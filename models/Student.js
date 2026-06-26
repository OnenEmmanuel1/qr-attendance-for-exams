const db = require('../config/database');

class Student {
    static async findByUserId(userId) {
        const [rows] = await db.query(`
            SELECT s.*, u.email, u.is_active, d.name as department_name 
            FROM students s 
            JOIN users u ON s.user_id = u.id 
            LEFT JOIN departments d ON s.department_id = d.id 
            WHERE s.user_id = ?
        `, [userId]);
        return rows[0];
    }

    static async findById(id) {
        const [rows] = await db.query(`
            SELECT s.*, u.email, u.is_active, d.name as department_name 
            FROM students s 
            JOIN users u ON s.user_id = u.id 
            LEFT JOIN departments d ON s.department_id = d.id 
            WHERE s.id = ?
        `, [id]);
        return rows[0];
    }

    static async findByMatric(matricNumber) {
        const [rows] = await db.query('SELECT * FROM students WHERE matric_number = ?', [matricNumber]);
        return rows[0];
    }

    static async create({ user_id, first_name, last_name, matric_number, department_id, level, phone, passport_url }) {
        const [result] = await db.query(
            `INSERT INTO students (user_id, first_name, last_name, matric_number, department_id, level, phone, passport_url) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [user_id, first_name, last_name, matric_number || null, department_id || null, level || '100', phone || null, passport_url || null]
        );
        return result.insertId;
    }

    static async update(id, data) {
        const fields = [];
        const values = [];
        for (const [key, value] of Object.entries(data)) {
            if (value !== undefined) {
                fields.push(`${key} = ?`);
                values.push(value);
            }
        }
        if (fields.length === 0) return;
        values.push(id);
        await db.query(`UPDATE students SET ${fields.join(', ')} WHERE id = ?`, values);
    }

    static async updatePassport(id, passportUrl) {
        await db.query('UPDATE students SET passport_url = ? WHERE id = ?', [passportUrl, id]);
    }

    static async getAll() {
        const [rows] = await db.query(`
            SELECT s.*, u.email, u.is_active, d.name as department_name 
            FROM students s 
            JOIN users u ON s.user_id = u.id 
            LEFT JOIN departments d ON s.department_id = d.id 
            ORDER BY s.created_at DESC
        `);
        return rows;
    }

    static async count() {
        const [rows] = await db.query('SELECT COUNT(*) as count FROM students');
        return rows[0].count;
    }

    static async delete(id) {
        const student = await this.findById(id);
        if (student) {
            await db.query('DELETE FROM users WHERE id = ?', [student.user_id]);
        }
    }

    static async getByDepartmentAndLevel(departmentId, level) {
        const [rows] = await db.query(`
            SELECT s.*, u.email 
            FROM students s 
            JOIN users u ON s.user_id = u.id 
            WHERE s.department_id = ? AND s.level = ?
        `, [departmentId, level]);
        return rows;
    }
}

module.exports = Student;
