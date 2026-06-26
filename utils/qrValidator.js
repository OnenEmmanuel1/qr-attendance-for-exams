const QRCodeModel = require('../models/QRCode');
const AttendanceLog = require('../models/AttendanceLog');

async function validateQRCode(token, scannedBy, ipAddress) {
    const result = { valid: false, message: '', data: null };

    // Find QR code by token
    const qrCode = await QRCodeModel.findByToken(token);
    if (!qrCode) {
        result.message = 'Invalid QR code. Code not found in system.';
        await AttendanceLog.create({ action: 'scan_failed', details: 'Invalid token: ' + token.substring(0, 20), ip_address: ipAddress, performed_by: scannedBy });
        return result;
    }

    // Check if expired
    if (new Date(qrCode.expires_at) < new Date()) {
        result.message = 'QR code has expired.';
        await AttendanceLog.create({ action: 'expired_qr', details: `Expired QR for student ${qrCode.matric_number}`, ip_address: ipAddress, performed_by: scannedBy });
        return result;
    }

    // Check if already used
    if (qrCode.is_used) {
        result.message = 'QR code has already been used.';
        await AttendanceLog.create({ action: 'duplicate_attempt', details: `Duplicate scan for student ${qrCode.matric_number}`, ip_address: ipAddress, performed_by: scannedBy });
        return result;
    }

    // Check exam status
    if (qrCode.exam_status === 'cancelled') {
        result.message = 'This examination has been cancelled.';
        return result;
    }

    result.valid = true;
    result.message = 'QR code verified successfully.';
    result.data = {
        qr_id: qrCode.id,
        student_id: qrCode.student_id,
        examination_id: qrCode.examination_id,
        first_name: qrCode.first_name,
        last_name: qrCode.last_name,
        matric_number: qrCode.matric_number,
        passport_url: qrCode.passport_url,
        department_name: qrCode.department_name,
        course_code: qrCode.course_code,
        course_title: qrCode.course_title,
        exam_date: qrCode.exam_date,
        venue: qrCode.venue,
        start_time: qrCode.start_time,
        end_time: qrCode.end_time
    };
    return result;
}

module.exports = { validateQRCode };
