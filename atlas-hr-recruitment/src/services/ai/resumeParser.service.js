const logger = require('../../utils/logger');

/**
 * Resume Parser Service -- extracts structured data from candidate database fields.
 * Works entirely from the candidate record columns (no file parsing).
 */
class ResumeParserService {
  /**
   * Parse a candidate record into a structured profile object.
   * @param {object} candidate - raw candidate row from dice_staff_recruitment
   * @returns {object} structured candidate data
   */
  parseCandidate(candidate) {
    if (!candidate) return null;

    return {
      personal: {
        name: candidate.appln_full_name || null,
        email: candidate.appln_email || null,
        phone: candidate.appln_mobile_no || null,
        dob: candidate.appln_dob || null,
        gender: candidate.appln_gender || null,
        nationality: candidate.appln_nationality || null,
        address: candidate.appln_address || null,
      },
      currentRole: {
        organisation: candidate.appln_current_organisation || null,
        designation: candidate.appln_current_designation || null,
        totalExperience: this._parseNumber(candidate.appln_total_experience),
      },
      skills: this.extractSkills(candidate),
      education: this.extractEducation(candidate),
      experience: this.extractExperience(candidate),
      research: this.extractResearchProfile(candidate),
      specialization: candidate.appln_specialization || null,
      highestQualification: candidate.appln_high_qualification || null,
    };
  }

  /**
   * Infer skills from specialization, qualification, and experience fields.
   * @param {object} candidate
   * @returns {object} { technical: string[], domain: string[], inferred: string[] }
   */
  extractSkills(candidate) {
    if (!candidate) return { technical: [], domain: [], inferred: [] };

    const technical = [];
    const domain = [];
    const inferred = [];

    // Extract from specialization
    const spec = (candidate.appln_specialization || '').toLowerCase();
    if (spec) {
      const specKeywords = spec.split(/[,;\/&]+/).map((s) => s.trim()).filter(Boolean);
      domain.push(...specKeywords);
    }

    // Infer from qualification
    const qual = (candidate.appln_high_qualification || '').toLowerCase();
    if (qual.includes('phd') || qual.includes('doctorate')) {
      inferred.push('Advanced Research', 'Academic Writing', 'Data Analysis');
    } else if (qual.includes('m.tech') || qual.includes('mtech') || qual.includes('me ') || qual.includes('m.e.')) {
      inferred.push('Engineering', 'Technical Analysis');
    } else if (qual.includes('mba') || qual.includes('management')) {
      inferred.push('Management', 'Strategic Planning', 'Business Analysis');
    } else if (qual.includes('mca') || qual.includes('computer')) {
      inferred.push('Software Development', 'Programming');
    }

    // Infer from current designation
    const designation = (candidate.appln_current_designation || '').toLowerCase();
    if (designation.includes('professor') || designation.includes('lecturer')) {
      inferred.push('Teaching', 'Curriculum Development', 'Student Mentoring');
    }
    if (designation.includes('hod') || designation.includes('head') || designation.includes('dean')) {
      inferred.push('Leadership', 'Department Management', 'Academic Administration');
    }
    if (designation.includes('engineer') || designation.includes('developer')) {
      inferred.push('Technical Problem Solving');
    }
    if (designation.includes('research')) {
      inferred.push('Research Methodology', 'Grant Writing');
    }

    // Infer from experience years
    const experience = this._parseNumber(candidate.appln_total_experience);
    if (experience >= 10) {
      inferred.push('Senior Leadership');
    } else if (experience >= 5) {
      inferred.push('Team Collaboration');
    }

    return {
      technical: [...new Set(technical)],
      domain: [...new Set(domain)],
      inferred: [...new Set(inferred)],
    };
  }

  /**
   * Extract a structured education timeline from PhD, PG, UG, HSC, SSC fields.
   * @param {object} candidate
   * @returns {Array<{ level: string, degree: string, field: string, institution: string, year: number|null, percentage: string|null }>}
   */
  extractEducation(candidate) {
    if (!candidate) return [];

    const education = [];

    // PhD
    if (candidate.appln_phd_degree || candidate.appln_phd_university) {
      education.push({
        level: 'PhD',
        degree: candidate.appln_phd_degree || 'PhD',
        field: candidate.appln_phd_specialization || candidate.appln_specialization || '',
        institution: candidate.appln_phd_university || '',
        year: this._parseYear(candidate.appln_phd_year),
        percentage: candidate.appln_phd_percentage || null,
      });
    }

    // Post-Graduation
    if (candidate.appln_pg_degree || candidate.appln_pg_university) {
      education.push({
        level: 'Post-Graduation',
        degree: candidate.appln_pg_degree || 'PG',
        field: candidate.appln_pg_specialization || '',
        institution: candidate.appln_pg_university || '',
        year: this._parseYear(candidate.appln_pg_year),
        percentage: candidate.appln_pg_percentage || null,
      });
    }

    // Under-Graduation
    if (candidate.appln_ug_degree || candidate.appln_ug_university) {
      education.push({
        level: 'Under-Graduation',
        degree: candidate.appln_ug_degree || 'UG',
        field: candidate.appln_ug_specialization || '',
        institution: candidate.appln_ug_university || '',
        year: this._parseYear(candidate.appln_ug_year),
        percentage: candidate.appln_ug_percentage || null,
      });
    }

    // HSC / 12th
    if (candidate.appln_hsc_board || candidate.appln_hsc_school) {
      education.push({
        level: 'HSC / 12th',
        degree: 'HSC',
        field: candidate.appln_hsc_stream || '',
        institution: candidate.appln_hsc_school || candidate.appln_hsc_board || '',
        year: this._parseYear(candidate.appln_hsc_year),
        percentage: candidate.appln_hsc_percentage || null,
      });
    }

    // SSC / 10th
    if (candidate.appln_ssc_board || candidate.appln_ssc_school) {
      education.push({
        level: 'SSC / 10th',
        degree: 'SSC',
        field: '',
        institution: candidate.appln_ssc_school || candidate.appln_ssc_board || '',
        year: this._parseYear(candidate.appln_ssc_year),
        percentage: candidate.appln_ssc_percentage || null,
      });
    }

    return education;
  }

  /**
   * Extract a structured experience list from previous-company fields.
   * @param {object} candidate
   * @returns {Array<{ company: string, designation: string, from: string|null, to: string|null, years: number|null }>}
   */
  extractExperience(candidate) {
    if (!candidate) return [];

    const experience = [];

    // Current position
    if (candidate.appln_current_organisation) {
      experience.push({
        company: candidate.appln_current_organisation,
        designation: candidate.appln_current_designation || '',
        from: candidate.appln_current_from || null,
        to: 'Present',
        years: null,
      });
    }

    // Previous positions (1-5)
    for (let i = 1; i <= 5; i++) {
      const suffix = i === 1 ? '' : String(i);
      const company = candidate[`appln_prev_company${suffix}`] || candidate[`appln_prev_organisation${suffix}`];
      if (company) {
        experience.push({
          company,
          designation: candidate[`appln_prev_designation${suffix}`] || '',
          from: candidate[`appln_prev_from${suffix}`] || null,
          to: candidate[`appln_prev_to${suffix}`] || null,
          years: this._parseNumber(candidate[`appln_prev_experience${suffix}`]),
        });
      }
    }

    return experience;
  }

  /**
   * Extract research profile: journals, books, patents, citations, PhD students.
   * @param {object} candidate
   * @returns {object}
   */
  extractResearchProfile(candidate) {
    if (!candidate) return {};

    return {
      journalPapers: this._parseNumber(candidate.appln_journals) || this._parseNumber(candidate.appln_journal_papers),
      conferencePapers: this._parseNumber(candidate.appln_conference_papers),
      books: this._parseNumber(candidate.appln_books),
      bookChapters: this._parseNumber(candidate.appln_book_chapters),
      patents: this._parseNumber(candidate.appln_patents),
      citations: this._parseNumber(candidate.appln_citations),
      hIndex: this._parseNumber(candidate.appln_h_index),
      i10Index: this._parseNumber(candidate.appln_i10_index),
      impactFactor: this._parseNumber(candidate.appln_impact_factor),
      phdStudentsGuided: this._parseNumber(candidate.appln_phd_students) || this._parseNumber(candidate.appln_phd_guided),
      fundedProjects: this._parseNumber(candidate.appln_funded_projects),
    };
  }

  // --- Private helpers ---

  _parseNumber(value) {
    if (value == null) return 0;
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  }

  _parseYear(value) {
    if (!value) return null;
    const num = parseInt(value, 10);
    return isNaN(num) ? null : num;
  }
}

module.exports = new ResumeParserService();
