const sharp = require('sharp');

/**
 * Convert an uploaded image to WebP.
 *
 * @param {Buffer} buffer
 * @param {Object} options
 * @returns {Promise<Object>}
 */
async function convertToWebp(
    buffer,
    {
        width = 2000,
        height = 2000,
        quality = 85
    } = {}
) {
    if (!Buffer.isBuffer(buffer)) {
        throw new TypeError('Image buffer is required');
    }

    const image = sharp(buffer);

    const metadata = await image.metadata();

    const webpBuffer = await image
        .resize({
            width,
            height,
            fit: 'inside',
            withoutEnlargement: true
        })
        .webp({
            quality
        })
        .toBuffer();

    return {
        buffer: webpBuffer,

        // Always WebP
        extension: '.webp',
        mime_type: 'image/webp',

        size: webpBuffer.length,

        width: metadata.width || null,
        height: metadata.height || null,

        original_format:
            metadata.format || null
    };
}

module.exports = {
    convertToWebp
};