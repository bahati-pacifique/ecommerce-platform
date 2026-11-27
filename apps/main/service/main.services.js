const MainModel = require('../model/main.model');

class MainService {
    /**
     * @returns Array of global categories or empty array on error
     */
    static async getCategories() {
        try {
            const categories = await MainModel.getCategories();
            return categories;
        } catch (error) {
            console.log('[getCategories]', error);
            return [];
        }
    }

    static async getLatestHeroProductCatalog() {
        try {
            const heroProducts = await MainModel.getLatestHeroProductCatalog();
            return heroProducts;
        } catch (error) {
            console.log('[getLatestHeroProductCatalog]', error);
            return [];
        }
    }

    static async getProductCategoryImages() {
        try {
            const heroProductsCategories = await MainModel.getProductCategoryImages();
            return heroProductsCategories;
        } catch (error) {
            console.log('[getProductCategoryImages]', error);
            return [];
        }
    }

    static async getLandingListings() {
        try {
            const currentHomeListings = await MainModel.getLandingListings();
            return currentHomeListings;
        } catch (error) {
            console.log('[getLandingListings]', error);
            return [];
        }
    }

    static async getLandingListingsPaginated({page, limit}) {
        try {
            const currentHomeListings = await MainModel.getLandingListingsPaginated({page, limit});
            return currentHomeListings;
        } catch (error) {
            console.log('[getLandingListings]', error);
            return [];
        }
    }

}

module.exports = MainService;