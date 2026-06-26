const express = require('express');
const router = express.Router();
const lecturerController = require('../controllers/lecturerController');
const upload = require('../config/multer');
const { isLecturer } = require('../middleware/auth');

router.use(isLecturer); // Apply lecturer guard to all routes in this router

router.get('/dashboard', lecturerController.getDashboard);
router.get('/profile', lecturerController.getProfile);
router.post('/profile', upload.single('passport'), lecturerController.postProfile);
router.post('/change-password', lecturerController.postChangePassword);
router.get('/scanner', lecturerController.getScanner);
router.get('/attendance', lecturerController.getAttendance);
router.get('/reports', lecturerController.getReports);
router.get('/reports/export/pdf', lecturerController.exportPDF);
router.get('/reports/export/excel', lecturerController.exportExcel);

// Students Management (Lecturer)
router.get('/students', lecturerController.getStudents);
router.post('/students', upload.single('passport'), lecturerController.postStudent);
router.post('/students/edit/:id', upload.single('passport'), lecturerController.postEditStudent);
router.post('/students/delete/:id', lecturerController.postDeleteStudent);
router.post('/students/generate-qr/:id', lecturerController.postGenerateStudentQR);

// Examinations Management (Lecturer)
router.get('/examinations', lecturerController.getExaminations);
router.post('/examinations', lecturerController.postExamination);
router.post('/examinations/edit/:id', lecturerController.postEditExamination);
router.post('/examinations/cancel/:id', lecturerController.postCancelExamination);
router.post('/examinations/generate-qr/:id', lecturerController.postGenerateExamQR);

module.exports = router;
