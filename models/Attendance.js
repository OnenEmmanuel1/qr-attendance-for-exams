const db = require('../config/database');
class Attendance {
    static async record({ student_id, examination_id, qr_code_id, status, scanned_by, location }) {
        const [result] = await db.query(
            'INSERT INTO attendance_records (student_id, examination_id, qr_code_id, status, scanned_by, location) VALUES (?,?,?,?,?,?)',
            [student_id, examination_id, qr_code_id || null, status || 'present', scanned_by || null, location || null]
        );
        return result.insertId;
    }
    static async checkDuplicate(studentId, examId) {
        const [rows] = await db.query('SELECT id FROM attendance_records WHERE student_id = ? AND examination_id = ?', [studentId, examId]);
        return rows.length > 0;
    }
    static async findByExam(examId) {
        const [rows] = await db.query(`
            SELECT ar.*, s.first_name, s.last_name, s.matric_number, s.passport_url,
            d.name as department_name, c.code as course_code
            FROM attendance_records ar JOIN students s ON ar.student_id = s.id
            LEFT JOIN departments d ON s.department_id = d.id
            JOIN examinations e ON ar.examination_id = e.id JOIN courses c ON e.course_id = c.id
            WHERE ar.examination_id = ? ORDER BY ar.scanned_at DESC
        `, [examId]);
        return rows;
    }
    static async findByStudent(studentId) {
        const [rows] = await db.query(`
            SELECT ar.*, c.code as course_code, c.title as course_title, e.exam_date, e.venue
            FROM attendance_records ar JOIN examinations e ON ar.examination_id = e.id
            JOIN courses c ON e.course_id = c.id WHERE ar.student_id = ? ORDER BY ar.scanned_at DESC
        `, [studentId]);
        return rows;
    }
    static async findByLecturer(lecturerId) {
        const [rows] = await db.query(`
            SELECT ar.*, s.first_name, s.last_name, s.matric_number, s.passport_url,
            d.name as department_name, c.code as course_code
            FROM attendance_records ar JOIN students s ON ar.student_id = s.id
            LEFT JOIN departments d ON s.department_id = d.id
            JOIN examinations e ON ar.examination_id = e.id JOIN courses c ON e.course_id = c.id
            WHERE e.lecturer_id = ? ORDER BY ar.scanned_at DESC
        `, [lecturerId]);
        return rows;
    }
    static async getStats(examId) {
        const [rows] = await db.query(`
            SELECT COUNT(*) as total,
            SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
            SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
            SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late
            FROM attendance_records WHERE examination_id = ?
        `, [examId]);
        return rows[0];
    }
    static async getStudentStats(studentId) {
        const [rows] = await db.query(`
            SELECT COUNT(*) as total,
            SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
            SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent
            FROM attendance_records WHERE student_id = ?
        `, [studentId]);
        return rows[0];
    }
    static async getOverallStats() {
        const [rows] = await db.query(`
            SELECT COUNT(*) as total,
            SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
            SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent
            FROM attendance_records
        `);
        return rows[0];
    }
    static async getRecent(limit = 10) {
        const [rows] = await db.query(`
            SELECT ar.*, s.first_name, s.last_name, s.matric_number, c.code as course_code,
            CONCAT(u.email) as scanner_email
            FROM attendance_records ar JOIN students s ON ar.student_id = s.id
            JOIN examinations e ON ar.examination_id = e.id JOIN courses c ON e.course_id = c.id
            LEFT JOIN users u ON ar.scanned_by = u.id ORDER BY ar.scanned_at DESC LIMIT ?
        `, [limit]);
        return rows;
    }
    static async getLecturerScansToday(lecturerId) {
        const [rows] = await db.query(`
            SELECT COUNT(*) as count FROM attendance_records ar
            JOIN examinations e ON ar.examination_id = e.id
            WHERE e.lecturer_id = ? AND DATE(ar.scanned_at) = CURDATE()
        `, [lecturerId]);
        return rows[0].count;
    }
}
module.exports = Attendance;
