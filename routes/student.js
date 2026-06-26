const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const upload = require('../config/multer');
const { isStudent } = require('../middleware/auth');

router.use(isStudent); // Apply student guard to all routes in this router

router.get('/dashboard', studentController.getDashboard);
router.get('/profile', studentController.getProfile);
router.post('/profile', upload.single('passport'), studentController.postProfile);
router.post('/change-password', studentController.postChangePassword);
router.get('/qrcode', studentController.getQRCode);
router.get('/attendance', studentController.getAttendance);

module.exports = router;
