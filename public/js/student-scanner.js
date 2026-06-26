/* ═══════════════════════════════════════════════════════════
   Student QR Scanner Script — QR Exam Attendance System
   ═══════════════════════════════════════════════════════════ */

let html5QrcodeScanner = null;
let currentScannedData = null; // Holds the last validated scan result

// Load html5-qrcode library dynamically if not loaded
if (typeof Html5Qrcode === 'undefined') {
    const script = document.createElement('script');
    script.src = "https://unpkg.com/html5-qrcode";
    document.head.appendChild(script);
}

// ─── Start/Stop Scanner ──────────────────────────────────────────
window.startScanner = function () {
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
            showScanResult(result.data, 'Verified');
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

// ─── Confirm Attendance Action ───────────────────────────────────
window.confirmAttendance = function () {
    if (!currentScannedData) return;

    fetch('/api/scan/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            qr_id: null,
            student_id: currentScannedData.student_id,
            examination_id: currentScannedData.examination_id,
            status: 'present'
        })
    })
    .then(res => res.json())
    .then(res => {
        if (res.success) {
            alert(res.message || 'Attendance confirmed successfully!');
            window.location.href = '/student/attendance';
        } else {
            alert(res.message || 'Failed to record attendance.');
            resetResultCard();
        }
    })
    .catch(err => {
        console.error(err);
        alert('Error confirming attendance.');
        resetResultCard();
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

function showScanResult(data, badgeText) {
    currentScannedData = data;
    
    // Display result card
    const card = document.getElementById('scanResultCard');
    card.style.display = 'block';

    const statusBadge = document.getElementById('verificationStatus');
    const statusText = document.getElementById('verificationMessage');
    statusBadge.className = 'verification-status success';
    statusText.textContent = badgeText;

    // Student info displays
    document.getElementById('studentInfoDisplay').style.display = 'flex';
    document.getElementById('examDetailsList').style.display = 'block';

    // Exam info
    document.getElementById('examCourse').textContent = `${data.course_code} - ${data.course_title}`;
    document.getElementById('examVenue').textContent = data.venue;
    document.getElementById('examDate').textContent = data.exam_date;

    // Show action buttons
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

window.resetResultCard = function () {
    const card = document.getElementById('scanResultCard');
    card.style.display = 'none';
    
    // Restore elements for next scans
    document.getElementById('studentInfoDisplay').style.display = 'flex';
    document.getElementById('examDetailsList').style.display = 'block';
    
    currentScannedData = null;
    updateScannerStatus('idle', 'Scanner Ready');
};
