module.exports = (req, res, next) => {

    const type = req.accepts([
        'html',
        'json'
    ]);

    //We expect the host name prefixed by these values to accept only json request
    //Since no view engines was set to their app
    const onlyJsonHostnameSubs = [
        'auth',
        'api'
    ]

    //TODO register as system activity log

    const hasJsonHostMatch = onlyJsonHostnameSubs.some(sub => req.hostname.includes(sub));
    if (type === 'json' || hasJsonHostMatch) {
        return res.status(404).json({
            status_code: 404,
            message: 'Not Found'
        });
    }

    return res.render('404');
};