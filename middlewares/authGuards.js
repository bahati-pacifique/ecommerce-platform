// const { verifyPreAuth, authPass, passUser, validateAuthentication } = require('./auth.middleware');

// module.exports = {
//     /**
//      * Verify preauth
//      */
//     accountValidation: verifyPreAuth,
//     /**
//      * Check if user is already authenticated before accessing login page
//      */
//     checkAuthentication: validateAuthentication,
//     /**
//      * Middleware guard for only super_admin/ControlPanel
//      */
//     controlPanel: authPass({ acceptedTypes: ['super_admin'] }),
//     /**
//      * Pass user session
//      */
//     session: passUser,
//     administration: authPass({ acceptedTypes: ['admin', 'dev', 'Development', 'qa'] }),
//     dev: authPass({ acceptedTypes: ['dev'] }),
//     qa: authPass({ acceptedTypes: ['qa'] }),
//     dashboard: authPass({ acceptedTypes: ['admin', 'dev', 'Development', 'engineer', 'qa', 'moderator', 'seller', 'hr', 'technical', 'store'] }),
//     membership: authPass({ acceptedTypes: ['client', 'member', 'general'] }),
//     client: authPass({acceptedTypes: ['customer', 'subscriber']})
// };

// ========== AUTH GUARDS - IMPROVED ==========
const {
    verifyPreAuth,
    authPass,
    passUser,
    validateAuthentication,
    validateAuthorizationAndPass,
    validateAuthWithRedirectTo } = require('./auth.middleware');

// ========== ROLE HIERARCHY (Inheritance) ==========
const ROLES = {
    // System-level (highest privilege)
    SUPER_ADMIN: 'super_admin',
    ADMIN: 'admin',
    DEV: 'dev',
    QA: 'qa',
    ENGINEER: 'engineer',

    // Management-level
    MANAGER: 'manager',
    MODERATOR: 'moderator',
    HR: 'hr',

    // Business-level
    BUSINESS: 'business',
    SELLER: 'seller',
    STORE: 'store',
    MEMBER: 'member',
    CLIENT: 'client',
    CUSTOMER: 'customer',
    SUBSCRIBER: 'subscriber',

    // Development/Testing
    DEVELOPMENT: 'development',
    TECHNICAL: 'technical',
    GENERAL: 'general'
};

// ========== ROLE PERMISSIONS (Inheritance) ==========
const ROLE_HIERARCHY = {
    [ROLES.SUPER_ADMIN]: {
        inherits: [],
        level: 100
    },
    [ROLES.ADMIN]: {
        inherits: [ROLES.SUPER_ADMIN],
        level: 90
    },
    [ROLES.DEV]: {
        inherits: [ROLES.ADMIN],
        level: 80
    },
    [ROLES.ENGINEER]: {
        inherits: [ROLES.DEV],
        level: 75
    },
    [ROLES.QA]: {
        inherits: [ROLES.DEV],
        level: 70
    },
    [ROLES.MANAGER]: {
        inherits: [ROLES.ADMIN],
        level: 60
    },
    [ROLES.MODERATOR]: {
        inherits: [ROLES.MANAGER],
        level: 55
    },
    [ROLES.HR]: {
        inherits: [ROLES.MANAGER],
        level: 50
    },
    [ROLES.SELLER]: {
        inherits: [ROLES.MEMBER],
        level: 40
    },
    [ROLES.STORE]: {
        inherits: [ROLES.SELLER],
        level: 35
    },
    [ROLES.MEMBER]: {
        inherits: [ROLES.CLIENT],
        level: 30
    },
    [ROLES.CLIENT]: {
        inherits: [ROLES.CUSTOMER],
        level: 20
    },
    [ROLES.CUSTOMER]: {
        inherits: [],
        level: 10
    },
    [ROLES.SUBSCRIBER]: {
        inherits: [ROLES.CUSTOMER],
        level: 5
    },
    [ROLES.DEVELOPMENT]: {
        inherits: [ROLES.DEV],
        level: 85
    },
    [ROLES.TECHNICAL]: {
        inherits: [ROLES.ENGINEER],
        level: 70
    },
    [ROLES.GENERAL]: {
        inherits: [ROLES.MEMBER],
        level: 25
    }
};

// ========== HELPER: Get all inherited roles ==========
function getInheritedRoles(role) {
    const roles = new Set([role]);
    const hierarchy = ROLE_HIERARCHY[role];

    if (hierarchy && hierarchy.inherits) {
        hierarchy.inherits.forEach(parent => {
            getInheritedRoles(parent).forEach(r => roles.add(r));
        });
    }

    return Array.from(roles);
}

// ========== HELPER: Check if role has permission ==========
function hasRole(role, requiredRole) {
    if (role === requiredRole) return true;

    const inherited = getInheritedRoles(role);
    return inherited.includes(requiredRole);
}

// ========== CLEAN AUTH GUARDS ==========
module.exports = {
    // Pre-auth / validation
    accountValidation: verifyPreAuth,
    checkAuthentication: validateAuthentication,
    session: passUser,
    authorization: validateAuthorizationAndPass,

    // ========== ROLE-BASED GUARDS (Using Inheritance) ==========

    // System-level guards (highest privilege)
    superAdmin: authPass({
        acceptedTypes: [ROLES.SUPER_ADMIN]
    }),

    admin: authPass({
        acceptedTypes: [ROLES.ADMIN, ROLES.SUPER_ADMIN]
    }),

    // Development guards
    development: authPass({
        acceptedTypes: [ROLES.DEV, ROLES.ENGINEER, ROLES.QA, ROLES.DEVELOPMENT, ROLES.SUPER_ADMIN, ROLES.ADMIN]
    }),

    dev: authPass({
        acceptedTypes: [ROLES.DEV, ROLES.SUPER_ADMIN, ROLES.ADMIN]
    }),

    qa: authPass({
        acceptedTypes: [ROLES.QA, ROLES.DEV, ROLES.SUPER_ADMIN, ROLES.ADMIN]
    }),

    engineer: authPass({
        acceptedTypes: [ROLES.ENGINEER, ROLES.DEV, ROLES.SUPER_ADMIN, ROLES.ADMIN]
    }),

    // Management guards
    manager: authPass({
        acceptedTypes: [ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN]
    }),

    moderator: authPass({
        acceptedTypes: [ROLES.MODERATOR, ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN]
    }),

    hr: authPass({
        acceptedTypes: [ROLES.HR, ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN]
    }),

    // Business guards
    administration: authPass({
        acceptedTypes: [ROLES.ADMIN, ROLES.DEV, ROLES.DEVELOPMENT, ROLES.QA, ROLES.MANAGER, ROLES.SUPER_ADMIN]
    }),

    businessPass: validateAuthorizationAndPass(ROLES.BUSINESS),
    business: authPass({acceptedTypes: [ROLES.BUSINESS]}),

    dashboard: authPass({
        acceptedTypes: [
            ROLES.ADMIN, ROLES.DEV, ROLES.DEVELOPMENT, ROLES.ENGINEER,
            ROLES.QA, ROLES.MODERATOR, ROLES.SELLER, ROLES.HR,
            ROLES.TECHNICAL, ROLES.STORE, ROLES.SUPER_ADMIN
        ]
    }),

    // Membership guards
    membership: authPass({
        acceptedTypes: [
            ROLES.CLIENT, ROLES.MEMBER, ROLES.GENERAL,
            ROLES.CUSTOMER, ROLES.SUBSCRIBER
        ]
    }),

    client: authPass({
        acceptedTypes: [ROLES.CUSTOMER, ROLES.SUBSCRIBER, ROLES.CLIENT]
    }),

    // Specific role guards
    seller: authPass({
        acceptedTypes: [ROLES.SELLER, ROLES.MEMBER, ROLES.CLIENT, ROLES.CUSTOMER]
    }),

    store: authPass({
        acceptedTypes: [ROLES.STORE, ROLES.SELLER, ROLES.MEMBER]
    }),

    // Public/authenticated
    authenticated: authPass({
        acceptedTypes: Object.values(ROLES)
    }),

    vendorBusinessRegister: validateAuthWithRedirectTo({
        fallbackTo: "/dashboard",
        acceptedType: "business"
    }),

    // ========== UTILITY FUNCTIONS ==========
    // Export helpers for use in controllers
    helpers: {
        hasRole,
        getInheritedRoles,
        ROLES,
        ROLE_HIERARCHY
    }
};