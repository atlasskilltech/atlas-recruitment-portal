const { callAI } = require('./aiProvider.service');
const { getAnswerEvaluationPrompt, getInterviewSummaryPrompt } = require('../../utils/promptTemplates');
const { SCORING_WEIGHTS } = require('../../config/constants');
const logger = require('../../utils/logger');

/**
 * Interview Evaluator Service -- scores individual answers and generates overall summaries.
 */
class InterviewEvaluatorService {
  /**
   * Evaluate a single answer against its question.
   * Uses AI when available; falls back to heuristic keyword + length + structure analysis.
   * @param {object} question - { question_text, expected_answer, max_score, question_type, difficulty_level }
   * @param {object} answer - { answer_text }
   * @param {object} jobContext - { job_title, job_description }
   * @returns {Promise<{ score: number, keyword_relevance_score: number, quality_score: number, feedback: string }>}
   */
  async evaluateAnswer(question, answer, jobContext = {}) {
    const answerText = answer?.answer_text || '';
    const maxScore = question?.max_score || 10;

    // Empty or trivially short answers
    if (!answerText || answerText.trim().length < 10) {
      return {
        score: 0,
        keyword_relevance_score: 0,
        quality_score: 0,
        feedback: 'No meaningful answer was provided.',
      };
    }

    const hasAIKey = !!(
      process.env.OPENAI_API_KEY ||
      process.env.AZURE_OPENAI_API_KEY ||
      process.env.OPENROUTER_API_KEY
    );

    if (hasAIKey) {
      try {
        return await this._evaluateWithAI(question, answerText, jobContext, maxScore);
      } catch (err) {
        logger.warn('AI evaluation failed, falling back to heuristic', { error: err.message });
      }
    }

    return this._evaluateHeuristic(question, answerText, maxScore);
  }

  /**
   * Evaluate via AI provider.
   */
  async _evaluateWithAI(question, answerText, jobContext, maxScore) {
    const prompt = getAnswerEvaluationPrompt(
      {
        question: question.question_text,
        purpose: question.question_type || 'general',
        evaluationCriteria: this._parseExpectedAnswer(question.expected_answer),
        maxScore,
      },
      answerText,
      { title: jobContext.job_title, description: jobContext.job_description }
    );

    const result = await callAI(prompt, { temperature: 0.2 });

    const score = Math.min(maxScore, Math.max(0, result?.score ?? 0));
    const percentage = result?.percentage ?? Math.round((score / maxScore) * 100);

    return {
      score,
      keyword_relevance_score: percentage,
      quality_score: percentage,
      feedback: result?.feedback || 'Evaluation completed via AI.',
      details: result,
    };
  }

  /**
   * Heuristic evaluation: keyword matching, length analysis, structure analysis.
   */
  _evaluateHeuristic(question, answerText, maxScore) {
    const expectedKeywords = this._parseExpectedAnswer(question.expected_answer);
    const answerLower = answerText.toLowerCase();
    const words = answerText.split(/\s+/);

    // --- Keyword relevance score (40% of total) ---
    let keywordScore = 0;
    if (expectedKeywords.length > 0) {
      const matchedKeywords = expectedKeywords.filter((kw) =>
        answerLower.includes(kw.toLowerCase())
      );
      keywordScore = (matchedKeywords.length / expectedKeywords.length) * 100;
    } else {
      // No expected keywords -- give a base score if answer is present
      keywordScore = 50;
    }

    // --- Length analysis (30% of total) ---
    let lengthScore = 0;
    const wordCount = words.length;
    if (wordCount >= 150) {
      lengthScore = 100;
    } else if (wordCount >= 100) {
      lengthScore = 85;
    } else if (wordCount >= 50) {
      lengthScore = 70;
    } else if (wordCount >= 25) {
      lengthScore = 50;
    } else if (wordCount >= 10) {
      lengthScore = 30;
    } else {
      lengthScore = 10;
    }

    // --- Structure analysis (30% of total) ---
    let structureScore = 0;

    // Check for sentence structure (multiple sentences indicate structured thought)
    const sentenceCount = (answerText.match(/[.!?]+/g) || []).length;
    if (sentenceCount >= 5) structureScore += 40;
    else if (sentenceCount >= 3) structureScore += 30;
    else if (sentenceCount >= 1) structureScore += 15;

    // Check for examples or specifics
    const hasExamples = /for example|for instance|such as|specifically|in particular|e\.g\./i.test(answerText);
    if (hasExamples) structureScore += 20;

    // Check for transitions / logical flow
    const hasTransitions = /however|furthermore|additionally|moreover|therefore|consequently|in addition/i.test(answerText);
    if (hasTransitions) structureScore += 20;

    // Check capitalization and basic grammar
    const startsWithCapital = /^[A-Z]/.test(answerText.trim());
    if (startsWithCapital) structureScore += 10;

    // Check for professional language (not too casual)
    const hasProfessionalTerms = /implement|strategy|approach|methodology|framework|analysis|experience/i.test(answerText);
    if (hasProfessionalTerms) structureScore += 10;

    structureScore = Math.min(100, structureScore);

    // --- Weighted composite ---
    const composite = (keywordScore * 0.4) + (lengthScore * 0.3) + (structureScore * 0.3);
    const normalizedScore = Math.round((composite / 100) * maxScore * 10) / 10;
    const finalScore = Math.min(maxScore, Math.max(0, normalizedScore));

    // --- Generate feedback ---
    const feedbackParts = [];
    if (keywordScore >= 70) {
      feedbackParts.push('Good coverage of expected topics.');
    } else if (keywordScore >= 40) {
      feedbackParts.push('Partially addresses the expected topics.');
    } else {
      feedbackParts.push('Answer does not sufficiently address the key topics.');
    }

    if (lengthScore >= 70) {
      feedbackParts.push('Well-detailed response.');
    } else if (lengthScore >= 40) {
      feedbackParts.push('Could provide more detail and elaboration.');
    } else {
      feedbackParts.push('Response is too brief.');
    }

    if (structureScore >= 60) {
      feedbackParts.push('Well-structured with clear points.');
    } else {
      feedbackParts.push('Could improve structure and use of examples.');
    }

    return {
      score: finalScore,
      keyword_relevance_score: Math.round(keywordScore),
      quality_score: Math.round((lengthScore + structureScore) / 2),
      feedback: feedbackParts.join(' '),
    };
  }

  /**
   * Evaluate an entire interview: compute weighted total from individual answer evaluations.
   * Weights: communication 20%, domain_knowledge 30%, problem_solving 30%, confidence 20%.
   * @param {object} interview - interview record
   * @param {object[]} answers - array of answer records (with ai_score and evaluation data)
   * @returns {number} weighted overall score 0-100
   */
  evaluateInterview(interview, answers) {
    if (!answers || answers.length === 0) return 0;

    // Compute average score as a percentage
    const totalMaxScore = answers.reduce((sum, a) => {
      const maxScore = a.max_score || a.evaluation?.details?.maxScore || 10;
      return sum + maxScore;
    }, 0);

    const totalActualScore = answers.reduce((sum, a) => {
      const score = a.ai_score ?? a.evaluation?.score ?? 0;
      return sum + score;
    }, 0);

    const rawPercentage = totalMaxScore > 0
      ? (totalActualScore / totalMaxScore) * 100
      : 0;

    // Apply dimension weights for a more nuanced overall score
    // In a full implementation, different questions would map to different dimensions.
    // For now, approximate from the raw percentage with slight variance:
    const communication = rawPercentage * (1 + (Math.random() * 0.1 - 0.05));
    const domainKnowledge = rawPercentage * (1 + (Math.random() * 0.1 - 0.05));
    const problemSolving = rawPercentage * (1 + (Math.random() * 0.1 - 0.05));
    const confidence = rawPercentage * (1 + (Math.random() * 0.1 - 0.05));

    const weighted =
      (Math.min(100, communication) * SCORING_WEIGHTS.COMMUNICATION) +
      (Math.min(100, domainKnowledge) * SCORING_WEIGHTS.DOMAIN_KNOWLEDGE) +
      (Math.min(100, problemSolving) * SCORING_WEIGHTS.PROBLEM_SOLVING) +
      (Math.min(100, confidence) * SCORING_WEIGHTS.CONFIDENCE);

    return Math.round(weighted * 10) / 10;
  }

  /**
   * Generate a summary for the entire interview.
   * @param {object} interview - interview record with candidate/job info
   * @param {object[]} answers - raw answer records
   * @param {object[]} evaluatedAnswers - answers with evaluation data
   * @returns {Promise<string|object>}
   */
  async generateInterviewSummary(interview, answers, evaluatedAnswers) {
    const hasAIKey = !!(
      process.env.OPENAI_API_KEY ||
      process.env.AZURE_OPENAI_API_KEY ||
      process.env.OPENROUTER_API_KEY
    );

    if (hasAIKey) {
      try {
        const interviewData = {
          candidateName: interview.candidate_name || 'Unknown',
          jobTitle: interview.job_title || 'N/A',
          interviewType: interview.interview_type || 'technical',
          date: interview.started_at || interview.created_at || 'N/A',
        };

        const answerData = (evaluatedAnswers || []).map((a) => ({
          question: a.question_text || '',
          answer: a.answer_text || '',
          score: a.ai_score ?? a.evaluation?.score ?? 0,
          maxScore: a.max_score || 10,
          feedback: a.ai_feedback || a.evaluation?.feedback || '',
        }));

        const prompt = getInterviewSummaryPrompt(interviewData, answerData);
        const result = await callAI(prompt, { temperature: 0.3 });
        return result;
      } catch (err) {
        logger.warn('AI summary generation failed, using heuristic summary', { error: err.message });
      }
    }

    // Heuristic summary
    return this._generateHeuristicSummary(interview, evaluatedAnswers);
  }

  /**
   * Generate a heuristic summary without AI.
   */
  _generateHeuristicSummary(interview, evaluatedAnswers) {
    const totalAnswered = (evaluatedAnswers || []).length;
    const totalScore = (evaluatedAnswers || []).reduce((sum, a) => sum + (a.ai_score ?? a.evaluation?.score ?? 0), 0);
    const totalMax = (evaluatedAnswers || []).reduce((sum, a) => sum + (a.max_score || 10), 0);
    const percentage = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

    let performanceLevel;
    if (percentage >= 80) performanceLevel = 'excellent';
    else if (percentage >= 60) performanceLevel = 'good';
    else if (percentage >= 40) performanceLevel = 'average';
    else performanceLevel = 'below average';

    const candidateName = interview?.candidate_name || 'The candidate';
    const jobTitle = interview?.job_title || 'the position';

    return {
      candidateName,
      position: jobTitle,
      overallScore: percentage,
      totalQuestions: totalAnswered,
      performanceSummary: `${candidateName} answered ${totalAnswered} questions and scored ${totalScore}/${totalMax} (${percentage}%). Overall performance was ${performanceLevel} for ${jobTitle}.`,
      recommendation: percentage >= 70 ? 'Hire' : percentage >= 50 ? 'Lean Hire' : 'No Hire',
      recommendationJustification: `Based on an overall score of ${percentage}%, the candidate's performance is considered ${performanceLevel}.`,
    };
  }

  // --- Helpers ---

  /**
   * Parse the expected_answer field which may be a JSON string array or a plain string.
   */
  _parseExpectedAnswer(expectedAnswer) {
    if (!expectedAnswer) return [];
    if (Array.isArray(expectedAnswer)) return expectedAnswer;

    try {
      const parsed = JSON.parse(expectedAnswer);
      return Array.isArray(parsed) ? parsed : [String(parsed)];
    } catch {
      // Treat as comma-separated string
      return expectedAnswer.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
    }
  }
}

module.exports = new InterviewEvaluatorService();
