// ─── Authentication Middleware ───────────────────────────────

const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) return next();
    req.flash('error_msg', 'Please login to access this page');
    res.redirect('/auth/login');
};

const isNotAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        return res.redirect(`/${req.session.user.role}/dashboard`);
    }
    next();
};

const isStudent = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'student') return next();
    req.flash('error_msg', 'Access denied');
    res.redirect('/auth/login');
};

const isLecturer = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'lecturer') return next();
    req.flash('error_msg', 'Access denied');
    res.redirect('/auth/login');
};

const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') return next();
    req.flash('error_msg', 'Access denied');
    res.redirect('/auth/login');
};

module.exports = { isAuthenticated, isNotAuthenticated, isStudent, isLecturer, isAdmin };
