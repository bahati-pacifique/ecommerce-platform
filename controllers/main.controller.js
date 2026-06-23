function renderLaunchPage(req, res) {

    if (req.accepts('html')) {
        return res.render('launch')
    }

    if (req.accepts('json')) {
        return res.json({
            message: `COCOCE - We're comming soon`
        });
    }
}

const path = require('path');
const storage = require('../src/configs/storage.config');

const uploadProductImage = async (req, res) => {

    const image = req.files.file;

    const fileName =
        `${Date.now()}-${image.name}`;

    const destination =
        path.join(
            storage.images,
            'products',
            fileName
        );

    await image.mv(destination);

    return res.json({
        success: true,
        imagePath: `products/${fileName}`
    });
};

module.exports = {
    renderLaunchPage,
    uploadProductImage
}