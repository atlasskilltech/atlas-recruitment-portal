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

    // 4. Create interview record — always behavioral+hr, difficulty high
    const interview = await interviewRepository.create({
      candidate_id: candidateId,
      job_id: jobId,
      screening_id: screeningId || null,
      interview_token: interviewToken,
      interview_status: INTERVIEW_STATUSES.INVITED,
      interview_type: 'hr',
      difficulty_level: 'high',
      total_questions: 6,
      duration_minutes: 30,
    });

    // 5. Generate questions — behavioral+hr mix, hard difficulty
    const questionGenerator = require('./ai/interviewQuestionGenerator.service');
    const questions = await questionGenerator.generateQuestions(job, candidate, 'hr', 6);

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
    // Verify interview exists
    const interview = await interviewRepository.findById(interviewId);
    if (!interview) {
      throw new Error(`Interview not found: ${interviewId}`);
    }

    const status = interview.interview_status || interview.status;
    // Allow answer submission for invited or in_progress status
    if (status && !['invited', 'in_progress', 'pending'].includes(status)) {
      throw new Error(`Cannot submit answers for interview in status: ${status}`);
    }

    // Auto-mark as in_progress if still invited
    if (status === 'invited' || status === 'pending') {
      await interviewRepository.update(interviewId, {
        interview_status: INTERVIEW_STATUSES.IN_PROGRESS,
        started_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      });
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
    logger.info(`[INTERVIEW] Starting evaluation for interview ${interviewId}`);

    const interview = await interviewRepository.findById(interviewId);
    if (!interview) {
      throw new Error(`Interview not found: ${interviewId}`);
    }

    // Get questions and answers
    const [questions, answers] = await Promise.all([
      interviewRepository.getQuestions(interviewId),
      interviewRepository.getAnswers(interviewId),
    ]);

    logger.info(`[INTERVIEW] Found ${questions.length} questions, ${answers.length} answers for interview ${interviewId}`);

    if (answers.length === 0) {
      logger.warn(`[INTERVIEW] No answers found for interview ${interviewId}, marking as evaluated with 0 score`);
    }

    // Evaluate each answer
    const evaluator = require('./ai/interviewEvaluator.service');
    const evaluatedAnswers = [];

    for (const answer of answers) {
      const question = questions.find((q) => q.id === answer.question_id);
      if (!question) {
        logger.warn(`[INTERVIEW] No matching question for answer ${answer.id}, question_id=${answer.question_id}`);
        continue;
      }

      try {
        const jobContext = {
          job_title: interview.job_title || interview.applied_for_post || '',
          job_description: interview.job_description || interview.applied_job_desc || '',
        };

        const evaluation = await evaluator.evaluateAnswer(question, answer, jobContext);
        logger.info(`[INTERVIEW] Answer ${answer.id} evaluated: score=${evaluation.score}, feedback=${(evaluation.feedback || '').substring(0, 50)}`);

        // Update the answer with scores
        await interviewRepository.updateAnswer(answer.id, {
          ai_score: evaluation.score || 0,
          keyword_relevance_score: evaluation.keyword_relevance_score || evaluation.keywordScore || null,
          quality_score: evaluation.quality_score || evaluation.qualityScore || null,
          ai_feedback: typeof evaluation.feedback === 'string' ? evaluation.feedback : JSON.stringify(evaluation.feedback || ''),
        });

        evaluatedAnswers.push({
          ...answer,
          score: evaluation.score || 0,
          keyword_relevance_score: evaluation.keyword_relevance_score || evaluation.keywordScore || 0,
          quality_score: evaluation.quality_score || evaluation.qualityScore || 0,
          ai_feedback: evaluation.feedback,
          evaluation,
        });
      } catch (evalErr) {
        logger.error(`[INTERVIEW] Failed to evaluate answer ${answer.id}: ${evalErr.message}`);
        evaluatedAnswers.push({ ...answer, score: 0, evaluation: { score: 0, keyword_relevance_score: 0, quality_score: 0 } });
      }
    }

    // Compute weighted total score
    const scoringService = require('./ai/scoring.service');
    const overallScore = scoringService.calculateInterviewScore(
      evaluatedAnswers.map((a) => a.evaluation || { score: a.score || 0, keyword_relevance_score: 0, quality_score: 0 })
    );

    // Compute dimension scores
    const avgKeywordRelevance = evaluatedAnswers.length > 0
      ? evaluatedAnswers.reduce((s, a) => s + (a.keyword_relevance_score || (a.score / 10) * 100 || 0), 0) / evaluatedAnswers.length : 0;
    const avgQuality = evaluatedAnswers.length > 0
      ? evaluatedAnswers.reduce((s, a) => s + (a.quality_score || (a.score / 10) * 100 || 0), 0) / evaluatedAnswers.length : 0;

    const communicationScore = Math.round(avgQuality * 10) / 10;
    const domainKnowledgeScore = Math.round(avgKeywordRelevance * 10) / 10;
    const problemSolvingScore = Math.round(((avgKeywordRelevance + avgQuality) / 2) * 10) / 10;
    const confidenceScore = Math.round(avgQuality * 10) / 10;

    logger.info(`[INTERVIEW] Scores: overall=${overallScore}, comm=${communicationScore}, domain=${domainKnowledgeScore}, problem=${problemSolvingScore}, confidence=${confidenceScore}`);

    // Generate summary
    let summary = '';
    try {
      summary = await evaluator.generateInterviewSummary(interview, answers, evaluatedAnswers);
    } catch (summaryErr) {
      logger.warn(`[INTERVIEW] Summary generation failed: ${summaryErr.message}`);
      summary = `Interview completed with ${answers.length} answers. Overall score: ${overallScore}%.`;
    }

    // Determine recommendation
    const recommendation = scoringService.getRecommendationTag(overallScore);

    // Update interview record with all scores
    const updated = await interviewRepository.update(interviewId, {
      interview_status: INTERVIEW_STATUSES.EVALUATED,
      overall_score: overallScore,
      communication_score: communicationScore,
      domain_knowledge_score: domainKnowledgeScore,
      problem_solving_score: problemSolvingScore,
      confidence_score: confidenceScore,
      completed_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      feedback: typeof summary === 'string' ? summary : JSON.stringify(summary),
      ai_recommendation: recommendation,
    });

    logger.info(`[INTERVIEW] Interview ${interviewId} completed: score=${overallScore}, status=evaluated, recommendation=${recommendation}`);

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
      expiresIn: '10d', // 10 days validity for interview link
    });
  }
}

module.exports = new InterviewService();
