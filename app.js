require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const ejsLayouts = require('express-ejs-layouts');
const helmet = require('helmet');

const app = express();

// ─── Configuration ───────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

// ─── Security Headers ───────────────────────────────────────────
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

// ─── Body Parsing ────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Static Files ────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── View Engine ─────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(ejsLayouts);
app.set('layout', 'layouts/main');

// ─── Session ─────────────────────────────────────────────────────
app.use(session({
    secret: process.env.SESSION_SECRET || 'qr_exam_default_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// ─── Flash Messages ─────────────────────────────────────────────
app.use(flash());

// ─── Global Variables ────────────────────────────────────────────
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.session.user || null;
    res.locals.appName = process.env.APP_NAME || 'QR Exam Attendance System';
    res.locals.currentPath = req.path;
    next();
});

// ─── Routes ──────────────────────────────────────────────────────
const homeRoutes = require('./routes/home');
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/student');
const lecturerRoutes = require('./routes/lecturer');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');

app.use('/', homeRoutes);
app.use('/auth', authRoutes);
app.use('/student', studentRoutes);
app.use('/lecturer', lecturerRoutes);
app.use('/admin', adminRoutes);
app.use('/api', apiRoutes);

// ─── Error Handling ──────────────────────────────────────────────
// 404
app.use((req, res) => {
    res.status(404).render('errors/404', {
        layout: 'layouts/main',
        title: 'Page Not Found'
    });
});

// 500
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('errors/500', {
        layout: 'layouts/main',
        title: 'Server Error'
    });
});

// ─── Start Server ────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`
    ╔══════════════════════════════════════════════════════════╗
    ║   QR Code Exam Attendance Management System             ║
    ║   Server running on http://localhost:${PORT}               ║
    ║   Environment: ${process.env.NODE_ENV || 'development'}                              ║
    ╚══════════════════════════════════════════════════════════╝
    `);
});

module.exports = app;
