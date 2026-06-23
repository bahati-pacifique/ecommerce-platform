function renderLaunchPage(req, res) {

    console.log('**MainRoutes')

    if (req.accepts('html')) {
        return res.render('launch')
    }

    if (req.accepts('json')) {
        return res.json({
            message: `COCOCE - We're comming soon`
        });
    }
}

module.exports = {
    renderLaunchPage
}