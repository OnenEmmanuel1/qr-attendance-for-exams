/* ═══════════════════════════════════════════════════════════
   DataTables Initialization — QR Exam Attendance System
   ═══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', function () {
    const tables = document.querySelectorAll('.table-custom');
    if (tables.length === 0) return;

    // Load jQuery & DataTables dynamically if not already present
    if (typeof jQuery === 'undefined') {
        const jqScript = document.createElement('script');
        jqScript.src = "https://code.jquery.com/jquery-3.7.1.min.js";
        jqScript.onload = loadDataTables;
        document.head.appendChild(jqScript);
    } else {
        loadDataTables();
    }

    function loadDataTables() {
        // Load CSS
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = 'https://cdn.datatables.net/1.13.7/css/dataTables.bootstrap5.min.css';
        document.head.appendChild(cssLink);

        // Load JS
        const dtScript = document.createElement('script');
        dtScript.src = "https://cdn.datatables.net/1.13.7/js/jquery.dataTables.min.js";
        dtScript.onload = () => {
            const dtB5Script = document.createElement('script');
            dtB5Script.src = "https://cdn.datatables.net/1.13.7/js/dataTables.bootstrap5.min.js";
            dtB5Script.onload = initialize;
            document.head.appendChild(dtB5Script);
        };
        document.head.appendChild(dtScript);
    }

    function initialize() {
        $('.table-custom').each(function () {
            // Check if DataTable already initialized
            if ($.fn.DataTable.isDataTable(this)) return;

            $(this).DataTable({
                responsive: true,
                pageLength: 10,
                lengthMenu: [5, 10, 25, 50],
                language: {
                    search: "_INPUT_",
                    searchPlaceholder: "Search records..."
                },
                dom: '<"d-flex justify-content-between align-items-center mb-3"lf>t<"d-flex justify-content-between align-items-center mt-3"ip>'
            });
        });
    }
});
