const transporter = require('../../../config/nodemailer');
const path = require('path');

const ejs = require('ejs');
const LogsModel = require('../../models/logs.model');
const renderEmail = require("./email.renderer");

const { formatDate, capitalize } = require('../../../util/utilities');

class MailServices {

    static async sendVendorRegistrationEmail(data, vendor) {

        let text = `
            Hello ${vendor.first_name},
            Thank you for registering your business with Cococe Business.
            Your registration has been successfully received and is currently under review.
            Reference Number: ${vendor.registration_reference}
            Vendor ID: ${vendor.public_id}
            Name: ${vendor.first_name} ${vendor.last_name}
            Email: ${vendor.email}
            Status: Under Review
            Please keep your reference number for future communication.
            Cococe Business
            `.trim();

        const html = await ejs.renderFile(
            path.join(
                __dirname,
                "templates",
                "vendor-registration.ejs"
            ),
            data
        );

        const respose = await transporter.sendMail({
            from: {
                name: process.env.MAIL_NAME,
                address: process.env.MAIL_FROM
            },
            to: data.email,
            subject: "Vendor Registration Submitted",
            text,
            html
        });
    }

    // static async testSend({ username, to, imageUrl }) {

    //     let text = `
    //         Hello ${username},
    //         Thank you for registering your business with Cococe Business.
    //         Your registration has been successfully received and is currently under review.
    //         Reference Number: 0
    //         Vendor ID: 0
    //         Name: 0
    //         Email: 0
    //         Status: Under Review
    //         Please keep your reference number for future communication.
    //         Cococe Business
    //         `.trim();

    //     const html = await ejs.renderFile(
    //         path.join(
    //             __dirname,
    //             "templates",
    //             "test.ejs"
    //         ),
    //         { username, imageUrl }
    //     );

    //     const date = new Date();

    //     const sent_at = new Intl.DateTimeFormat('en-GB', {
    //         dateStyle: 'short',
    //         timeStyle: 'medium',
    //         hour12: false
    //     }).format(date);

    //     const sqlTimestampTZ = date.toISOString();

    //     const emailLog = {
    //         recipient_email: to,
    //         email_type: 'testing_email',
    //         title: "Vendor Registration Submitted",
    //         body_html: html,
    //         body_text: text,
    //     }

    //     let response;
    //     try {

    //         response = await transporter.sendMail({
    //             from: {
    //                 name: process.env.MAIL_NAME,
    //                 address: process.env.MAIL_FROM
    //             },
    //             to,
    //             subject: "Vendor Registration Submitted",
    //             text,
    //             html
    //         });

    //         emailLog.status = "sent";
    //         emailLog.sent_at = sqlTimestampTZ;
    //         emailLog.provider_message_id = response.messageId;
    //     } catch (error) {
    //         console.log('Unable to register email log: ', error);
    //         emailLog.error_message = error.message
    //     } finally {
    //         await LogsModel.createEmailLog(emailLog);
    //         console.log('Email log registered!')
    //     }

    //     return response;
    // }

    static async testSend({ username, to, imageUrl }) {

        //     const text = `
        //     Hello ${username},

        //     Thank you for registering your business with Cococe Business.

        //     Your registration has been successfully received and is currently under review.

        //     Reference Number: 0
        //     Vendor ID: 0
        //     Name: 0
        //     Email: 0
        //     Status: Under Review

        //     Please keep your reference number for future communication.

        //     Cococe Business
        // `.trim();


        //     const html = await ejs.renderFile(
        //         path.join(
        //             __dirname,
        //             "templates",
        //             "test.ejs"
        //         ),
        //         {
        //             username,
        //             imageUrl
        //         }
        //     );

        // const html = await renderEmail.renderEmail(
        //     "hello_test",
        //     {
        //         name: "Bahati"
        //     }
        // );

        const html = await renderEmail.renderEmail(
            "vendor_registration",
            {
                firstName: "Bahati",
                businessName: "MrChips",
                email: "bhtpac@gmail.com"
            }
        );

        const emailLog = {
            recipient_email: to,
            email_type: "testing_email",
            title: "Vendor Registration Submitted",
            body_html: html,
            body_text: html,
            status: "pending"
        };


        let response;

        try {

            response = await transporter.sendMail({
                from: {
                    name: process.env.MAIL_NAME,
                    address: process.env.MAIL_FROM
                },
                to,
                subject: "Vendor Registration Submitted",
                html
            });


            // Email successfully accepted by SMTP server
            emailLog.status = "sent";
            emailLog.sent_at = new Date();
            emailLog.provider_message_id = response.messageId;

        } catch (error) {

            console.error("Unable to send email:", error);

            emailLog.status = "failed";
            emailLog.error_message = error.message;

        }


        // Logging should not hide the actual email result
        try {

            await LogsModel.createEmailLog(emailLog);

            console.log("Email log registered!");

        } catch (error) {

            console.error(
                "Unable to register email log:",
                error
            );

        }


        return response;
    }

    /**
     * Official successfull vendor application email confirmation
     * @returns 
     */
    static async sendVendorApplicationEmail(data, vendor) {

        let text = `
            Hello ${data.f_name},
            Thank you for registering your business with Cococe Business.
            Your registration has been successfully received and is currently under review.
            Reference Number: ${vendor.reference_number}
            Name: ${data.f_name} ${data.l_name}
            Email: ${data.email}
            Status: Under Review
            Please keep your reference number for future communication.
            COCOCE Business
            `.trim();

        const applicationStatus = capitalize(vendor.status?.replaceAll("_", " ") || 'under review');

        const html = await renderEmail.renderEmail(
            "vendor_registration",
            {
                firstName: data.f_name,
                lastName: data.l_name,
                businessName: vendor.business_name,
                email: data.email,
                applicationStatus,
                referenceNumber: vendor.reference_number,
                portalUrl: `https://business.cococe.rw/business/applications/${vendor.reference_number}`
            }
        );

        const emailLog = {
            recipient_email: data.email,
            email_type: "business application",
            title: "Vendor Registration Submitted",
            body_html: html,
            body_text: text,
            status: vendor.status
        };

        let response;

        try {

            response = await transporter.sendMail({
                from: {
                    name: process.env.MAIL_BUSINESS_NAME,
                    address: process.env.MAIL_FROM
                },
                to: data.email,
                subject: 'Business Application Confirmation',
                text,
                html
            });

            emailLog.status = "sent";
            emailLog.sent_at = new Date();
            emailLog.provider_message_id = response.messageId;

        } catch (error) {

            console.error("Unable to send email:", error);

            emailLog.status = "failed";
            emailLog.error_message = error.message;

        }


        // Logging should not hide the actual email result
        try {

            await LogsModel.createEmailLog(emailLog);

            console.log("Email log registered!");

        } catch (error) {

            console.error(
                "Unable to register email log:",
                error
            );

        }


        return response;
    }

    static async sendAdminVendorApplicationEmail(userAdminEmail, applicantData, applicationData) {

        const html = await renderEmail.renderEmail(
            "vendor-application-admin",
            {
                businessName: applicationData.business_name,
                applicantName: `${applicantData.f_name} ${applicantData.l_name}`,
                referenceNumber: applicationData.reference_number,
                submittedAt: formatDate(applicationData.submitted_at, { includeTime: true }),
                reviewUrl: `https://admin.cococe.rw/dashboard/business-applications/${applicantData.reference_number}`
            }
        );

        const emailLog = {
            recipient_email: userAdminEmail,
            email_type: "business application",
            title: "Vendor Admin Registration Notified",
            body_html: html,
            body_text: "",
            status: applicantData.status
        };

        let response;

        try {

            response = await transporter.sendMail({
                from: {
                    name: process.env.MAIL_ADMIN_NAME,
                    address: process.env.MAIL_FROM
                },
                to: userAdminEmail,
                subject: 'Business Application Confirmation',
                html
            });

            emailLog.status = "sent";
            emailLog.sent_at = new Date();
            emailLog.provider_message_id = response.messageId;

        } catch (error) {

            console.error("Unable to send email:", error);
            emailLog.status = "failed";
            emailLog.error_message = error.message;

        }

        // Logging should not hide the actual email result
        try {

            await LogsModel.createEmailLog(emailLog);

            console.log("Email log registered: ", emailLog);

        } catch (error) {

            console.error(
                "Unable to register email log:",
                error
            );

        }


        return response;
    }

    static async simplTest() {
        try {

            const html = await renderEmail.renderEmail(
                "hello_test",
                {
                    name: "Bahati"
                }
            );

            //res.type("html").send(html);
            return html;

        } catch (error) {

            console.error("Email rendering failed:", error);

            throw new Error('enable to render html')

        }
    }
}

module.exports = MailServices;