const db = require('../config/database');
class Department {
    static async getAll() { const [rows] = await db.query('SELECT * FROM departments ORDER BY name'); return rows; }
    static async findById(id) { const [rows] = await db.query('SELECT * FROM departments WHERE id = ?', [id]); return rows[0]; }
    static async create(name, code) { const [result] = await db.query('INSERT INTO departments (name, code) VALUES (?,?)', [name, code.toUpperCase()]); return result.insertId; }
    static async update(id, name, code) { await db.query('UPDATE departments SET name = ?, code = ? WHERE id = ?', [name, code, id]); }
    static async delete(id) { await db.query('DELETE FROM departments WHERE id = ?', [id]); }
}
module.exports = Department;
