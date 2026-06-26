const db = require('../config/database');
class AttendanceLog {
    static async create({ attendance_id, action, details, ip_address, performed_by }) {
        await db.query('INSERT INTO attendance_logs (attendance_id, action, details, ip_address, performed_by) VALUES (?,?,?,?,?)',
            [attendance_id || null, action, details || null, ip_address || null, performed_by || null]);
    }
    static async getRecent(limit = 20) {
        const [rows] = await db.query('SELECT * FROM attendance_logs ORDER BY created_at DESC LIMIT ?', [limit]);
        return rows;
    }
    static async getSuspicious() {
        const [rows] = await db.query("SELECT * FROM attendance_logs WHERE action IN ('duplicate_attempt','expired_qr','suspicious') ORDER BY created_at DESC LIMIT 50");
        return rows;
    }
    static async countSuspicious() {
        const [rows] = await db.query("SELECT COUNT(*) as count FROM attendance_logs WHERE action IN ('duplicate_attempt','expired_qr','suspicious')");
        return rows[0].count;
    }
}
module.exports = AttendanceLog;
