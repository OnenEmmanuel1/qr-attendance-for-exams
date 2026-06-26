const db = require('../config/database');
class Course {
    static async getAll() {
        const [rows] = await db.query('SELECT c.*, d.name as department_name FROM courses c LEFT JOIN departments d ON c.department_id = d.id ORDER BY c.code');
        return rows;
    }
    static async findById(id) { const [rows] = await db.query('SELECT c.*, d.name as department_name FROM courses c LEFT JOIN departments d ON c.department_id = d.id WHERE c.id = ?', [id]); return rows[0]; }
    static async create({ code, title, department_id, credit_units, level }) {
        const [result] = await db.query('INSERT INTO courses (code, title, department_id, credit_units, level) VALUES (?,?,?,?,?)', [code.toUpperCase(), title, department_id || null, credit_units || 3, level || null]);
        return result.insertId;
    }
    static async update(id, data) {
        const fields = [], values = [];
        for (const [k, v] of Object.entries(data)) { if (v !== undefined) { fields.push(`${k} = ?`); values.push(v); } }
        if (!fields.length) return; values.push(id);
        await db.query(`UPDATE courses SET ${fields.join(', ')} WHERE id = ?`, values);
    }
    static async delete(id) { await db.query('DELETE FROM courses WHERE id = ?', [id]); }
    static async getByDepartment(deptId) { const [rows] = await db.query('SELECT * FROM courses WHERE department_id = ?', [deptId]); return rows; }
}
module.exports = Course;
