const { acceptsHtml } = require('../../../util/helpers');
const VendorService = require('../../../src/services/vendor.services');
const StoreService = require('../../../src/services/store.services');
const InventoryService = require('../../../src/services/inventory.service');
const ListingService = require('../../../src/services/listing.service');

const qs = require('qs');
const ProductService = require('../../../src/services/product.service');

const { clearAuthentication } = require('../../../util/helpers')

const isProduction = process.env.NODE_ENV === 'production';

const sslUrlPrefix = isProduction ? 'https://' : 'http://';

const portSuffix = isProduction ? '' : `:${process.env.PORT}`;

const domain = `${sslUrlPrefix}business.${process.env.DOMAIN}${portSuffix}`;
const authDomain = `${sslUrlPrefix}auth.${process.env.DOMAIN}${portSuffix}?r=${domain}/dashboard`;

const protocal = sslUrlPrefix;
const domainName = `${process.env.DOMAIN}${portSuffix}`;

const { mockDashboard } = require('../../../src/mocks/store-dashboard.mock');
const { stat } = require('fs/promises');
const { getProductVariantsOnly } = require('../../../src/models/product.model');

async function updateStoreLastActive(id) {
    try {
        await StoreService.setStoreLastActive(id);
    } catch (error) {
        console.log("setting store active status", error)
    }
}

async function businessHomePage(req, res) {
    const user = req.user || null;

    if (!acceptsHtml(req)) {
        return res.json({
            user,
            message: "Welcome to COCOCE business"
        })
    }

    return res.render('business', { layout: false, message: "Welcome to COCOCE business", user, authDomain, domain, protocal, domainName });
}

async function businessVendorPricing(req, res) {
    const user = req.user || null;

    if (!acceptsHtml(req)) {
        return res.json({
            user,
            message: "Welcome to COCOCE business"
        })
    }

    return res.render('vendor-pricing', { layout: false, user, protocal, domainName });
}

async function renderVendorCreation(req, res) {
    const user = req.user || null;

    if (!acceptsHtml(req)) {
        return res.json({
            ...(user && { user }),
            domain,
            authDomain,
            message: "Join hundreds of happy vendors"
        })
    }

    return res.render('business-registration', { layout: false, message: "Join hundreds of happy vendors", domain, domainName, protocal, authDomain, ...(user && { user }) });
}

async function renderApplicationConfirmation(req, res) {
    const user = req.user || null;

    return res.render('business-application-confirmation', { layout: false, user });
}

function redirectedToDashboard(req, res) {

    const user = req.user;

    const vendorId = user?.vendor?.id;

    if (!vendorId) {
        clearAuthentication(res);
        req.session.message = 'Please login to continue';
        return res.redirect(`${protocal}auth.${domainName}?r=${protocal}business.${domainName}/dashboard`)
    }

    if (acceptsHtml(req)) {
        res.redirect(`/${vendorId.replaceAll('-', '')}/dashboard`)
    }
}

async function renderAttributeRegistryTerms(req, res) {
    const user = req.user;

    res.render('attribute-registry-terms', { layout: false, protocal, domainName, user });
}

async function renderDashboard(req, res) {
    const user = req.user || null;

    const vendorParam = req.params.vendor;

    if (!user || !user.vendor) {
        return res.redirect(`${protocal}/business.${domainName}/`);
    }

    if (String(user.vendor.id).replaceAll('-', '') !== String(vendorParam)) {
        //TODO log activity
        //User attempt to access page without owning or having the vendor id stated
        console.log(`User attempt to access page without owning or having the vendor id stated from ip Add. ${req.ip}`)
        return res.redirect(`${protocal}/business.${domainName}/`);
    }

    if (!acceptsHtml(req)) {
        return res.json({
            user,
            message: "Join hundreds of happy vendors"
        })
    }

    //Update lastActive
    try {
        await VendorService.updateLastActive(user.vendor.id);
    } catch (error) {
        console.log('updating vendor last active:', error)
    }

    return res.render('business-dashboard',
        {
            layout: false,
            user,
            protocal,
            domainName
        });
}

async function renderApplicationReview(req, res) {

    const identifier = req.params.identifier;

    if (identifier) {
        req.session.applicationIdentifier = identifier;
        return res.redirect('/applications/')
    }

    const applicationIdentifier = req.session.applicationIdentifier || '';
    return res.render('business-application-review', { layout: false, protocal, domainName, applicationIdentifier });
}

async function renderStoreCreation(req, res) {
    const user = req.user;
    const vendorParamId = req.params.vendorId;

    if (!user || !user.vendor) {
        return res.redirect(`${protocal}/business.${domainName}/`);
    }

    if (String(user.vendor.id).replaceAll('-', '') !== String(vendorParamId)) {
        //TODO log activity
        //User attempt to access page without owning or having the vendor id stated

        return res.redirect(`${protocal}/business.${domainName}/`);
    }

    //const vendor = await VendorService.getVendorByUserId(user.userId || user.user_id || user.id, { includeUser: false });
    return res.render('store-creation', { layout: false, user, protocal, domainName });
}

async function renderTerms(req, res) {
    const user = req.user;
    return res.render('store-terms', { layout: false, user, protocal, domainName });
}

async function renderStoreDashboardWelcome(req, res) {
    const user = req.user;
    const storeId = req.params.storeId;
    try {

        const vendorStore = await StoreService.getVendorStore(storeId, user.vendor?.id || null);

        if (!vendorStore) {
            return res.render('store-no-access', {
                layout: false,
                message: `<span class="text-black/70">Oops!</span> <span class="text-brand">${user.username}</span>, we're unable to get you authenticated to this Store.`,
                details: `<h1 class="text-left text-ink-700 text-lg">It's seems like:</h1><p class="text-sm sm:text-base text-left text-ink-500 leading-relaxed"><br>● This store does not belongs to you, <br>● This store have been disabled or does not exist. <br><br><i>Please contact our support team for clarification</i></p>`,
                code: 'STORE_NOT_FOUND',
                protocal,
                domainName
            });
        }
        res.locals.layout = 'store-center';
        updateStoreLastActive(vendorStore.id);
        return res.render('store-partials/welcome', { layout: 'store-center', store: vendorStore, user, protocal, domainName, title: 'dashboard-welcome' });
    } catch (error) {
        console.log(error);
        return res.render('store-no-access', {
            layout: false,
            message: `<span class="text-black/70">Oops!</span> <span class="text-brand">${user.username}</span>, we're unable to get you authenticated to this Store.`,
            details: `<h1 class="text-left text-ink-700 text-lg">It's seems like:</h1><p class="text-sm sm:text-base text-left text-ink-500 leading-relaxed"><br>● This store does not belongs to you, <br>● This store have been disabled or does not exist. <br><br><i>Please contact our support team for clarification</i></p>`,
            code: error.message.toUpperCase(),
            protocal,
            domainName
        });

    }
}

async function renderStoreInventory(req, res) {
    const user = req.user;
    const storeId = req.params.storeId;
    try {

        const vendorStore = await StoreService.getVendorStore(storeId, user.vendor?.id || null);

        if (!vendorStore) {
            return res.render('store-no-access', {
                layout: false,
                message: `<span class="text-black/70">Oops!</span> <span class="text-brand">${user.username}</span>, we're unable to get you authenticated to this Store.`,
                details: `<h1 class="text-left text-ink-700 text-lg">It's seems like:</h1><p class="text-sm sm:text-base text-left text-ink-500 leading-relaxed"><br>● This store does not belongs to you, <br>● This store have been disabled or does not exist. <br><br><i>Please contact our support team for clarification</i></p>`,
                code: 'STORE_NOT_FOUND',
                protocal,
                domainName
            });
        }
        res.locals.layout = 'store-center';
        updateStoreLastActive(vendorStore.id);
        return res.render('store-partials/inventory', { layout: 'store-center', store: vendorStore, user, protocal, domainName, title: 'inventory' });
    } catch (error) {
        console.log(error);
        return res.render('store-no-access', {
            layout: false,
            message: `<span class="text-black/70">Oops!</span> <span class="text-brand">${user.username}</span>, we're unable to get you authenticated to this Store.`,
            details: `<h1 class="text-left text-ink-700 text-lg">It's seems like:</h1><p class="text-sm sm:text-base text-left text-ink-500 leading-relaxed"><br>● This store does not belongs to you, <br>● This store have been disabled or does not exist. <br><br><i>Please contact our support team for clarification</i></p>`,
            code: error.message.toUpperCase(),
            protocal,
            domainName
        });

    }
}

//============================= INVENTORY OPERATIONS =====================

async function renderInventoryHome(req, res) {
    const user = req.user;
    const { storeId, inventoryId } = req.params;
    try {

        const vendorStore = await StoreService.getVendorStore(storeId, user.vendor?.id || null);

        if (!vendorStore) {
            return res.render('store-no-access', {
                layout: false,
                message: `<span class="text-black/70">Oops!</span> <span class="text-brand">${user.username}</span>, we're unable to give you access to the requested page.`,
                details: `<h1 class="text-left text-ink-700 text-lg">It's seems like:</h1><p class="text-sm sm:text-base text-left text-ink-500 leading-relaxed"><br>● This store does not belongs to you, <br>● This store have been disabled or does not exist. <br><br><i>Please contact our support team for clarification</i></p>`,
                code: 'INVENTORY_ACCESS_ERROR',
                protocal,
                domainName
            });
        }
        res.locals.layout = 'inventory-center';
        const inventory = await InventoryService.getInventoryById(inventoryId, vendorStore.id);
        updateStoreLastActive(vendorStore.id);
        const welcomeAlert = `<span class="font-bold">Hi, ${user.username}!</span> Please click on 'Quick actions' button for navigations.`;
        return res.render('store-partials/welcome', {
            layout: 'inventory-center',
            store: vendorStore,
            inventory,
            user,
            protocal,
            domainName,
            title: 'Inventory Home',
            titleBadge: 'Inventory Portal',
            welcomeAlert
        });
    } catch (error) {
        console.log(error);
        return res.render('store-no-access', {
            layout: false,
            message: `<span class="text-black/70">Oops!</span> <span class="text-brand">${user.username}</span>, we're unable to give you access to the requested page.`,
            details: `<h1 class="text-left text-ink-700 text-lg">It's seems like:</h1><p class="text-sm sm:text-base text-left text-ink-500 leading-relaxed"><br>● This store does not belongs to you, <br>● This store have been disabled or does not exist. <br><br><i>Please contact our support team for clarification</i></p>`,
            code: 'INVENTORY_ACCESS_ERROR',
            protocal,
            domainName
        });

    }
}

async function renderInventoryOverview(req, res) {
    const user = req.user;
    const { storeId, inventoryId } = req.params;
    try {

        const vendorStore = await StoreService.getVendorStore(storeId, user.vendor?.id || null);

        if (!vendorStore) {
            return res.render('store-no-access', {
                layout: false,
                message: `<span class="text-black/70">Oops!</span> <span class="text-brand">${user.username}</span>, we're unable to get you authenticated to this Store.`,
                details: `<h1 class="text-left text-ink-700 text-lg">It's seems like:</h1><p class="text-sm sm:text-base text-left text-ink-500 leading-relaxed"><br>● This store does not belongs to you, <br>● This store have been disabled or does not exist. <br><br><i>Please contact our support team for clarification</i></p>`,
                code: 'STORE_NOT_FOUND',
                protocal,
                domainName
            });
        }

        res.locals.layout = 'inventory-center';

        const inventory = await InventoryService.getInventoryById(inventoryId, vendorStore.id);

        updateStoreLastActive(vendorStore.id);

        const data = await InventoryService.getInventoryDetail(vendorStore.id, inventoryId);

        return res.render('partials/inventory/show', {
            layout: 'inventory-center',
            store: vendorStore,
            inventory,
            user,
            protocal,
            domainName,
            title: 'Inventory Overview',
            data
        });
    } catch (err) {
        console.error('[inventory/index] failed:', err);

        res.render('partials/inventory/inventory-overview', {
            layout: 'inventory-center',
            protocal,
            domainName,
            title: 'Inventory Overview',
            ...InventoryService.emptyInventoryOverview(),
        });
    }
}

async function renderInventoryUnit(req, res) {
    const user = req.user;
    const { storeId, inventoryId } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const status = req.query.status || '';
    const sort = req.query.sort || 'recent';
    try {

        const vendorStore = await StoreService.getVendorStore(storeId, user.vendor?.id || null);

        if (!vendorStore) {
            return res.render('store-no-access', {
                layout: false,
                message: `<span class="text-black/70">Oops!</span> <span class="text-brand">${user.username}</span>, we're unable to get you authenticated to this Store.`,
                details: `<h1 class="text-left text-ink-700 text-lg">It's seems like:</h1><p class="text-sm sm:text-base text-left text-ink-500 leading-relaxed"><br>● This store does not belongs to you, <br>● This store have been disabled or does not exist. <br><br><i>Please contact our support team for clarification</i></p>`,
                code: 'STORE_NOT_FOUND',
                protocal,
                domainName
            });
        }

        res.locals.layout = 'inventory-center';

        const inventory = await InventoryService.getInventoryById(inventoryId, vendorStore.id);

        updateStoreLastActive(vendorStore.id);

        const result = await InventoryService.listUnitsByInventory(inventory.id, {
            page,
            limit,
            status,
            sort,
        });

        const storeInventories = await InventoryService.getInventoriesByStoreId(vendorStore.id, { limit: 10 });

        return res.render('partials/inventory/units', {
            layout: 'inventory-center',
            store: vendorStore,
            inventory,
            user,
            protocal,
            domainName,
            store_inventories: storeInventories.rows,
            title: 'Inventory Unit',
            data: result
        });
    } catch (err) {
        console.error('Error rending [inventory unit] failed:', err);

        res.render('partials/inventory/inventory-overview', {
            layout: 'inventory-center',
            protocal,
            domainName,
            title: 'Inventory Overview',
            ...InventoryService.emptyInventoryOverview(),
        });
    }
}

async function getItemUnit(req, res) {
    const user = req.user;
    const storeId = req.params.storeId;
    const unitId = req.params.unitId;

    try {
        const vendorStore = await StoreService.getVendorStore(storeId, user.vendor?.id || null);

        if (!vendorStore) {
            return res.status(401).json({
                message: `Vendor/Store verification failed`
            });
        }

        const result = await InventoryService.getUnitById(unitId);

        return res.status(result ? 200 : 404).json({
            ...result,
            ...(!result && { message: 'Unit not found, please check unit id/serial number/barcode' }),
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: 'Unable to get unit — Internal error'
        })
    }
}


async function createInventoryItem(req, res) {

    const { storeId, inventoryId } = req.params;
    const user = req.user;

    try {
        const vendorStore = await StoreService.getVendorStore(storeId, user.vendor?.id || null);

        if (!vendorStore) {
            return res.status(401).json({
                message: 'Failed — Unable to add inventory item'
            })
        }

        const {
            listing_variant_id, tracking_mode, quantity = 0, reserved = 0,
            batch_number = null, mfg_at = null, expires_at = null,
            status = 'in_stock'
        } = req.body;



        const result = await InventoryService.insertItem(storeId, {
            inventoryId, listing_variant_id, tracking_mode, quantity, reserved,
            batch_number, mfg_at, expires_at,
            status,
        });

        return res.status(201).json({ success: true, result })
    } catch (error) {
        console.log('[addInventoryItem]', error);

        return res.status(500).json({
            success: false,
            message: 'Unable to insert item — Internal Error'
        });
    }

}

async function insertInventoryUnit(req, res) {
    const { storeId, inventoryId } = req.params;
    const user = req.user;
    try {
        const vendorStore = await StoreService.getVendorStore(storeId, user.vendor?.id || null);

        if (!vendorStore) {
            return res.status(401).json({
                message: 'Failed — Vendor/Store verification failed'
            });
        }

        const result = await InventoryService.insertItemUnity(vendorStore.id, inventoryId, {
            inventoryItemId: req.body.inventory_item_id,
            serialNumber: req.body.serial_number,
            barcode: req.body.barcode,
            imei: req.body.imei,
            macAddress: req.body.mac_address,
            status: req.body.status,
            condition: req.body.condition,
            receivedAt: req.body.received_at,
            soldAt: req.body.sold_at,
            meta: req.body.meta,
        }, user)


        return res.status(201).json(result);

    } catch (error) {
        console.log('[insertInventoryItemUnit]', error);

        let message = 'Unable to insert unit — Internal Error';

        if (error.code === '23505') message = `Failed — Item unit with provided serial number/imei/mac address/barcode already exists`
        return res.status(500).json({
            success: false,
            message,
        });
    }
}

async function searchUnit(req, res) {
    const user = req.user;
    const { storeId, inventoryId } = req.params;
    try {
        const { q, status } = req.query;
        const vendorStore = await StoreService.getVendorStore(storeId, user.vendor?.id || null);

        if (!vendorStore) {
            return res.status(401).json({
                message: 'Failed — Unable to retieve store'
            })
        }

        const result = await InventoryService.searchUnit(storeId, q, {
            inventoryId,
            status,
            limit: 100,
        });

        return res.json({
            result
        });
    } catch (err) {
        console.log('[searching unit]: ', err);
        return res.status(404).json({
            message: 'Failed — Internal error'
        })
    }
}

async function searchListingByStore(req, res) {
    const storeId = req.params.storeId;
    try {
        const { query, limit } = req.query;
        const result = await ListingService.searchListingByStore(storeId, query, { limit });
        return res.json(result);
    } catch (error) {
        console.log('searchListingByStore()', error);
        return res.status(500).json({
            message: `Failed — Internal Error`
        })
    }
}

// async function renderInventoryIndex(req, res) {
//     const user = req.user;
//     const storeId = req.params.storeId;
//     try {

//         const vendorStore = await StoreService.getVendorStore(storeId, user.vendor?.id || null);


//         if (!vendorStore) {
//             return res.render('store-no-access', {
//                 layout: false,
//                 message: `<span class="text-black/70">Oops!</span> <span class="text-brand">${user.username}</span>, we're unable to get you authenticated to this Store.`,
//                 details: `<h1 class="text-left text-ink-700 text-lg">It's seems like:</h1><p class="text-sm sm:text-base text-left text-ink-500 leading-relaxed"><br>● This store does not belongs to you, <br>● This store have been disabled or does not exist. <br><br><i>Please contact our support team for clarification</i></p>`,
//                 code: 'STORE_NOT_FOUND',
//                 protocal,
//                 domainName
//             });
//         }
//         const data = await InventoryService.getInventoryOverview(vendorStore.id);

//         res.locals.layout = 'store-center';
//         res.render('pages/inventory/index', {
//             layout: 'store-center',
//             title: 'Inventory',
//             locations: data.locations,
//             totals: data.totals,
//         });
//     } catch (err) {
//         console.error('[inventory/index] failed:', err);

//         // Even the error state is a service concern — but we still render *something*
//         res.render('pages/inventory/index', {
//             title: 'Inventory',
//             ...InventoryService.emptyInventoryOverview(),
//         });
//     }
// }

async function renderStoreDashboard(req, res) {
    const user = req.user;
    const storeId = req.params.storeId;

    try {

        const vendorStore = await StoreService.getVendorStore(storeId, user.vendor?.id || null);

        if (!vendorStore) {
            return res.render('store-no-access', {
                layout: false,
                message: `<span class="text-black/70">Oops!</span> <span class="text-brand">${user.username}</span>, we're unable to get you authenticated to this Store.`,
                details: `<h1 class="text-left text-ink-700 text-lg">It's seems like:</h1><p class="text-sm sm:text-base text-left text-ink-500 leading-relaxed"><br>● This store does not belongs to you, <br>● This store have been disabled or does not exist. <br><br><i>Please contact our support team for clarification</i></p>`,
                code: 'STORE_NOT_FOUND',
                protocal,
                domainName
            });
        }

        const data = await StoreService.getDashboard({ storeId: vendorStore.id, period: '7d' });

        res.locals.layout = 'store-center';
        updateStoreLastActive(vendorStore.id);

        return res.render('store-partials/dashboard', { layout: 'store-center', dashboard: data, store: vendorStore, user, protocal, domainName, title: 'home' });
    } catch (error) {
        console.log(error);
        return res.render('store-no-access', {
            layout: false,
            message: `<span class="text-black/70">Oops!</span> <span class="text-brand">${user.username}</span>, we're unable to get you authenticated to this Store.`,
            details: `<h1 class="text-left text-ink-700 text-lg">It's seems like:</h1><p class="text-sm sm:text-base text-left text-ink-500 leading-relaxed"><br>● This store does not belongs to you, <br>● This store have been disabled or does not exist. <br><br><i>Please contact our support team for clarification</i></p>`,
            code: error.message.toUpperCase(),
            protocal,
            domainName
        });

    }
}

async function renderStoreListing(req, res) {
    const user = req.user;
    const storeId = req.params.storeId;

    try {

        const vendorStore = await StoreService.getVendorStore(storeId, user.vendor?.id || null);

        if (!vendorStore) {
            return res.render('store-no-access', {
                layout: false,
                message: `<span class="text-black/70">Oops!</span> <span class="text-brand">${user.username}</span>, we're unable to get you authenticated to this Store.`,
                details: `<h1 class="text-left text-ink-700 text-lg">It's seems like:</h1><p class="text-sm sm:text-base text-left text-ink-500 leading-relaxed"><br>● This store does not belongs to you, <br>● This store have been disabled or does not exist. <br><br><i>Please contact our support team for clarification</i></p>`,
                code: 'STORE_NOT_FOUND',
                protocal,
                domainName
            });
        }

        //Update store last active
        res.locals.layout = 'store-center';
        updateStoreLastActive(vendorStore.id);
        return res.render('store-partials/listings', { layout: 'store-center', store: vendorStore, user, protocal, domainName, title: 'listings' });
    } catch (error) {
        console.log(error);
        return res.render('store-no-access', {
            layout: false,
            message: `<span class="text-black/70">Oops!</span> <span class="text-brand">${user.username}</span>, we're unable to get you authenticated to this Store.`,
            details: `<h1 class="text-left text-ink-700 text-lg">It's seems like:</h1><p class="text-sm sm:text-base text-left text-ink-500 leading-relaxed"><br>● This store does not belongs to you, <br>● This store have been disabled or does not exist. <br><br><i>Please contact our support team for clarification</i></p>`,
            code: error.message.toUpperCase(),
            protocal,
            domainName
        });

    }
}

async function renderStoreOrders(req, res) {
    const user = req.user;
    const storeId = req.params.storeId;

    try {
        const vendorStore = await StoreService.getVendorStore(
            storeId,
            user.vendor?.id || null
        );

        if (!vendorStore) {
            return res.render('store-no-access', {
                layout: false,
                message: `<span class="text-black/70">Oops!</span> <span class="text-brand">${user.username}</span>, we're unable to get you authenticated to this Store.`,
                details: `<h1 class="text-left text-ink-700 text-lg">It seems like:</h1>
          <p class="text-sm sm:text-base text-left text-ink-500 leading-relaxed">
            <br>● This store does not belong to you, <br>
            ● This store has been disabled or does not exist. <br><br>
            <i>Please contact our support team for clarification</i>
          </p>`,
                code: 'STORE_NOT_FOUND',
                protocal,
                domainName,
            });
        }

        return res.render('store-partials/orders', {
            layout: 'store-center',
            title: 'Orders',
            store: vendorStore,
            user,
            protocal,
            domainName,
        });
    } catch (error) {
        console.error(error);

        return res.render('store-no-access', {
            layout: false,
            message: `<span class="text-black/70">Oops!</span> <span class="text-brand">${user.username}</span>, we're unable to get you authenticated to this Store.`,
            details: `<h1 class="text-left text-ink-700 text-lg">It seems like:</h1>
        <p class="text-sm sm:text-base text-left text-ink-500 leading-relaxed">
          <br>● This store does not belong to you, <br>
          ● This store has been disabled or does not exist. <br><br>
          <i>Please contact our support team for clarification</i>
        </p>`,
            code: (error.message || 'UNKNOWN_ERROR').toUpperCase(),
            protocal,
            domainName
        });
    }
}

async function renderStoreProducts(req, res) {
    const user = req.user;
    const storeId = req.params.storeId;

    try {
        const vendorStore = await StoreService.getVendorStore(
            storeId,
            user.vendor?.id || null
        );

        if (!vendorStore) {
            return res.render('store-no-access', {
                layout: false,
                message: `<span class="text-black/70">Oops!</span> <span class="text-brand">${user.username}</span>, we're unable to get you authenticated to this Store.`,
                details: `<h1 class="text-left text-ink-700 text-lg">It seems like:</h1>
                            <p class="text-sm sm:text-base text-left text-ink-500 leading-relaxed">
                                <br>● This store does not belong to you, <br>
                                ● This store has been disabled or does not exist. <br><br>
                                <i>Please contact our support team for clarification</i>
                            </p>
                `,
                code: 'STORE_NOT_FOUND',
                protocal,
                domainName,
            });
        }

        updateStoreLastActive(vendorStore.id);

        return res.render('store-partials/products', {
            layout: 'store-center',
            title: 'Products',
            store: vendorStore,
            user,
            protocal,
            domainName
        });
    } catch (error) {
        console.error(error);

        return res.render('store-no-access', {
            layout: false,
            message: `<span class="text-black/70">Oops!</span> <span class="text-brand">${user.username}</span>, we're unable to get you authenticated to this Store.`,
            details: `<h1 class="text-left text-ink-700 text-lg">It seems like:</h1>
        <p class="text-sm sm:text-base text-left text-ink-500 leading-relaxed">
          <br>● This store does not belong to you, <br>
          ● This store has been disabled or does not exist. <br><br>
          <i>Please contact our support team for clarification</i>
        </p>`,
            code: (error.message || 'UNKNOWN_ERROR').toUpperCase(),
            protocal,
            domainName
        });
    }
}

async function getStoreListingProductAnalytics(req, res) {
    try {
        const storeId = req.params.storeId;
        const { page, limit, search, status, sortBy, sortOrder = 'DESC' } = req.query;

        const result = await StoreService.getProductListingAnalytics({
            storeId,
            page,
            limit,
            search,
            status,
            sortBy,
            sortOrder,
        });

        return res.json(result)
    } catch (error) {
        console.log('getStoreListingProductAnalytics():', error);
        return res.status(500).json({ message: 'Internal Error — Unable to get listing analytic' });
    }
}

async function getInventoriesByStoreId(req, res) {
    try {
        const storeId = req.params.storeId;
        const { lowStockThreshold, search, status, stock, page, limit } = req.params;
        const user = req.user;

        const vendorStore = await StoreService.getVendorStore(
            storeId,
            user.vendor?.id || null
        );

        if (!vendorStore) {
            return res.status(401).json({
                message: 'Store verification failed'
            })
        }

        const result = await StoreService.getInventoriesByStoreId({
            storeId,
            search, status, stock, page, limit, lowStockThreshold
        });

        return res.json(result);
    } catch (error) {
        console.log('getInventoriesByStoreId()', error);
        return res.status(500).json({ message: 'Internal Error — Unable to get listing analytic' });
    }
}

async function renderStoreFollowers(req, res) {
    const user = req.user;
    const storeId = req.params.storeId;

    try {
        const vendorStore = await StoreService.getVendorStore(
            storeId,
            user.vendor?.id || null
        );

        if (!vendorStore) {
            return res.render('store-no-access', {
                layout: false,
                message: `<span class="text-black/70">Oops!</span> <span class="text-brand">${user.username}</span>, we're unable to get you authenticated to this Store.`,
                details: `<h1 class="text-left text-ink-700 text-lg">It seems like:</h1>
                            <p class="text-sm sm:text-base text-left text-ink-500 leading-relaxed">
                                <br>● This store does not belong to you, <br>
                                ● This store has been disabled or does not exist. <br><br>
                                <i>Please contact our support team for clarification</i>
                            </p>
                `,
                code: 'STORE_NOT_FOUND',
                protocal,
                domainName,
            });
        }

        return res.render('store-partials/followers', {
            layout: 'store-center',
            title: 'Followers',
            store: vendorStore,
            user,
            protocal,
            domainName,
        });
    } catch (error) {
        console.error(error);

        return res.render('store-no-access', {
            layout: false,
            message: `<span class="text-black/70">Oops!</span> <span class="text-brand">${user.username}</span>, we're unable to get you authenticated to this Store.`,
            details: `<h1 class="text-left text-ink-700 text-lg">It seems like:</h1>
        <p class="text-sm sm:text-base text-left text-ink-500 leading-relaxed">
          <br>● This store does not belong to you, <br>
          ● This store has been disabled or does not exist. <br><br>
          <i>Please contact our support team for clarification</i>
        </p>`,
            code: (error.message || 'UNKNOWN_ERROR').toUpperCase(),
            protocal,
            domainName
        });
    }
}

async function renderInvontoryForm(req, res) {
    const vendorId = req.params.vendor;

    const user = req.user;

    if (user.vendor?.id.replaceAll('-', '') !== vendorId) {
        //Invalid session and id
        return res.redirect('/');
    }

    const { stores } = await StoreService.getPaginatedStoresByVendorId(user.vendor.id);

    return res.render('inventory-form', { layout: false, user, protocal, domainName, stores });
}

async function renderMessages(req, res) {
    //const vendorId = req.params.vendor;

    const user = req.user;

    const conversations = [];
    return res.render('messaging', { layout: false, user, conversations });
}

async function renderNotifications(req, res) {
    //const vendorId = req.params.vendor;
    const user = req.user;

    const conversations = [];
    return res.render('notification-center', { layout: false, user, conversations });
}

async function transferUnit(req, res) {
    const { storeId, unitId, inventoryId } = req.params;
    const user = req.user;
    try {
        const vendorStore = await StoreService.getVendorStore(
            storeId,
            user.vendor?.id || null
        );

        if (!vendorStore) {
            return res.status(401).json({
                message: 'Vendor/Store verification failed'
            });
        }

        const result = await StoreService.transferUnit(unitId, inventoryId);

        return res.status(201).json(result);
    } catch (error) {
        console.log(error);
        let message = 'Failed — Internal Error';
        if (!error.code) message = error.message;
        return res.status(500).json({
            message 
        });
    }
}

async function getVendorOrderDashboard(req, res) {
    try {
        const vendorId = req.user.vendor.id;

        const { period } = req.query;

        if (!vendorId) return res.status(401).json({ message: 'Not authenticated' });

        const result = await VendorService.getOrderVendorDashboardData(vendorId, period);

        return res.json(result);
    } catch (error) {
        console.log('getVendorOrderDashboard():', error);
        res.status(500).json({ message: !error.code ? error.message : 'Failed — Internal Server Error' });
    }
}

async function getAnalyticVendorDashboardData(req, res) {
    try {
        const vendorId = req.user.vendor?.id || null;

        if (!vendorId) return res.status(403).json({
            message: 'Failed — It seems like you are not authenticated'
        })

        const { period } = req.query;

        if (!vendorId) return res.status(401).json({ message: 'Not authenticated' });

        const result = await VendorService.getAnalyticVendorDashboardData(vendorId, period);

        return res.json(result);
    } catch (error) {
        console.log('getVendorOrderDashboard():', error);
        res.status(500).json({ message: !error.code ? error.message : 'Failed — Internal Server Error' });
    }
}

async function getVendorOverviewData(req, res) {
    try {
        const vendorId = req.user.vendor?.id || null;

        if (!vendorId) return res.status(403).json({
            message: 'Failed — It seems like you are not authenticated'
        })

        const { period, lowStockThreshold } = req.query;

        if (!vendorId) return res.status(401).json({ message: 'Not authenticated' });

        const result = await VendorService.getVendorOverviewData(vendorId, period, lowStockThreshold);

        return res.json(result);
    } catch (error) {
        console.log('getVendorOrderDashboard():', error);
        return res.status(500).json({ message: !error.code ? error.message : 'Failed — Internal Server Error' });
    }
}

async function renderProductCataloging(req, res) {
    const user = req.user;
    return res.render('product-cataloging', { layout: false, user, protocal, domainName });
}

async function renderProductCatalog(req, res) {
    const user = req.user;
    return res.render('product-catalog', { layout: false, user, protocal, domainName, type: 'vendor' });
}

async function renderListingcataloging(req, res) {
    const user = req.user;
    const storeId = req.params.storeId;

    try {

        const vendorStore = await StoreService.getVendorStore(storeId, user.vendor?.id || null);

        if (!vendorStore) {
            return res.render('store-no-access', {
                layout: false,
                message: `<span class="text-black/70">Oops!</span> <span class="text-brand">${user.username}</span>, we're unable to get you authenticated to this Store.`,
                details: `<h1 class="text-left text-ink-700 text-lg">It's seems like:</h1><p class="text-sm sm:text-base text-left text-ink-500 leading-relaxed"><br>● This store does not belongs to you, <br>● This store have been disabled or does not exist. <br><br><i>Please contact our support team for clarification</i></p>`,
                code: 'STORE_NOT_FOUND',
                protocal,
                domainName
            });
        }
        res.locals.layout = 'focused';
        updateStoreLastActive(vendorStore.id);
        return res.render('partials/listing/new', { layout: 'focused', store: vendorStore, user, protocal, domainName, title: 'New Listing' });
    } catch (error) {
        console.log(error);
        return res.render('store-no-access', {
            layout: false,
            message: `<span class="text-black/70">Oops!</span> <span class="text-brand">${user.username}</span>, we're unable to get you authenticated to this Store.`,
            details: `<h1 class="text-left text-ink-700 text-lg">It's seems like:</h1><p class="text-sm sm:text-base text-left text-ink-500 leading-relaxed"><br>● This store does not belongs to you, <br>● This store have been disabled or does not exist. <br><br><i>Please contact our support team for clarification</i></p>`,
            code: error.message.toUpperCase(),
            protocal,
            domainName
        });

    }
}

async function renderMarketplacePolicy(req, res) {
    const user = req.user;
    res.render('marketplace-terms', { layout: false, user, protocal, domainName })
}

async function renderCatalogPolicy(req, res) {
    const user = req.user;
    res.render('catalog-policy', { layout: false, user, protocal, domainName })
}

async function renderCatalogTerms(req, res) {
    const user = req.user;
    res.render('catalog-terms', { layout: false, user, protocal, domainName })
}

async function insertProductCatalog(req, res) {

    try {

        const body = qs.parse(
            Object.assign({}, req.body)
        );

        const product = body.product || {};

        const variants = Array.isArray(body.variants)
            ? body.variants
            : [];

        const mediaMeta = Array.isArray(body.media)
            ? body.media
            : [];

        const filesByIndex = {};

        for (const [fieldName, file] of Object.entries(
            req.files || {}
        )) {

            const match = fieldName.match(
                /^media\[(\d+)\]\[file\]$/
            );

            if (!match) continue;

            filesByIndex[
                Number(match[1])
            ] = file;
        }


        // --------------------------------------------------
        // BUILD MEDIA
        // --------------------------------------------------

        const media = mediaMeta.map((meta, index) => ({
            file: filesByIndex[index] || null,

            position: Number(
                meta?.position ?? index
            ),

            is_primary:
                meta?.is_primary === 'true' ||
                meta?.is_primary === true
        }));


        // --------------------------------------------------
        // VALIDATION
        // --------------------------------------------------

        const errors = [];


        // --------------------------------------------------
        // PRODUCT
        // --------------------------------------------------

        if (!product.title?.trim()) {

            errors.push(
                'product.title is required'
            );
        }


        if (!product.slug?.trim()) {

            errors.push(
                'product.slug is required'
            );
        }


        if (!product.family_id) {

            errors.push(
                'product.family_id is required'
            );
        }


        // --------------------------------------------------
        // VARIANTS
        // --------------------------------------------------

        if (!variants.length) {

            errors.push(
                'At least one variant is required'
            );
        }


        for (let i = 0; i < variants.length; i++) {

            const variant = variants[i];


            if (!variant.sku?.trim()) {

                errors.push(
                    `variants[${i}].sku is required`
                );
            }


            const attributes =
                Array.isArray(variant.attributes)
                    ? variant.attributes
                    : [];


            if (!attributes.length) {

                errors.push(
                    `variants[${i}].attributes must have at least one entry`
                );
            }
        }


        // --------------------------------------------------
        // MEDIA
        // --------------------------------------------------

        if (!media.length) {

            errors.push(
                'At least one image is required'
            );
        }


        if (media.length > 10) {

            errors.push(
                'A maximum of 10 images is allowed'
            );
        }


        for (let i = 0; i < media.length; i++) {

            const item = media[i];


            if (!item.file) {

                errors.push(
                    `media[${i}].file is missing`
                );

                continue;
            }


            if (
                !/^image\/(jpeg|png|webp)$/.test(
                    item.file.mimetype
                )
            ) {

                errors.push(
                    `media[${i}] has unsupported type ${item.file.mimetype}`
                );
            }
        }


        // --------------------------------------------------
        // PRIMARY IMAGE
        // --------------------------------------------------

        const primaryCount = media.filter(
            item => item.is_primary
        ).length;


        if (primaryCount > 1) {

            errors.push(
                'Only one product image can be primary'
            );
        }


        // --------------------------------------------------
        // VALIDATION RESPONSE
        // --------------------------------------------------

        if (errors.length) {

            return res.status(422).json({
                message: 'Validation failed',
                errors
            });
        }


        // --------------------------------------------------
        // CREATE PRODUCT CATALOG
        // --------------------------------------------------

        const result =
            await ProductService.createProductCatalog({

                product,

                variants,

                media,

                requestedBy:
                    req.user?.userId || req.user?.user_id || req.user?.id
            });


        // --------------------------------------------------
        // RESPONSE
        // --------------------------------------------------

        return res.status(201).json({

            message:
                'Product catalog submitted successfully',

            data: result
        });


    } catch (error) {

        console.error(
            '[insertProductCatalog]',
            error
        );


        return res.status(500).json({

            message:
                error.message ||
                'Internal server error'
        });
    }
}

async function insertNewList(req, res) {
    try {
        const payload = req.body;
        const store_id = req.params.storeId;
        const files = req.files || {};

        let {
            product_id,
            title,
            description,
            condition,
            status,
            variants,
            meta
        } = payload;

        // Parse variants safely.
        if (typeof variants === 'string') {
            try {
                variants = JSON.parse(variants);
            } catch {
                return res.status(422).json({
                    success: false,
                    message: 'Variants must contain valid JSON'
                });
            }
        }

        if (!Array.isArray(variants) || variants.length === 0) {
            return res.status(422).json({
                success: false,
                message: 'At least one variant is required'
            });
        }

        // Parse listing options (meta).
        if (typeof meta === 'string') {
            try {
                meta = JSON.parse(meta);
            } catch {
                return res.status(422).json({
                    success: false,
                    message: 'Meta must contain valid JSON'
                });
            }
        }

        if (
            meta != null &&
            (typeof meta !== 'object' || Array.isArray(meta))
        ) {
            return res.status(422).json({
                success: false,
                message: 'Meta must be a JSON object'
            });
        }

        const listingPayload = {
            product_id,
            store_id,
            title: title?.trim(),
            description,
            options: meta || {},
            status: status || 'active',
            condition: condition || 'new'
        };

        const listingVideo = files.video || null;

        // Map images[index][] to the appropriate variant.
        const imagesByIndex = {};

        for (const [fieldName, uploaded] of Object.entries(files)) {
            const match = fieldName.match(/^images\[(\d+)\]\[\]$/);

            if (!match) continue;

            const index = Number(match[1]);
            const images = Array.isArray(uploaded)
                ? uploaded
                : [uploaded];

            imagesByIndex[index] ??= [];
            imagesByIndex[index].push(...images);
        }

        const errors = [];

        if (!product_id) errors.push('product_id is required');
        if (!store_id) errors.push('storeId is required');
        if (!listingPayload.title) errors.push('title is required');

        variants.forEach((variant, index) => {
            if (!variant.catalog_variant_id) {
                errors.push(
                    `variants[${index}].catalog_variant_id is required`
                );
            }

            if (!variant.sku?.trim()) {
                errors.push(`variants[${index}].sku is required`);
            }

            if (
                variant.price === undefined ||
                variant.price === null ||
                variant.price === '' ||
                !Number.isFinite(Number(variant.price)) ||
                Number(variant.price) < 0
            ) {
                errors.push(
                    `variants[${index}].price must be non-negative`
                );
            }

            //We choosed to let system pick base currency
            // if (!variant.currency_id) {
            //     errors.push(
            //         `variants[${index}].currency_id is required`
            //     );
            // }
        });

        if (listingVideo && listingVideo.mimetype !== 'video/mp4') {
            errors.push('The listing video must be an MP4 file');
        }

        for (const [index, images] of Object.entries(imagesByIndex)) {
            if (Number(index) >= variants.length) {
                errors.push(`Images reference invalid variant index ${index}`);
            }

            for (const image of images) {
                if (![
                    'image/jpeg',
                    'image/png',
                    'image/webp'
                ].includes(image.mimetype)) {
                    errors.push(
                        `Unsupported image type: ${image.mimetype}`
                    );
                }
            }
        }

        console.log(errors)
        if (errors.length) {
            return res.status(422).json({
                success: false,
                message: 'Validation failed',
                errors
            });
        }

        const result = await ListingService.createListing({
            listing: listingPayload,
            variants,
            imagesByIndex,
            video: listingVideo,
            vendorId: req.user?.vendor?.id
        });

        return res.status(201).json({
            success: true,
            message: 'Listing created successfully',
            data: result,
            result
        });
    } catch (error) {
        console.error('[insertNewList]:', error);

        let message = 'Unable to create listing — Internal Error';

        if (error.code === '23505') {
            message = `A List for this product already exists in your store, please consider add variant instead`
        }

        return res.status(500).json({
            success: false,
            message
        });
    }
}


async function getPaginatedProductsCatalog(req, res) {
    try {
        const { page = 1, limit } = req.query;
        const offset = (page - 1) * limit;
        const result = await ProductService.getPaginatedProductsCatalog({ limit, offset });

        return res.json(result);

    } catch (error) {
        console.log(`getPaginatedProductsCatalog()`, error);
        res.status(500).json({
            message: 'Failed — Internal Error'
        });
    }

}

async function deepSearchProductsCatalog(req, res) {
    try {
        const searchKey = req.query.key;
        const status = req.query.status;
        const limit = req.query.limit;
        const offset = req.query.offset
        const result = await ProductService.deepSearchProductsCatalog({ searchKey, limit, offset, status });

        return res.json(result);
    } catch (error) {
        console.log(`deepSearchProductsCatalog()`, error);
        res.status(500).json({
            message: 'Failed — Internal Error'
        });
    }
}

async function searchProductByImage(req, res) {
    try {

        const file = req.files?.image;

        if (!file || Array.isArray(file)) {
            return res.status(400).json({
                success: false,
                message: 'Please upload an image using the image field'
            });
        }

        const requestedLimit = Number(req.body?.limit ?? 100);

        if (
            !Number.isInteger(requestedLimit) ||
            requestedLimit < 1
        ) {
            return res.status(400).json({
                success: false,
                message: 'Limit must be a positive integer'
            });
        }

        const limit = Math.min(requestedLimit, 100);

        const result =
            await ProductService.searchProductByImage({
                file,
                limit
            });

        return res.status(200).json({
            success: true,
            message: 'Image search completed successfully',
            ...result
        });

    } catch (error) {
        console.error(
            '[searchProductByImage]',
            error
        );

        if (
            error.message === 'Product search image is required' ||
            error.message === 'Only JPEG, PNG, and WebP images are supported'
        ) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Failed to search products by image'
        });
    }
}

async function getProductById(req, res) {
    try {
        const id = req.params.id;
        const result = await ProductService.getProductById(id);
        return res.json(result);
    } catch (error) {
        console.log(`getProductById()`, error);
        res.status(500).json({
            message: 'Failed — Internal Error'
        });
    }
}

async function deleteProduct(req, res) {
    try {
        const id = req.params.id;
        const result = await ProductService.deleteProduct(id);
        return res.json(result);
    } catch (error) {
        console.log(`deleteProduct()`, error);
        res.status(500).json({
            message: 'Failed — Internal Error'
        });
    }
}

async function deleteProductVariant(req, res) {
    try {
        const variantId = req.params.variantId;
        const result = await ProductService.deleteProductVariant(variantId);
        return res.json(result);
    } catch (error) {
        console.log(`deleteProductVariant()`, error);
        res.status(500).json({
            message: 'Failed — Internal Error'
        });
    }
}

async function deleteVariantAttributeValue(req, res) {
    try {
        const { variantId, attributeValueId } = req.query;
        const result = await ProductService.deleteVariantAttributeValue(variantId, attributeValueId);
        return res.json(result);
    } catch (error) {
        console.log(`deleteProductVariant()`, error);
        res.status(500).json({
            message: 'Failed — Internal Error'
        });
    }
}

async function deleteVariantAttributes(req, res) {
    try {
        const variantId = req.params.variantId;
        const result = await ProductService.deleteVariantAttributes(variantId);
        return res.json(result);
    } catch (error) {
        console.log(`deleteVariantAttributes()`, error);
        res.status(500).json({
            message: 'Failed — Internal Error'
        });
    }
}

async function getProductVariants(req, res) {
    try {
        const productId = req.params.productId;
        const result = await ProductService.getProductVariants(productId);
        return res.json(result);
    } catch (error) {
        console.log(`getProductVariants()`, error);
        res.status(500).json({
            message: 'Failed — Internal Error'
        });
    }
}

async function getProductVariantOnly(req, res) {
    try {
        const productId = req.params.productId;
        const result = await ProductService.getProductVariantOnly(productId);
        return res.json(result);
    } catch (error) {
        console.log(`getProductVariantOnly()`, error);
        res.status(500).json({
            message: 'Failed — Internal Error'
        });
    }
}

async function getVariantAttributeValues(req, res) {
    try {
        const variantId = req.params.productId;
        const result = await ProductService.getVariantAttributeValues(variantId);
        return res.json(result);
    } catch (error) {
        console.log(`getVariantAttributeValues()`, error);
        res.status(500).json({
            message: 'Failed — Internal Error'
        });
    }
}

async function deleteProductVariant(req, res) {
    try {
        const variantId = req.params.productId;
        const result = await ProductService.deleteProductVariant(variantId);
        return res.json(result);
    } catch (error) {
        console.log(`deleteProductVariant()`, error);
        res.status(500).json({
            message: 'Failed — Internal Error'
        });
    }
}

async function updateProduct(req, res) {
    try {
        const productId = req.params.productId;
        const data = req.body.data;
        const result = await ProductService.updateProduct(productId, data);
        return res.json(result);
    } catch (error) {
        console.log(`updateProduct()`, error);
        res.status(500).json({
            message: 'Failed — Internal Error'
        });
    }
}

async function updateProductStatus(req, res) {
    try {
        const productId = req.params.productId;
        const { status } = req.body;
        const userId = req.user.userId || req.user.user_id || req.user.id;
        const result = await ProductService.updateProductStatus(productId, status, userId);
        return res.json(result);
    } catch (error) {
        console.log(`updateProductStatus()`, error);
        res.status(500).json({
            message: 'Failed — Internal Error'
        });
    }
}

async function updateProductVariant(req, res) {
    try {
        const variantId = req.params.variantId;
        const data = req.body.data;
        const result = await ProductService.updateProductVariant(variantId, data);
        return res.json(result);
    } catch (error) {
        console.log(`updateProductVariant()`, error);
        res.status(500).json({
            message: 'Failed — Internal Error'
        });
    }
}

async function insertVariantAttributeValue(req, res) {
    try {
        const { variantId, attributeValueId } = req.body;
        const result = await ProductService.insertVariantAttributeValue(
            { variant_id: variantId, attribute_value_id: attributeValueId }
        );

        return res.json(result);
    } catch (error) {
        console.log(`insertVariantAttributeValue()`, error);
        res.status(500).json({
            message: 'Failed — Internal Error'
        });
    }
}

async function activateProduct(req, res) {
    try {
        const productId = req.params.productId;
        const userId = req.user.userId || req.user.user_id || req.user.id;
        const result = await ProductService.updateProductStatus(productId, 'active', userId);

        if (!result) {
            return res.status(404).json({ success: false, message: 'Failed — Please check product id' })
        }
        return res.json(result);
    } catch (error) {
        console.log(`insertVariantAttributeValue()`, error);
        res.status(500).json({
            message: 'Failed — Internal Error'
        });
    }
}

async function getStoreDashboardAnalytics(req, res) {
    try {
        const storeId = req.params.storeId;
        const { period } = req.query;
        const result = await StoreService.getStoreDashboardAnalytics(storeId, period);
        return res.json(result)
    } catch (error) {
        console.log('getStoreDashboardAnalytics()', error);
        return res.status(500).json({ message: 'Unable to get Dashboard data — Internal Error' })
    }
}

async function getStoreDashboard(req, res) {
    try {
        const { storeId } = req.params;
        const { period = "7d", from, to } = req.query;

        if (!storeId) {
            return res.status(400).json({
                success: false,
                message: "Store ID is required.",
            });
        }

        const dashboard = await StoreService.getDashboard({
            storeId,
            period,
            from,
            to,
        });

        return res.status(200).json({
            success: true,
            data: dashboard,
        });
    } catch (error) {
        if (
            error.message.startsWith("Invalid period") ||
            error.message.includes("required for a custom period") ||
            error.message.includes("Invalid from or to date") ||
            error.message.includes("from must be before") ||
            error.message.includes("to cannot be in the future")
        ) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }

        console.error(
            "Failed to load store dashboard:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to load store dashboard.",
        });
    }
}


module.exports = {
    businessHomePage,
    renderVendorCreation,
    renderDashboard,
    businessVendorPricing,
    renderApplicationConfirmation,
    renderApplicationReview,
    renderStoreCreation,
    renderTerms,
    renderAttributeRegistryTerms,
    redirectedToDashboard,

    renderStoreDashboard,
    renderStoreOrders,
    renderStoreDashboardWelcome,
    renderStoreInventory,
    renderStoreListing,
    renderStoreProducts,
    renderStoreFollowers,
    renderMessages,
    renderNotifications,

    renderInventoryHome,
    renderInventoryOverview,

    renderInventoryUnit,
    searchUnit,
    getItemUnit,
    insertInventoryUnit,

    searchListingByStore,

    createInventoryItem,
    transferUnit,

    getStoreDashboardAnalytics,
    getStoreDashboard,
    getStoreListingProductAnalytics,
    getInventoriesByStoreId,

    renderInvontoryForm,
    getVendorOrderDashboard,
    getAnalyticVendorDashboardData,
    getVendorOverviewData,

    renderProductCataloging,
    renderProductCatalog,

    renderListingcataloging,

    renderMarketplacePolicy,
    renderCatalogPolicy,
    renderCatalogTerms,

    insertProductCatalog,
    getPaginatedProductsCatalog,
    deepSearchProductsCatalog,
    searchProductByImage,
    getProductById,
    activateProduct,

    insertNewList,

    getProductVariantsOnly,
    getProductVariants,
}