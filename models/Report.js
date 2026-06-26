const db = require('../config/database');
class Report {
    static async create({ title, type, examination_id, generated_by, file_url, format }) {
        const [result] = await db.query('INSERT INTO reports (title, type, examination_id, generated_by, file_url, format) VALUES (?,?,?,?,?,?)',
            [title, type, examination_id || null, generated_by || null, file_url || null, format || 'pdf']);
        return result.insertId;
    }
    static async getAll() { const [rows] = await db.query('SELECT * FROM reports ORDER BY created_at DESC'); return rows; }
    static async findById(id) { const [rows] = await db.query('SELECT * FROM reports WHERE id = ?', [id]); return rows[0]; }
}
module.exports = Report;
