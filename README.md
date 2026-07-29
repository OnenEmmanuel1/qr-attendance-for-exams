# QR Code Examination Attendance Management System 🎓📱

A comprehensive, role-based Web Application built with **Node.js**, **Express**, **EJS**, and **MySQL** for automating examination attendance tracking using dynamic **QR Code** validation.

---

## 📌 Features

### 🔑 Authentication & Security
- Role-based authentication (**Admin**, **Lecturer**, **Student**).
- Passwords hashed with `bcryptjs`.
- Session management with `express-session`.
- HTTP Security headers via `helmet`.
- File upload restriction & management using `multer`.

### 🛡️ Admin Portal
- **Dashboard**: High-level system stats and real-time attendance graphs powered by `Chart.js`.
- **User Management**: Add, edit, and delete Students and Lecturers; assign departments, courses, matric numbers, and passport photos.
- **Academic Management**: Configure Departments and Courses (Credit units, Level).
- **Exam Management**: Schedule, edit, or cancel examinations; trigger batch/individual QR code generation.
- **Reporting & Analytics**: View filterable attendance logs and export comprehensive reports in **PDF** (`pdfkit`) and **Excel** (`exceljs`).

### 👨‍🏫 Lecturer Portal
- **QR Code Scanner**: Interactive scanner view to validate student QR passes, approve or reject check-in entries in real-time, or use manual student lookup.
- **Exam & Student Tracking**: Manage associated courses, schedule exams, and review attendance records for assigned modules.
- **Data Export**: Download attendance logs as PDF or Excel files.

### 🎓 Student Portal
- **Digital Exam Pass**: Generate dynamic QR codes linked to student identity and registered exams.
- **Attendance Record**: View detailed history of verified exam attendances.
- **Profile Management**: Update contact info and upload passport photos.

---

## 🛠️ Technology Stack

- **Backend**: Node.js, Express.js
- **Template Engine**: EJS with `express-ejs-layouts`
- **Database**: MySQL 8.0+ (via `mysql2` connection pool & promise interface)
- **QR Generator & Validator**: `qrcode`
- **File Uploads**: `multer`
- **Export Tools**: `pdfkit` (PDF), `exceljs` (Excel)
- **Charts & UI**: `Chart.js`, Vanilla CSS, Responsive Layouts

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [npm](https://www.npmjs.com/) (bundled with Node.js)
- [MySQL Server](https://www.mysql.com/) (or XAMPP / WAMP / MariaDB)

---

### Installation & Setup

1. **Clone or Navigate to the Repository**
   ```bash
   cd "c:/Users/USER/Desktop/project/nodejs  back-end/EJS/school project sw/QR code exams"
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the root directory (or update the existing `.env`) with your configuration:
   ```env
   PORT=3000
   NODE_ENV=development
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=qr_exam_attendance_system
   DB_PORT=3306
   SESSION_SECRET=your_super_secret_session_key
   APP_NAME="QR Exam Attendance System"
   ```

4. **Initialize Database & Seed Default Data**
   Run the seed script to automatically create the database (`qr_exam_attendance_system`), set up the database tables (`config/schema.sql`), and insert sample data & accounts:
   ```bash
   npm run seed
   ```

---

## 🔑 Default Login Credentials

After running `npm run seed`, you can sign in using the following default demo accounts:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@qrexam.com` | `password123` |
| **Lecturer** | `lecturer@qrexam.com` | `password123` |
| **Student** | `student@qrexam.com` | `password123` |

---

## 🏃 Running the Application

### Development Mode (Auto-reload with Nodemon)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

Once started, open your web browser and navigate to:
```
http://localhost:3000
```

---

## 📁 Project Directory Structure

```
├── app.js                   # Application entry point & Express configuration
├── config/
│   ├── database.js          # MySQL connection pool & database helper
│   ├── multer.js            # Multer storage & file upload filters
│   ├── schema.sql           # Database table definitions
│   └── seed.js              # Database initialization & seed script
├── controllers/             # Request handlers for admin, lecturer, student & API
├── middleware/              # Auth guards (isAdmin, isLecturer, isStudent, etc.)
├── models/                  # Database models & query helpers
├── public/                  # Static assets (CSS, client-side JS, images)
├── routes/                  # Express routing modules
│   ├── admin.js
│   ├── api.js
│   ├── auth.js
│   ├── home.js
│   ├── lecturer.js
│   └── student.js
├── uploads/                 # Uploaded user profile passports
├── utils/                   # QR code generator, validator & report generator helpers
├── views/                   # EJS templates & layouts
├── package.json             # Node.js project manifest & scripts
└── README.md                # Project documentation
```

---

## 🔌 API & Endpoint Summary

- **Authentication**: `/auth/login`, `/auth/logout`
- **Admin**: `/admin/dashboard`, `/admin/students`, `/admin/lecturers`, `/admin/examinations`, `/admin/attendance-reports`, `/admin/settings`
- **Lecturer**: `/lecturer/dashboard`, `/lecturer/scanner`, `/lecturer/attendance`, `/lecturer/reports`
- **Student**: `/student/dashboard`, `/student/qrcode`, `/student/attendance`, `/student/profile`
- **API Utilities**: `/api/scan/validate`, `/api/scan/approve`, `/api/scan/reject`, `/api/notifications`, `/api/stats/attendance`

---

## 📜 License

This project is licensed under the **ISC License**.
