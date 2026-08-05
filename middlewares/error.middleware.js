const { acceptsHtml } = require('../util/helpers')

module.exports = (
    err,
    req,
    res,
    next
) => {

    console.log(err)
    let message = 'Internal Server Error';
    if (err.message === 'Not allowed by CORS') message = 'Access blocked — Unknown source origin'
    if (!acceptsHtml(req)) {

        if (err.message === 'Not allowed by CORS') {
            return res.status(403).json({
                success: false,
                status: 'forbidden',
                code: 'POLICY_VIOLATION',
                message
            });
        }

        return res.status(500).json({
            success: false,
            message
        });
    } else {
        res.render('er', { message });
    }

};