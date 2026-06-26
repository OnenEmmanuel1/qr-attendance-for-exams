const db = require('../config/database');
class Notification {
    static async create({ user_id, title, message, type }) {
        await db.query('INSERT INTO notifications (user_id, title, message, type) VALUES (?,?,?,?)', [user_id, title, message, type || 'system']);
    }
    static async getByUser(userId, limit = 20) {
        const [rows] = await db.query('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?', [userId, limit]);
        return rows;
    }
    static async markRead(id) { await db.query('UPDATE notifications SET is_read = TRUE WHERE id = ?', [id]); }
    static async markAllRead(userId) { await db.query('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [userId]); }
    static async getUnreadCount(userId) {
        const [rows] = await db.query('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE', [userId]);
        return rows[0].count;
    }
}
module.exports = Notification;
