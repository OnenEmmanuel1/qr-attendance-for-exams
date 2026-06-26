const Lecturer = require('../models/Lecturer');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Examination = require('../models/Examination');
const Student = require('../models/Student');
const AttendanceLog = require('../models/AttendanceLog');
const Course = require('../models/Course');
const Department = require('../models/Department');
const { generateQRCode, generateExamQRCode } = require('../utils/qrGenerator');
const { generatePDFReport, generateExcelReport } = require('../utils/reportGenerator');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const path = require('path');
const fs = require('fs');

exports.getDashboard = async (req, res) => {
    try {
        const lecturer = await Lecturer.findByUserId(req.session.user.id);
        if (!lecturer) {
            req.flash('error_msg', 'Lecturer profile not found');
            return res.redirect('/auth/login');
        }

        const lecturerId = lecturer.id;

        // Fetch stats
        const assignedExamsCount = await db.query('SELECT COUNT(*) as count FROM examinations WHERE lecturer_id = ?', [lecturerId]);
        const scansTodayCount = await Attendance.getLecturerScansToday(lecturerId);
        
        const totalScansQuery = await db.query('SELECT COUNT(*) as count FROM attendance_records ar JOIN examinations e ON ar.examination_id = e.id WHERE e.lecturer_id = ?', [lecturerId]);
        const suspiciousQuery = await db.query('SELECT COUNT(*) as count FROM attendance_logs al JOIN users u ON al.performed_by = u.id WHERE u.id = ? AND al.action IN (\'scan_failed\', \'duplicate_attempt\', \'expired_qr\', \'suspicious\')', [req.session.user.id]);

        const stats = {
            assignedExams: assignedExamsCount[0][0].count || 0,
            scansToday: scansTodayCount || 0,
            totalScanned: totalScansQuery[0][0].count || 0,
            suspicious: suspiciousQuery[0][0].count || 0
        };

        // Fetch assigned exams
        const examinations = await Examination.getByLecturer(lecturerId);

        // Fetch recent scans (logs/records)
        const [recentScansRows] = await db.query(`
            SELECT ar.*, CONCAT(s.first_name, ' ', s.last_name) as student_name
            FROM attendance_records ar
            JOIN students s ON ar.student_id = s.id
            JOIN examinations e ON ar.examination_id = e.id
            WHERE e.lecturer_id = ?
            ORDER BY ar.scanned_at DESC LIMIT 5
        `, [lecturerId]);

        // Format dates
        examinations.forEach(e => {
            if (e.exam_date) e.exam_date = new Date(e.exam_date).toLocaleDateString();
        });
        recentScansRows.forEach(s => {
            if (s.scanned_at) s.scanned_at = new Date(s.scanned_at).toLocaleString();
            s.action = 'scan_success';
        });

        res.render('lecturer/dashboard', {
            title: 'Lecturer Dashboard',
            layout_type: 'dashboard',
            stats,
            examinations,
            recentScans: recentScansRows
        });
    } catch (err) {
        console.error('Lecturer dashboard error:', err);
        req.flash('error_msg', 'An error occurred loading dashboard');
        res.redirect('/auth/login');
    }
};

exports.getScanner = async (req, res) => {
    try {
        const lecturer = await Lecturer.findByUserId(req.session.user.id);
        if (!lecturer) {
            req.flash('error_msg', 'Lecturer profile not found');
            return res.redirect('/auth/login');
        }

        const examinations = await Examination.getByLecturer(lecturer.id);
        // Format date for select option display
        examinations.forEach(e => {
            if (e.exam_date) e.exam_date = new Date(e.exam_date).toLocaleDateString();
        });

        res.render('lecturer/scanner', {
            title: 'QR Code Scanner',
            layout_type: 'dashboard',
            pageJS: 'scanner.js',
            examinations
        });
    } catch (err) {
        console.error('Lecturer scanner error:', err);
        req.flash('error_msg', 'An error occurred loading scanner page');
        res.redirect('/lecturer/dashboard');
    }
};

exports.getAttendance = async (req, res) => {
    try {
        const lecturer = await Lecturer.findByUserId(req.session.user.id);
        if (!lecturer) {
            req.flash('error_msg', 'Lecturer profile not found');
            return res.redirect('/auth/login');
        }

        const examinations = await Examination.getByLecturer(lecturer.id);
        const records = await Attendance.findByLecturer(lecturer.id);

        examinations.forEach(e => {
            if (e.exam_date) e.exam_date = new Date(e.exam_date).toLocaleDateString();
        });
        records.forEach(r => {
            if (r.scanned_at) r.scanned_at = new Date(r.scanned_at).toLocaleString();
        });

        res.render('lecturer/attendance', {
            title: 'Attendance Records',
            layout_type: 'dashboard',
            examinations,
            records
        });
    } catch (err) {
        console.error('Lecturer attendance error:', err);
        req.flash('error_msg', 'An error occurred');
        res.redirect('/lecturer/dashboard');
    }
};

exports.getReports = async (req, res) => {
    try {
        const lecturer = await Lecturer.findByUserId(req.session.user.id);
        if (!lecturer) {
            req.flash('error_msg', 'Lecturer profile not found');
            return res.redirect('/auth/login');
        }

        const examinations = await Examination.getByLecturer(lecturer.id);
        examinations.forEach(e => {
            if (e.exam_date) e.exam_date = new Date(e.exam_date).toLocaleDateString();
        });

        const examId = req.query.examination_id;
        let reportData = { total: 0, present: 0, absent: 0, percentage: '0%' };
        let reportRecords = [];
        let queryStr = '';

        if (examId) {
            queryStr = `examination_id=${examId}`;
            const examInfo = await Examination.findById(examId);
            if (examInfo && examInfo.lecturer_id === lecturer.id) {
                // Course level and department_id
                const deptId = examInfo.department_id;
                const courseLevel = examInfo.course_level;

                // Eligible students
                const students = await Student.getByDepartmentAndLevel(deptId, courseLevel);
                // Recorded attendance
                const attendanceList = await Attendance.findByExam(examId);

                // Build mapping
                const attMap = {};
                attendanceList.forEach(a => {
                    attMap[a.student_id] = a;
                });

                students.forEach(s => {
                    const record = attMap[s.id];
                    reportRecords.push({
                        first_name: s.first_name,
                        last_name: s.last_name,
                        matric_number: s.matric_number,
                        department_name: s.department_name || examInfo.department_name,
                        status: record ? record.status : 'absent',
                        scanned_at: record ? new Date(record.scanned_at).toLocaleString() : null
                    });
                });

                const total = reportRecords.length;
                const present = reportRecords.filter(r => r.status === 'present' || r.status === 'late').length;
                const absent = total - present;
                const percentage = total > 0 ? `${Math.round((present / total) * 100)}%` : '0%';

                reportData = { total, present, absent, percentage };
            }
        }

        res.render('lecturer/reports', {
            title: 'Reports & Analytics',
            layout_type: 'dashboard',
            examinations,
            reportData,
            reportRecords,
            query: queryStr
        });
    } catch (err) {
        console.error('Lecturer reports error:', err);
        req.flash('error_msg', 'An error occurred loading reports page');
        res.redirect('/lecturer/dashboard');
    }
};

exports.exportPDF = async (req, res) => {
    try {
        const lecturer = await Lecturer.findByUserId(req.session.user.id);
        const examId = req.query.examination_id;
        
        if (!examId) {
            req.flash('error_msg', 'Examination ID is required');
            return res.redirect('/lecturer/reports');
        }

        const examInfo = await Examination.findById(examId);
        if (!examInfo || examInfo.lecturer_id !== lecturer.id) {
            req.flash('error_msg', 'Examination not found or unauthorized');
            return res.redirect('/lecturer/reports');
        }

        const students = await Student.getByDepartmentAndLevel(examInfo.department_id, examInfo.course_level);
        const attendanceList = await Attendance.findByExam(examId);

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

        const fileName = `report_${examId}_${Date.now()}.pdf`;
        const filePath = path.join(reportsDir, fileName);

        if (examInfo.exam_date) examInfo.exam_date = new Date(examInfo.exam_date).toLocaleDateString();

        await generatePDFReport(reportRecords, examInfo, filePath);
        
        res.download(filePath, `attendance_report_${examInfo.course_code}.pdf`, (err) => {
            if (err) {
                console.error('PDF Download error:', err);
            }
            // Cleanup temp file
            fs.unlink(filePath, () => {});
        });
    } catch (err) {
        console.error('Export PDF error:', err);
        req.flash('error_msg', 'Failed to export PDF');
        res.redirect('/lecturer/reports');
    }
};

exports.exportExcel = async (req, res) => {
    try {
        const lecturer = await Lecturer.findByUserId(req.session.user.id);
        const examId = req.query.examination_id;
        
        if (!examId) {
            req.flash('error_msg', 'Examination ID is required');
            return res.redirect('/lecturer/reports');
        }

        const examInfo = await Examination.findById(examId);
        if (!examInfo || examInfo.lecturer_id !== lecturer.id) {
            req.flash('error_msg', 'Examination not found or unauthorized');
            return res.redirect('/lecturer/reports');
        }

        const students = await Student.getByDepartmentAndLevel(examInfo.department_id, examInfo.course_level);
        const attendanceList = await Attendance.findByExam(examId);

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

        const fileName = `report_${examId}_${Date.now()}.xlsx`;
        const filePath = path.join(reportsDir, fileName);

        if (examInfo.exam_date) examInfo.exam_date = new Date(examInfo.exam_date).toLocaleDateString();

        await generateExcelReport(reportRecords, examInfo, filePath);
        
        res.download(filePath, `attendance_report_${examInfo.course_code}.xlsx`, (err) => {
            if (err) {
                console.error('Excel Download error:', err);
            }
            // Cleanup temp file
            fs.unlink(filePath, () => {});
        });
    } catch (err) {
        console.error('Export Excel error:', err);
        req.flash('error_msg', 'Failed to export Excel');
        res.redirect('/lecturer/reports');
    }
};

// ─── Student Management (Lecturer) ──────────────────────────────────
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
        res.redirect('/lecturer/dashboard');
    }
};

exports.postStudent = async (req, res) => {
    try {
        const { first_name, last_name, email, password, matric_number, department_id, level, phone } = req.body;
        
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            req.flash('error_msg', 'Email is already registered');
            return res.redirect('/lecturer/students');
        }

        const existingMatric = await Student.findByMatric(matric_number);
        if (existingMatric) {
            req.flash('error_msg', 'Matric number is already registered');
            return res.redirect('/lecturer/students');
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
        res.redirect('/lecturer/students');
    } catch (err) {
        console.error('Post student error:', err);
        req.flash('error_msg', 'Failed to register student');
        res.redirect('/lecturer/students');
    }
};

exports.postEditStudent = async (req, res) => {
    try {
        const { id } = req.params;
        const { first_name, last_name, matric_number, department_id, level, phone, is_active } = req.body;
        
        const student = await Student.findById(id);
        if (!student) {
            req.flash('error_msg', 'Student not found');
            return res.redirect('/lecturer/students');
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
        res.redirect('/lecturer/students');
    } catch (err) {
        console.error('Edit student error:', err);
        req.flash('error_msg', 'Failed to update student');
        res.redirect('/lecturer/students');
    }
};

exports.postDeleteStudent = async (req, res) => {
    try {
        const { id } = req.params;
        await Student.delete(id);
        req.flash('success_msg', 'Student deleted successfully');
        res.redirect('/lecturer/students');
    } catch (err) {
        console.error('Delete student error:', err);
        req.flash('error_msg', 'Failed to delete student');
        res.redirect('/lecturer/students');
    }
};

exports.postGenerateStudentQR = async (req, res) => {
    try {
        const { id } = req.params;
        const student = await Student.findById(id);
        if (!student) {
            req.flash('error_msg', 'Student not found');
            return res.redirect('/lecturer/students');
        }

        if (!student.department_id || !student.level || !student.matric_number) {
            req.flash('error_msg', 'Student must have matric number, department, and level to generate QR codes.');
            return res.redirect('/lecturer/students');
        }

        // Get upcoming exams for this student
        const [exams] = await db.query(`
            SELECT e.id FROM examinations e
            JOIN courses c ON e.course_id = c.id
            WHERE c.department_id = ? AND c.level = ? AND e.exam_date >= CURDATE() AND e.status = 'scheduled'
        `, [student.department_id, student.level]);

        if (exams.length === 0) {
            req.flash('error_msg', 'No upcoming exams scheduled for this student.');
            return res.redirect('/lecturer/students');
        }

        let count = 0;
        for (const exam of exams) {
            await generateQRCode(student.id, exam.id, student.matric_number);
            count++;
        }

        req.flash('success_msg', `Generated ${count} QR codes for upcoming exams.`);
        res.redirect('/lecturer/students');
    } catch (err) {
        console.error('Generate student QR error:', err);
        req.flash('error_msg', 'Failed to generate student QR codes');
        res.redirect('/lecturer/students');
    }
};

// ─── Examination Management (Lecturer) ────────────────────────────────
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
        res.redirect('/lecturer/dashboard');
    }
};

exports.postExamination = async (req, res) => {
    try {
        const { course_id, lecturer_id, exam_date, start_time, end_time, venue, semester, academic_year } = req.body;
        
        const examId = await Examination.create({
            course_id,
            lecturer_id: lecturer_id || null,
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
        res.redirect('/lecturer/examinations');
    } catch (err) {
        console.error('Create exam error:', err);
        req.flash('error_msg', 'Failed to create examination');
        res.redirect('/lecturer/examinations');
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
        res.redirect('/lecturer/examinations');
    } catch (err) {
        console.error('Edit exam error:', err);
        req.flash('error_msg', 'Failed to update examination');
        res.redirect('/lecturer/examinations');
    }
};

exports.postCancelExamination = async (req, res) => {
    try {
        const { id } = req.params;
        await Examination.cancel(id);
        req.flash('success_msg', 'Examination cancelled successfully');
        res.redirect('/lecturer/examinations');
    } catch (err) {
        console.error('Cancel exam error:', err);
        req.flash('error_msg', 'Failed to cancel examination');
        res.redirect('/lecturer/examinations');
    }
};

exports.postGenerateExamQR = async (req, res) => {
    try {
        const { id } = req.params;
        const exam = await Examination.findById(id);
        if (!exam) {
            req.flash('error_msg', 'Examination not found');
            return res.redirect('/lecturer/examinations');
        }

        await generateExamQRCode(exam.id);

        req.flash('success_msg', 'Exam QR code generated successfully.');
        res.redirect('/lecturer/examinations');
    } catch (err) {
        console.error('Generate exam QR error:', err);
        req.flash('error_msg', 'Failed to generate QR codes');
        res.redirect('/lecturer/examinations');
    }
};

exports.getProfile = async (req, res) => {
    try {
        const lecturer = await Lecturer.findByUserId(req.session.user.id);
        res.render('lecturer/profile', {
            title: 'Profile',
            layout_type: 'dashboard',
            lecturer
        });
    } catch (err) {
        console.error('Lecturer profile error:', err);
        req.flash('error_msg', 'An error occurred loading profile');
        res.redirect('/lecturer/dashboard');
    }
};

exports.postProfile = async (req, res) => {
    try {
        const lecturer = await Lecturer.findByUserId(req.session.user.id);
        
        let updateData = {};
        if (req.body.first_name) updateData.first_name = req.body.first_name;
        if (req.body.last_name) updateData.last_name = req.body.last_name;
        if (req.body.phone) updateData.phone = req.body.phone;

        if (req.file) {
            // Delete old passport if exists
            if (lecturer.passport_url) {
                const oldPath = path.join(__dirname, '..', 'uploads', 'passports', path.basename(lecturer.passport_url));
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }
            updateData.passport_url = `passports/${req.file.filename}`;
            req.session.user.passport_url = `passports/${req.file.filename}`;
        }

        await Lecturer.update(lecturer.id, updateData);
        
        if (updateData.first_name) req.session.user.first_name = updateData.first_name;
        if (updateData.last_name) req.session.user.last_name = updateData.last_name;

        req.flash('success_msg', 'Profile updated successfully');
        res.redirect('/lecturer/profile');
    } catch (err) {
        console.error('Post lecturer profile error:', err);
        req.flash('error_msg', 'An error occurred updating profile');
        res.redirect('/lecturer/profile');
    }
};

exports.postChangePassword = async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        const user = await User.findById(req.session.user.id);

        const isMatch = await bcrypt.compare(current_password, user.password);
        if (!isMatch) {
            req.flash('error_msg', 'Current password is incorrect');
            return res.redirect('/lecturer/profile');
        }

        const hashedPassword = await bcrypt.hash(new_password, 10);
        await User.updatePassword(user.id, hashedPassword);

        req.flash('success_msg', 'Password updated successfully');
        res.redirect('/lecturer/profile');
    } catch (err) {
        console.error('Lecturer change password error:', err);
        req.flash('error_msg', 'An error occurred changing password');
        res.redirect('/lecturer/profile');
    }
};
