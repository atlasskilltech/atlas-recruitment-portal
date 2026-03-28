const { callAI } = require('./aiProvider.service');
const { getInterviewQuestionsPrompt } = require('../../utils/promptTemplates');
const logger = require('../../utils/logger');

// ---------------------------------------------------------------------------
// Built-in question banks (used when no AI API key is configured)
// ---------------------------------------------------------------------------

const QUESTION_BANKS = {
  academic: [
    {
      question_text: 'Describe your teaching philosophy and how you engage students in active learning.',
      question_type: 'general',
      difficulty_level: 'easy',
      expected_keywords: ['student-centered', 'active learning', 'engagement', 'pedagogy', 'outcomes'],
      max_score: 10,
    },
    {
      question_text: 'How do you design a course curriculum to align with programme outcomes and industry needs?',
      question_type: 'technical',
      difficulty_level: 'medium',
      expected_keywords: ['curriculum mapping', 'outcome-based', 'industry alignment', 'bloom taxonomy', 'assessment'],
      max_score: 10,
    },
    {
      question_text: 'Discuss your research contributions and how they have impacted your field.',
      question_type: 'technical',
      difficulty_level: 'medium',
      expected_keywords: ['publications', 'journals', 'impact factor', 'citations', 'methodology', 'contribution'],
      max_score: 10,
    },
    {
      question_text: 'How do you mentor and guide research students through their thesis or dissertation?',
      question_type: 'behavioral',
      difficulty_level: 'medium',
      expected_keywords: ['mentoring', 'guidance', 'milestones', 'feedback', 'research methodology', 'timeline'],
      max_score: 10,
    },
    {
      question_text: 'How do you integrate technology and digital tools into your teaching practice?',
      question_type: 'technical',
      difficulty_level: 'easy',
      expected_keywords: ['LMS', 'online tools', 'blended learning', 'technology', 'digital', 'e-learning'],
      max_score: 10,
    },
    {
      question_text: 'Describe a challenging classroom situation you faced and how you handled it.',
      question_type: 'behavioral',
      difficulty_level: 'medium',
      expected_keywords: ['conflict resolution', 'adaptability', 'communication', 'student management', 'solution'],
      max_score: 10,
    },
    {
      question_text: 'What interdisciplinary collaborations have you undertaken and what were the outcomes?',
      question_type: 'technical',
      difficulty_level: 'hard',
      expected_keywords: ['collaboration', 'interdisciplinary', 'cross-functional', 'outcomes', 'project', 'team'],
      max_score: 10,
    },
    {
      question_text: 'How do you plan to contribute to the accreditation and quality assurance process?',
      question_type: 'technical',
      difficulty_level: 'hard',
      expected_keywords: ['NAAC', 'NBA', 'accreditation', 'quality', 'documentation', 'standards', 'compliance'],
      max_score: 10,
    },
  ],

  admin: [
    {
      question_text: 'Walk us through how you would streamline an existing administrative process to improve efficiency.',
      question_type: 'general',
      difficulty_level: 'easy',
      expected_keywords: ['process improvement', 'efficiency', 'bottleneck', 'automation', 'workflow'],
      max_score: 10,
    },
    {
      question_text: 'How do you manage competing priorities from multiple stakeholders?',
      question_type: 'behavioral',
      difficulty_level: 'medium',
      expected_keywords: ['prioritization', 'stakeholder management', 'communication', 'deadlines', 'negotiation'],
      max_score: 10,
    },
    {
      question_text: 'Describe your experience with compliance and regulatory requirements in an institutional context.',
      question_type: 'technical',
      difficulty_level: 'medium',
      expected_keywords: ['compliance', 'regulations', 'audit', 'policy', 'documentation', 'governance'],
      max_score: 10,
    },
    {
      question_text: 'How do you ensure effective communication across departments?',
      question_type: 'behavioral',
      difficulty_level: 'easy',
      expected_keywords: ['cross-functional', 'communication', 'meetings', 'reporting', 'transparency'],
      max_score: 10,
    },
    {
      question_text: 'Describe a time you had to handle a crisis or unexpected situation in a professional setting.',
      question_type: 'behavioral',
      difficulty_level: 'medium',
      expected_keywords: ['crisis management', 'decision-making', 'calm', 'resolution', 'leadership'],
      max_score: 10,
    },
    {
      question_text: 'What is your approach to managing budgets and resource allocation?',
      question_type: 'technical',
      difficulty_level: 'hard',
      expected_keywords: ['budgeting', 'resource allocation', 'cost control', 'financial planning', 'ROI'],
      max_score: 10,
    },
  ],

  technical: [
    {
      question_text: 'Describe the architecture of a complex system you have designed or contributed to.',
      question_type: 'technical',
      difficulty_level: 'medium',
      expected_keywords: ['architecture', 'scalability', 'components', 'design patterns', 'microservices', 'API'],
      max_score: 10,
    },
    {
      question_text: 'How do you approach debugging a production issue that is difficult to reproduce?',
      question_type: 'technical',
      difficulty_level: 'medium',
      expected_keywords: ['debugging', 'logs', 'monitoring', 'reproduction', 'root cause', 'analysis'],
      max_score: 10,
    },
    {
      question_text: 'What strategies do you use to ensure scalability and performance of applications?',
      question_type: 'technical',
      difficulty_level: 'hard',
      expected_keywords: ['scalability', 'caching', 'load balancing', 'optimization', 'profiling', 'database indexing'],
      max_score: 10,
    },
    {
      question_text: 'Explain your experience with version control and CI/CD pipelines.',
      question_type: 'technical',
      difficulty_level: 'easy',
      expected_keywords: ['git', 'CI/CD', 'automation', 'deployment', 'pipeline', 'testing'],
      max_score: 10,
    },
    {
      question_text: 'How do you handle technical debt in a project?',
      question_type: 'behavioral',
      difficulty_level: 'medium',
      expected_keywords: ['refactoring', 'prioritization', 'code review', 'documentation', 'maintainability'],
      max_score: 10,
    },
    {
      question_text: 'Describe a situation where you had to make a significant technical trade-off. What was your reasoning?',
      question_type: 'behavioral',
      difficulty_level: 'hard',
      expected_keywords: ['trade-off', 'decision-making', 'analysis', 'constraints', 'outcomes', 'risk'],
      max_score: 10,
    },
  ],
};

/**
 * Interview Question Generator Service
 */
class InterviewQuestionGeneratorService {
  /**
   * Generate interview questions tailored to the job, candidate, and interview type.
   * Uses AI when available; falls back to the built-in question bank.
   * @param {object|null} job - job record
   * @param {object|null} candidate - candidate record
   * @param {string} interviewType - 'technical', 'hr', 'managerial', 'panel', etc.
   * @param {number} count - number of questions to generate (default 6)
   * @returns {Promise<Array<{ question_text: string, question_type: string, difficulty_level: string, expected_keywords: string[], max_score: number }>>}
   */
  async generateQuestions(job, candidate, interviewType = 'technical', count = 6) {
    // Always try AI first via callAI() which respects AI_PROVIDER env
    try {
      const aiQuestions = await this._generateWithAI(job, candidate, interviewType, count);
      if (aiQuestions && aiQuestions.length > 0) {
        return aiQuestions;
      }
    } catch (err) {
      logger.warn('AI question generation failed, using built-in bank', { error: err.message });
    }

    return this._generateFromBank(job, candidate, interviewType, count);
  }

  /**
   * Generate questions via the AI provider.
   */
  async _generateWithAI(job, candidate, interviewType, count) {
    const jobData = {
      title: job?.applied_job_short_desc_new || '',
      description: job?.applied_job_desc || '',
      requirements: job?.applied_job_requirements || job?.applied_job_desc || '',
    };

    const candidateData = {
      name: candidate?.appln_full_name || 'Unknown',
      resumeText: [
        candidate?.appln_specialization,
        candidate?.appln_high_qualification,
        candidate?.appln_current_designation,
        candidate?.appln_current_organisation,
      ].filter(Boolean).join('. '),
      skills: candidate?.appln_specialization || '',
    };

    // Always use mixed (behavioral+HR) type with hard difficulty
    const prompt = getInterviewQuestionsPrompt(jobData, candidateData, 'mixed', count);
    const result = await callAI(prompt, { temperature: 0.5 });

    const aiQuestions = result?.questions || [];
    if (aiQuestions.length === 0) {
      throw new Error('AI returned no questions');
    }

    return aiQuestions.slice(0, count).map((q) => ({
      question_text: q.question || q.question_text || '',
      question_type: q.type || q.question_type || interviewType,
      difficulty_level: q.difficulty || q.difficulty_level || 'medium',
      expected_keywords: q.evaluationCriteria || q.expected_keywords || [],
      max_score: q.maxScore || q.max_score || 10,
    }));
  }

  /**
   * Select questions from the built-in question bank.
   * Mixes questions from the job-relevant bank + other banks for variety.
   */
  _generateFromBank(job, candidate, interviewType, count) {
    const bankKey = this._resolveBankKey(job, interviewType);
    const primaryBank = QUESTION_BANKS[bankKey] || QUESTION_BANKS.academic;

    // Combine all banks for more variety, prioritize primary bank
    var allQuestions = [...primaryBank];
    Object.keys(QUESTION_BANKS).forEach(function(key) {
      if (key !== bankKey) {
        QUESTION_BANKS[key].forEach(function(q) { allQuestions.push(q); });
      }
    });

    // Use candidate-specific seed for deterministic but unique shuffle per candidate
    var seed = (candidate?.id || candidate?.appln_full_name || '') + '_' + Date.now();
    var seededRandom = function() {
      var x = 0;
      for (var i = 0; i < seed.length; i++) x += seed.charCodeAt(i);
      x = ((x * 9301 + 49297) % 233280);
      return x / 233280;
    };

    // Shuffle: pick primarily from primary bank, fill rest from others
    var shuffledPrimary = [...primaryBank].sort(() => Math.random() - 0.5);
    var shuffledOthers = allQuestions.filter(function(q) { return !primaryBank.includes(q); }).sort(() => Math.random() - 0.5);

    // Take up to (count-1) from primary, at least 1 from others for variety
    var primaryCount = Math.min(count - 1, shuffledPrimary.length);
    var selected = shuffledPrimary.slice(0, primaryCount);
    var remaining = count - selected.length;
    selected = selected.concat(shuffledOthers.slice(0, remaining));

    // Final shuffle so order is random
    selected = selected.sort(() => Math.random() - 0.5);

    // If still not enough, pad with generic
    while (selected.length < count) {
      selected.push({
        question_text: 'Tell us about a relevant experience that demonstrates your suitability for this role.',
        question_type: 'behavioral',
        difficulty_level: 'medium',
        expected_keywords: ['experience', 'skills', 'achievement', 'impact'],
        max_score: 10,
      });
    }

    logger.info(`Generated ${selected.length} questions from built-in bank (primary: ${bankKey})`);
    return selected;
  }

  /**
   * Resolve which question bank to use based on job and interview type.
   */
  _resolveBankKey(job, interviewType) {
    // Check job title first — more specific than interview type
    const jobTitle = (job?.applied_job_short_desc_new || job?.applied_for_post || '').toLowerCase();
    if (jobTitle.includes('professor') || jobTitle.includes('lecturer') || jobTitle.includes('faculty') || jobTitle.includes('academic')) {
      return 'academic';
    }
    if (jobTitle.includes('engineer') || jobTitle.includes('developer') || jobTitle.includes('architect') || jobTitle.includes('analyst')) {
      return 'technical';
    }
    if (jobTitle.includes('admin') || jobTitle.includes('manager') || jobTitle.includes('coordinator') || jobTitle.includes('officer') ||
        jobTitle.includes('registrar') || jobTitle.includes('counsellor') || jobTitle.includes('counselor') || jobTitle.includes('librarian')) {
      return 'admin';
    }

    // Fallback to interview type
    const type = (interviewType || '').toLowerCase();
    if (type === 'technical') return 'technical';
    if (type === 'hr' || type === 'managerial' || type === 'panel') return 'admin';

    return 'academic'; // default for university recruitment
  }
}

module.exports = new InterviewQuestionGeneratorService();
