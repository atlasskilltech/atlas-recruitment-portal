function isCandidateAuthenticated(req, res, next) {
  if (req.session && req.session.candidate) {
    return next();
  }
  req.session.candidateReturnTo = req.originalUrl;
  req.flash('error', 'Please log in to access the candidate portal.');
  return res.redirect('/candidate/login');
}

function isCandidateGuest(req, res, next) {
  if (req.session && req.session.candidate) {
    return res.redirect('/candidate/dashboard');
  }
  return next();
}

function attachCandidate(req, res, next) {
  res.locals.candidate = req.session && req.session.candidate ? req.session.candidate : null;
  res.locals.currentPath = req.originalUrl.split('?')[0];
  return next();
}

module.exports = { isCandidateAuthenticated, isCandidateGuest, attachCandidate };
