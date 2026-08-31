$(document).ready(() => {
    const copyBtn = document.getElementById('copyRefBtn');
    const refNumber = document.getElementById('referenceNumber');

    copyBtn.addEventListener('click', function () {
        const text = refNumber.textContent;

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                showCopiedFeedback(this);
            }).catch(() => {
                fallbackCopy(text, this);
            });
        } else {
            fallbackCopy(text, this);
        }
    });

    function fallbackCopy(text, btn) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showCopiedFeedback(btn);
        } catch (err) {
            console.error('Copy failed:', err);
        }
        document.body.removeChild(textarea);
    }

    function showCopiedFeedback(btn) {
        const icon = btn.querySelector('i');
        const originalClass = icon.className;

        icon.className = 'fas fa-check';
        btn.classList.add('copied');

        setTimeout(() => {
            icon.className = originalClass;
            btn.classList.remove('copied');
        }, 2000);
    }
});