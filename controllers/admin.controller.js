function home(req, res) {
    //Middleware check admin session
    console.log('**MainRoutes')
    res.render('index-admin', {message: ''})
}

module.exports = {
    home
}