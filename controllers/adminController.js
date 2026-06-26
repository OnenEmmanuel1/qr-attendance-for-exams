const User = require('../models/User');
const Student = require('../models/Student');
const Lecturer = require('../models/Lecturer');
const Admin = require('../models/Admin');
const Department = require('../models/Department');
const Course = require('../models/Course');
const Examination = require('../models/Examination');
const QRCode = require('../models/QRCode');
const Attendance = require('../models/Attendance');
const AttendanceLog = require('../models/AttendanceLog');
const Notification = require('../models/Notification');
const { generateQRCode, generateExamQRCode } = require('../utils/qrGenerator');
const { generatePDFReport, generateExcelReport } = require('../utils/reportGenerator');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const fs = require('fs');
const path = require('path');

// ─── Dashboard ───────────────────────────────────────────────────
exports.getDashboard = async (req, res) => {
    try {
        const totalStudents = await Student.count();
        const totalLecturers = await Lecturer.count();
        const totalExams = await Examination.count();
        const overallStats = await Attendance.getOverallStats();
        
        const present = overallStats ? (overallStats.present || 0) : 0;
        const total = overallStats ? (overallStats.total || 0) : 0;
        const attendanceRate = total > 0 ? `${Math.round((present / total) * 100)}%` : '0%';

        const [recentActivityRows] = await db.query(`
            SELECT al.*, u.email as user_email
            FROM attendance_logs al
            LEFT JOIN users u ON al.performed_by = u.id
            ORDER BY al.created_at DESC LIMIT 5
        `);

        recentActivityRows.forEach(act => {
            if (act.created_at) act.created_at = new Date(act.created_at).toLocaleString();
        });

        const stats = {
            totalStudents,
            totalLecturers,
            totalExams,
            attendanceRate
        };

        res.render('admin/dashboard', {
            title: 'Admin Dashboard',
            layout_type: 'dashboard',
            pageJS: 'dashboard-charts.js',
            stats,
            recentActivity: recentActivityRows
        });
    } catch (err) {
        console.error('Admin dashboard error:', err);
        req.flash('error_msg', 'Failed to load dashboard');
        res.redirect('/auth/login');
    }
};

// ─── Student Management ──────────────────────────────────────────
exports.getStudents = async (req, res) => {
    try {
        const students = await Student.getAll();
        const departments = await Department.getAll();
        res.render('admin/students', {
            title: 'Student Management',
            layout_type: 'dashboard',
            pageJS: 'admin.js',
            students,
            departments
        });
    } catch (err) {
        console.error('Get students error:', err);
        req.flash('error_msg', 'Failed to load students');
        res.redirect('/admin/dashboard');
    }
};

exports.postStudent = async (req, res) => {
    try {
        const { first_name, last_name, email, password, matric_number, department_id, level, phone } = req.body;
        
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            req.flash('error_msg', 'Email is already registered');
            return res.redirect('/admin/students');
        }

        const existingMatric = await Student.findByMatric(matric_number);
        if (existingMatric) {
            req.flash('error_msg', 'Matric number is already registered');
            return res.redirect('/admin/students');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = await User.create({ email, password: hashedPassword, role: 'student' });
        
        let passport_url = null;
        if (req.file) {
            passport_url = `passports/${req.file.filename}`;
        }

        await Student.create({
            user_id: userId,
            first_name,
            last_name,
            matric_number,
            department_id,
            level,
            phone,
            passport_url
        });

        req.flash('success_msg', 'Student registered successfully');
        res.redirect('/admin/students');
    } catch (err) {
        console.error('Post student error:', err);
        req.flash('error_msg', 'Failed to register student');
        res.redirect('/admin/students');
    }
};

exports.postEditStudent = async (req, res) => {
    try {
        const { id } = req.params;
        const { first_name, last_name, matric_number, department_id, level, phone, is_active } = req.body;
        
        const student = await Student.findById(id);
        if (!student) {
            req.flash('error_msg', 'Student not found');
            return res.redirect('/admin/students');
        }

        const updateData = { first_name, last_name, matric_number, department_id, level, phone };
        if (req.file) {
            if (student.passport_url) {
                const oldPath = path.join(__dirname, '..', 'uploads', 'passports', path.basename(student.passport_url));
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
            updateData.passport_url = `passports/${req.file.filename}`;
        }

        await Student.update(id, updateData);
        
        if (is_active !== undefined) {
            const activeBool = is_active === '1' || is_active === 'true';
            await db.query('UPDATE users SET is_active = ? WHERE id = ?', [activeBool, student.user_id]);
        }

        req.flash('success_msg', 'Student updated successfully');
        res.redirect('/admin/students');
    } catch (err) {
        console.error('Edit student error:', err);
        req.flash('error_msg', 'Failed to update student');
        res.redirect('/admin/students');
    }
};

exports.postDeleteStudent = async (req, res) => {
    try {
        const { id } = req.params;
        await Student.delete(id);
        req.flash('success_msg', 'Student deleted successfully');
        res.redirect('/admin/students');
    } catch (err) {
        console.error('Delete student error:', err);
        req.flash('error_msg', 'Failed to delete student');
        res.redirect('/admin/students');
    }
};

exports.postGenerateStudentQR = async (req, res) => {
    try {
        const { id } = req.params;
        const student = await Student.findById(id);
        if (!student) {
            req.flash('error_msg', 'Student not found');
            return res.redirect('/admin/students');
        }

        if (!student.department_id || !student.level || !student.matric_number) {
            req.flash('error_msg', 'Student must have matric number, department, and level to generate QR codes.');
            return res.redirect('/admin/students');
        }

        // Get upcoming exams for this student
        const [exams] = await db.query(`
            SELECT e.id FROM examinations e
            JOIN courses c ON e.course_id = c.id
            WHERE c.department_id = ? AND c.level = ? AND e.exam_date >= CURDATE() AND e.status = 'scheduled'
        `, [student.department_id, student.level]);

        if (exams.length === 0) {
            req.flash('error_msg', 'No upcoming exams scheduled for this student.');
            return res.redirect('/admin/students');
        }

        let count = 0;
        for (const exam of exams) {
            await generateQRCode(student.id, exam.id, student.matric_number);
            count++;
        }

        req.flash('success_msg', `Generated ${count} QR codes for upcoming exams.`);
        res.redirect('/admin/students');
    } catch (err) {
        console.error('Generate student QR error:', err);
        req.flash('error_msg', 'Failed to generate student QR codes');
        res.redirect('/admin/students');
    }
};

// ─── Lecturer Management ─────────────────────────────────────────
exports.getLecturers = async (req, res) => {
    try {
        const lecturers = await Lecturer.getAll();
        const departments = await Department.getAll();
        res.render('admin/lecturers', {
            title: 'Lecturer Management',
            layout_type: 'dashboard',
            pageJS: 'admin.js',
            lecturers,
            departments
        });
    } catch (err) {
        console.error('Get lecturers error:', err);
        req.flash('error_msg', 'Failed to load lecturers');
        res.redirect('/admin/dashboard');
    }
};

exports.postLecturer = async (req, res) => {
    try {
        const { first_name, last_name, email, password, staff_id, department_id, phone } = req.body;
        
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            req.flash('error_msg', 'Email is already registered');
            return res.redirect('/admin/lecturers');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = await User.create({ email, password: hashedPassword, role: 'lecturer' });
        
        let passport_url = null;
        if (req.file) {
            passport_url = `passports/${req.file.filename}`;
        }

        await Lecturer.create({
            user_id: userId,
            first_name,
            last_name,
            staff_id,
            department_id,
            phone,
            passport_url
        });

        req.flash('success_msg', 'Lecturer registered successfully');
        res.redirect('/admin/lecturers');
    } catch (err) {
        console.error('Post lecturer error:', err);
        req.flash('error_msg', 'Failed to register lecturer');
        res.redirect('/admin/lecturers');
    }
};

exports.postEditLecturer = async (req, res) => {
    try {
        const { id } = req.params;
        const { first_name, last_name, staff_id, department_id, phone, is_active } = req.body;

        const lecturer = await Lecturer.findById(id);
        if (!lecturer) {
            req.flash('error_msg', 'Lecturer not found');
            return res.redirect('/admin/lecturers');
        }

        const updateData = { first_name, last_name, staff_id, department_id, phone };
        if (req.file) {
            if (lecturer.passport_url) {
                const oldPath = path.join(__dirname, '..', 'uploads', 'passports', path.basename(lecturer.passport_url));
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
            updateData.passport_url = `passports/${req.file.filename}`;
        }

        await Lecturer.update(id, updateData);

        if (is_active !== undefined) {
            const activeBool = is_active === '1' || is_active === 'true';
            await db.query('UPDATE users SET is_active = ? WHERE id = ?', [activeBool, lecturer.user_id]);
        }

        req.flash('success_msg', 'Lecturer updated successfully');
        res.redirect('/admin/lecturers');
    } catch (err) {
        console.error('Edit lecturer error:', err);
        req.flash('error_msg', 'Failed to update lecturer');
        res.redirect('/admin/lecturers');
    }
};

exports.postDeleteLecturer = async (req, res) => {
    try {
        const { id } = req.params;
        await Lecturer.delete(id);
        req.flash('success_msg', 'Lecturer deleted successfully');
        res.redirect('/admin/lecturers');
    } catch (err) {
        console.error('Delete lecturer error:', err);
        req.flash('error_msg', 'Failed to delete lecturer');
        res.redirect('/admin/lecturers');
    }
};

// ─── Examination Management ──────────────────────────────────────
exports.getExaminations = async (req, res) => {
    try {
        const examinations = await Examination.getAll();
        const courses = await Course.getAll();
        const lecturers = await Lecturer.getAll();

        examinations.forEach(e => {
            if (e.exam_date) e.exam_date = new Date(e.exam_date).toLocaleDateString();
        });

        res.render('admin/examinations', {
            title: 'Examination Management',
            layout_type: 'dashboard',
            pageJS: 'admin.js',
            examinations,
            courses,
            lecturers
        });
    } catch (err) {
        console.error('Get examinations error:', err);
        req.flash('error_msg', 'Failed to load examinations');
        res.redirect('/admin/dashboard');
    }
};

exports.postExamination = async (req, res) => {
    try {
        const { course_id, lecturer_id, exam_date, start_time, end_time, venue, semester, academic_year } = req.body;
        
        const examId = await Examination.create({
            course_id,
            lecturer_id,
            exam_date,
            start_time,
            end_time,
            venue,
            semester,
            academic_year,
            created_by: req.session.user.id
        });

        // Generate the single Exam QR Code
        await generateExamQRCode(examId);

        req.flash('success_msg', 'Examination created successfully! Exam QR code generated.');
        res.redirect('/admin/examinations');
    } catch (err) {
        console.error('Create exam error:', err);
        req.flash('error_msg', 'Failed to create examination');
        res.redirect('/admin/examinations');
    }
};

exports.postEditExamination = async (req, res) => {
    try {
        const { id } = req.params;
        const { course_id, lecturer_id, exam_date, start_time, end_time, venue, semester, academic_year, status } = req.body;
        
        await Examination.update(id, {
            course_id,
            lecturer_id: lecturer_id || null,
            exam_date,
            start_time,
            end_time,
            venue,
            semester,
            academic_year,
            status
        });

        req.flash('success_msg', 'Examination updated successfully');
        res.redirect('/admin/examinations');
    } catch (err) {
        console.error('Edit exam error:', err);
        req.flash('error_msg', 'Failed to update examination');
        res.redirect('/admin/examinations');
    }
};

exports.postCancelExamination = async (req, res) => {
    try {
        const { id } = req.params;
        await Examination.cancel(id);
        req.flash('success_msg', 'Examination cancelled successfully');
        res.redirect('/admin/examinations');
    } catch (err) {
        console.error('Cancel exam error:', err);
        req.flash('error_msg', 'Failed to cancel examination');
        res.redirect('/admin/examinations');
    }
};

exports.postGenerateExamQR = async (req, res) => {
    try {
        const { id } = req.params;
        const exam = await Examination.findById(id);
        if (!exam) {
            req.flash('error_msg', 'Examination not found');
            return res.redirect('/admin/examinations');
        }

        await generateExamQRCode(exam.id);

        req.flash('success_msg', 'Exam QR code generated successfully.');
        res.redirect('/admin/examinations');
    } catch (err) {
        console.error('Generate exam QR error:', err);
        req.flash('error_msg', 'Failed to generate QR codes');
        res.redirect('/admin/examinations');
    }
};

// ─── Attendance Reports ──────────────────────────────────────────
exports.getAttendanceReports = async (req, res) => {
    try {
        const examinations = await Examination.getAll();
        const departments = await Department.getAll();

        const examId = req.query.examination_id;
        const deptId = req.query.department_id;
        const dateFrom = req.query.date_from;
        const dateTo = req.query.date_to;

        let query = `
            SELECT ar.*, s.first_name, s.last_name, s.matric_number,
            d.name as department_name, c.code as course_code,
            CONCAT(u.first_name, ' ', u.last_name) as scanner_name
            FROM attendance_records ar
            JOIN students s ON ar.student_id = s.id
            LEFT JOIN departments d ON s.department_id = d.id
            JOIN examinations e ON ar.examination_id = e.id
            JOIN courses c ON e.course_id = c.id
            LEFT JOIN users us ON ar.scanned_by = us.id
            LEFT JOIN lecturers u ON us.id = u.user_id
            WHERE 1=1
        `;
        const params = [];

        if (examId) {
            query += ` AND ar.examination_id = ?`;
            params.push(examId);
        }
        if (deptId) {
            query += ` AND s.department_id = ?`;
            params.push(deptId);
        }
        if (dateFrom) {
            query += ` AND DATE(ar.scanned_at) >= ?`;
            params.push(dateFrom);
        }
        if (dateTo) {
            query += ` AND DATE(ar.scanned_at) <= ?`;
            params.push(dateTo);
        }

        query += ` ORDER BY ar.scanned_at DESC`;
        const [records] = await db.query(query, params);

        // Summary details
        let totalStudents = 0;
        let present = 0;
        let absent = 0;

        if (examId) {
            const examInfo = await Examination.findById(examId);
            if (examInfo) {
                const studs = await Student.getByDepartmentAndLevel(examInfo.department_id, examInfo.course_level);
                totalStudents = studs.length;
                present = records.filter(r => r.status === 'present' || r.status === 'late').length;
                absent = totalStudents - present;
            }
        } else {
            totalStudents = await Student.count();
            present = records.filter(r => r.status === 'present' || r.status === 'late').length;
            absent = totalStudents - present;
        }

        const rate = totalStudents > 0 ? `${Math.round((present / totalStudents) * 100)}%` : '0%';

        records.forEach(r => {
            if (r.scanned_at) r.scanned_at = new Date(r.scanned_at).toLocaleString();
        });
        examinations.forEach(e => {
            if (e.exam_date) e.exam_date = new Date(e.exam_date).toLocaleDateString();
        });

        res.render('admin/attendance-reports', {
            title: 'Attendance Reports',
            layout_type: 'dashboard',
            examinations,
            departments,
            records,
            selectedExam: examId,
            reportData: { totalStudents, present, absent, rate }
        });
    } catch (err) {
        console.error('Get reports error:', err);
        req.flash('error_msg', 'Failed to load reports');
        res.redirect('/admin/dashboard');
    }
};

exports.exportPDF = async (req, res) => {
    try {
        const { examination_id } = req.query;
        if (!examination_id) {
            req.flash('error_msg', 'Export requires selecting an examination');
            return res.redirect('/admin/attendance-reports');
        }

        const examInfo = await Examination.findById(examination_id);
        if (!examInfo) {
            req.flash('error_msg', 'Examination not found');
            return res.redirect('/admin/attendance-reports');
        }

        const students = await Student.getByDepartmentAndLevel(examInfo.department_id, examInfo.course_level);
        const attendanceList = await Attendance.findByExam(examination_id);

        const attMap = {};
        attendanceList.forEach(a => { attMap[a.student_id] = a; });

        const reportRecords = students.map(s => {
            const record = attMap[s.id];
            return {
                first_name: s.first_name,
                last_name: s.last_name,
                matric_number: s.matric_number,
                department_name: s.department_name || examInfo.department_name,
                status: record ? record.status : 'absent',
                scanned_at: record ? record.scanned_at : null
            };
        });

        const reportsDir = path.join(__dirname, '..', 'uploads', 'reports');
        if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

        const fileName = `admin_report_${examination_id}_${Date.now()}.pdf`;
        const filePath = path.join(reportsDir, fileName);

        if (examInfo.exam_date) examInfo.exam_date = new Date(examInfo.exam_date).toLocaleDateString();

        await generatePDFReport(reportRecords, examInfo, filePath);
        
        res.download(filePath, `admin_report_${examInfo.course_code}.pdf`, (err) => {
            if (err) console.error(err);
            fs.unlink(filePath, () => {});
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Export PDF failed');
        res.redirect('/admin/attendance-reports');
    }
};

exports.exportExcel = async (req, res) => {
    try {
        const { examination_id } = req.query;
        if (!examination_id) {
            req.flash('error_msg', 'Export requires selecting an examination');
            return res.redirect('/admin/attendance-reports');
        }

        const examInfo = await Examination.findById(examination_id);
        if (!examInfo) {
            req.flash('error_msg', 'Examination not found');
            return res.redirect('/admin/attendance-reports');
        }

        const students = await Student.getByDepartmentAndLevel(examInfo.department_id, examInfo.course_level);
        const attendanceList = await Attendance.findByExam(examination_id);

        const attMap = {};
        attendanceList.forEach(a => { attMap[a.student_id] = a; });

        const reportRecords = students.map(s => {
            const record = attMap[s.id];
            return {
                first_name: s.first_name,
                last_name: s.last_name,
                matric_number: s.matric_number,
                department_name: s.department_name || examInfo.department_name,
                status: record ? record.status : 'absent',
                scanned_at: record ? record.scanned_at : null
            };
        });

        const reportsDir = path.join(__dirname, '..', 'uploads', 'reports');
        if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

        const fileName = `admin_report_${examination_id}_${Date.now()}.xlsx`;
        const filePath = path.join(reportsDir, fileName);

        if (examInfo.exam_date) examInfo.exam_date = new Date(examInfo.exam_date).toLocaleDateString();

        await generateExcelReport(reportRecords, examInfo, filePath);
        
        res.download(filePath, `admin_report_${examInfo.course_code}.xlsx`, (err) => {
            if (err) console.error(err);
            fs.unlink(filePath, () => {});
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Export Excel failed');
        res.redirect('/admin/attendance-reports');
    }
};

// ─── Settings ────────────────────────────────────────────────────
exports.getSettings = async (req, res) => {
    try {
        const departments = await Department.getAll();
        const courses = await Course.getAll();
        res.render('admin/settings', {
            title: 'System Settings',
            layout_type: 'dashboard',
            pageJS: 'admin.js',
            departments,
            courses
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Failed to load settings');
        res.redirect('/admin/dashboard');
    }
};

exports.postSettingsGeneral = async (req, res) => {
    try {
        const { app_name, qr_expiry } = req.body;
        // In a database settings table we would save these. 
        // Here we will update process.env.APP_NAME and process.env.QR_EXPIRY_HOURS for runtime persistence
        process.env.APP_NAME = app_name;
        process.env.QR_EXPIRY_HOURS = qr_expiry;

        req.flash('success_msg', 'General settings updated successfully');
        res.redirect('/admin/settings');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Failed to update settings');
        res.redirect('/admin/settings');
    }
};

exports.postAddDepartment = async (req, res) => {
    try {
        const { name, code } = req.body;
        await Department.create({ name, code });
        req.flash('success_msg', 'Department added successfully');
        res.redirect('/admin/settings#departments');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Failed to add department');
        res.redirect('/admin/settings#departments');
    }
};

exports.postDeleteDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        await Department.delete(id);
        req.flash('success_msg', 'Department deleted successfully');
        res.redirect('/admin/settings#departments');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Failed to delete department. Verify it is not in use.');
        res.redirect('/admin/settings#departments');
    }
};

exports.postAddCourse = async (req, res) => {
    try {
        const { code, title, department_id, credit_units, level } = req.body;
        await Course.create({ code, title, department_id, credit_units, level });
        req.flash('success_msg', 'Course added successfully');
        res.redirect('/admin/settings#courses');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Failed to add course');
        res.redirect('/admin/settings#courses');
    }
};

exports.postDeleteCourse = async (req, res) => {
    try {
        const { id } = req.params;
        await Course.delete(id);
        req.flash('success_msg', 'Course deleted successfully');
        res.redirect('/admin/settings#courses');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Failed to delete course');
        res.redirect('/admin/settings#courses');
    }
};

exports.getProfile = async (req, res) => {
    try {
        const admin = await Admin.findByUserId(req.session.user.id);
        res.render('admin/profile', {
            title: 'Profile',
            layout_type: 'dashboard',
            admin
        });
    } catch (err) {
        console.error('Admin profile error:', err);
        req.flash('error_msg', 'An error occurred loading profile');
        res.redirect('/admin/dashboard');
    }
};

exports.postProfile = async (req, res) => {
    try {
        const admin = await Admin.findByUserId(req.session.user.id);
        
        let updateData = {};
        if (req.body.first_name) updateData.first_name = req.body.first_name;
        if (req.body.last_name) updateData.last_name = req.body.last_name;
        if (req.body.phone) updateData.phone = req.body.phone;

        if (req.file) {
            // Delete old passport if exists
            if (admin.passport_url) {
                const oldPath = path.join(__dirname, '..', 'uploads', 'passports', path.basename(admin.passport_url));
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }
            updateData.passport_url = `passports/${req.file.filename}`;
            req.session.user.passport_url = `passports/${req.file.filename}`;
        }

        await Admin.update(admin.id, updateData);
        
        if (updateData.first_name) req.session.user.first_name = updateData.first_name;
        if (updateData.last_name) req.session.user.last_name = updateData.last_name;

        req.flash('success_msg', 'Profile updated successfully');
        res.redirect('/admin/profile');
    } catch (err) {
        console.error('Post admin profile error:', err);
        req.flash('error_msg', 'An error occurred updating profile');
        res.redirect('/admin/profile');
    }
};

exports.postChangePassword = async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        const user = await User.findById(req.session.user.id);

        const isMatch = await bcrypt.compare(current_password, user.password);
        if (!isMatch) {
            req.flash('error_msg', 'Current password is incorrect');
            return res.redirect('/admin/profile');
        }

        const hashedPassword = await bcrypt.hash(new_password, 10);
        await User.updatePassword(user.id, hashedPassword);

        req.flash('success_msg', 'Password updated successfully');
        res.redirect('/admin/profile');
    } catch (err) {
        console.error('Admin change password error:', err);
        req.flash('error_msg', 'An error occurred changing password');
        res.redirect('/admin/profile');
    }
};
