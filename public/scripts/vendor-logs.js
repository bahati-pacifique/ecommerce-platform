// ============================================================
// LOGS MANAGER
// ============================================================

class LogsManager {
    constructor() {
        this.currentPage = 1;
        this.perPage = 25;
        this.totalPages = 1;
        this.totalLogs = 0;
        this.logs = [];
        this.filters = {
            search: '',
            type: 'all',
            dateFrom: '',
            dateTo: '',
            user: 'all'
        };
        this.selectedLog = null;
        this.isLoading = false;
        this.autoRefreshInterval = null;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupAutoRefresh();
        this.loadLogs();

        // Watch for logs tab activation
        const logsLink = document.querySelector('.sidebar-link[data-tab="logs"]');
        if (logsLink) {
            logsLink.addEventListener('click', () => {
                this.loadLogs();
            });
        }
    }

    setupEventListeners() {
        // Refresh button
        document.getElementById('logsRefreshBtn').addEventListener('click', () => {
            this.loadLogs(true);
        });

        // Export button
        document.getElementById('logsExportBtn').addEventListener('click', () => {
            this.exportLogs();
        });

        // Clear button
        document.getElementById('logsClearBtn').addEventListener('click', () => {
            this.clearLogs();
        });

        // Search input with debounce
        const searchInput = document.getElementById('logsSearchInput');
        let searchTimeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.filters.search = searchInput.value.trim();
                this.currentPage = 1;
                this.loadLogs();
            }, 500);
        });

        // Type filter
        document.getElementById('logsTypeFilter').addEventListener('change', (e) => {
            this.filters.type = e.target.value;
            this.currentPage = 1;
            this.loadLogs();
        });

        // User filter
        document.getElementById('logsUserFilter').addEventListener('change', (e) => {
            this.filters.user = e.target.value;
            this.currentPage = 1;
            this.loadLogs();
        });

        // Date filters
        document.getElementById('logsDateFrom').addEventListener('change', (e) => {
            this.filters.dateFrom = e.target.value;
            this.currentPage = 1;
            this.loadLogs();
        });

        document.getElementById('logsDateTo').addEventListener('change', (e) => {
            this.filters.dateTo = e.target.value;
            this.currentPage = 1;
            this.loadLogs();
        });

        // Apply filters button
        document.getElementById('logsApplyFilters').addEventListener('click', () => {
            this.currentPage = 1;
            this.loadLogs();
        });

        // Reset filters
        document.getElementById('logsResetFilters').addEventListener('click', () => {
            this.resetFilters();
        });

        // Per page change
        document.getElementById('logsPerPage').addEventListener('change', (e) => {
            this.perPage = parseInt(e.target.value);
            this.currentPage = 1;
            this.loadLogs();
        });

        // Pagination
        document.getElementById('logsPrevPage').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.loadLogs();
            }
        });

        document.getElementById('logsNextPage').addEventListener('click', () => {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                this.loadLogs();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl+Shift+R to refresh logs
            if (e.ctrlKey && e.shiftKey && e.key === 'R') {
                e.preventDefault();
                this.loadLogs(true);
            }
            // Escape to close modal
            if (e.key === 'Escape') {
                this.closeLogDetail();
            }
        });

        // Close log detail modal
        document.getElementById('closeLogDetailBtn').addEventListener('click', () => {
            this.closeLogDetail();
        });

        document.querySelector('#logDetailModal .modal-overlay').addEventListener('click', () => {
            this.closeLogDetail();
        });
    }

    setupAutoRefresh() {
        // Auto-refresh every 30 seconds
        this.autoRefreshInterval = setInterval(() => {
            // Only refresh if logs tab is visible
            const logsTab = document.getElementById('tab-logs');
            if (logsTab && logsTab.classList.contains('active')) {
                this.loadLogs();
            }
        }, 30000);

        // Cleanup interval on page unload
        window.addEventListener('beforeunload', () => {
            if (this.autoRefreshInterval) {
                clearInterval(this.autoRefreshInterval);
            }
        });
    }

    resetFilters() {
        document.getElementById('logsSearchInput').value = '';
        document.getElementById('logsTypeFilter').value = 'all';
        document.getElementById('logsUserFilter').value = 'all';
        document.getElementById('logsDateFrom').value = '';
        document.getElementById('logsDateTo').value = '';

        this.filters = {
            search: '',
            type: 'all',
            dateFrom: '',
            dateTo: '',
            user: 'all'
        };
        this.currentPage = 1;
        this.loadLogs();
    }

    async loadLogs(forceRefresh = false) {
        if (this.isLoading) return;

        this.isLoading = true;
        this.showLoading();

        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.perPage,
                search: this.filters.search,
                type: this.filters.type,
                user: this.filters.user,
                dateFrom: this.filters.dateFrom,
                dateTo: this.filters.dateTo,
                refresh: forceRefresh ? Date.now() : ''
            });

            const response = await axios.get(
                `${protocal}api.${domainName}/logs?${params.toString()}`,
                { withCredentials: true }
            );

            if (response.data.success) {
                this.logs = response.data.logs || [];
                this.totalLogs = response.data.total || 0;
                this.totalPages = response.data.totalPages || 1;
                this.currentPage = response.data.currentPage || 1;

                this.renderLogs();
                this.updateStats(response.data.stats || {});
                this.updatePagination();
            }
        } catch (error) {
            console.error('Failed to load logs:', error);
            Notification.showNotification({
                type: 'error',
                message: error.response?.data?.message || 'Failed to load logs'
            });
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }

    showLoading() {
        const tbody = document.getElementById('logsTableBody');
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-8">
                    <div class="flex items-center justify-center gap-3">
                        <i class="fas fa-spinner fa-spin text-brand text-2xl"></i>
                        <span class="text-gray-500">Loading logs...</span>
                    </div>
                </td>
            </tr>
        `;
    }

    hideLoading() {
        // Handled by renderLogs
    }

    renderLogs() {
        const tbody = document.getElementById('logsTableBody');

        if (!this.logs || this.logs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-8">
                        <div class="flex flex-col items-center gap-2">
                            <i class="fas fa-inbox text-3xl text-gray-300"></i>
                            <p class="text-gray-500">No logs found</p>
                            <p class="text-xs text-gray-400">Try adjusting your filters</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.logs.map((log, index) => {
            const typeIcon = this.getTypeIcon(log.type);
            const typeBadge = this.getTypeBadge(log.type);
            const timestamp = this.formatTimestamp(log.created_at || log.timestamp);
            const message = this.highlightSearch(log.message || '');

            return `
                <tr class="log-row border-b border-gray-50 log-entry" data-log-id="${log.id}">
                    <td class="px-4 py-3 text-xs text-gray-400 text-center">
                        ${(this.currentPage - 1) * this.perPage + index + 1}
                    </td>
                    <td class="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        ${timestamp}
                    </td>
                    <td class="px-4 py-3">
                        <span class="log-badge ${log.type}">${typeIcon} ${log.type}</span>
                    </td>
                    <td class="px-4 py-3">
                        <div class="log-message">${message}</div>
                        ${log.details ? `<div class="text-xs text-gray-400 mt-1 truncate max-w-[200px]">${this.truncate(log.details, 100)}</div>` : ''}
                    </td>
                    <td class="px-4 py-3 text-xs text-gray-500">
                        ${log.user_name || log.user || 'System'}
                    </td>
                    <td class="px-4 py-3 text-center">
                        <button class="view-log-btn p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition" data-log-id="${log.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="copy-log-btn p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition" data-log-message="${log.message || ''}">
                            <i class="fas fa-copy"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Attach event listeners
        tbody.querySelectorAll('.view-log-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const logId = btn.dataset.logId;
                this.viewLogDetail(logId);
            });
        });

        tbody.querySelectorAll('.copy-log-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const message = btn.dataset.logMessage;
                this.copyLogMessage(message);
            });
        });
    }

    getTypeIcon(type) {
        const icons = {
            info: '📘',
            warning: '⚠️',
            error: '❌',
            success: '✅',
            debug: '🔍'
        };
        return icons[type] || '📝';
    }

    getTypeBadge(type) {
        return type || 'info';
    }

    formatTimestamp(timestamp) {
        if (!timestamp) return 'N/A';
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    highlightSearch(text) {
        if (!this.filters.search || !text) return text;
        const regex = new RegExp(`(${this.escapeRegex(this.filters.search)})`, 'gi');
        return text.replace(regex, '<span class="highlight">$1</span>');
    }

    escapeRegex(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    truncate(text, length) {
        if (!text) return '';
        return text.length > length ? text.substring(0, length) + '...' : text;
    }

    updateStats(stats) {
        document.getElementById('logsTotalCount').textContent = stats.total || 0;
        document.getElementById('logsInfoCount').textContent = stats.info || 0;
        document.getElementById('logsWarningCount').textContent = stats.warning || 0;
        document.getElementById('logsErrorCount').textContent = stats.error || 0;
        document.getElementById('logsTodayCount').textContent = stats.today || 0;
    }

    updatePagination() {
        const start = (this.currentPage - 1) * this.perPage + 1;
        const end = Math.min(start + this.perPage - 1, this.totalLogs);

        document.getElementById('logsPaginationInfo').textContent =
            `Showing ${this.totalLogs > 0 ? start : 0}-${end} of ${this.totalLogs} logs`;

        document.getElementById('logsPageInfo').textContent =
            `Page ${this.currentPage} of ${this.totalPages || 1}`;

        document.getElementById('logsPrevPage').disabled = this.currentPage <= 1;
        document.getElementById('logsNextPage').disabled = this.currentPage >= this.totalPages;
    }

    async viewLogDetail(logId) {
        try {
            const response = await axios.get(
                `${protocal}api.${domainName}/logs/${logId}`,
                { withCredentials: true }
            );

            if (response.data.success) {
                this.selectedLog = response.data.log;
                this.showLogDetail(this.selectedLog);
            }
        } catch (error) {
            console.error('Failed to load log details:', error);
            Notification.showNotification({
                type: 'error',
                message: error.response?.data?.message || 'Failed to load log details'
            });
        }
    }

    showLogDetail(log) {
        const modal = document.getElementById('logDetailModal');
        const content = document.getElementById('logDetailContent');
        const icon = document.getElementById('logDetailIcon');

        icon.textContent = this.getTypeIcon(log.type);

        const detailsHtml = log.details ? `
            <div class="log-property">
                <span class="key">Details</span>
                <span class="value">${log.details}</span>
            </div>
        ` : '';

        const metadataHtml = log.metadata ? `
            <div>
                <h4 class="text-sm font-semibold text-gray-700 mb-2">Metadata</h4>
                <div class="log-json">${this.formatJSON(log.metadata)}</div>
            </div>
        ` : '';

        content.innerHTML = `
            <div class="log-property">
                <span class="key">Type</span>
                <span class="value"><span class="log-badge ${log.type}">${this.getTypeIcon(log.type)} ${log.type.toUpperCase()}</span></span>
            </div>
            <div class="log-property">
                <span class="key">Timestamp</span>
                <span class="value">${this.formatTimestamp(log.created_at || log.timestamp)}</span>
            </div>
            <div class="log-property">
                <span class="key">User</span>
                <span class="value">${log.user_name || log.user || 'System'}</span>
            </div>
            <div class="log-property">
                <span class="key">Message</span>
                <span class="value font-medium">${log.message || 'No message'}</span>
            </div>
            ${detailsHtml}
            ${metadataHtml}
            ${log.ip_address ? `<div class="log-property">
                <span class="key">IP Address</span>
                <span class="value font-mono text-sm">${log.ip_address}</span>
            </div>` : ''}
            ${log.user_agent ? `<div class="log-property">
                <span class="key">User Agent</span>
                <span class="value text-xs">${log.user_agent}</span>
            </div>` : ''}
        `;

        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    closeLogDetail() {
        const modal = document.getElementById('logDetailModal');
        modal.classList.add('hidden');
        modal.style.display = 'none';
        document.body.style.overflow = '';
        this.selectedLog = null;
    }

    formatJSON(data) {
        try {
            if (typeof data === 'string') {
                data = JSON.parse(data);
            }
            return JSON.stringify(data, null, 2);
        } catch {
            return String(data);
        }
    }

    copyLogMessage(message) {
        navigator.clipboard.writeText(message).then(() => {
            Notification.showNotification({
                type: 'success',
                message: 'Log message copied to clipboard'
            });
        }).catch(() => {
            // Fallback
            const textarea = document.createElement('textarea');
            textarea.value = message;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            Notification.showNotification({
                type: 'success',
                message: 'Log message copied to clipboard'
            });
        });
    }

    async exportLogs() {
        try {
            const params = new URLSearchParams({
                search: this.filters.search,
                type: this.filters.type,
                user: this.filters.user,
                dateFrom: this.filters.dateFrom,
                dateTo: this.filters.dateTo
            });

            const response = await axios.get(
                `${protocal}api.${domainName}/logs/export?${params.toString()}`,
                {
                    withCredentials: true,
                    responseType: 'blob'
                }
            );

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `logs-${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();

            Notification.showNotification({
                type: 'success',
                message: 'Logs exported successfully'
            });
        } catch (error) {
            console.error('Export failed:', error);
            Notification.showNotification({
                type: 'error',
                message: error.response?.data?.message || 'Failed to export logs'
            });
        }
    }

    async clearLogs() {
        if (!confirm('Are you sure you want to clear all logs? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await axios.delete(
                `${protocal}api.${domainName}/logs`,
                { withCredentials: true }
            );

            if (response.data.success) {
                Notification.showNotification({
                    type: 'success',
                    message: 'All logs cleared successfully'
                });
                this.loadLogs();
            }
        } catch (error) {
            console.error('Clear logs failed:', error);
            Notification.showNotification({
                type: 'error',
                message: error.response?.data?.message || 'Failed to clear logs'
            });
        }
    }
}