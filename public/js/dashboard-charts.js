/* ═══════════════════════════════════════════════════════════
   Dashboard Charts — QR Exam Attendance System
   ═══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', function () {
    const ctx = document.getElementById('attendanceChart');
    if (!ctx) return;

    // Load Chart.js dynamically if not loaded
    if (typeof Chart === 'undefined') {
        const script = document.createElement('script');
        script.src = "https://cdn.jsdelivr.net/npm/chart.js";
        script.onload = initializeChart;
        document.head.appendChild(script);
    } else {
        initializeChart();
    }

    function initializeChart() {
        // Try fetching actual stats from api
        fetch('/api/stats/attendance')
            .then(res => res.json())
            .then(data => {
                renderChart(data.labels, data.present, data.absent);
            })
            .catch(err => {
                console.warn('Could not load live chart stats, using fallback mock data:', err);
                // Fallback mock data
                renderChart(
                    ['CSC 101', 'CSC 201', 'MTH 101', 'CSC 301', 'GST 111'],
                    [45, 38, 55, 30, 80],
                    [5, 2, 8, 0, 12]
                );
            });
    }

    function renderChart(labels, presentData, absentData) {
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Present',
                        data: presentData,
                        backgroundColor: '#073EB8', // Primary Approved
                        borderRadius: 4,
                        borderWidth: 0
                    },
                    {
                        label: 'Absent',
                        data: absentData,
                        backgroundColor: '#E63946', // Red accent
                        borderRadius: 4,
                        borderWidth: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            font: { family: 'Inter', size: 12 },
                            color: '#435E6E' // Secondary Text Approved
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { font: { family: 'Inter' }, color: '#435E6E' }
                    },
                    y: {
                        grid: { color: '#EAEAEA' },
                        ticks: { font: { family: 'Inter' }, color: '#435E6E' },
                        beginAtZero: true
                    }
                }
            }
        });
    }
});
