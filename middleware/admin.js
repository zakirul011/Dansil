module.exports = function (req, res, next) {
  console.log(req.session.user)
  if (req.session.user && req.session.user.role == 'admin') {
    return next();
  }
  res.redirect('/');
};
