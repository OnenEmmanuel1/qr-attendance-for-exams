const multer = require('multer');
const path = require('path');

const fs = require('fs');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dest = path.join(__dirname, '..', 'uploads', 'passports');
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        cb(null, dest);
    },
    filename: function (req, file, cb) {
        const uniqueName = `passport_${Date.now()}_${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const fileFilter = function (req, file, cb) {
    const allowed = /jpeg|jpg|png/;
    const extname = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowed.test(file.mimetype);
    if (extname && mimetype) { cb(null, true); }
    else { cb(new Error('Only JPEG, JPG, and PNG images are allowed')); }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 2 * 1024 * 1024 } }); // 2MB

module.exports = upload;
