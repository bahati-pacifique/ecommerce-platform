module.exports = (req, res) => {

    const type = req.accepts([
        'html',
        'json'
    ]);

    if (type === 'json') {
        return res.status(404).json({
            success: false,
            message: 'Page Not Found'
        });
    }

    return res.redirect('/');
};