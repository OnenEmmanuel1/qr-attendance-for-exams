const Student = require('../models/Student');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const QRCode = require('../models/QRCode');
const Examination = require('../models/Examination');
const Course = require('../models/Course');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

exports.getDashboard = async (req, res) => {
    try {
        const student = await Student.findByUserId(req.session.user.id);
        if (!student) {
            req.flash('error_msg', 'Student profile not found');
            return res.redirect('/auth/login');
        }

        const studentId = student.id;
        const deptId = student.department_id;
        const level = student.level;

        // Fetch student stats
        const attendanceStats = await Attendance.getStudentStats(studentId);
        const activeQRCount = await QRCode.countActiveByStudent(studentId);

        // Fetch upcoming exams matching department and level
        let upcomingExams = [];
        if (deptId && level) {
            const [rows] = await require('../config/database').query(`
                SELECT e.*, c.code as course_code, c.title as course_title,
                CONCAT(l.first_name, ' ', l.last_name) as lecturer_name
                FROM examinations e
                JOIN courses c ON e.course_id = c.id
                LEFT JOIN lecturers l ON e.lecturer_id = l.id
                WHERE c.department_id = ? AND c.level = ? AND e.exam_date >= CURDATE() AND e.status = 'scheduled'
                ORDER BY e.exam_date ASC LIMIT 5
            `, [deptId, level]);
            upcomingExams = rows;
        }

        // Fetch recent attendance records
        const recentAttendance = await Attendance.findByStudent(studentId);

        const stats = {
            upcomingExams: upcomingExams.length,
            attended: attendanceStats ? (attendanceStats.present || 0) : 0,
            missed: attendanceStats ? (attendanceStats.absent || 0) : 0,
            activeQR: activeQRCount
        };

        // Format dates
        upcomingExams.forEach(e => {
            if (e.exam_date) e.exam_date = new Date(e.exam_date).toLocaleDateString();
        });
        recentAttendance.forEach(a => {
            if (a.exam_date) a.exam_date = new Date(a.exam_date).toLocaleDateString();
            if (a.scanned_at) a.scanned_at = new Date(a.scanned_at).toLocaleString();
        });

        res.render('student/dashboard', {
            title: 'Student Dashboard',
            layout_type: 'dashboard',
            student,
            stats,
            upcomingExams,
            recentAttendance
        });
    } catch (err) {
        console.error('Student dashboard error:', err);
        req.flash('error_msg', 'An error occurred loading dashboard');
        res.redirect('/auth/login');
    }
};

exports.getProfile = async (req, res) => {
    try {
        const student = await Student.findByUserId(req.session.user.id);
        res.render('student/profile', {
            title: 'Profile',
            layout_type: 'dashboard',
            student: student
        });
    } catch (err) {
        console.error('Student profile error:', err);
        req.flash('error_msg', 'An error occurred');
        res.redirect('/student/dashboard');
    }
};

exports.postProfile = async (req, res) => {
    try {
        const student = await Student.findByUserId(req.session.user.id);
        
        let updateData = {};
        if (req.body.first_name) updateData.first_name = req.body.first_name;
        if (req.body.last_name) updateData.last_name = req.body.last_name;
        if (req.body.phone) updateData.phone = req.body.phone;

        if (req.file) {
            // Delete old passport if exists
            if (student.passport_url) {
                const oldPath = path.join(__dirname, '..', 'uploads', 'passports', path.basename(student.passport_url));
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }
            updateData.passport_url = `passports/${req.file.filename}`;
            // Update passport in session as well
            req.session.user.passport_url = `passports/${req.file.filename}`;
        }

        await Student.update(student.id, updateData);
        
        // Update name in session
        if (updateData.first_name) req.session.user.first_name = updateData.first_name;
        if (updateData.last_name) req.session.user.last_name = updateData.last_name;

        req.flash('success_msg', 'Profile updated successfully');
        res.redirect('/student/profile');
    } catch (err) {
        console.error('Post student profile error:', err);
        req.flash('error_msg', 'An error occurred updating profile');
        res.redirect('/student/profile');
    }
};

exports.postChangePassword = async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        const user = await User.findById(req.session.user.id);

        const isMatch = await bcrypt.compare(current_password, user.password);
        if (!isMatch) {
            req.flash('error_msg', 'Current password is incorrect');
            return res.redirect('/student/profile');
        }

        const hashedPassword = await bcrypt.hash(new_password, 10);
        await User.updatePassword(user.id, hashedPassword);

        req.flash('success_msg', 'Password updated successfully');
        res.redirect('/student/profile');
    } catch (err) {
        console.error('Student change password error:', err);
        req.flash('error_msg', 'An error occurred changing password');
        res.redirect('/student/profile');
    }
};

exports.getQRCode = async (req, res) => {
    try {
        const student = await Student.findByUserId(req.session.user.id);
        res.render('student/qrcode', {
            title: 'Scan Exam QR',
            layout_type: 'dashboard',
            pageJS: 'student-scanner.js',
            student: student
        });
    } catch (err) {
        console.error('Student QR code page error:', err);
        req.flash('error_msg', 'An error occurred');
        res.redirect('/student/dashboard');
    }
};

exports.getAttendance = async (req, res) => {
    try {
        const student = await Student.findByUserId(req.session.user.id);
        const stats = await Attendance.getStudentStats(student.id);
        const records = await Attendance.findByStudent(student.id);
        
        // Fetch courses for the filter dropdown
        let courses = [];
        if (student.department_id && student.level) {
            const [rows] = await require('../config/database').query(
                'SELECT * FROM courses WHERE department_id = ? AND level = ?',
                [student.department_id, student.level]
            );
            courses = rows;
        }

        // Format dates
        records.forEach(r => {
            if (r.exam_date) r.exam_date = new Date(r.exam_date).toLocaleDateString();
            if (r.scanned_at) r.scanned_at = new Date(r.scanned_at).toLocaleString();
        });

        res.render('student/attendance', {
            title: 'Attendance History',
            layout_type: 'dashboard',
            stats: {
                total: records.length,
                present: stats ? (stats.present || 0) : 0,
                absent: stats ? (stats.absent || 0) : 0
            },
            courses,
            records
        });
    } catch (err) {
        console.error('Student attendance page error:', err);
        req.flash('error_msg', 'An error occurred loading attendance');
        res.redirect('/student/dashboard');
    }
};
