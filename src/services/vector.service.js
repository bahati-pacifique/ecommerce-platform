const API_URL = 'https://vector.genilabs.duckdns.org:4443/embed';

async function generateImageEmbedding(buffer) {

    if (!Buffer.isBuffer(buffer)) {
        throw new TypeError('Image buffer is required');
    }

    const formData = new FormData();

    const blob = new Blob(
        [buffer],
        {
            type: 'image/webp'
        }
    );

    formData.append(
        'file',
        blob,
        'image.webp'
    );

    const response = await fetch(
        API_URL,
        {
            method: 'POST',
            body: formData
        }
    );

    if (!response.ok) {

        const message =
            await response.text();

        throw new Error(
            `Vector API failed (${response.status}): ${message}`
        );
    }

    const result =
        await response.json();

    if (
        !result.embedding ||
        !Array.isArray(result.embedding)
    ) {
        throw new Error(
            'Vector API returned an invalid embedding'
        );
    }

    if (result.dimension !== 512) {
        throw new Error(
            `Unexpected embedding dimension: ${result.dimension}`
        );
    }

    if (result.embedding.length !== 512) {
        throw new Error(
            `Expected 512-dimensional embedding, received ${result.embedding.length}`
        );
    }

    return {
        model: result.model || 'ViT-B/32',
        dimension: result.dimension,
        embedding: result.embedding
    };
}

module.exports = {
    generateImageEmbedding
};