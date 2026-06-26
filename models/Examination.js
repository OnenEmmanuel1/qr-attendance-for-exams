const db = require('../config/database');
class Examination {
    static async getAll() {
        const [rows] = await db.query(`
            SELECT e.*, c.code as course_code, c.title as course_title,
            CONCAT(l.first_name, ' ', l.last_name) as lecturer_name
            FROM examinations e JOIN courses c ON e.course_id = c.id
            LEFT JOIN lecturers l ON e.lecturer_id = l.id ORDER BY e.exam_date DESC
        `);
        return rows;
    }
    static async findById(id) {
        const [rows] = await db.query(`
            SELECT e.*, c.code as course_code, c.title as course_title, c.department_id, c.level as course_level,
            CONCAT(l.first_name, ' ', l.last_name) as lecturer_name
            FROM examinations e JOIN courses c ON e.course_id = c.id
            LEFT JOIN lecturers l ON e.lecturer_id = l.id WHERE e.id = ?
        `, [id]);
        return rows[0];
    }
    static async create({ course_id, lecturer_id, venue, exam_date, start_time, end_time, semester, academic_year, created_by }) {
        const [result] = await db.query(
            'INSERT INTO examinations (course_id, lecturer_id, venue, exam_date, start_time, end_time, semester, academic_year, created_by) VALUES (?,?,?,?,?,?,?,?,?)',
            [course_id, lecturer_id || null, venue, exam_date, start_time, end_time, semester, academic_year, created_by || null]
        );
        return result.insertId;
    }
    static async update(id, data) {
        const fields = [], values = [];
        for (const [k, v] of Object.entries(data)) { if (v !== undefined) { fields.push(`${k} = ?`); values.push(v); } }
        if (!fields.length) return; values.push(id);
        await db.query(`UPDATE examinations SET ${fields.join(', ')} WHERE id = ?`, values);
    }
    static async cancel(id) { await db.query("UPDATE examinations SET status = 'cancelled' WHERE id = ?", [id]); }
    static async getByLecturer(lecturerId) {
        const [rows] = await db.query(`
            SELECT e.*, c.code as course_code, c.title as course_title
            FROM examinations e JOIN courses c ON e.course_id = c.id WHERE e.lecturer_id = ? ORDER BY e.exam_date DESC
        `, [lecturerId]);
        return rows;
    }
    static async getUpcoming() {
        const [rows] = await db.query(`
            SELECT e.*, c.code as course_code, c.title as course_title
            FROM examinations e JOIN courses c ON e.course_id = c.id
            WHERE e.exam_date >= CURDATE() AND e.status = 'scheduled' ORDER BY e.exam_date ASC LIMIT 10
        `);
        return rows;
    }
    static async count() { const [rows] = await db.query('SELECT COUNT(*) as count FROM examinations'); return rows[0].count; }
}
module.exports = Examination;
