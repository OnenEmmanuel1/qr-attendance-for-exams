const db = require('../config/database');
class QRCode {
    static async create({ student_id, examination_id, qr_data, qr_image_url, token, expires_at }) {
        const [result] = await db.query(
            'INSERT INTO qr_codes (student_id, examination_id, qr_data, qr_image_url, token, expires_at) VALUES (?,?,?,?,?,?)',
            [student_id, examination_id, qr_data, qr_image_url, token, expires_at]
        );
        return result.insertId;
    }
    static async findByStudentExam(studentId, examId) {
        const [rows] = await db.query('SELECT * FROM qr_codes WHERE student_id = ? AND examination_id = ?', [studentId, examId]);
        return rows[0];
    }
    static async findByToken(token) {
        const [rows] = await db.query(`
            SELECT qr.*, s.first_name, s.last_name, s.matric_number, s.passport_url, s.department_id,
            d.name as department_name, e.exam_date, e.venue, e.start_time, e.end_time, e.status as exam_status,
            c.code as course_code, c.title as course_title
            FROM qr_codes qr
            JOIN students s ON qr.student_id = s.id
            LEFT JOIN departments d ON s.department_id = d.id
            JOIN examinations e ON qr.examination_id = e.id
            JOIN courses c ON e.course_id = c.id
            WHERE qr.token = ?
        `, [token]);
        return rows[0];
    }
    static async markUsed(id) { await db.query('UPDATE qr_codes SET is_used = TRUE WHERE id = ?', [id]); }
    static async getByStudent(studentId) {
        const [rows] = await db.query(`
            SELECT qr.*, c.code as course_code, c.title as course_title, e.exam_date, e.venue
            FROM qr_codes qr JOIN examinations e ON qr.examination_id = e.id
            JOIN courses c ON e.course_id = c.id WHERE qr.student_id = ? ORDER BY qr.created_at DESC
        `, [studentId]);
        return rows;
    }
    static async getActiveByStudent(studentId) {
        const [rows] = await db.query(`
            SELECT qr.*, c.code as course_code, c.title as course_title, e.exam_date, e.venue
            FROM qr_codes qr JOIN examinations e ON qr.examination_id = e.id
            JOIN courses c ON e.course_id = c.id
            WHERE qr.student_id = ? AND qr.is_used = FALSE AND qr.expires_at > NOW() AND e.status != 'cancelled'
            ORDER BY e.exam_date ASC LIMIT 1
        `, [studentId]);
        return rows[0];
    }
    static async countActiveByStudent(studentId) {
        const [rows] = await db.query(
            'SELECT COUNT(*) as count FROM qr_codes WHERE student_id = ? AND is_used = FALSE AND expires_at > NOW()', [studentId]
        );
        return rows[0].count;
    }
}
module.exports = QRCode;
