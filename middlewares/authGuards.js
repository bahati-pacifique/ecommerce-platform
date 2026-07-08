const { verifyPreAuth, authPass, passUser, validateAuthentication } = require('./auth.middleware');

module.exports = {
    /**
     * Verify preauth
     */
    accountValidation: verifyPreAuth,
    /**
     * Check if user is already authenticated before accessing login page
     */
    checkAuthentication: validateAuthentication,
    /**
     * Middleware guard for only super_admin/ControlPanel
     */
    controlPanel: authPass({ acceptedTypes: ['super_admin'] }),
    /**
     * Pass user session
     */
    session: passUser,
    administration: authPass({ acceptedTypes: ['admin', 'dev', 'Development', 'qa'] }),
    dev: authPass({ acceptedTypes: ['dev'] }),
    qa: authPass({ acceptedTypes: ['qa'] }),
    dashboard: authPass({ acceptedTypes: ['admin', 'dev', 'engineer', 'qa', 'moderator', 'seller', 'hr', 'technical', 'store'] }),
    membership: authPass({ acceptedTypes: ['client', 'member', 'customer'] })
};