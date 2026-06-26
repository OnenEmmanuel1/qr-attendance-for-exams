/* ═══════════════════════════════════════════════════════════
   QR Scanner Script — QR Exam Attendance System
   ═══════════════════════════════════════════════════════════ */

let html5QrcodeScanner = null;
let currentScannedData = null; // Holds the last validated scan result
let sessionScans = []; // Session history list

// Load html5-qrcode library dynamically if not loaded
if (typeof Html5Qrcode === 'undefined') {
    const script = document.createElement('script');
    script.src = "https://unpkg.com/html5-qrcode";
    document.head.appendChild(script);
}

// ─── Start/Stop Scanner ──────────────────────────────────────────
window.startScanner = function () {
    const examSelect = document.getElementById('examSelect');
    if (!examSelect || !examSelect.value) {
        alert('Please select an examination first.');
        return;
    }

    document.getElementById('startScanBtn').style.display = 'none';
    document.getElementById('stopScanBtn').style.display = 'block';
    updateScannerStatus('active', 'Scanner Active. Waiting for QR code...');

    if (!html5QrcodeScanner) {
        html5QrcodeScanner = new Html5Qrcode("reader");
    }

    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    html5QrcodeScanner.start(
        { facingMode: "environment" },
        config,
        onScanSuccess,
        onScanFailure
    ).catch(err => {
        console.error('Unable to start scanner:', err);
        updateScannerStatus('error', 'Camera access failed.');
        stopScanner();
    });
};

window.stopScanner = function () {
    if (html5QrcodeScanner && html5QrcodeScanner.isScanning) {
        html5QrcodeScanner.stop().then(() => {
            document.getElementById('startScanBtn').style.display = 'block';
            document.getElementById('stopScanBtn').style.display = 'none';
            updateScannerStatus('idle', 'Scanner Stopped');
        }).catch(err => {
            console.error('Stop error:', err);
        });
    } else {
        document.getElementById('startScanBtn').style.display = 'block';
        document.getElementById('stopScanBtn').style.display = 'none';
        updateScannerStatus('idle', 'Scanner Stopped');
    }
};

function onScanSuccess(decodedText, decodedResult) {
    // Play beep sound or feedback
    stopScanner(); // Pause scanner during processing
    updateScannerStatus('processing', 'Processing scanned QR code...');
    
    // Send to backend API for decryption and validation
    fetch('/api/scan/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scannedData: decodedText })
    })
    .then(res => res.json())
    .then(result => {
        if (result.valid) {
            // Verify if the exam ID matches the selected exam
            const selectedExamId = document.getElementById('examSelect').value;
            if (String(result.data.examination_id) !== String(selectedExamId)) {
                showScanError('This QR code is for a different examination.');
                return;
            }
            showScanResult(result.data, true, 'Verified');
        } else {
            showScanError(result.message || 'Verification failed.');
        }
    })
    .catch(err => {
        console.error('Validation fetch error:', err);
        showScanError('Failed to validate QR code with server.');
    });
}

function onScanFailure(error) {
    // Silent fail for continuous scanner frame reading
}

// ─── Manual Lookup ───────────────────────────────────────────────
window.manualLookup = function (event) {
    if (event) event.preventDefault();
    const matricNumber = document.getElementById('manualMatric').value.trim();
    const examSelect = document.getElementById('examSelect');

    if (!examSelect || !examSelect.value) {
        alert('Please select an examination first.');
        return;
    }
    if (!matricNumber) {
        alert('Please enter a matric number.');
        return;
    }

    fetch('/api/scan/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matricNumber, examinationId: examSelect.value })
    })
    .then(res => res.json())
    .then(result => {
        if (result.found) {
            // Adapt manual lookup response to fit scanned display structure
            const studentData = {
                qr_id: null,
                student_id: result.student.id,
                examination_id: result.exam.id,
                first_name: result.student.first_name,
                last_name: result.student.last_name,
                matric_number: result.student.matric_number,
                passport_url: result.student.passport_url,
                department_name: result.student.department_name,
                course_code: result.exam.course_code,
                course_title: result.exam.course_title,
                venue: result.exam.venue,
                exam_date: result.exam.exam_date
            };
            showScanResult(studentData, false, 'Manual Lookup Successful');
        } else {
            alert(result.message || 'Student not found or not eligible.');
        }
    })
    .catch(err => {
        console.error('Manual lookup fetch error:', err);
        alert('Failed to connect to server.');
    });
};

// ─── Approve/Reject Actions ──────────────────────────────────────
window.approveAttendance = function () {
    if (!currentScannedData) return;

    fetch('/api/scan/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            qr_id: currentScannedData.qr_id,
            student_id: currentScannedData.student_id,
            examination_id: currentScannedData.examination_id,
            status: 'present'
        })
    })
    .then(res => res.json())
    .then(res => {
        if (res.success) {
            addToScanLog(currentScannedData, 'success');
            alert(res.message || 'Attendance approved successfully.');
            resetResultCard();
        } else {
            alert(res.message || 'Failed to record attendance.');
        }
    })
    .catch(err => {
        console.error(err);
        alert('Error approving attendance.');
    });
};

window.rejectScan = function () {
    if (!currentScannedData) return;
    const reason = prompt('Please enter the reason for rejection (optional):');
    if (reason === null) return; // User cancelled prompt

    fetch('/api/scan/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            student_id: currentScannedData.student_id,
            reason: reason
        })
    })
    .then(res => res.json())
    .then(res => {
        addToScanLog(currentScannedData, 'failed', reason);
        alert('Scan rejected and logged.');
        resetResultCard();
    })
    .catch(err => {
        console.error(err);
        alert('Error logging rejection.');
    });
};

// ─── DOM Manipulation Helpers ─────────────────────────────────────
function updateScannerStatus(state, text) {
    const statusText = document.getElementById('scannerStatusText');
    const statusIndicator = document.getElementById('scannerStatus');
    if (statusText) statusText.textContent = text;
    if (statusIndicator) {
        statusIndicator.className = 'status-indicator ' + state;
    }
}

function showScanResult(data, isQR, badgeText) {
    currentScannedData = data;
    
    // Display result card
    const card = document.getElementById('scanResultCard');
    card.style.display = 'block';

    const statusBadge = document.getElementById('verificationStatus');
    const statusText = document.getElementById('verificationMessage');
    statusBadge.className = 'verification-status success';
    statusText.textContent = badgeText;

    // Student info
    document.getElementById('studentName').textContent = `${data.first_name} ${data.last_name}`;
    document.getElementById('studentMatric').textContent = data.matric_number;
    document.getElementById('studentDept').textContent = data.department_name || '';
    
    const passportImg = document.getElementById('studentPassport');
    if (data.passport_url) {
        passportImg.src = `/uploads/${data.passport_url}`;
        passportImg.style.display = 'block';
    } else {
        passportImg.src = '';
        passportImg.style.display = 'none'; // Fallback to placeholder or hidden
    }

    // Exam info
    document.getElementById('examCourse').textContent = data.course_code;
    document.getElementById('examVenue').textContent = data.venue;
    document.getElementById('examDate').textContent = data.exam_date;

    // Show/hide approve reject action buttons
    document.getElementById('actionButtons').style.display = 'flex';
}

function showScanError(message) {
    const card = document.getElementById('scanResultCard');
    card.style.display = 'block';

    const statusBadge = document.getElementById('verificationStatus');
    const statusText = document.getElementById('verificationMessage');
    statusBadge.className = 'verification-status error';
    statusText.textContent = message;

    // Hide student/exam displays since scan failed
    document.getElementById('studentInfoDisplay').style.display = 'none';
    document.getElementById('examDetailsList').style.display = 'none';
    document.getElementById('actionButtons').style.display = 'none';
    
    currentScannedData = null;
}

function resetResultCard() {
    const card = document.getElementById('scanResultCard');
    card.style.display = 'none';
    
    // Restore elements for next scans
    document.getElementById('studentInfoDisplay').style.display = 'flex';
    document.getElementById('examDetailsList').style.display = 'block';
    
    currentScannedData = null;
}

function addToScanLog(data, status, reason = '') {
    sessionScans.unshift({
        name: `${data.first_name} ${data.last_name}`,
        matric: data.matric_number,
        course: data.course_code,
        time: new Date().toLocaleTimeString(),
        status: status,
        reason: reason
    });

    const countBadge = document.getElementById('scanCount');
    if (countBadge) countBadge.textContent = `${sessionScans.length} scans`;

    const logBody = document.getElementById('scanLogBody');
    const emptyLog = document.getElementById('scanLogEmpty');
    
    if (emptyLog) emptyLog.style.display = 'none';

    let listHtml = '';
    sessionScans.forEach(scan => {
        listHtml += `
            <div class="activity-item">
                <div class="activity-dot ${scan.status === 'success' ? 'success' : 'danger'}"></div>
                <div class="activity-content">
                    <div class="activity-title">${scan.name} (${scan.matric})</div>
                    <div class="activity-time">${scan.course} | ${scan.time} ${scan.reason ? ' - ' + scan.reason : ''}</div>
                </div>
                <span class="status-badge ${scan.status === 'success' ? 'present' : 'absent'}">
                    ${scan.status === 'success' ? 'Success' : 'Rejected'}
                </span>
            </div>
        `;
    });
    logBody.innerHTML = listHtml;
}
