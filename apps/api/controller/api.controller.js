const ProductMetaServices = require('../../../src/services/productMeta.services');
const { formatError } = require('../../../util/helpers');
const EmailServices = require('../../../src/services/email/email.service');
const VendorServices = require('../../../src/services/vendor.services');
const UserServices = require('../../../src/services/user.services');
const FileServices = require('../../../src/services/file.service');

async function getProductActiveCategories(req, res) {
    try {
        const result = await ProductMetaServices.getActiveCategories();

        return res.json(result);
    } catch (error) {
        return formatError('getProductActiveCategories()', 500, error, 'Failed — Internal Server Error', res);
    }
}

async function getProductActiveCategoriesPaginated(req, res) {
    try {

        const { page, limit } = req.query;
        const result = await ProductMetaServices.getAllProductCategories(page, limit);

        return res.json(result);
    } catch (error) {
        return formatError('getProductActiveCategories()', 500, error, 'Failed — Internal Server Error', res);
    }
}

async function getProductCategoriesPaginated(req, res) {
    try {

        const status = req.params.status;
        const { page, limit, } = req.query;

        const requesterId = req.user.userId || req.user.id || req.user.user_id;
        const result = await ProductMetaServices.getCategoriesPaginated(page, limit, status, requesterId);

        return res.json(result);
    } catch (error) {
        return formatError('getProductActiveCategories()', 500, error, 'Failed — Internal Server Error', res);
    }
}

async function searchCategories(req, res) {
    try {
        const { key, page, limit } = req.query;
        const result = await ProductMetaServices.searchCategory(key, page, limit);

        return res.json(result);
    } catch (error) {
        return formatError('searchCategories()', 500, error, 'Failed — Internal Server Error', res);
    }
}

async function getProductActiveFamilies(req, res) {
    try {
        const result = await ProductMetaServices.getActiveProductFamilies();

        return res.json(result);
    } catch (error) {
        return formatError('getProductActiveFamilies()', 500, error, 'Failed — Internal Server Error', res);
    }
}

async function searchFamilies(req, res) {
    try {
        const { key, page, limit } = req.query;
        const result = await ProductMetaServices.searchProductFamilies(key, page, limit);

        return res.json(result);
    } catch (error) {
        return formatError('searchCategories()', 500, error, 'Failed — Internal Server Error', res);
    }
}

async function getProductFamilies(req, res) {
    try {
        const result = await ProductMetaServices.getProductFamilies();

        return res.json(result);
    } catch (error) {
        return formatError('getProductFamilies()', 500, error, 'Failed — Internal Server Error', res);
    }
}

async function getProductFamiliesPaginatedRequested(req, res) {
    try {

        const status = req.params.status || 'active';
        const { page, limit } = req.query;

        const requesterId = req.user?.userId || req.user?.id || req.user?.user_id || null;
        const result = await ProductMetaServices.getProductFamiliesWithRequested(page, limit, status, requesterId);

        return res.json(result);
    } catch (error) {
        return formatError('getProductFamiliesPaginatedRequested()', 500, error, 'Failed — Internal Server Error', res);
    }
}

async function getActiveBrands(req, res) {
    try {
        const result = await ProductMetaServices.getActiveBrandsList();

        return res.json(result);
    } catch (error) {
        return formatError('getBrands()', 500, error, 'Failed — Internal Server Error', res);
    }
}

async function getActiveAttributes(req, res) {
    try {
        const result = await ProductMetaServices.getActiveAttribute();

        return res.json(result);
    } catch (error) {
        return formatError('getActiveAttributes()', 500, error, 'Failed — Internal Server Error', res);
    }
}

async function getActiveAttributeValues(req, res) {
    try {
        const result = await ProductMetaServices.getActiveAttributeValues();

        return res.json(result);
    } catch (error) {
        return formatError('getAttribute()', 500, error, 'Failed — Internal Server Error', res);
    }
}

async function testSendEmail(req, res) {
    try {
        const response = await EmailServices.testSend({ username: 'Bahati', to: 'bhtpac@gmail.com', imageUrl: 'https://cdn.cococe.rw/meta/cococe.png' });
        console.log(response)
        return res.json({ message: "Possibly email sent!" });
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: 'Failed...' })
    }
}

async function testMaizleEmail(req, res) {
    try {
        const html = await EmailServices.simplTest();
        console.log(html);

        return res.type("html").send(html);
    } catch (error) {
        console.log(error);
        res.json({ message: 'Failed' });
    }
}

async function submitVendorApplication(req, res) {
    try {

        let { userData, vendorData } = req.body;

        const profilePhoto = req.files?.profile_image || null;
        const idCopy = req.files?.id_copy || null;

        userData = JSON.parse(userData);
        vendorData = JSON.parse(vendorData);

        const currentUser = req.user;

        // const userData = req.body.user;
        // const vendorData = req.body.vendor;

        /*
         * If the user is already authenticated, we don't need
         * user data from the request.
         *
         * If the user is not authenticated, user data is required
         * because we need to create an account first.
         */
        if (!currentUser && !userData) {
            return res.status(400).json({
                message: 'User data is required to submit a vendor application'
            });
        }

        if (!vendorData) {
            return res.status(400).json({
                message: 'Vendor data is required to submit a vendor application'
            });
        }

        let user;

        /*
         * Existing authenticated user
         */
        if (currentUser) {
            user = currentUser;
        }

        /*
         * New user
         */
        else {
            user = await UserServices.createUser(userData);

            if (!user) {
                return res.status(500).json({
                    message: 'Failed — Unable to create user account. You may try again, if the error persist please contact our support team'
                });
            }
        }

        /*
         * Determine the user ID.
         *
         * Use whichever property your User service actually returns.
         * Ideally, standardize this to `id`.
         */
        const userId = user.id || user.user_id || user.userId;

        if (!userId) {
            //TODO implement log activity to failed application
            return res.status(500).json({
                message: 'Fatal error: We\'re unable to submit your vendor application'
            });
        }

        const applicationData = {
            ...vendorData,
            userId
        };

        const vendorApplication =
            await VendorServices.submitVendorApplication(applicationData);

        if (!vendorApplication) {
            return res.status(500).json({
                message: 'Failed to submit vendor application'
            });
        }

        try {
            //Send applicant confirmation email
            await EmailServices.sendVendorApplicationEmail(user, vendorApplication);

            //Get admin user 'admin' code 'Admin' title for email
            const admin = await UserServices.getRandomUserByAccountCategory({ code: 'admin', title: 'Admin' });

            if (admin) {
                await EmailServices.sendAdminVendorApplicationEmail(admin.email, user, vendorApplication);
            }

            //Uploading user file
            // User profile image
            //Rename file to match user id

            if (profilePhoto) {
                try {

                    const ext = profilePhoto.name.split('.').pop();
                    profilePhoto.name = `${userId}.${ext}`;
                    await FileServices.uploadProfileImage(profilePhoto);

                } catch (error) {
                    console.log('Error uploading user profile:', error);
                }
            }

            if (idCopy) {
                try {
                    const ext = idCopy.name.split('.').pop();
                    idCopy.name = `${userId}.${ext}`;
                    await FileServices.uploadUserPhotoId(idCopy)
                } catch (error) {
                    console.log('Error uploading user id copy:', error);
                }
            }

        } catch (error) {
            console.log(error);

        }

        return res.status(201).json({
            success: true,
            referenceNumber: vendorApplication.reference_number,
            message: `Thank you for your application to COCOCE Business. 
            Your application has been submitted successfully.
            You will receive a application confirmation email to the email address used within this application.`
        });

    } catch (error) {
        let message = "Unable to submit application — Internal Server Error";
        if (error.code === 23505 || error.code === 23503) message = error.message;

        console.log("submitVendorApplicationError(): ", error);

        res.status(500).json({
            success: false,
            message
        });
    }
}

async function getRandomUserByAccountCategory(req, res) {
    try {
        const result = await UserServices.getRandomUserByAccountCategory(req.query);


        // return res.status(result ? 404 : 200).json({
        //     ...(!!!result && {message: `No user found by '${req.query.code || req.query.title}' account code or title selector`}),
        //     ...(!!result && {user: result})
        // });

        //More specifically typed
        if (!result) {
            return res.status(404).json({
                message: `No user found with '${req.query.code || req.query.title}' account selector`
            });
        } else {
            return res.json(result);
        }
    } catch (error) {
        console.log('getRandomUserByAccountCategory():', error);
        let message = !error.code ? error.message : "Failed — Internal Server Error";
        return res.status(404).json({ message });
    }
}

async function checkUsername(req, res) {
    try {

        if (!req.query.username) return res.status(400).json({
            message: 'Username is required'
        });
        const result = await UserServices.checkUsername(req.query.username);
        if (result === null) return res.status(500).json({ message: 'Failed — Internal Server Error' });
        return res.json({
            isAvailable: result,
            message: !result ? 'This username is not available' : 'Username is available for use'
        });
    } catch (error) {
        console.log('checkUsername():', error);
        return res.json({
            message: "Failed — Internal Server Error"
        });
    }
}

async function checkBusinessUsername(req, res) {
    try {
        if (!req.query.username) return res.status(400).json({
            message: 'Username is required'
        });
        const result = await VendorServices.checkBusinessUsername(req.query.username);
        if (result === null) return res.status(500).json({ message: 'Failed — Internal Server Error' });
        return res.json({
            isAvailable: result,
            message: !result ? 'Business name is not available' : 'Business name is available for use'
        })
    } catch (error) {
        console.log('checkUsername():', error);
        return res.json({
            message: "Failed — Internal Server Error"
        });
    }
}

async function checkVendorApplication(req, res) {
    try {
        const { identifier } = req.params;
        const application = await VendorServices.getVendorApplication(identifier, { includeUser: true });
        return res.status(!application ? 404 : 200).json(application || { message: "Application not found — Please check id or reference number" })
    } catch (error) {
        console.log("checkVendorApplication()", error);
        return res.status(500).json({ message: "Failed — Internal Server Error" });
    }
}

async function getBusinessApplications(req, res) {
    try {
        const { page, limit } = req.query;

        const result = await VendorServices.getVendorApplications({ page, limit, includeUser: true });
        //TODO implement: Log action
        return res.json(result)

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message || 'Failed — Internal Server Error' })
    }
}

async function rejectBusinessApplication(req, res) {
    try {
        const reviewerId = req.user.userId || req.user?.id || req.user?.user_id;

        const applicationId = req.params.id

        const {
            userEmail,
            firstName,
            referenceNumber,
            businessName,
            rejectionReason = "Application or applicant data does not meet vendor requirements",
            status = "missing_requirement"
        } = req.body;

        const rejectResult = await VendorServices.updateVendorApplicationStatus({ applicationId, status, reviewerId, rejectionReason });

        if (rejectResult) {
            try {
                await EmailServices.sendVendorApplicationDenyEmail({
                    to: userEmail,
                    denyStatus: rejectionReason,
                    name: firstName,
                    businessName,
                    referenceNumber,
                    portalUrl: `http://business.cococe.rw/applications/${referenceNumber}`
                })
            } catch (error) {
                console.log(error);
            }
        }

        return res.json(rejectResult);

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Failed — Internal Error"
        })
    }
}

async function approveBusinessApplication(req, res) {
    try {
        const reviewerId = req.user.userId || req.user?.id || req.user?.user_id;
        const applicationId = req.params.id;

        const approvalResult = await VendorServices.approveVendorApplication({ applicationId, reviewerId });


        if (approvalResult && approvalResult.vendor) {
            try {
                await EmailServices.sendVendorApplicationApprovalEmail({
                    to: approvalResult.user?.email,
                    firstName: approvalResult.user?.f_name,
                    lastName: approvalResult.user?.l_name,
                    username: approvalResult.user?.username,
                    businessName: approvalResult.vendor.business_name,
                    portalUrl: `http://business.cococe.rw/`
                })
            } catch (error) {
                console.log(error);
            }
        }

        return res.json(approvalResult);

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: error.message || "Unable to approve application — Internal Error"
        })
    }
}

async function uploadUserProfileAvatar(req, res) {
    try {
        const avatar = req.files.avatar;
        const user = req.user;

        const ext = avatar.name.split('.').pop();
        avatar.name = `${user.userId || user.id || user.user_id}.${ext}`;

        const result = await FileServices.uploadProfileImage(avatar);
        console.log(result)
        if (result) {
            //TODO register user system log
            //LOG MESSAGE: "A new profile image was upladed by (${user.userId} ${user.username})"
        }
        return res.json({ success: true, message: 'Profile image uploaded' });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: 'Failed — Internal Server Error' })
    }
}

async function updateVendorProfile(req, res) {
    try {
        const payload = req.body;

        if (Object.keys(payload).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields provided'
            });
        }

        const vendor = req.user.vendor;

        const result = await VendorServices.updateVendor(vendor.id, payload);

        //TODO: implement log activity

        return res.json(result)

    } catch (error) {
        console.log('updateVendorProfile():', error);
        res.status(500).json({ message: 'Failed — Internal Server Error' })
    }
}

async function removeUserProfileImage(req, res) {
    try {

        const user = req.user;

        const result = await FileServices.removeFile(`/images/users/profiles/${user.userId || user.user_id || user.id}.jpg`);
        if (result) {
            //TODO implement log activity
            //Log msg: Profile image removed

            return res.json({ success: true, message: 'Profile image removed successfully' })

        }

        return res.json({ success: false, message: 'Failed — Internal Server Error' })

    } catch (error) {
        console.log('removeUserProfileImage():', error);
        res.status(500).json({ message: 'Failed — Internal Server Error' });
    }
}

module.exports = {

    getProductActiveCategories,
    getProductActiveCategoriesPaginated,
    getProductCategoriesPaginated,
    searchCategories,

    searchFamilies,

    getProductFamilies,
    getProductActiveFamilies,
    getProductFamiliesPaginatedRequested,

    getActiveBrands,
    getActiveAttributes,
    getActiveAttributeValues,
    testSendEmail,
    testMaizleEmail,
    submitVendorApplication,
    getRandomUserByAccountCategory,
    checkUsername,
    checkBusinessUsername,
    checkVendorApplication,
    getBusinessApplications,
    rejectBusinessApplication,
    approveBusinessApplication,
    uploadUserProfileAvatar,
    updateVendorProfile,
    removeUserProfileImage
}