const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const upload = require('../config/multer');
const { isAdmin } = require('../middleware/auth');

router.use(isAdmin); // Protect all routes with isAdmin guard

// Dashboard
router.get('/dashboard', adminController.getDashboard);

// Profile
router.get('/profile', adminController.getProfile);
router.post('/profile', upload.single('passport'), adminController.postProfile);
router.post('/change-password', adminController.postChangePassword);

// Students
router.get('/students', adminController.getStudents);
router.post('/students', upload.single('passport'), adminController.postStudent);
router.post('/students/edit/:id', upload.single('passport'), adminController.postEditStudent);
router.post('/students/delete/:id', adminController.postDeleteStudent);
router.post('/students/generate-qr/:id', adminController.postGenerateStudentQR);

// Lecturers
router.get('/lecturers', adminController.getLecturers);
router.post('/lecturers', upload.single('passport'), adminController.postLecturer);
router.post('/lecturers/edit/:id', upload.single('passport'), adminController.postEditLecturer);
router.post('/lecturers/delete/:id', adminController.postDeleteLecturer);

// Examinations
router.get('/examinations', adminController.getExaminations);
router.post('/examinations', adminController.postExamination);
router.post('/examinations/edit/:id', adminController.postEditExamination);
router.post('/examinations/cancel/:id', adminController.postCancelExamination);
router.post('/examinations/generate-qr/:id', adminController.postGenerateExamQR);

// Attendance Reports
router.get('/attendance-reports', adminController.getAttendanceReports);
router.get('/attendance-reports/export/pdf', adminController.exportPDF);
router.get('/attendance-reports/export/excel', adminController.exportExcel);

// Settings
router.get('/settings', adminController.getSettings);
router.post('/settings/general', adminController.postSettingsGeneral);
router.post('/settings/departments', adminController.postAddDepartment);
router.post('/settings/departments/delete/:id', adminController.postDeleteDepartment);
router.post('/settings/courses', adminController.postAddCourse);
router.post('/settings/courses/delete/:id', adminController.postDeleteCourse);

module.exports = router;
