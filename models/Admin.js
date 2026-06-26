const db = require('../config/database');
class Admin {
    static async findByUserId(userId) {
        const [rows] = await db.query(`
            SELECT a.*, u.email, u.is_active 
            FROM admins a 
            JOIN users u ON a.user_id = u.id 
            WHERE a.user_id = ?
        `, [userId]);
        return rows[0];
    }
    static async create({ user_id, first_name, last_name, phone }) {
        const [result] = await db.query('INSERT INTO admins (user_id, first_name, last_name, phone) VALUES (?,?,?,?)', [user_id, first_name, last_name, phone || null]);
        return result.insertId;
    }
    static async update(id, data) {
        const fields = [], values = [];
        for (const [key, val] of Object.entries(data)) { if (val !== undefined) { fields.push(`${key} = ?`); values.push(val); } }
        if (!fields.length) return; values.push(id);
        await db.query(`UPDATE admins SET ${fields.join(', ')} WHERE id = ?`, values);
    }
}
module.exports = Admin;
