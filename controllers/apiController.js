const crypto = require('crypto');
const Student = require('../models/Student');
const Lecturer = require('../models/Lecturer');
const Examination = require('../models/Examination');
const QRCodeModel = require('../models/QRCode');
const Attendance = require('../models/Attendance');
const AttendanceLog = require('../models/AttendanceLog');
const Notification = require('../models/Notification');
const { validateQRCode } = require('../utils/qrValidator');
const { generateExamQRCode } = require('../utils/qrGenerator');
const db = require('../config/database');

// ─── Notifications ───────────────────────────────────────────────
exports.getUnreadCount = async (req, res) => {
    try {
        if (!req.session || !req.session.user) {
            return res.json({ count: 0 });
        }
        const count = await Notification.getUnreadCount(req.session.user.id);
        res.json({ count });
    } catch (err) {
        console.error('Unread count error:', err);
        res.status(500).json({ error: 'Failed to count notifications' });
    }
};

exports.getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.getByUser(req.session.user.id);
        res.json(notifications);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to get notifications' });
    }
};

exports.markRead = async (req, res) => {
    try {
        const { id } = req.body;
        if (id) {
            await Notification.markRead(id);
        } else {
            await Notification.markAllRead(req.session.user.id);
        }
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update notifications' });
    }
};

// ─── Scan Operations ─────────────────────────────────────────────
exports.validateScan = async (req, res) => {
    try {
        const { scannedData } = req.body;
        if (!scannedData) {
            return res.status(400).json({ error: 'Scanned QR data is required' });
        }

        // Decrypt the scanned QR data
        let decryptedData;
        try {
            const secret = process.env.SESSION_SECRET || 'default_key';
            const key = crypto.createHash('sha256').update(secret).digest();
            
            const parts = scannedData.split(':');
            const iv = Buffer.from(parts[0], 'hex');
            const encryptedText = parts[1];
            
            const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
            let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            decryptedData = JSON.parse(decrypted);
        } catch (decErr) {
            console.error('Decryption failed:', decErr.message);
            // Log failed scan attempt
            await AttendanceLog.create({
                action: 'scan_failed',
                details: 'Decryption failed for scanned QR payload',
                ip_address: req.ip,
                performed_by: req.session.user.id
            });
            return res.json({ valid: false, message: 'Invalid QR payload format or decryption failed.' });
        }

        // Check if this is an examination-level QR code (student scans exam QR)
        if (decryptedData.eid) {
            const examId = decryptedData.eid;
            const token = decryptedData.token;

            const exam = await Examination.findById(examId);
            if (!exam) {
                return res.json({ valid: false, message: 'Examination not found.' });
            }

            if (exam.status === 'cancelled') {
                return res.json({ valid: false, message: 'This examination has been cancelled.' });
            }

            if (exam.qr_token !== token) {
                return res.json({ valid: false, message: 'Invalid or expired QR token.' });
            }

            // Find student profile matching the logged in user
            const student = await Student.findByUserId(req.session.user.id);
            if (!student) {
                return res.json({ valid: false, message: 'Student profile not found.' });
            }

            // Check student eligibility (matches department and course level)
            if (student.department_id !== exam.department_id || student.level !== exam.course_level) {
                return res.json({
                    valid: false,
                    message: `You are not eligible for this examination. Course is for ${exam.department_name} Level ${exam.course_level}, you are in ${student.department_name || 'N/A'} Level ${student.level || 'N/A'}`
                });
            }

            // Double check duplicate
            const isDup = await Attendance.checkDuplicate(student.id, exam.id);
            if (isDup) {
                return res.json({ valid: false, message: 'Your attendance is already recorded for this examination.' });
            }

            return res.json({
                valid: true,
                isExamQR: true,
                message: 'QR verified successfully.',
                data: {
                    student_id: student.id,
                    examination_id: exam.id,
                    first_name: student.first_name,
                    last_name: student.last_name,
                    matric_number: student.matric_number,
                    passport_url: student.passport_url,
                    department_name: student.department_name,
                    course_code: exam.course_code,
                    course_title: exam.course_title,
                    exam_date: new Date(exam.exam_date).toLocaleDateString(),
                    venue: exam.venue
                }
            });
        }

        const { token } = decryptedData;
        const result = await validateQRCode(token, req.session.user.id, req.ip);
        res.json(result);
    } catch (err) {
        console.error('Scan validation error:', err);
        res.status(500).json({ error: 'Failed to validate scan' });
    }
};

exports.approveScan = async (req, res) => {
    try {
        const { qr_id, student_id, examination_id, status } = req.body;
        
        // Double check duplicate
        const isDup = await Attendance.checkDuplicate(student_id, examination_id);
        if (isDup) {
            return res.json({ success: false, message: 'Attendance already recorded for this student.' });
        }

        await Attendance.record({
            student_id,
            examination_id,
            qr_code_id: qr_id || null,
            status: status || 'present',
            scanned_by: req.session.user.id,
            location: req.body.location || 'Exam Venue'
        });

        // Mark QR code as used (only if qr_id is provided)
        if (qr_id) {
            await QRCodeModel.markUsed(qr_id);
        }

        // Fetch student details to get their user_id for notification
        const student = await Student.findById(student_id);
        const exam = await Examination.findById(examination_id);

        // Create student notification
        if (student && exam) {
            await Notification.create({
                user_id: student.user_id,
                title: 'Attendance Recorded',
                message: `Your attendance for ${exam.course_code} on ${new Date(exam.exam_date).toLocaleDateString()} has been marked as ${status || 'present'}.`,
                type: 'attendance'
            });
        }

        // Log success
        const record = await db.query('SELECT id FROM attendance_records WHERE student_id = ? AND examination_id = ?', [student_id, examination_id]);
        if (record[0] && record[0][0]) {
            await AttendanceLog.create({
                attendance_id: record[0][0].id,
                action: 'scan_success',
                details: `Attendance recorded for student ${student.matric_number} (${status || 'present'})`,
                ip_address: req.ip,
                performed_by: req.session.user.id
            });
        }

        res.json({ success: true, message: 'Attendance successfully recorded!' });
    } catch (err) {
        console.error('Approve scan error:', err);
        res.status(500).json({ error: 'Failed to approve attendance' });
    }
};

exports.rejectScan = async (req, res) => {
    try {
        const { student_id, reason } = req.body;
        
        let details = 'Scan rejected';
        if (student_id) {
            const student = await Student.findById(student_id);
            if (student) details += ` for student ${student.matric_number}`;
        }
        if (reason) details += `. Reason: ${reason}`;

        await AttendanceLog.create({
            action: 'suspicious',
            details,
            ip_address: req.ip,
            performed_by: req.session.user.id
        });

        res.json({ success: true, message: 'Rejection logged.' });
    } catch (err) {
        console.error('Reject scan error:', err);
        res.status(500).json({ error: 'Failed to log rejection' });
    }
};

exports.manualLookup = async (req, res) => {
    try {
        const { matricNumber, examinationId } = req.body;
        if (!matricNumber || !examinationId) {
            return res.status(400).json({ error: 'Matric number and examination ID are required' });
        }

        const student = await Student.findByMatric(matricNumber);
        if (!student) {
            return res.json({ found: false, message: 'Student with this matric number not found.' });
        }

        const exam = await Examination.findById(examinationId);
        if (!exam) {
            return res.json({ found: false, message: 'Examination not found.' });
        }

        // Verify if student is eligible for this course exam (matches department + level)
        if (student.department_id !== exam.department_id || student.level !== exam.course_level) {
            return res.json({ 
                found: false, 
                message: `Student is not eligible for this examination. Course is for ${exam.department_name} Level ${exam.course_level}, student is in ${student.department_name || 'N/A'} Level ${student.level || 'N/A'}` 
            });
        }

        // Check if attendance already recorded
        const isDup = await Attendance.checkDuplicate(student.id, exam.id);
        if (isDup) {
            return res.json({ found: false, message: 'Attendance already recorded for this student.' });
        }

        res.json({
            found: true,
            student: {
                id: student.id,
                first_name: student.first_name,
                last_name: student.last_name,
                matric_number: student.matric_number,
                passport_url: student.passport_url,
                department_name: student.department_name
            },
            exam: {
                id: exam.id,
                course_code: exam.course_code,
                course_title: exam.course_title,
                venue: exam.venue,
                exam_date: new Date(exam.exam_date).toLocaleDateString()
            }
        });
    } catch (err) {
        console.error('Manual lookup error:', err);
        res.status(500).json({ error: 'Manual lookup failed' });
    }
};

// ─── Data Details for Edit Modals ─────────────────────────────────
exports.getStudentDetails = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        if (!student) return res.status(404).json({ error: 'Student not found' });
        res.json(student);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch student details' });
    }
};

exports.getLecturerDetails = async (req, res) => {
    try {
        const lecturer = await Lecturer.findById(req.params.id);
        if (!lecturer) return res.status(404).json({ error: 'Lecturer not found' });
        res.json(lecturer);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch lecturer details' });
    }
};

exports.getExaminationDetails = async (req, res) => {
    try {
        const exam = await Examination.findById(req.params.id);
        if (!exam) return res.status(404).json({ error: 'Examination not found' });
        
        // Dynamically generate QR code if it doesn't exist yet
        if (!exam.qr_image_url) {
            const qr = await generateExamQRCode(exam.id);
            exam.qr_image_url = qr.qr_image_url;
            exam.qr_token = qr.qr_token;
        }

        // Format date to YYYY-MM-DD for date input values
        if (exam.exam_date) {
            const d = new Date(exam.exam_date);
            const month = '' + (d.getMonth() + 1);
            const day = '' + d.getDate();
            const year = d.getFullYear();
            exam.exam_date_raw = [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
        }
        res.json(exam);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch examination details' });
    }
};

exports.getAttendanceStats = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT e.id, c.code as course_code,
            (SELECT COUNT(*) FROM attendance_records ar WHERE ar.examination_id = e.id AND ar.status IN ('present', 'late')) as present,
            (SELECT COUNT(*) FROM students s WHERE s.department_id = c.department_id AND s.level = c.level) as total
            FROM examinations e
            JOIN courses c ON e.course_id = c.id
            ORDER BY e.exam_date DESC LIMIT 5
        `);

        const labels = [];
        const present = [];
        const absent = [];

        rows.forEach(r => {
            labels.unshift(r.course_code);
            present.unshift(r.present);
            const abs = r.total - r.present;
            absent.unshift(abs < 0 ? 0 : abs);
        });

        res.json({ labels, present, absent });
    } catch (err) {
        console.error('Error fetching attendance stats for chart:', err);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
};

