// module.exports = (req, res, next) => {

//     const isProduction = process.env.NODE_ENV === 'production';

//         console.log(isProduction, process.env.ADMIN_HOST, req.hostname);

//     if (!isProduction) {
//         return next();
//     }

//     if (req.hostname !== process.env.ADMIN_HOST) {
//         return res.status(404).send('Not Found');
//     }

//     next();
// };