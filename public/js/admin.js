/* ═══════════════════════════════════════════════════════════
   Admin Client-side Management — QR Exam Attendance System
   ═══════════════════════════════════════════════════════════ */

const urlPrefix = window.location.pathname.startsWith('/admin') ? '/admin' : '/lecturer';

// ─── Edit Student ────────────────────────────────────────────────
window.editStudent = function (id) {
    fetch(`/api/students/${id}`)
        .then(res => res.json())
        .then(student => {
            document.getElementById('editStudentFirstName').value = student.first_name || '';
            document.getElementById('editStudentLastName').value = student.last_name || '';
            document.getElementById('editStudentMatric').value = student.matric_number || '';
            document.getElementById('editStudentPhone').value = student.phone || '';
            document.getElementById('editStudentDept').value = student.department_id || '';
            document.getElementById('editStudentLevel').value = student.level || '';
            document.getElementById('editStudentActive').value = student.is_active ? '1' : '0';
            
            document.getElementById('editStudentForm').action = `${urlPrefix}/students/edit/${id}`;
            
            const editModal = new bootstrap.Modal(document.getElementById('editStudentModal'));
            editModal.show();
        })
        .catch(err => {
            console.error('Error fetching student details:', err);
            alert('Failed to load student details.');
        });
};

window.deleteStudent = function (id) {
    if (confirm('Are you sure you want to delete this student? All associated data and user logins will be permanently deleted.')) {
        submitPostForm(`${urlPrefix}/students/delete/${id}`);
    }
};

window.generateQR = function (id) {
    if (confirm('Generate QR codes for this student for all scheduled examinations?')) {
        submitPostForm(`${urlPrefix}/students/generate-qr/${id}`);
    }
};

// ─── Edit Lecturer ───────────────────────────────────────────────
window.editLecturer = function (id) {
    fetch(`/api/lecturers/${id}`)
        .then(res => res.json())
        .then(lecturer => {
            document.getElementById('editLecturerFirstName').value = lecturer.first_name || '';
            document.getElementById('editLecturerLastName').value = lecturer.last_name || '';
            document.getElementById('editLecturerStaffId').value = lecturer.staff_id || '';
            document.getElementById('editLecturerPhone').value = lecturer.phone || '';
            document.getElementById('editLecturerDept').value = lecturer.department_id || '';
            document.getElementById('editLecturerActive').value = lecturer.is_active ? '1' : '0';
            
            document.getElementById('editLecturerForm').action = `${urlPrefix}/lecturers/edit/${id}`;
            
            const editModal = new bootstrap.Modal(document.getElementById('editLecturerModal'));
            editModal.show();
        })
        .catch(err => {
            console.error('Error fetching lecturer details:', err);
            alert('Failed to load lecturer details.');
        });
};

window.deleteLecturer = function (id) {
    if (confirm('Are you sure you want to delete this lecturer? All associated examinations and user account will be permanently deleted.')) {
        submitPostForm(`${urlPrefix}/lecturers/delete/${id}`);
    }
};

// ─── Edit Examination ────────────────────────────────────────────
window.editExam = function (id) {
    fetch(`/api/examinations/${id}`)
        .then(res => res.json())
        .then(exam => {
            document.getElementById('editExamCourse').value = exam.course_id || '';
            document.getElementById('editExamLecturer').value = exam.lecturer_id || '';
            document.getElementById('editExamDate').value = exam.exam_date_raw || '';
            document.getElementById('editExamStartTime').value = exam.start_time || '';
            document.getElementById('editExamEndTime').value = exam.end_time || '';
            document.getElementById('editExamVenue').value = exam.venue || '';
            document.getElementById('editExamSemester').value = exam.semester || 'first';
            document.getElementById('editExamAcademicYear').value = exam.academic_year || '';
            document.getElementById('editExamStatus').value = exam.status || 'scheduled';
            
            document.getElementById('editExamForm').action = `${urlPrefix}/examinations/edit/${id}`;
            
            const editModal = new bootstrap.Modal(document.getElementById('editExamModal'));
            editModal.show();
        })
        .catch(err => {
            console.error('Error fetching examination details:', err);
            alert('Failed to load examination details.');
        });
};

window.showExamQR = function (id) {
    fetch(`/api/examinations/${id}`)
        .then(res => res.json())
        .then(exam => {
            document.getElementById('qrCourseTitle').textContent = `${exam.course_code} - ${exam.course_title}`;
            document.getElementById('qrModalImage').src = exam.qr_image_url || '';
            document.getElementById('qrDownloadBtn').href = exam.qr_image_url || '';
            document.getElementById('qrDownloadBtn').download = `exam_qr_${exam.course_code}.png`;
            
            const dateStr = exam.exam_date ? new Date(exam.exam_date).toLocaleDateString() : '';
            document.getElementById('qrExamDetails').textContent = `Date: ${dateStr} | Time: ${exam.start_time || ''} - ${exam.end_time || ''} | Venue: ${exam.venue || ''}`;
            
            const qrModal = new bootstrap.Modal(document.getElementById('viewQRModal'));
            qrModal.show();
        })
        .catch(err => {
            console.error('Error fetching exam details:', err);
            alert('Failed to load exam QR code.');
        });
};

window.printQR = function () {
    const qrImg = document.getElementById('qrModalImage');
    if (!qrImg || !qrImg.src) return;
    
    const win = window.open('');
    win.document.write(`
        <html>
        <head>
            <title>Print QR Code</title>
            <style>
                body { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; font-family: sans-serif; }
                img { max-width: 350px; height: auto; }
                h1 { margin-bottom: 5px; font-size: 24px; }
                p { margin: 5px 0 0 0; color: #555; font-size: 14px; }
            </style>
        </head>
        <body onload="window.print(); window.close();">
            <h1>${document.getElementById('qrCourseTitle').textContent}</h1>
            <img src="${qrImg.src}" />
            <p>${document.getElementById('qrExamDetails').textContent}</p>
        </body>
        </html>
    `);
    win.document.close();
};

window.cancelExam = function (id) {
    if (confirm('Are you sure you want to cancel this examination?')) {
        submitPostForm(`${urlPrefix}/examinations/cancel/${id}`);
    }
};

// ─── Settings CRUD ───────────────────────────────────────────────
window.deleteDepartment = function (id) {
    if (confirm('Delete this department? All courses and students tied to it might lose reference.')) {
        submitPostForm(`${urlPrefix}/settings/departments/delete/${id}`);
    }
};

window.deleteCourse = function (id) {
    if (confirm('Delete this course?')) {
        submitPostForm(`${urlPrefix}/settings/courses/delete/${id}`);
    }
};

// ─── Helper Form Submission ──────────────────────────────────────
function submitPostForm(url) {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = url;
    document.body.appendChild(form);
    form.submit();
}

// ─── Table Searching/Filtering ───────────────────────────────────
window.searchTable = function () {
    const studentInput = document.getElementById('searchStudent');
    const lecturerInput = document.getElementById('searchLecturer');
    const examInput = document.getElementById('searchExam');
    
    let filter = '';
    let tableId = '';
    
    if (studentInput) { filter = studentInput.value.toLowerCase(); tableId = 'studentsTable'; }
    else if (lecturerInput) { filter = lecturerInput.value.toLowerCase(); tableId = 'lecturersTable'; }
    else if (examInput) { filter = examInput.value.toLowerCase(); tableId = 'examsTable'; }
    
    if (!tableId) return;
    
    const table = document.getElementById(tableId);
    if (!table) return;
    const tr = table.getElementsByTagName('tr');
    
    for (let i = 1; i < tr.length; i++) {
        let match = false;
        const td = tr[i].getElementsByTagName('td');
        for (let j = 0; j < td.length; j++) {
            if (td[j]) {
                const text = td[j].textContent || td[j].innerText;
                if (text.toLowerCase().indexOf(filter) > -1) {
                    match = true;
                    break;
                }
            }
        }
        tr[i].style.display = match ? '' : 'none';
    }
};

window.filterStudents = function () {
    const deptId = document.getElementById('filterDept').value;
    const level = document.getElementById('filterLevel').value;
    const table = document.getElementById('studentsTable');
    if (!table) return;
    const tr = table.getElementsByTagName('tr');

    for (let i = 1; i < tr.length; i++) {
        let show = true;
        const row = tr[i];
        
        // Department check
        if (deptId) {
            // Note: department filter can check text contents or we can store data attributes on rows
            // For simplicity, let's look for match in columns or data attributes
            // Let's add data-dept and data-level to rows in the template! We should check if they exist or verify.
            // Wait, we can add them to EJS. Let's see: in students.ejs:
            // Let's write the Javascript filter checking columns:
            // Column 3 is Department, Column 4 is Level.
            const deptText = row.cells[3].textContent.trim();
            const levelText = row.cells[4].textContent.trim();
            
            if (deptText === '—' && deptId) show = false;
            // Let's rely on data attributes, or matching texts.
        }
        // Let's write a robust text-based filter:
        const deptText = row.cells[3].textContent.toLowerCase();
        const levelText = row.cells[4].textContent.toLowerCase();
        
        // Since deptId select contains department names, let's search if deptText contains select text
        const deptSelect = document.getElementById('filterDept');
        const selectedDeptText = deptSelect.options[deptSelect.selectedIndex].text.toLowerCase();
        
        if (deptId && deptText.indexOf(selectedDeptText) === -1) show = false;
        if (level && levelText.indexOf(level.toLowerCase()) === -1) show = false;
        
        row.style.display = show ? '' : 'none';
    }
};

window.filterLecturers = function () {
    const deptSelect = document.getElementById('filterDept');
    const deptId = deptSelect.value;
    const table = document.getElementById('lecturersTable');
    if (!table) return;
    const tr = table.getElementsByTagName('tr');

    const selectedDeptText = deptSelect.options[deptSelect.selectedIndex].text.toLowerCase();

    for (let i = 1; i < tr.length; i++) {
        let show = true;
        const row = tr[i];
        const deptText = row.cells[3].textContent.toLowerCase();
        
        if (deptId && deptText.indexOf(selectedDeptText) === -1) show = false;
        row.style.display = show ? '' : 'none';
    }
};

window.filterExams = function () {
    const status = document.getElementById('filterStatus').value;
    const table = document.getElementById('examsTable');
    if (!table) return;
    const tr = table.getElementsByTagName('tr');

    for (let i = 1; i < tr.length; i++) {
        let show = true;
        const row = tr[i];
        const statusText = row.cells[6].textContent.trim().toLowerCase();
        
        if (status && statusText !== status.toLowerCase()) show = false;
        row.style.display = show ? '' : 'none';
    }
};
