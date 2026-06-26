-- ═══════════════════════════════════════════════════════════
-- Database Schema — QR Code Exam Attendance System
-- ═══════════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS qr_exam_attendance_system;
USE qr_exam_attendance_system;

-- ─── 1. Departments ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(10) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── 2. Users (Central Auth) ────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('student','lecturer','admin') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    reset_token VARCHAR(255) DEFAULT NULL,
    reset_token_expires DATETIME DEFAULT NULL,
    last_login DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── 3. Students ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    matric_number VARCHAR(20) DEFAULT NULL UNIQUE,
    department_id INT DEFAULT NULL,
    level ENUM('100','200','300','400','500') DEFAULT '100',
    passport_url VARCHAR(255) DEFAULT NULL,
    phone VARCHAR(20) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

-- ─── 4. Lecturers ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lecturers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    staff_id VARCHAR(20) DEFAULT NULL UNIQUE,
    department_id INT DEFAULT NULL,
    phone VARCHAR(20) DEFAULT NULL,
    passport_url VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

-- ─── 5. Admins ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    phone VARCHAR(20) DEFAULT NULL,
    passport_url VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─── 6. Courses ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS courses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(10) NOT NULL UNIQUE,
    title VARCHAR(100) NOT NULL,
    department_id INT DEFAULT NULL,
    credit_units INT DEFAULT 3,
    level ENUM('100','200','300','400','500') DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

-- ─── 7. Examinations ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS examinations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    lecturer_id INT DEFAULT NULL,
    venue VARCHAR(100) DEFAULT NULL,
    exam_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    semester ENUM('first','second') NOT NULL DEFAULT 'first',
    academic_year VARCHAR(9) NOT NULL,
    status ENUM('scheduled','ongoing','completed','cancelled') DEFAULT 'scheduled',
    qr_token VARCHAR(255) DEFAULT NULL,
    qr_image_url VARCHAR(255) DEFAULT NULL,
    created_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (lecturer_id) REFERENCES lecturers(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ─── 8. QR Codes ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qr_codes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    examination_id INT NOT NULL,
    qr_data TEXT NOT NULL,
    qr_image_url VARCHAR(255) DEFAULT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    is_used BOOLEAN DEFAULT FALSE,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (examination_id) REFERENCES examinations(id) ON DELETE CASCADE,
    UNIQUE KEY unique_student_exam (student_id, examination_id)
);

-- ─── 9. Attendance Records ──────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    examination_id INT NOT NULL,
    qr_code_id INT DEFAULT NULL,
    status ENUM('present','absent','late') DEFAULT 'present',
    scanned_by INT DEFAULT NULL,
    scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    location VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (examination_id) REFERENCES examinations(id) ON DELETE CASCADE,
    FOREIGN KEY (qr_code_id) REFERENCES qr_codes(id) ON DELETE SET NULL,
    FOREIGN KEY (scanned_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_attendance (student_id, examination_id)
);

-- ─── 10. Attendance Logs (Audit Trail) ──────────────────────
CREATE TABLE IF NOT EXISTS attendance_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    attendance_id INT DEFAULT NULL,
    action ENUM('scan_success','scan_failed','duplicate_attempt','expired_qr','suspicious') NOT NULL,
    details TEXT DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    performed_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (attendance_id) REFERENCES attendance_records(id) ON DELETE SET NULL,
    FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ─── 11. Reports ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    type ENUM('attendance','examination','department','summary') NOT NULL,
    examination_id INT DEFAULT NULL,
    generated_by INT DEFAULT NULL,
    file_url VARCHAR(255) DEFAULT NULL,
    format ENUM('pdf','excel') DEFAULT 'pdf',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (examination_id) REFERENCES examinations(id) ON DELETE SET NULL,
    FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ─── 12. Notifications ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('attendance','examination','system','report') DEFAULT 'system',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─── Indexes for Performance ────────────────────────────────
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_students_matric ON students(matric_number);
CREATE INDEX idx_students_dept ON students(department_id);
CREATE INDEX idx_lecturers_staff ON lecturers(staff_id);
CREATE INDEX idx_examinations_date ON examinations(exam_date);
CREATE INDEX idx_examinations_status ON examinations(status);
CREATE INDEX idx_qr_codes_token ON qr_codes(token);
CREATE INDEX idx_attendance_exam ON attendance_records(examination_id);
CREATE INDEX idx_attendance_student ON attendance_records(student_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
