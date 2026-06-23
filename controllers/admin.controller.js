function home(req, res) {
    //Middleware check admin session
    res.render('index-admin', {message: ''})
}

module.exports = {
    home
}