const jwt = require('jsonwebtoken');
const interviewRepository = require('../repositories/interview.repository');
const candidateRepository = require('../repositories/candidate.repository');
const screeningRepository = require('../repositories/screening.repository');
const { callAI } = require('./ai/aiProvider.service');
const env = require('../config/env');
const { INTERVIEW_STATUSES } = require('../config/constants');
const logger = require('../utils/logger');

/**
 * Interview Service – manages AI interview lifecycle
 */
class InterviewService {
  /**
   * Create a new AI interview: generate questions, create invitation token.
   * @param {number} candidateId
   * @param {number|null} screeningId
   * @param {string} interviewType - e.g. 'technical', 'hr', 'managerial', 'panel'
   * @returns {Promise<object>} created interview with questions and token
   */
  async createInterview(candidateId, screeningId, interviewType = 'technical') {
    // 1. Load candidate and job
    const candidate = await candidateRepository.findById(candidateId);
    if (!candidate) {
      throw new Error(`Candidate not found: ${candidateId}`);
    }

    const jobId = candidate.job_id || candidate.appln_applied_for_sub;
    const jobRepository = require('../repositories/job.repository');
    const job = jobId ? await jobRepository.findById(jobId) : null;

    // 2. Load screening if provided
    let screening = null;
    if (screeningId) {
      screening = await screeningRepository.findById(screeningId);
    }

    // 3. Generate invitation token
    const interviewToken = this.generateInvitationToken(null, candidateId);

    // 4. Create interview record
    const interview = await interviewRepository.create({
      candidate_id: candidateId,
      job_id: jobId,
      screening_id: screeningId || null,
      interview_token: interviewToken,
      interview_status: INTERVIEW_STATUSES.INVITED,
      total_questions: 6,
      duration_minutes: 30,
    });

    // 5. Generate questions
    const questionGenerator = require('./ai/interviewQuestionGenerator.service');
    const questions = await questionGenerator.generateQuestions(job, candidate, interviewType, 6);

    // 6. Save questions
    const savedQuestions = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const saved = await interviewRepository.createQuestion({
        interview_id: interview.id,
        question_number: i + 1,
        question_text: q.question_text,
        question_type: q.question_type || interviewType,
        difficulty_level: q.difficulty_level || 'medium',
        expected_answer: JSON.stringify(q.expected_keywords || []),
        max_score: q.max_score || 10,
      });
      savedQuestions.push(saved);
    }

    logger.info(`Interview created: id=${interview.id}, candidate=${candidateId}, type=${interviewType}, questions=${savedQuestions.length}`);

    return {
      ...interview,
      token: interviewToken,
      questions: savedQuestions,
    };
  }

  /**
   * Retrieve interview by invitation token after JWT verification.
   * @param {string} token
   * @returns {Promise<object>} interview with questions
   */
  async getInterviewByToken(token) {
    // Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
      throw new Error('Invalid or expired interview token');
    }

    // Find interview by token
    const interview = await interviewRepository.findByToken(token);
    if (!interview) {
      throw new Error('Interview not found for the given token');
    }

    // Check if expired
    if (interview.interview_status === INTERVIEW_STATUSES.EXPIRED) {
      throw new Error('This interview has expired');
    }

    // Load questions
    const questions = await interviewRepository.getQuestions(interview.id);

    return {
      ...interview,
      questions,
    };
  }

  /**
   * Mark an interview as in_progress (candidate has started).
   * @param {string} token
   * @returns {Promise<object>} updated interview
   */
  async startInterview(token) {
    const interview = await this.getInterviewByToken(token);

    if (interview.interview_status === INTERVIEW_STATUSES.IN_PROGRESS) {
      return interview; // Already started
    }

    if (interview.interview_status !== INTERVIEW_STATUSES.INVITED &&
        interview.interview_status !== INTERVIEW_STATUSES.PENDING) {
      throw new Error(`Cannot start interview in status: ${interview.interview_status}`);
    }

    const updated = await interviewRepository.update(interview.id, {
      interview_status: INTERVIEW_STATUSES.IN_PROGRESS,
      started_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    });

    logger.info(`Interview started: id=${interview.id}`);
    return updated;
  }

  /**
   * Submit an answer for a specific question.
   * @param {number} interviewId
   * @param {number} questionId
   * @param {string} answerText
   * @returns {Promise<object>} saved answer
   */
  async submitAnswer(interviewId, questionId, answerText) {
    // Verify interview exists and is in progress
    const interview = await interviewRepository.findById(interviewId);
    if (!interview) {
      throw new Error(`Interview not found: ${interviewId}`);
    }

    if (interview.interview_status !== INTERVIEW_STATUSES.IN_PROGRESS) {
      throw new Error(`Cannot submit answers for interview in status: ${interview.interview_status}`);
    }

    // Save the answer
    const answer = await interviewRepository.createAnswer({
      interview_id: interviewId,
      question_id: questionId,
      answer_text: answerText,
    });

    logger.info(`Answer submitted: interview=${interviewId}, question=${questionId}`);
    return answer;
  }

  /**
   * Complete an interview: evaluate all answers, compute weighted scores, update record.
   * @param {number} interviewId
   * @returns {Promise<object>} evaluated interview
   */
  async completeInterview(interviewId) {
    const interview = await interviewRepository.findById(interviewId);
    if (!interview) {
      throw new Error(`Interview not found: ${interviewId}`);
    }

    // Get questions and answers
    const [questions, answers] = await Promise.all([
      interviewRepository.getQuestions(interviewId),
      interviewRepository.getAnswers(interviewId),
    ]);

    // Evaluate each answer
    const evaluator = require('./ai/interviewEvaluator.service');
    const evaluatedAnswers = [];

    for (const answer of answers) {
      const question = questions.find((q) => q.id === answer.question_id);
      if (!question) continue;

      const jobContext = {
        job_title: interview.job_title,
        job_description: interview.job_description,
      };

      const evaluation = await evaluator.evaluateAnswer(question, answer, jobContext);

      // Update the answer with the score
      await interviewRepository.updateAnswer(answer.id, {
        ai_score: evaluation.score,
        ai_feedback: evaluation.feedback,
      });

      evaluatedAnswers.push({
        ...answer,
        ai_score: evaluation.score,
        ai_feedback: evaluation.feedback,
        evaluation,
      });
    }

    // Compute weighted total score
    const scoringService = require('./ai/scoring.service');
    const overallScore = scoringService.calculateInterviewScore(
      evaluatedAnswers.map((a) => a.evaluation)
    );

    // Generate summary
    const summary = await evaluator.generateInterviewSummary(interview, answers, evaluatedAnswers);

    // Determine recommendation
    const recommendation = scoringService.getRecommendationTag(overallScore);

    // Update interview record
    const updated = await interviewRepository.update(interviewId, {
      interview_status: INTERVIEW_STATUSES.EVALUATED,
      overall_score: overallScore,
      questions_answered: answers.length,
      completed_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      feedback: typeof summary === 'string' ? summary : JSON.stringify(summary),
      ai_recommendation: recommendation,
    });

    logger.info(`Interview completed and evaluated: id=${interviewId}, score=${overallScore}, recommendation=${recommendation}`);

    return {
      ...updated,
      evaluatedAnswers,
      overallScore,
      recommendation,
      summary,
    };
  }

  /**
   * Get full interview details including questions and answers.
   * @param {number} interviewId
   * @returns {Promise<object>}
   */
  async getInterviewDetails(interviewId) {
    const interview = await interviewRepository.findById(interviewId);
    if (!interview) {
      throw new Error(`Interview not found: ${interviewId}`);
    }

    const [questions, answers] = await Promise.all([
      interviewRepository.getQuestions(interviewId),
      interviewRepository.getAnswers(interviewId),
    ]);

    // Map answers to their questions
    const questionsWithAnswers = questions.map((q) => {
      const answer = answers.find((a) => a.question_id === q.id);
      return {
        ...q,
        answer: answer || null,
      };
    });

    return {
      ...interview,
      questions: questionsWithAnswers,
      answers,
    };
  }

  /**
   * Generate a JWT invitation token for an interview.
   * @param {number|null} interviewId
   * @param {number} candidateId
   * @returns {string} JWT token
   */
  generateInvitationToken(interviewId, candidateId) {
    const payload = {
      type: 'interview_invitation',
      interview_id: interviewId,
      candidate_id: candidateId,
      iat: Math.floor(Date.now() / 1000),
    };

    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN || '24h',
    });
  }
}

module.exports = new InterviewService();
