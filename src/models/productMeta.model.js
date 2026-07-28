const db = require('../configs/db');
const bcrypt = require('bcrypt');

class ProductMetaModel {
    static async createProductCategory(title, slug, description) {
        const { rows } = await db.query(`
            INSERT INTO categories(title, slug, description) 
            VALUES ($1, $2, $3) RETURNING *;
            `, [title, slug, description]);

        return rows[0] ?? null
    }

    static async #setStatus(status, id, table = 'categories') {
        const query = `
            UPDATE ${table} SET status = $1 WHERE id = $2 RETURNING *
        `;

        const { rows } = await db.query(query, [status, id]);

        return rows[0] ?? null;
    }

    /**
     * Soft deleting category
     * @param {string|uuid} id system category unique identifier
     * @returns {object|category} returns object of the removed category or null
     */
    static async removingProductCategory(id) {
        const result = await this.#setStatus('deleted', id);

        return result;
    }

    /**
     * Re-Activate category by its id
     * @param {string|uuid} id system category unique identifier
     * @returns {object|category} returns object of the activated category or null
     */
    static async activateProductCategory(id) {
        const result = await this.#setStatus('active', id)

        return result;
    }

    /**
     * Hard deleting category
     * @param {string|uuid} id system category unique identifier
     * @returns {object|category} returns object of the deleted category or null
     */
    static async deleteProductCategory(id) {
        const { rows } = await db.query(`
            DELETE FROM categories WHERE id = $1 RETURNING *
            `, [id]);

        return rows[0] ?? null;
    }

    /**
     * Get category by id
     * @param {string|uuid} id system category unique identifier
     * @returns {object|category} returns object of category or null
     */
    static async getProductCategoryById(id) {
        const { rows } = await db.query(`
            SELECT * FROM categories WHERE id =  $1
            `, [id]);

        return rows[0] ?? null;
    }

    /**
     * @returns {array|categories} returns Array of categories regardless of status
     */
    static async getProductCategories() {
        const { rows } = await db.query(`
            SELECT * FROM categories WHERE status = 'active'
            `);

        return rows ?? [];
    }

    /**
     * @returns {array|categories} returns Array of categories with regard to the status
     */
    static async getProductCategoriesByStatus(status = 'active') {
        const { rows } = await db.query(`
            SELECT * FROM categories WHERE status = $1
            `, [status]);

        return rows ?? [];
    }

    /**
     * Updating category according to provided fields
     * @param {string|uuid} id system category unique identifier
     * @returns {object|category} returns object of the updated category or null
     */
    static async updateProductCategory(id, { title, slug, description }) {
        const updates = [];
        const values = [];
        let index = 1;

        if (title !== undefined) {
            updates.push(`title = $${index++}`);
            values.push(title);
        }

        if (slug !== undefined) {
            updates.push(`slug = $${index++}`);
            values.push(slug);
        }

        if (description !== undefined) {
            updates.push(`description = $${index++}`);
            values.push(description);
        }

        if (updates.length === 0) {
            throw new Error("No fields to update.");
        }

        values.push(id);

        const query = `
            UPDATE categories
            SET
                ${updates.join(", ")} 
            WHERE id = $${index}
            RETURNING *;
        `;

        const { rows } = await db.query(query, values);
        return rows[0] || null;
    }
}

module.exports = ProductMetaModel