(()=>{
    lucide.createIcons();

    const openBtn = document.getElementById('cameraOpenSCan');
    const modal = document.getElementById('scannerModal');
    const closeBtn = document.getElementById('closeScannerBtn');

    let html5QrCode = null;

    if (openBtn) {
        openBtn.addEventListener('click', async () => {
            modal.classList.remove('hidden');

            html5QrCode = new Html5Qrcode("qr-reader");

            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            };

            try {
                await html5QrCode.start(
                    { facingMode: "environment" },
                    config,
                    (decodedText, decodedResult) => {
                        html5QrCode.stop().then(() => {
                            window.location.href = decodedText;
                        }).catch(err => console.error("Failed to stop scanner", err));
                    },
                    (errorMessage) => {
                        // Ignore constant parse errors while scanning
                    }
                );
            } catch (err) {
                console.error("Camera start error:", err);
                alert("Could not access the camera. Please ensure you have granted camera permissions and are using HTTPS.");
                closeScanner();
            }
        });
    }

    function closeScanner() {
        modal.classList.add('hidden');
        if (html5QrCode) {
            html5QrCode.stop().then(() => {
                html5QrCode.clear();
                html5QrCode = null;
            }).catch(err => {
                console.error("Failed to stop scanner on close", err);
            });
        }
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', closeScanner);
    }
})();