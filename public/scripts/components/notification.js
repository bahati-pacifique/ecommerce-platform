// Enhanced Notification Module
const Notification = (() => {
    // Configuration
    const config = {
        defaultDuration: 5000,
        maxNotifications: 7,
        types: {
            success: {
                icon: 'bi bi-check-circle',
                title: 'Success',
                defaultDuration: 5000
            },
            error: {
                icon: 'bi bi-exclamation-circle',
                title: '',
                defaultDuration: 8000
            },
            warning: {
                icon: 'bi bi-exclamation-triangle',
                title: 'Warning',
                defaultDuration: 10000
            },
            info: {
                icon: 'bi bi-info-circle',
                title: 'Information',
                defaultDuration: 5000
            }
        },
        position: 'bottom-right'
    };

    // State
    let notificationContainer = null;
    let notifications = new Map();
    let activeNotificationsPanel = null;

    // Initialize notification container
    const initContainer = ({position = 'top-right'} = {}) => {
        
        config.position = position;

        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.className = 'notification-container';
            notificationContainer.classList.add(config.position)
            document.body.appendChild(notificationContainer);
        }

        // Initialize active notifications panel
        activeNotificationsPanel = document.getElementById('activeNotifications');
        updateActiveNotificationsPanel();
    };

    // Create notification element
    const createNotification = (options, id) => {
        const {
            type = 'info',
            message = '',
            title = '',
            duration = config.types[type]?.defaultDuration || config.defaultDuration,
            autoClose = true,
            onClose = null
        } = options;

        const notificationType = config.types[type] || config.types.info;
        const showProgress = autoClose && duration > 0;

        // Create notification element
        const notification = document.createElement('div');

        notification.className = `notification ${type} ${showProgress ? '' : 'no-progress'}`;
        notification.dataset.id = id;

        // Add hover events for pausing/resuming
        notification.addEventListener('mouseenter', () => {
            const notifData = notifications.get(id);
            if (notifData && notifData.autoClose && notifData.duration > 0) {
                pause(id);
            }
        });

        notification.addEventListener('mouseleave', () => {
            const notifData = notifications.get(id);
            if (notifData && notifData.autoClose && notifData.duration > 0) {
                resume(id);
            }
        });

        // Format duration for display
        const durationText = duration >= 1000 ?
            `${duration / 1000} seconds` :
            `${duration} ms`;

        // Create HTML structure
        notification.innerHTML = `
                    <div class="notification-icon">
                        <i class="${notificationType.icon}"></i>
                    </div>
                    <div class="notification-content">
                        <div class="notification-title">
                            ${title || notificationType.title}
                        </div>
                        <div class="notification-message">
                            ${message}
                        </div>
                        ${showProgress ?
                            `<div class="notification-time">
                                <i class="fas fa-clock"></i>
                                ${durationText}</div>`
                                    :
                            `<div class="notification-time"></div>`
                        }
                    </div>
                    <button class="notification-close">
                        <i class="fas fa-times"></i>
                    </button>
                    ${showProgress ?
                `<div class="notification-progress">
                    <div class="notification-progress-bar"></div>
                </div>` : ''
            }
                `;

        // Add close event listener
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            hide(id);
        });

        return notification;
    };

    // Show notification
    const show = (options) => {
        
        // Initialize container if needed
        initContainer(options);

        // Limit number of notifications
        if (notifications.size >= config.maxNotifications) {
            const oldestId = Array.from(notifications.keys())[0];
            hide(oldestId, true);
        }

        // Generate unique ID
        const id = 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

        // Determine actual duration
        const actualDuration = options.autoClose === false ? 0 :
            (options.duration ||
                config.types[options.type]?.defaultDuration ||
                config.defaultDuration);

        // Create notification
        const notificationElement = createNotification({
            ...options,
            duration: actualDuration,
            autoClose: options.autoClose !== false && actualDuration > 0
        }, id);

        // Add to container
        notificationContainer.appendChild(notificationElement);

        // Force reflow to enable transition
        notificationElement.offsetHeight;

        // Show with animation
        setTimeout(() => {
            notificationElement.classList.add('show');

            // Start progress bar animation if autoClose is enabled and duration > 0
            const progressBar = notificationElement.querySelector('.notification-progress-bar');
            if (progressBar && actualDuration > 0) {
                progressBar.style.transition = `transform ${actualDuration}ms linear`;
                progressBar.style.transform = 'scaleX(0)';

                // Force reflow
                progressBar.offsetHeight;

                progressBar.style.transform = 'scaleX(1)';
            }
        }, 10);

        // Store notification reference
        const notification = {
            id,
            element: notificationElement,
            timeout: null,
            onClose: options.onClose,
            duration: actualDuration,
            autoClose: options.autoClose !== false && actualDuration > 0,
            remainingTime: actualDuration,
            startTime: Date.now(),
            isPaused: false
        };

        notifications.set(id, notification);

        // Set auto-close timeout if enabled and duration > 0
        if (notification.autoClose && actualDuration > 0) {
            notification.timeout = setTimeout(() => {
                hide(id);
            }, actualDuration);
        }

        // Update active notifications panel
        updateActiveNotificationsPanel();

        return id;
    };

    // Hide specific notification
    const hide = (notificationId, immediate = false) => {
        const notification = notifications.get(notificationId);

        if (!notification) return;

        // Clear timeout if exists
        if (notification.timeout) {
            clearTimeout(notification.timeout);
            notification.timeout = null;
        }

        // Trigger onClose callback
        if (notification.onClose && typeof notification.onClose === 'function') {
            notification.onClose();
        }

        if (immediate) {
            notification.element.remove();
            notifications.delete(notificationId);
            updateActiveNotificationsPanel();
            return;
        }

        // Hide with animation
        notification.element.classList.remove('show');
        notification.element.classList.add('hide');

        // Remove after animation
        setTimeout(() => {
            notification.element.remove();
            notifications.delete(notificationId);
            updateActiveNotificationsPanel();
        }, 300);
    };

    // Hide all notifications
    const hideAll = () => {
        notifications.forEach((notification, id) => {
            hide(id, true);
        });
    };

    // Pause auto-close for specific notification
    const pause = (notificationId) => {
        const notification = notifications.get(notificationId);

        if (!notification || !notification.timeout || notification.isPaused) return;

        // Calculate remaining time
        const elapsed = Date.now() - notification.startTime;
        notification.remainingTime = Math.max(0, notification.duration - elapsed);

        // Clear the timeout
        clearTimeout(notification.timeout);
        notification.timeout = null;
        notification.isPaused = true;

        // Pause progress bar animation
        const progressBar = notification.element.querySelector('.notification-progress-bar');
        if (progressBar) {
            const computedStyle = window.getComputedStyle(progressBar);
            const currentTransform = computedStyle.transform;
            progressBar.style.transition = 'none';
            progressBar.style.transform = currentTransform;
        }

        updateActiveNotificationsPanel();
    };

    // Resume auto-close for specific notification
    const resume = (notificationId) => {
        const notification = notifications.get(notificationId);

        if (!notification || !notification.isPaused || notification.remainingTime <= 0) return;

        // Update start time
        notification.startTime = Date.now();

        // Set new timeout
        notification.timeout = setTimeout(() => {
            hide(notificationId);
        }, notification.remainingTime);

        notification.isPaused = false;

        // Resume progress bar animation
        const progressBar = notification.element.querySelector('.notification-progress-bar');
        if (progressBar) {
            const currentTransform = progressBar.style.transform;
            const scaleX = currentTransform.match(/scaleX\(([^)]+)\)/);
            if (scaleX) {
                const remainingScale = 1 - parseFloat(scaleX[1]);
                const remainingTime = remainingScale * notification.duration;

                progressBar.style.transition = `transform ${remainingTime}ms linear`;
                progressBar.offsetHeight; // Force reflow
                progressBar.style.transform = 'scaleX(1)';
            }
        }

        updateActiveNotificationsPanel();
    };

    // Pause all notifications
    const pauseAll = () => {
        notifications.forEach((notification, id) => {
            if (notification.autoClose && !notification.isPaused) {
                pause(id);
            }
        });
    };

    // Resume all notifications
    const resumeAll = () => {
        notifications.forEach((notification, id) => {
            if (notification.autoClose && notification.isPaused) {
                resume(id);
            }
        });
    };

    // Update active notifications panel
    const updateActiveNotificationsPanel = () => {
        if (!activeNotificationsPanel) return;

        const list = document.getElementById('activeNotificationsList');
        if (!list) return;

        list.innerHTML = '';

        if (notifications.size === 0) {
            list.innerHTML = '<li>No active notifications</li>';
            return;
        }

        notifications.forEach((notification, id) => {
            const li = document.createElement('li');
            const type = notification.element.className.split(' ')[1];
            const message = notification.element.querySelector('.notification-message').textContent;
            const status = notification.isPaused ? ' (Paused)' : '';

            li.innerHTML = `
                        <div>
                            <span class="notification-status ${type}"></span>
                            ${message.substring(0, 30)}${message.length > 30 ? '...' : ''}
                        </div>
                        <button class="btn btn-sm" onclick="Notification.hide('${id}')" style="padding: 2px 8px;">
                            <i class="fas fa-times"></i>
                        </button>
                    `;
            list.appendChild(li);
        });
    };

    // Success shortcut
    const success = (message, options = {}) => {
        return show({
            type: 'success',
            message,
            ...options
        });
    };

    // Error shortcut
    const error = (message, options = {}) => {
        return show({
            type: 'error',
            message,
            ...options
        });
    };

    // Warning shortcut
    const warning = (message, options = {}) => {
        return show({
            type: 'warning',
            message,
            ...options
        });
    };

    // Info shortcut
    const info = (message, options = {}) => {
        return show({
            type: 'info',
            message,
            ...options
        });
    };

    /**
     * 
     * Possible types: {}
     * warning,
     * error,
     * success,
     * info
     */
    const showNotification = ({ type, title, message, autoClose = false, position = 'bottom-right' }) => {
        Notification.show({
            type,
            title,
            message,
            autoClose,
            position
        });
    }

    // Expose public API
    return {
        show,
        hide,
        hideAll,
        pause,
        resume,
        pauseAll,
        resumeAll,
        success,
        error,
        warning,
        info,
        config,
        showNotification
    };
})();

// Make it available globally
window.Notification = Notification;