function renderLaunchPage(req, res) {
    if (req.accepts('html')) {
        return res.render('launch')
    }

    if (req.accepts('json')) {
        return res.json({
            message: `COCOCE - We're comming soon`
        })
    }
}

module.exports = {
    renderLaunchPage
}