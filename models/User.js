const db = require('../config/database');

class User {
    static async findByEmail(email) {
        const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        return rows[0];
    }

    static async findByMatricNumber(matricNumber) {
        const [rows] = await db.query(
            'SELECT u.* FROM users u JOIN students s ON u.id = s.user_id WHERE s.matric_number = ?',
            [matricNumber]
        );
        return rows[0];
    }

    static async findById(id) {
        const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
        return rows[0];
    }

    static async create({ email, password, role }) {
        const [result] = await db.query(
            'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
            [email, password, role]
        );
        return result.insertId;
    }

    static async updatePassword(id, password) {
        await db.query('UPDATE users SET password = ? WHERE id = ?', [password, id]);
    }

    static async setResetToken(id, token, expires) {
        await db.query(
            'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
            [token, expires, id]
        );
    }

    static async findByResetToken(token) {
        const [rows] = await db.query(
            'SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
            [token]
        );
        return rows[0];
    }

    static async clearResetToken(id) {
        await db.query(
            'UPDATE users SET reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
            [id]
        );
    }

    static async updateLastLogin(id) {
        await db.query('UPDATE users SET last_login = NOW() WHERE id = ?', [id]);
    }

    static async toggleActive(id) {
        await db.query('UPDATE users SET is_active = NOT is_active WHERE id = ?', [id]);
    }
}

module.exports = User;
