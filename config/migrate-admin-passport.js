const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
    console.log('🔄 Checking database for admin passport migration...');
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'qr_exam_attendance_system',
        port: process.env.DB_PORT || 3306
    });

    try {
        // Check if column exists
        const [columns] = await connection.query('SHOW COLUMNS FROM admins LIKE "passport_url"');
        if (columns.length === 0) {
            console.log('➕ Column passport_url does not exist on table admins. Adding column...');
            await connection.query('ALTER TABLE admins ADD COLUMN passport_url VARCHAR(255) DEFAULT NULL AFTER phone');
            console.log('✅ Column passport_url successfully added to table admins!');
        } else {
            console.log('✅ Column passport_url already exists on table admins.');
        }
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    } finally {
        await connection.end();
    }
}

migrate();
