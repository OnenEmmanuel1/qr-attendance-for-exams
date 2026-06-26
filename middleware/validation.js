const { body, validationResult } = require('express-validator');

const handleValidation = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('error_msg', errors.array().map(e => e.msg).join(', '));
        return res.redirect('back');
    }
    next();
};

const registerValidation = [
    body('first_name').trim().notEmpty().withMessage('First name is required'),
    body('last_name').trim().notEmpty().withMessage('Last name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('matric_number').trim().notEmpty().withMessage('Matric number is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('confirm_password').custom((value, { req }) => {
        if (value !== req.body.password) throw new Error('Passwords do not match');
        return true;
    }),
    body('role').isIn(['student', 'lecturer', 'admin']).withMessage('Invalid role'),
    handleValidation
];

const loginValidation = [
    body('email').trim().notEmpty().withMessage('Email address or matric number is required'),
    body('password').notEmpty().withMessage('Password is required'),
    handleValidation
];

const examValidation = [
    body('course_id').notEmpty().withMessage('Course is required'),
    body('exam_date').isDate().withMessage('Valid exam date is required'),
    body('start_time').notEmpty().withMessage('Start time is required'),
    body('end_time').notEmpty().withMessage('End time is required'),
    body('venue').notEmpty().withMessage('Venue is required'),
    body('semester').isIn(['first', 'second']).withMessage('Invalid semester'),
    body('academic_year').notEmpty().withMessage('Academic year is required'),
    handleValidation
];

module.exports = { registerValidation, loginValidation, examValidation, handleValidation };
