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

    const prompt = getInterviewQuestionsPrompt(jobData, candidateData, interviewType, count);
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
   */
  _generateFromBank(job, candidate, interviewType, count) {
    const bankKey = this._resolveBankKey(job, interviewType);
    const bank = QUESTION_BANKS[bankKey] || QUESTION_BANKS.academic;

    // Shuffle and pick
    const shuffled = [...bank].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(count, shuffled.length));

    // If we need more questions than the bank has, pad with generic ones
    while (selected.length < count) {
      selected.push({
        question_text: `Tell us about a relevant experience that demonstrates your suitability for this role. (Question ${selected.length + 1})`,
        question_type: 'behavioral',
        difficulty_level: 'medium',
        expected_keywords: ['experience', 'skills', 'achievement', 'impact'],
        max_score: 10,
      });
    }

    logger.info(`Generated ${selected.length} questions from built-in bank (${bankKey})`);
    return selected;
  }

  /**
   * Resolve which question bank to use based on job and interview type.
   */
  _resolveBankKey(job, interviewType) {
    const type = (interviewType || '').toLowerCase();
    // For university recruitment: 'technical' interview type = academic questions
    if (type === 'hr' || type === 'managerial' || type === 'panel') return 'admin';

    // Infer from job title
    const jobTitle = (job?.applied_job_short_desc_new || '').toLowerCase();
    if (jobTitle.includes('professor') || jobTitle.includes('lecturer') || jobTitle.includes('faculty') || jobTitle.includes('academic')) {
      return 'academic';
    }
    if (jobTitle.includes('admin') || jobTitle.includes('manager') || jobTitle.includes('coordinator') || jobTitle.includes('officer')) {
      return 'admin';
    }
    if (jobTitle.includes('engineer') || jobTitle.includes('developer') || jobTitle.includes('architect') || jobTitle.includes('analyst')) {
      return 'technical';
    }

    return 'academic'; // default for university recruitment
  }
}

module.exports = new InterviewQuestionGeneratorService();
