module.exports = (req, res, next) => {

    const type = req.accepts([
        'html',
        'json'
    ]);

    //TODO register as system activity log

    if (type === 'json') {
        return res.status(404).json({
            success: false,
            message: 'Not Found'
        });
    }

    return res.render('404');
};