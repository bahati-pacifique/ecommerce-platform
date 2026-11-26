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
            console.log('[getCategories]', error);
            return [];
        }
    }

}

module.exports = MainService;