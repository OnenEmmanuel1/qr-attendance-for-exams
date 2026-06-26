const db = require('../config/database');

class Lecturer {
    static async findByUserId(userId) {
        const [rows] = await db.query(`
            SELECT l.*, u.email, u.is_active, d.name as department_name 
            FROM lecturers l JOIN users u ON l.user_id = u.id 
            LEFT JOIN departments d ON l.department_id = d.id WHERE l.user_id = ?
        `, [userId]);
        return rows[0];
    }
    static async findById(id) {
        const [rows] = await db.query(`
            SELECT l.*, u.email, u.is_active, d.name as department_name 
            FROM lecturers l JOIN users u ON l.user_id = u.id 
            LEFT JOIN departments d ON l.department_id = d.id WHERE l.id = ?
        `, [id]);
        return rows[0];
    }
    static async create({ user_id, first_name, last_name, staff_id, department_id, phone, passport_url }) {
        const [result] = await db.query(
            'INSERT INTO lecturers (user_id, first_name, last_name, staff_id, department_id, phone, passport_url) VALUES (?,?,?,?,?,?,?)',
            [user_id, first_name, last_name, staff_id || null, department_id || null, phone || null, passport_url || null]
        );
        return result.insertId;
    }
    static async update(id, data) {
        const fields = [], values = [];
        for (const [key, value] of Object.entries(data)) { if (value !== undefined) { fields.push(`${key} = ?`); values.push(value); } }
        if (!fields.length) return;
        values.push(id);
        await db.query(`UPDATE lecturers SET ${fields.join(', ')} WHERE id = ?`, values);
    }
    static async getAll() {
        const [rows] = await db.query(`
            SELECT l.*, u.email, u.is_active, d.name as department_name,
            (SELECT COUNT(*) FROM examinations e WHERE e.lecturer_id = l.id) as exam_count
            FROM lecturers l JOIN users u ON l.user_id = u.id LEFT JOIN departments d ON l.department_id = d.id ORDER BY l.created_at DESC
        `);
        return rows;
    }
    static async count() { const [rows] = await db.query('SELECT COUNT(*) as count FROM lecturers'); return rows[0].count; }
    static async delete(id) {
        const l = await this.findById(id);
        if (l) await db.query('DELETE FROM users WHERE id = ?', [l.user_id]);
    }
}
module.exports = Lecturer;
