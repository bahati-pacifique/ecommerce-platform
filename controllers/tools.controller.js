
const { encrypt } = require('../util/helpers');
const QRCode = require('qrcode');
const sharp = require('sharp');
const axios = require('axios');

const isProduction = process.env.NODE_ENV === 'production';

const sslUrlPrefix = isProduction ? 'https://' : 'http://';

const portSuffix = isProduction ? '' : `:${process.env.PORT}`;
const protocal = sslUrlPrefix;
const domainName = `${process.env.DOMAIN}${portSuffix}`;

async function unitQRStickerGenerate(req, res) {
    try {
        const { storeId, unitId } = req.params;
        const inventoryId = req.query.inventoryId; 

        const payload = JSON.stringify({ unitId, inventoryId, storeId });
        const token = encrypt(payload);

        const baseUrl = `${protocal}business.${domainName}`;
        const verifyUrl = `${baseUrl}/items/unit/verify?t=${encodeURIComponent(token)}`;

        // 'H' allows up to 30% of the code to be obscured
        const qrBuffer = await QRCode.toBuffer(verifyUrl, {
            type: 'png',
            errorCorrectionLevel: 'H', 
            margin: 2,
            width: 600, // Generate at a high resolution for crisp printing
            color: {
                dark: '#0f172a',
                light: '#ffffff'
            }
        });

        const favUrl = 'https://cdn.cococe.rw/meta/fav-black.png';
        const favResponse = await axios.get(favUrl, { responseType: 'arraybuffer' });
        const favBuffer = Buffer.from(favResponse.data, 'binary');

        // Resize the Favicon (make it about 20% of the QR code size)
        const favSize = 160; // 120 — correspond to 20% of 600px
        const resizedFavBuffer = await sharp(favBuffer)
            .resize(favSize, favSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
            .toBuffer();

        // With a 600px QR, 120px logo, we offset by (600 - 120) / 2 = 240
        const finalImageBuffer = await sharp(qrBuffer)
            .composite([
                {
                    input: resizedFavBuffer,
                    top: 240, 
                    left: 240
                }
            ])
            .png()
            .toBuffer();

        res.type('image/png');
        res.send(finalImageBuffer);

    } catch (error) {
        console.error('QR Generation Error:', error);
        res.status(500).json({ message: 'Failed to generate QR code' });
    }
}

module.exports = {
    unitQRStickerGenerate
}