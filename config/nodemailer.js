const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    port: 465,
    host: "smtp.gmail.com",
    auth: {
        user: "cococe.store@gmail.com",
        pass: "ucjq shnm nphm nbox",
    },
    secure: true,
});

module.exports = transporter;