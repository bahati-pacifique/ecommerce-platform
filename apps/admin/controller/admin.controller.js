const mockService = require('../../../src/services/DBMockService');

async function home(req, res) {
    try {
        
        await mockService.testConnection();
    } catch (error) {
        console.log(error);
    }
    //Middleware check admin session
    return res.render('index-admin', { message: '' });
}

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// async function downloadImage() {
//     const url = 'https://res.cloudinary.com/dfv97pfcq/image/upload/v1717404221/cococe/cococe/p6nxkogue1wlimtlaohz.png';

//     const folder = '/var/www/cococe-storage/meta';
//     const fileName = 'image.png'; // or generate unique name
//     const filePath = path.join(folder, fileName);

//     // ensure folder exists
//     fs.mkdirSync(folder, { recursive: true });

//     const response = await axios({
//         url,
//         method: 'GET',
//         responseType: 'stream'
//     });

//     const writer = fs.createWriteStream(filePath);

//     response.data.pipe(writer);

//     return new Promise((resolve, reject) => {
//         writer.on('finish', () => {
//             resolve(filePath);
//         });

//         writer.on('error', reject);
//     });
// }

// usage

module.exports = {
    home
}