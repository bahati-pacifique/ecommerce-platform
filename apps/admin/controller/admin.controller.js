const mockService = require('../../../src/services/DBMockService');

async function home(req, res) {
    try {
        await mockService.testConnection();
    } catch (error) {
        console.log(error);
    }
    //Middleware check admin session
    return res.render('index-admin', {message: ''});
}

module.exports = {
    home
}