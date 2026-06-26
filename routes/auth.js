const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { registerValidation, loginValidation } = require('../middleware/validation');
const { isNotAuthenticated, isAuthenticated } = require('../middleware/auth');

router.get('/login', isNotAuthenticated, authController.getLogin);
router.post('/login', isNotAuthenticated, loginValidation, authController.postLogin);

router.get('/register', isNotAuthenticated, authController.getRegister);
router.post('/register', isNotAuthenticated, registerValidation, authController.postRegister);

router.get('/logout', isAuthenticated, authController.logout);

router.get('/forgot-password', authController.getForgotPassword);
router.post('/forgot-password', authController.postForgotPassword);

router.get('/reset-password', authController.getResetPassword);
router.post('/reset-password', authController.postResetPassword);

module.exports = router;
