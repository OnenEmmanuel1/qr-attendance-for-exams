/* ═══════════════════════════════════════════════════════════
   Main JavaScript — QR Exam Attendance System
   ═══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', function () {

    // ─── Flash Message Auto-Dismiss ──────────────────────────
    const flashMessages = document.querySelectorAll('.flash-message');
    flashMessages.forEach(function (msg) {
        setTimeout(function () {
            msg.style.animation = 'flashSlideOut 0.3s ease forwards';
            setTimeout(function () { msg.remove(); }, 300);
        }, 5000);
    });

    // Add slide-out animation
    const style = document.createElement('style');
    style.textContent = '@keyframes flashSlideOut { to { transform: translateX(100%); opacity: 0; } }';
    document.head.appendChild(style);

    // ─── Mobile Menu Toggle ──────────────────────────────────
    const mobileToggle = document.getElementById('mobileMenuToggle');
    const mobileClose = document.getElementById('mobileMenuClose');
    const navLinks = document.getElementById('navLinks');
    if (mobileToggle && navLinks) {
        mobileToggle.addEventListener('click', function (e) {
            e.stopPropagation();
            navLinks.classList.toggle('show');
        });
    }
    if (mobileClose && navLinks) {
        mobileClose.addEventListener('click', function (e) {
            e.stopPropagation();
            navLinks.classList.remove('show');
        });
    }
    // Close mobile menu when clicking outside
    document.addEventListener('click', function (e) {
        if (navLinks && navLinks.classList.contains('show')) {
            if (!navLinks.contains(e.target) && e.target !== mobileToggle) {
                navLinks.classList.remove('show');
            }
        }
    });

    // ─── Sidebar Toggle (Dashboard) ─────────────────────────
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('dashboardSidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function () {
            sidebar.classList.toggle('show');
            if (sidebarOverlay) sidebarOverlay.classList.toggle('show');
        });
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', function () {
            sidebar.classList.remove('show');
            sidebarOverlay.classList.remove('show');
        });
    }

    // ─── User Menu Dropdown ──────────────────────────────────
    function setupUserMenu(triggerId, dropdownId) {
        const trigger = document.getElementById(triggerId);
        const dropdown = document.getElementById(dropdownId);
        if (trigger && dropdown) {
            trigger.addEventListener('click', function (e) {
                e.stopPropagation();
                dropdown.classList.toggle('show');
            });
        }
    }

    setupUserMenu('userMenuTrigger', 'userDropdown');
    setupUserMenu('topbarUserTrigger', 'topbarUserDropdown');

    // Close dropdowns when clicking outside
    document.addEventListener('click', function () {
        document.querySelectorAll('.user-dropdown.show').forEach(function (d) {
            d.classList.remove('show');
        });
    });

    // ─── Password Toggle ────────────────────────────────────
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('loginPassword');
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function () {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.querySelector('i').classList.toggle('bi-eye');
            this.querySelector('i').classList.toggle('bi-eye-slash');
        });
    }

    // ─── Notification Polling ────────────────────────────────
    const notificationBadge = document.getElementById('notificationBadge');
    if (notificationBadge) {
        function checkNotifications() {
            fetch('/api/notifications/count')
                .then(function (res) { return res.json(); })
                .then(function (data) {
                    if (data.count > 0) {
                        notificationBadge.textContent = data.count;
                        notificationBadge.style.display = 'flex';
                    } else {
                        notificationBadge.style.display = 'none';
                    }
                })
                .catch(function () { });
        }
        checkNotifications();
        setInterval(checkNotifications, 30000); // Poll every 30 seconds
    }

    // ─── Settings Navigation ─────────────────────────────────
    const settingsNavLinks = document.querySelectorAll('.settings-nav a');
    settingsNavLinks.forEach(function (link) {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            settingsNavLinks.forEach(function (l) { l.classList.remove('active'); });
            this.classList.add('active');
            const targetId = this.getAttribute('href').substring(1);
            document.querySelectorAll('.settings-section').forEach(function (section) {
                section.style.display = section.id === targetId ? 'block' : 'none';
            });
        });
    });

    // ─── Confirm Delete ──────────────────────────────────────
    window.confirmDelete = function (url, name) {
        if (confirm('Are you sure you want to delete "' + name + '"? This action cannot be undone.')) {
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = url;
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = '_method';
            input.value = 'DELETE';
            form.appendChild(input);
            document.body.appendChild(form);
            form.submit();
        }
    };

    // ─── Native Table Pagination & Sorting Helper ─────────────
    function setupTableHelper() {
        const tables = document.querySelectorAll('.table-custom');
        tables.forEach(table => {
            if (table.dataset.tableHelperInitialized) return;
            table.dataset.tableHelperInitialized = "true";

            let currentPage = 1;
            const rowsPerPage = 10;
            
            // 1. Setup Sorting
            const headers = table.querySelectorAll('thead th');
            headers.forEach((header, colIndex) => {
                const headerText = header.innerText.trim();
                // Skip sorting for serial numbers, checkboxes or action column headers
                if (headerText === '#' || headerText === '' || headerText.toLowerCase() === 'actions') return;

                header.style.cursor = 'pointer';
                header.title = 'Click to sort by ' + headerText;
                header.innerHTML += ' <i class="bi bi-arrow-down-up ms-1" style="font-size: 0.7rem; opacity: 0.5;"></i>';

                let ascending = true;
                header.addEventListener('click', () => {
                    sortTable(table, colIndex, ascending);
                    ascending = !ascending;
                    
                    headers.forEach(h => {
                        const icon = h.querySelector('i');
                        if (icon) icon.className = 'bi bi-arrow-down-up ms-1';
                    });
                    const currentIcon = header.querySelector('i');
                    if (currentIcon) {
                        currentIcon.className = ascending ? 'bi bi-arrow-up ms-1' : 'bi bi-arrow-down ms-1';
                    }
                    paginateTable(table);
                });
            });

            // 2. Setup Pagination Container
            const tableWrapper = table.closest('.table-wrapper') || table.parentElement;
            const paginationContainer = document.createElement('div');
            paginationContainer.className = 'pagination-custom';
            paginationContainer.innerHTML = `
                <div class="pagination-info">Showing 0 to 0 of 0 entries</div>
                <div class="pagination-buttons"></div>
            `;
            tableWrapper.after(paginationContainer);

            function sortTable(table, colIndex, asc) {
                const tbody = table.querySelector('tbody');
                const rows = Array.from(tbody.querySelectorAll('tr'));
                if (rows.length <= 1 && rows[0].querySelector('.empty-state')) return;

                rows.sort((rowA, rowB) => {
                    if (!rowA.cells[colIndex] || !rowB.cells[colIndex]) return 0;
                    const cellA = rowA.cells[colIndex].textContent.trim();
                    const cellB = rowB.cells[colIndex].textContent.trim();
                    
                    const numA = parseFloat(cellA.replace(/[^\d.-]/g, ''));
                    const numB = parseFloat(cellB.replace(/[^\d.-]/g, ''));
                    if (!isNaN(numA) && !isNaN(numB)) {
                        return asc ? numA - numB : numB - numA;
                    }
                    
                    return asc 
                        ? cellA.localeCompare(cellB, undefined, { numeric: true, sensitivity: 'base' })
                        : cellB.localeCompare(cellA, undefined, { numeric: true, sensitivity: 'base' });
                });

                tbody.innerHTML = '';
                rows.forEach(row => tbody.appendChild(row));
            }

            function paginateTable(table) {
                const tbody = table.querySelector('tbody');
                const allRows = Array.from(tbody.querySelectorAll('tr'));
                if (allRows.length === 0 || (allRows.length === 1 && allRows[0].querySelector('.empty-state'))) {
                    paginationContainer.style.display = 'none';
                    return;
                }

                // Check visible rows (searchTable() hides rows by setting display = 'none')
                const visibleRows = allRows.filter(row => row.style.display !== 'none');
                const totalVisible = visibleRows.length;
                const totalPages = Math.ceil(totalVisible / rowsPerPage) || 1;

                if (currentPage > totalPages) currentPage = totalPages;
                if (currentPage < 1) currentPage = 1;

                visibleRows.forEach((row, index) => {
                    const start = (currentPage - 1) * rowsPerPage;
                    const end = start + rowsPerPage;
                    if (index >= start && index < end) {
                        row.classList.remove('pagination-hidden');
                    } else {
                        row.classList.add('pagination-hidden');
                    }
                });

                const startEntry = totalVisible === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
                const endEntry = Math.min(currentPage * rowsPerPage, totalVisible);
                const infoText = paginationContainer.querySelector('.pagination-info');
                if (infoText) {
                    infoText.textContent = `Showing ${startEntry} to ${endEntry} of ${totalVisible} entries ${totalVisible !== allRows.length ? `(filtered)` : ''}`;
                }

                const btnContainer = paginationContainer.querySelector('.pagination-buttons');
                if (btnContainer) {
                    btnContainer.innerHTML = '';
                    
                    const prevBtn = document.createElement('button');
                    prevBtn.innerHTML = '<i class="bi bi-chevron-left"></i>';
                    prevBtn.disabled = currentPage === 1;
                    prevBtn.addEventListener('click', () => {
                        currentPage--;
                        paginateTable(table);
                    });
                    btnContainer.appendChild(prevBtn);

                    for (let i = 1; i <= totalPages; i++) {
                        const pageBtn = document.createElement('button');
                        pageBtn.textContent = i;
                        if (i === currentPage) pageBtn.className = 'active';
                        pageBtn.addEventListener('click', () => {
                            currentPage = i;
                            paginateTable(table);
                        });
                        btnContainer.appendChild(pageBtn);
                    }

                    const nextBtn = document.createElement('button');
                    nextBtn.innerHTML = '<i class="bi bi-chevron-right"></i>';
                    nextBtn.disabled = currentPage === totalPages;
                    nextBtn.addEventListener('click', () => {
                        currentPage++;
                        paginateTable(table);
                    });
                    btnContainer.appendChild(nextBtn);
                }

                paginationContainer.style.display = totalVisible > 0 ? 'flex' : 'none';
            }

            paginateTable(table);

            // Observe visibility mutations to re-trigger pagination
            const tbody = table.querySelector('tbody');
            const observer = new MutationObserver(() => {
                observer.disconnect();
                paginateTable(table);
                observer.observe(tbody, { attributes: true, childList: true, subtree: true, attributeFilter: ['style'] });
            });
            observer.observe(tbody, { attributes: true, childList: true, subtree: true, attributeFilter: ['style'] });
        });
    }

    setupTableHelper();
});
