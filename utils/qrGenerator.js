const crypto = require('crypto');
const QRCodeLib = require('qrcode');
const path = require('path');
const fs = require('fs');
const QRCodeModel = require('../models/QRCode');
const Examination = require('../models/Examination');

async function generateQRCode(studentId, examId, matricNumber) {
    // Check for existing QR code
    const existing = await QRCodeModel.findByStudentExam(studentId, examId);
    if (existing) return existing;

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');

    // Create QR data payload
    const qrData = JSON.stringify({
        sid: studentId,
        eid: examId,
        matric: matricNumber,
        token: token,
        ts: Date.now()
    });

    // Encrypt the data
    const secret = process.env.SESSION_SECRET || 'default_key';
    const key = crypto.createHash('sha256').update(secret).digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(qrData, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const encryptedPayload = iv.toString('hex') + ':' + encrypted;

    // Generate QR code image
    const uploadsDir = path.join(__dirname, '..', 'uploads', 'qrcodes');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const fileName = `qr_${studentId}_${examId}_${Date.now()}.png`;
    const filePath = path.join(uploadsDir, fileName);
    const imageUrl = `/uploads/qrcodes/${fileName}`;

    await QRCodeLib.toFile(filePath, encryptedPayload, {
        errorCorrectionLevel: 'H',
        type: 'png',
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' }
    });

    // Calculate expiry
    const expiryHours = parseInt(process.env.QR_EXPIRY_HOURS) || 24;
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    // Store in database
    const id = await QRCodeModel.create({
        student_id: studentId,
        examination_id: examId,
        qr_data: encryptedPayload,
        qr_image_url: imageUrl,
        token: token,
        expires_at: expiresAt
    });

    return { id, token, qr_image_url: imageUrl, expires_at: expiresAt };
}

async function generateExamQRCode(examId) {
    // Check for existing QR code on examination
    const exam = await Examination.findById(examId);
    if (exam && exam.qr_token && exam.qr_image_url) {
        return { qr_image_url: exam.qr_image_url, qr_token: exam.qr_token };
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');

    // Create QR data payload
    const qrData = JSON.stringify({
        eid: examId,
        token: token,
        ts: Date.now()
    });

    // Encrypt the data
    const secret = process.env.SESSION_SECRET || 'default_key';
    const key = crypto.createHash('sha256').update(secret).digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(qrData, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const encryptedPayload = iv.toString('hex') + ':' + encrypted;

    // Generate QR code image
    const uploadsDir = path.join(__dirname, '..', 'uploads', 'qrcodes');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const fileName = `exam_qr_${examId}_${Date.now()}.png`;
    const filePath = path.join(uploadsDir, fileName);
    const imageUrl = `/uploads/qrcodes/${fileName}`;

    await QRCodeLib.toFile(filePath, encryptedPayload, {
        errorCorrectionLevel: 'H',
        type: 'png',
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' }
    });

    // Update in database
    await Examination.update(examId, {
        qr_token: token,
        qr_image_url: imageUrl
    });

    return { qr_token: token, qr_image_url: imageUrl };
}

module.exports = { generateQRCode, generateExamQRCode };
