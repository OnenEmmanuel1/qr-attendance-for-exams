const mysql = require('mysql2');

// ─── MySQL Connection Pool ──────────────────────────────────────
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'qr_exam_attendance_system',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// ─── Promise Wrapper ─────────────────────────────────────────────
const promisePool = pool.promise();

// ─── Test Connection ─────────────────────────────────────────────
pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
        if (err.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('   Check your DB_USER and DB_PASSWORD in .env');
        } else if (err.code === 'ER_BAD_DB_ERROR') {
            console.error('   Database does not exist. Run: node config/seed.js');
        } else if (err.code === 'ECONNREFUSED') {
            console.error('   MySQL server is not running. Start MySQL service.');
        }
        return;
    }
    if (connection) {
        console.log('✅ Database connected successfully');
        connection.release();
    }
});

module.exports = promisePool;
