const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');
const { isAuthenticated } = require('../middleware/auth');

router.use(isAuthenticated); // Protect all API endpoints

// Notifications
router.get('/notifications/count', apiController.getUnreadCount);
router.get('/notifications', apiController.getNotifications);
router.post('/notifications/mark-read', apiController.markRead);

// QR Scanning
router.post('/scan/validate', apiController.validateScan);
router.post('/scan/approve', apiController.approveScan);
router.post('/scan/reject', apiController.rejectScan);
router.post('/scan/manual', apiController.manualLookup);

// Details (Admin Edit Modals)
router.get('/students/:id', apiController.getStudentDetails);
router.get('/lecturers/:id', apiController.getLecturerDetails);
router.get('/examinations/:id', apiController.getExaminationDetails);
// Chart Stats
router.get('/stats/attendance', apiController.getAttendanceStats);

module.exports = router;
