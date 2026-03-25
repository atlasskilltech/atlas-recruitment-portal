/**
 * Prompt templates for AI-powered recruitment features.
 *
 * Each function returns a structured prompt string designed for use with
 * large-language-model APIs (OpenAI, Anthropic, etc.).
 */

/**
 * Build a prompt that instructs the model to extract structured information
 * (skills, education, work experience, publications, certifications) from
 * raw candidate data (typically parsed resume text).
 *
 * @param {Object} candidateData
 * @param {string} candidateData.name        - Candidate full name
 * @param {string} candidateData.resumeText  - Raw text extracted from resume / CV
 * @param {string} [candidateData.email]
 * @returns {string}
 */
function getResumeExtractionPrompt(candidateData) {
  const { name, resumeText, email } = candidateData || {};

  return `You are an expert HR data-extraction assistant. Your task is to analyse the following resume / CV text and return a structured JSON object.

CANDIDATE INFORMATION
---------------------
Name : ${name || 'Unknown'}
Email: ${email || 'N/A'}

RESUME TEXT
-----------
${resumeText || '[No resume text provided]'}

INSTRUCTIONS
------------
1. Parse the resume text carefully and extract the following fields.
2. Return ONLY valid JSON (no markdown fences, no commentary).
3. If a field cannot be determined, use null or an empty array as appropriate.

REQUIRED OUTPUT SCHEMA
----------------------
{
  "personal": {
    "name": "<string>",
    "email": "<string | null>",
    "phone": "<string | null>",
    "location": "<string | null>",
    "linkedin": "<string | null>",
    "website": "<string | null>"
  },
  "summary": "<string - a 2-3 sentence professional summary>",
  "skills": {
    "technical": ["<string>", ...],
    "soft": ["<string>", ...],
    "languages": ["<string>", ...],
    "tools": ["<string>", ...]
  },
  "education": [
    {
      "degree": "<string>",
      "field": "<string>",
      "institution": "<string>",
      "year": "<number | null>",
      "gpa": "<string | null>"
    }
  ],
  "experience": [
    {
      "title": "<string>",
      "company": "<string>",
      "location": "<string | null>",
      "startDate": "<string YYYY-MM or YYYY>",
      "endDate": "<string YYYY-MM or YYYY or 'Present'>",
      "description": "<string - brief summary of responsibilities>",
      "achievements": ["<string>", ...]
    }
  ],
  "publications": [
    {
      "title": "<string>",
      "journal": "<string | null>",
      "year": "<number | null>",
      "doi": "<string | null>"
    }
  ],
  "certifications": [
    {
      "name": "<string>",
      "issuer": "<string | null>",
      "year": "<number | null>"
    }
  ],
  "totalYearsExperience": "<number>"
}`;
}

/**
 * Build a prompt that asks the model to evaluate how well a candidate
 * matches a given job description and return a structured comparison.
 *
 * @param {Object} candidateData
 * @param {string} candidateData.name
 * @param {string} candidateData.resumeText
 * @param {string} [candidateData.skills]     - comma-separated skills if already extracted
 * @param {Object} jobData
 * @param {string} jobData.title
 * @param {string} jobData.description
 * @param {string} [jobData.requirements]
 * @param {string} [jobData.department]
 * @returns {string}
 */
function getJDMatchPrompt(candidateData, jobData) {
  const { name, resumeText, skills } = candidateData || {};
  const { title, description, requirements, department } = jobData || {};

  return `You are a senior recruitment analyst. Compare the candidate profile below against the job description and produce a detailed match analysis.

CANDIDATE
---------
Name  : ${name || 'Unknown'}
Skills: ${skills || 'See resume'}

Resume / CV Text:
${resumeText || '[No resume text provided]'}

JOB DESCRIPTION
---------------
Title      : ${title || 'N/A'}
Department : ${department || 'N/A'}

Description:
${description || '[No description provided]'}

Requirements:
${requirements || '[No requirements provided]'}

INSTRUCTIONS
------------
1. Identify which required and preferred qualifications the candidate meets.
2. Identify gaps or missing qualifications.
3. Assess cultural and domain fit based on available information.
4. Provide an overall match assessment.
5. Return ONLY valid JSON (no markdown fences).

REQUIRED OUTPUT SCHEMA
----------------------
{
  "overallMatch": "<string: 'Excellent' | 'Strong' | 'Moderate' | 'Weak' | 'Poor'>",
  "matchPercentage": <number 0-100>,
  "matchedQualifications": [
    {
      "requirement": "<string - the JD requirement>",
      "evidence": "<string - how the candidate meets it>"
    }
  ],
  "missingQualifications": [
    {
      "requirement": "<string>",
      "severity": "<string: 'Critical' | 'Important' | 'Nice-to-have'>",
      "mitigatingFactor": "<string | null>"
    }
  ],
  "skillsAnalysis": {
    "matched": ["<string>", ...],
    "missing": ["<string>", ...],
    "additional": ["<string> - candidate skills not in JD but potentially valuable"]
  },
  "experienceRelevance": "<string - 2-3 sentence assessment>",
  "educationFit": "<string - 1-2 sentence assessment>",
  "strengths": ["<string>", ...],
  "concerns": ["<string>", ...],
  "recommendation": "<string: 'Highly Recommended' | 'Recommended' | 'Maybe' | 'Not Recommended'>",
  "summary": "<string - 3-4 sentence executive summary>"
}`;
}

/**
 * Build a prompt that generates a numeric match score with breakdown
 * from pre-extracted candidate data and a job posting.
 *
 * @param {Object} extractedData - structured data previously extracted from resume
 * @param {Object} jobData
 * @param {string} jobData.title
 * @param {string} jobData.description
 * @param {string} [jobData.requirements]
 * @param {string} [jobData.minExperience]
 * @param {string} [jobData.preferredEducation]
 * @returns {string}
 */
function getMatchScoringPrompt(extractedData, jobData) {
  const { title, description, requirements, minExperience, preferredEducation } = jobData || {};

  return `You are an AI scoring engine for a university recruitment system. Given the extracted candidate profile and the job requirements, compute a detailed match score.

EXTRACTED CANDIDATE PROFILE
----------------------------
${JSON.stringify(extractedData, null, 2)}

JOB DETAILS
------------
Title               : ${title || 'N/A'}
Min. Experience     : ${minExperience || 'Not specified'}
Preferred Education : ${preferredEducation || 'Not specified'}

Description:
${description || '[No description]'}

Requirements:
${requirements || '[No requirements]'}

SCORING RUBRIC
--------------
Score each dimension on a 0-100 scale using the following weights:
  - Skills Match          (30%): How well do the candidate's technical and domain skills align?
  - Experience Relevance  (25%): Years and relevance of work experience to the role.
  - Education Fit         (20%): Degree level, field relevance, institution quality.
  - Publications/Research (15%): Quantity and relevance of academic output (if applicable).
  - Overall Impression    (10%): Communication quality, career trajectory, unique value.

INSTRUCTIONS
------------
1. Score each dimension independently.
2. Compute a weighted overall score.
3. Provide brief justification for each dimension score.
4. Return ONLY valid JSON (no markdown fences).

REQUIRED OUTPUT SCHEMA
----------------------
{
  "overallScore": <number 0-100, 1 decimal>,
  "breakdown": {
    "skillsMatch": {
      "score": <number>,
      "weight": 30,
      "justification": "<string>"
    },
    "experienceRelevance": {
      "score": <number>,
      "weight": 25,
      "justification": "<string>"
    },
    "educationFit": {
      "score": <number>,
      "weight": 20,
      "justification": "<string>"
    },
    "publicationsResearch": {
      "score": <number>,
      "weight": 15,
      "justification": "<string>"
    },
    "overallImpression": {
      "score": <number>,
      "weight": 10,
      "justification": "<string>"
    }
  },
  "recommendation": "<string: 'Highly Recommended' | 'Recommended' | 'Maybe' | 'Not Recommended'>",
  "keyStrengths": ["<string>", ...],
  "keyWeaknesses": ["<string>", ...],
  "summary": "<string - concise 2-3 sentence scoring rationale>"
}`;
}

/**
 * Build a prompt that generates interview questions tailored to the
 * job and candidate profile.
 *
 * @param {Object} jobData
 * @param {string} jobData.title
 * @param {string} jobData.description
 * @param {string} [jobData.requirements]
 * @param {Object} candidateData
 * @param {string} candidateData.name
 * @param {string} [candidateData.resumeText]
 * @param {string} [candidateData.skills]
 * @param {string} interviewType - e.g. 'technical', 'behavioral', 'situational', 'mixed'
 * @param {number} count - number of questions to generate (default 10)
 * @returns {string}
 */
function getInterviewQuestionsPrompt(jobData, candidateData, interviewType = 'mixed', count = 10) {
  const { title, description, requirements } = jobData || {};
  const { name, resumeText, skills } = candidateData || {};

  return `You are an expert interview designer for a university HR department. Generate ${count} high-quality interview questions for the following scenario.

JOB DETAILS
------------
Title: ${title || 'N/A'}

Description:
${description || '[No description]'}

Requirements:
${requirements || '[No requirements]'}

CANDIDATE PROFILE
-----------------
Name  : ${name || 'Unknown'}
Skills: ${skills || 'See resume'}

Resume excerpt:
${resumeText ? resumeText.substring(0, 2000) : '[No resume text provided]'}

INTERVIEW TYPE: ${interviewType.toUpperCase()}

INSTRUCTIONS
------------
1. Generate exactly ${count} questions appropriate for the "${interviewType}" interview type:
   - "technical": Focus on domain knowledge, problem-solving, technical skills relevant to the role.
   - "behavioral": Use the STAR method format. Focus on past experiences demonstrating competencies.
   - "situational": Present hypothetical scenarios related to the role and ask how the candidate would respond.
   - "mixed": A balanced combination of technical, behavioral, and situational questions.
2. Tailor questions to the specific job requirements AND the candidate's background (probe strengths and potential gaps).
3. Order questions from ice-breaker / easier to more challenging.
4. For each question, provide evaluation guidance.
5. Return ONLY valid JSON (no markdown fences).

REQUIRED OUTPUT SCHEMA
----------------------
{
  "questions": [
    {
      "id": <number starting from 1>,
      "type": "<string: 'technical' | 'behavioral' | 'situational' | 'general'>",
      "difficulty": "<string: 'easy' | 'medium' | 'hard'>",
      "question": "<string - the full interview question>",
      "purpose": "<string - what competency or trait this question evaluates>",
      "evaluationCriteria": [
        "<string - what a strong answer should include>",
        "<string>",
        "<string>"
      ],
      "followUp": "<string - a follow-up question if the initial answer is vague>",
      "maxScore": 10
    }
  ]
}`;
}

/**
 * Build a prompt that evaluates a candidate's answer to an interview question.
 *
 * @param {Object} question
 * @param {string} question.question           - The interview question text
 * @param {string} question.purpose            - What the question evaluates
 * @param {string[]} [question.evaluationCriteria]
 * @param {number} [question.maxScore]
 * @param {string} answer - The candidate's answer text
 * @param {Object} jobData
 * @param {string} jobData.title
 * @param {string} [jobData.description]
 * @returns {string}
 */
function getAnswerEvaluationPrompt(question, answer, jobData) {
  const { title, description } = jobData || {};
  const qText = typeof question === 'string' ? question : question?.question || '';
  const purpose = question?.purpose || 'General assessment';
  const criteria = question?.evaluationCriteria || [];
  const maxScore = question?.maxScore || 10;

  return `You are a rigorous but fair interview evaluator for a university recruitment process. Evaluate the candidate's answer below.

JOB CONTEXT
-----------
Title: ${title || 'N/A'}
${description ? `Description: ${description.substring(0, 500)}` : ''}

INTERVIEW QUESTION
------------------
${qText}

PURPOSE: ${purpose}

EVALUATION CRITERIA:
${criteria.length > 0 ? criteria.map((c, i) => `  ${i + 1}. ${c}`).join('\n') : '  (No specific criteria provided - use your professional judgement)'}

CANDIDATE'S ANSWER
-------------------
${answer || '[No answer provided]'}

INSTRUCTIONS
------------
1. Assess the answer against the stated purpose and evaluation criteria.
2. Consider: relevance, depth, specificity, use of examples, communication clarity, and domain accuracy.
3. Be objective - penalise vague or generic answers; reward concrete, evidence-based responses.
4. Score on a 0-${maxScore} scale where:
   - ${maxScore}: Exceptional - exceeds expectations with insightful, well-structured response
   - ${Math.round(maxScore * 0.7)}-${maxScore - 1}: Strong - addresses all criteria with good examples
   - ${Math.round(maxScore * 0.5)}-${Math.round(maxScore * 0.7) - 1}: Adequate - covers basics but lacks depth or specificity
   - ${Math.round(maxScore * 0.3)}-${Math.round(maxScore * 0.5) - 1}: Weak - misses key points or is too generic
   - 0-${Math.round(maxScore * 0.3) - 1}: Poor - irrelevant, incoherent, or no meaningful content
5. Return ONLY valid JSON (no markdown fences).

REQUIRED OUTPUT SCHEMA
----------------------
{
  "score": <number 0-${maxScore}>,
  "maxScore": ${maxScore},
  "percentage": <number 0-100>,
  "rating": "<string: 'Exceptional' | 'Strong' | 'Adequate' | 'Weak' | 'Poor'>",
  "criteriaAssessment": [
    {
      "criterion": "<string>",
      "met": <boolean>,
      "comment": "<string>"
    }
  ],
  "strengths": ["<string>", ...],
  "weaknesses": ["<string>", ...],
  "feedback": "<string - 2-3 sentence constructive feedback for internal HR use>",
  "flags": ["<string - any red flags or notable observations, if any>"]
}`;
}

/**
 * Build a prompt that generates an overall interview summary and
 * hiring recommendation from all questions and evaluated answers.
 *
 * @param {Object} interview
 * @param {string} interview.candidateName
 * @param {string} interview.jobTitle
 * @param {string} interview.interviewType
 * @param {string} [interview.date]
 * @param {string} [interview.interviewer]
 * @param {Object[]} answers - array of { question, answer, score, maxScore, feedback }
 * @returns {string}
 */
function getInterviewSummaryPrompt(interview, answers) {
  const {
    candidateName,
    jobTitle,
    interviewType,
    date,
    interviewer,
  } = interview || {};

  const answersBlock = (answers || [])
    .map((a, i) => {
      return `Q${i + 1}: ${a.question || 'N/A'}
Answer: ${a.answer || '[No answer]'}
Score: ${a.score ?? 'N/A'}/${a.maxScore ?? 10}
Evaluator Feedback: ${a.feedback || 'N/A'}`;
    })
    .join('\n\n');

  const totalScore = (answers || []).reduce((sum, a) => sum + (a.score || 0), 0);
  const totalMax = (answers || []).reduce((sum, a) => sum + (a.maxScore || 10), 0);

  return `You are a senior HR advisor generating a comprehensive interview summary report for the hiring committee.

INTERVIEW DETAILS
-----------------
Candidate   : ${candidateName || 'Unknown'}
Position    : ${jobTitle || 'N/A'}
Type        : ${interviewType || 'N/A'}
Date        : ${date || 'N/A'}
Interviewer : ${interviewer || 'N/A'}
Aggregate   : ${totalScore}/${totalMax} (${totalMax > 0 ? ((totalScore / totalMax) * 100).toFixed(1) : 0}%)

QUESTIONS & ANSWERS
-------------------
${answersBlock || '[No answers recorded]'}

INSTRUCTIONS
------------
1. Analyse all questions, answers, and per-question evaluations holistically.
2. Identify patterns in the candidate's strengths and weaknesses across all answers.
3. Assess overall communication ability, technical depth, problem-solving, and cultural fit.
4. Provide a clear hiring recommendation with justification.
5. Flag any concerns that the hiring committee should discuss.
6. Return ONLY valid JSON (no markdown fences).

REQUIRED OUTPUT SCHEMA
----------------------
{
  "candidateName": "<string>",
  "position": "<string>",
  "interviewDate": "<string>",
  "overallScore": <number 0-100>,
  "totalQuestions": <number>,
  "averageScore": <number - average percentage across all questions>,
  "performanceSummary": "<string - 4-5 sentence executive summary of performance>",
  "strengthAreas": [
    {
      "area": "<string>",
      "evidence": "<string - specific reference to answers>"
    }
  ],
  "improvementAreas": [
    {
      "area": "<string>",
      "evidence": "<string>",
      "severity": "<string: 'Minor' | 'Moderate' | 'Significant'>"
    }
  ],
  "competencyRatings": {
    "technicalKnowledge": <number 1-5>,
    "problemSolving": <number 1-5>,
    "communication": <number 1-5>,
    "teamwork": <number 1-5>,
    "leadership": <number 1-5>,
    "adaptability": <number 1-5>,
    "domainExpertise": <number 1-5>
  },
  "culturalFitAssessment": "<string - 2-3 sentence assessment>",
  "redFlags": ["<string - any concerns, empty array if none>"],
  "recommendation": "<string: 'Strong Hire' | 'Hire' | 'Lean Hire' | 'Lean No Hire' | 'No Hire'>",
  "recommendationJustification": "<string - 3-4 sentence justification>",
  "suggestedNextSteps": ["<string>", ...],
  "additionalNotes": "<string | null>"
}`;
}

module.exports = {
  getResumeExtractionPrompt,
  getJDMatchPrompt,
  getMatchScoringPrompt,
  getInterviewQuestionsPrompt,
  getAnswerEvaluationPrompt,
  getInterviewSummaryPrompt,
};
