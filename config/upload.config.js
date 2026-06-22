module.exports = {
    limits: {
        fileSize: 10 * 1024 * 1024
    },

    abortOnLimit: true,

    responseOnLimit: 'File exceeds maximum size'
};