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

    static async getLandingPaginatedBrands({page, limit}) {
        try {
            const homeBrands = await MainModel.getLandingPaginatedBrands({page, limit});
            return homeBrands;
        } catch (error) {
            console.log('[getLandingPaginatedBrands]', error);
            return [];
        }
    }

    static async getHomeListingsOnSale({page, limit}){
        try {
            const onSaleListings = await MainModel.getPaginatedListingsOnSale({page, limit});
            return onSaleListings;
        } catch (error) {
            console.log('[getHomeListingsOnSale]', error);
            return [];
        }
    }

}

module.exports = MainService;