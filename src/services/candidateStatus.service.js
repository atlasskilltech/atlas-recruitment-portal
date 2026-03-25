// Centralized candidate-friendly status mapping
const STAGES = [
  { key: 'applied', label: 'Application Submitted', icon: 'file-text' },
  { key: 'under_review', label: 'Under Review', icon: 'search' },
  { key: 'ai_screening', label: 'AI Screening', icon: 'brain' },
  { key: 'ai_interview', label: 'AI Interview', icon: 'message-square' },
  { key: 'hr_review', label: 'HR Review', icon: 'user-check' },
  { key: 'interview_scheduled', label: 'Interview Scheduled', icon: 'calendar' },
  { key: 'decision', label: 'Final Decision', icon: 'award' },
];

function mapToStage(application, screening, interview, shortlist, schedule) {
  const status = String(application.appln_status_new || application.appln_status || 'new').toLowerCase();
  const aiStatus = screening ? String(screening.ai_status || '').toLowerCase() : null;
  const intStatus = interview ? String(interview.status || '').toLowerCase() : null;
  const hrStatus = shortlist ? String(shortlist.hr_status || '').toLowerCase() : null;

  let currentStageIndex = 0;
  let isRejected = false;
  let rejectedAt = null;

  if (['hired', 'selected', 'offer_released'].includes(status) || ['hired', 'selected', 'offer_released'].includes(hrStatus)) {
    currentStageIndex = 6;
  } else if (schedule || status === 'scheduled' || hrStatus === 'scheduled') {
    currentStageIndex = 5;
  } else if (hrStatus === 'shortlisted' || hrStatus === 'new') {
    currentStageIndex = 4;
  } else if (['submitted', 'evaluated', 'passed', 'failed'].includes(intStatus)) {
    currentStageIndex = 3;
    if (intStatus === 'failed') { isRejected = true; rejectedAt = 'ai_interview'; }
  } else if (['invited', 'in_progress', 'pending'].includes(intStatus)) {
    currentStageIndex = 3;
  } else if (aiStatus === 'eligible') {
    currentStageIndex = 2;
  } else if (aiStatus === 'rejected') {
    currentStageIndex = 2; isRejected = true; rejectedAt = 'ai_screening';
  } else if (aiStatus === 'hold') {
    currentStageIndex = 2;
  } else if (screening) {
    currentStageIndex = 2;
  } else if (status !== 'new') {
    currentStageIndex = 1;
  }

  if (['rejected'].includes(status) || ['rejected'].includes(hrStatus)) {
    isRejected = true; rejectedAt = 'decision';
  }

  return {
    stages: STAGES,
    currentStageIndex,
    isRejected,
    rejectedAt,
    friendlyStatus: getFriendlyStatus(status, aiStatus, intStatus, hrStatus),
  };
}

function getFriendlyStatus(status, aiStatus, intStatus, hrStatus) {
  if (['hired'].includes(status) || ['hired'].includes(hrStatus)) return 'Selected';
  if (['selected', 'offer_released'].includes(status) || ['selected', 'offer_released'].includes(hrStatus)) return 'Offer Stage';
  if (['rejected'].includes(status) || ['rejected'].includes(hrStatus)) return 'Not Selected';
  if (intStatus === 'failed') return 'Not Selected';
  if (['scheduled'].includes(status) || ['scheduled'].includes(hrStatus)) return 'Interview Scheduled';
  if (['shortlisted'].includes(hrStatus)) return 'Shortlisted';
  if (['passed'].includes(intStatus)) return 'Interview Passed';
  if (['evaluated', 'submitted'].includes(intStatus)) return 'Interview Under Review';
  if (['in_progress'].includes(intStatus)) return 'Interview In Progress';
  if (['invited', 'pending'].includes(intStatus)) return 'Interview Pending';
  if (aiStatus === 'eligible') return 'AI Screening Passed';
  if (aiStatus === 'hold') return 'Under Review';
  if (aiStatus === 'rejected') return 'Not Selected';
  return 'Application Received';
}

module.exports = { STAGES, mapToStage, getFriendlyStatus };
