const errorConfig = {
    defaultCode: '500',
    defaultTitle: 'Something went wrong',
    defaultMessage: "We're sorry, but an unexpected error occurred while processing your request. Our team has been notified and is working on a fix.",
    defaultDetail: 'Error: Something went wrong. Please try again later.',

    errorMap: {
        '400': {
            title: 'Bad Request',
            message: 'The request could not be understood by the server. Please check your input and try again.'
        },
        '401': {
            title: 'Unauthorized',
            message: 'You need to be authenticated to access this resource. Please log in and try again.'
        },
        '403': {
            title: 'Forbidden',
            message: 'You do not have permission to access this resource. Please contact your administrator.'
        },
        '404': {
            title: 'Not Found',
            message: 'The resource you are looking for could not be found.'
        },
        '405': {
            title: 'Method Not Allowed',
            message: 'The HTTP method used is not allowed for this endpoint.'
        },
        '408': {
            title: 'Request Timeout',
            message: 'The request took too long to process. Please try again.'
        },
        '429': {
            title: 'Too Many Requests',
            message: 'You have made too many requests. Please slow down and try again later.'
        },
        '500': {
            title: 'Internal Server Error',
            message: 'Something went wrong on our end. Our team has been notified and is working on a fix.'
        },
        '502': {
            title: 'Bad Gateway',
            message: 'The server received an invalid response from an upstream server. Please try again later.'
        },
        '503': {
            title: 'Service Unavailable',
            message: 'The service is temporarily unavailable. Please try again later.'
        },
        '504': {
            title: 'Gateway Timeout',
            message: 'The upstream server took too long to respond. Please try again later.'
        }
    },

    customMessages: {
        'database': 'A database error occurred. Please try again later.',
        'validation': 'The data you provided is invalid. Please check your input.',
        'payment': 'There was an issue processing your payment. Please try again or use a different payment method.',
        'permission': 'You do not have the necessary permissions to perform this action.',
        'network': 'A network error occurred. Please check your connection and try again.'
    }
};

function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

function generateErrorRef() {
    const timestamp = Date.now().toString(36).toUpperCase().slice(0, 4);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ERR-${timestamp}-${random}`;
}

function initErrorPage() {
    const code = getQueryParam('code') || errorConfig.defaultCode;
    const type = getQueryParam('type') || '';
    const detail = getQueryParam('detail') || errorConfig.defaultDetail;
    const ref = getQueryParam('ref') || generateErrorRef();

    const errorInfo = errorConfig.errorMap[code] || {
        title: errorConfig.defaultTitle,
        message: errorConfig.defaultMessage
    };

    let message = errorInfo.message;
    if (type && errorConfig.customMessages[type]) {
        message = errorConfig.customMessages[type];
    }

    let codeHtml = '';

    const errorCodes = code.split("");

    errorCodes.forEach((c, i) => {
        if (i > 0 && (i + 1) < errorCodes.length) {
            codeHtml += `<span class="text-brand px-3">${c == 0 ? '<i class="bi bi-emoji-angry"></i>' : `${c}`}</span>`;
        } else codeHtml += `<span>${c}</span>`
    })

    document.getElementById('errorCode').innerHTML = codeHtml;
    document.getElementById('errorTitle').textContent = errorInfo.title;
    document.getElementById('errorMessage').textContent = message;
    document.getElementById('errorDetail').textContent = detail;

    document.title = `COCOCE — ${errorInfo.title}`;
}

document.addEventListener('DOMContentLoaded', initErrorPage);

// Keep navigation links functional; log clicks without blocking navigation.
document.querySelectorAll('.action-card, .footer-links a').forEach(link => {
    link.addEventListener('click', function () {
        console.log(`Navigating to: ${this.textContent.trim()}`);
    });
});

document.getElementById('reloadBtn').addEventListener('click', () => {
    window.location.reload()
});