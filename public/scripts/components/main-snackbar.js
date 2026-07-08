function showSnackbar(options) {

    const config = {
        message: 'Default message',
        actionText: '',
        type: 'default',
        position: 'bottom',
        autoClose: true,
        duration: 5000,
        onAction: null,
        ...options
    };

    const snackbar = document.createElement('div');
    snackbar.className = `snackbar snackbar-${config.type} snackbar-${config.position}`;

    const message = document.createElement('div');
    message.className = 'snackbar-message';
    message.innerHTML = config.message;

    let actionButton = null;
    if (config.actionText) {
        actionButton = document.createElement('button');
        actionButton.className = 'snackbar-action';
        actionButton.textContent = config.actionText;
        actionButton.className += ' '+config.type;
        actionButton.addEventListener('click', () => {
            if (config.onAction) config.onAction();
            hideSnackbar(snackbar);
        });
    }

    const closeButton = document.createElement('button');
    closeButton.className = 'snackbar-close';
    closeButton.innerHTML = '&times;';
    closeButton.addEventListener('click', () => hideSnackbar(snackbar));

    snackbar.appendChild(message);
    if (actionButton) snackbar.appendChild(actionButton);
    snackbar.appendChild(closeButton);

    document.body.appendChild(snackbar);

    setTimeout(() => {
        snackbar.classList.add('show');
    }, 10);

    if (config.autoClose && config.duration > 0) {
        setTimeout(() => {
            if (snackbar.parentNode) {
                hideSnackbar(snackbar);
            }
        }, config.duration);
    }

    return snackbar;
}

function hideSnackbar(snackbar) {
    snackbar.classList.remove('show');
    setTimeout(() => {
        if (snackbar.parentNode) {
            snackbar.parentNode.removeChild(snackbar);
        }
    }, 300);
}