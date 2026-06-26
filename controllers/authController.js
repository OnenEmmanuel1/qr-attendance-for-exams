const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const Student = require('../models/Student');
const Lecturer = require('../models/Lecturer');
const Admin = require('../models/Admin');

exports.getLogin = (req, res) => {
    res.render('auth/login', {
        title: 'Login',
        layout: 'layouts/main'
    });
};

exports.postLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        let user;
        if (email.includes('@')) {
            user = await User.findByEmail(email);
        } else {
            user = await User.findByMatricNumber(email);
        }

        if (!user) {
            req.flash('error_msg', 'Invalid credentials');
            return res.render('auth/login', {
                title: 'Login',
                email
            });
        }

        if (!user.is_active) {
            req.flash('error_msg', 'Your account has been deactivated. Contact Admin.');
            return res.redirect('/auth/login');
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            req.flash('error_msg', 'Invalid credentials');
            return res.render('auth/login', {
                title: 'Login',
                email
            });
        }

        // Determine specific user profile data
        let profile = null;
        if (user.role === 'student') {
            profile = await Student.findByUserId(user.id);
        } else if (user.role === 'lecturer') {
            profile = await Lecturer.findByUserId(user.id);
        } else if (user.role === 'admin') {
            profile = await Admin.findByUserId(user.id);
        }

        // Store user in session
        req.session.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            profileId: profile ? profile.id : null,
            first_name: profile ? profile.first_name : 'User',
            last_name: profile ? profile.last_name : '',
            passport_url: profile ? profile.passport_url : null
        };

        await User.updateLastLogin(user.id);

        req.flash('success_msg', `Welcome back, ${profile ? profile.first_name : 'User'}!`);
        res.redirect(`/${user.role}/dashboard`);
    } catch (err) {
        console.error('Login error:', err);
        req.flash('error_msg', 'An error occurred during login. Please try again.');
        res.redirect('/auth/login');
    }
};

exports.getRegister = (req, res) => {
    res.render('auth/register', {
        title: 'Register',
        layout: 'layouts/main'
    });
};

exports.postRegister = async (req, res) => {
    try {
        const { first_name, last_name, email, password, role, matric_number } = req.body;
        
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            req.flash('error_msg', 'Email is already registered');
            return res.render('auth/register', {
                title: 'Register',
                first_name,
                last_name,
                email,
                matric_number
            });
        }

        // Validate unique matric number for student
        if (role === 'student' && matric_number) {
            const existingMatric = await Student.findByMatric(matric_number);
            if (existingMatric) {
                req.flash('error_msg', 'Matric number is already registered');
                return res.render('auth/register', {
                    title: 'Register',
                    first_name,
                    last_name,
                    email,
                    matric_number
                });
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const userId = await User.create({
            email,
            password: hashedPassword,
            role
        });

        if (role === 'student') {
            await Student.create({
                user_id: userId,
                first_name,
                last_name,
                matric_number
            });
        } else if (role === 'lecturer') {
            await Lecturer.create({
                user_id: userId,
                first_name,
                last_name
            });
        } else if (role === 'admin') {
            await Admin.create({
                user_id: userId,
                first_name,
                last_name
            });
        }

        req.flash('success_msg', 'Registration successful! You can now log in.');
        res.redirect('/auth/login');
    } catch (err) {
        console.error('Registration error:', err);
        req.flash('error_msg', 'An error occurred during registration.');
        res.redirect('/auth/register');
    }
};

exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/auth/login');
    });
};

exports.getForgotPassword = (req, res) => {
    res.render('auth/forgot-password', {
        title: 'Forgot Password',
        layout: 'layouts/main'
    });
};

exports.postForgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findByEmail(email);
        
        if (!user) {
            req.flash('error_msg', 'No account with that email address exists.');
            return res.redirect('/auth/forgot-password');
        }

        const token = crypto.randomBytes(20).toString('hex');
        const expires = new Date(Date.now() + 3600000); // 1 hour

        await User.setResetToken(user.id, token, expires);

        // Flash reset link for easy local testing
        const resetUrl = `${req.protocol}://${req.get('host')}/auth/reset-password?token=${token}`;
        console.log(`Password reset link: ${resetUrl}`);
        
        req.flash('success_msg', `An email has been sent. For testing, click here: ${resetUrl}`);
        res.redirect('/auth/forgot-password');
    } catch (err) {
        console.error('Forgot password error:', err);
        req.flash('error_msg', 'An error occurred.');
        res.redirect('/auth/forgot-password');
    }
};

exports.getResetPassword = async (req, res) => {
    try {
        const token = req.query.token;
        if (!token) {
            req.flash('error_msg', 'Token is missing.');
            return res.redirect('/auth/login');
        }

        const user = await User.findByResetToken(token);
        if (!user) {
            req.flash('error_msg', 'Password reset token is invalid or has expired.');
            return res.redirect('/auth/forgot-password');
        }

        res.render('auth/reset-password', {
            title: 'Reset Password',
            layout: 'layouts/main',
            token
        });
    } catch (err) {
        console.error('Get reset password error:', err);
        res.redirect('/auth/login');
    }
};

exports.postResetPassword = async (req, res) => {
    try {
        const { token, password, confirm_password } = req.body;
        
        if (password !== confirm_password) {
            req.flash('error_msg', 'Passwords do not match.');
            return res.redirect(`/auth/reset-password?token=${token}`);
        }

        const user = await User.findByResetToken(token);
        if (!user) {
            req.flash('error_msg', 'Password reset token is invalid or has expired.');
            return res.redirect('/auth/forgot-password');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await User.updatePassword(user.id, hashedPassword);
        await User.clearResetToken(user.id);

        req.flash('success_msg', 'Password has been reset successfully. You can now log in.');
        res.redirect('/auth/login');
    } catch (err) {
        console.error('Post reset password error:', err);
        req.flash('error_msg', 'An error occurred during password reset.');
        res.redirect('/auth/login');
    }
};
