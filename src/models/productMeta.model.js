const db = require('../configs/db');
const bcrypt = require('bcrypt');

class ProductMetaModel {

    static async #setStatus(status, id, table = 'categories') {
        const query = `
            UPDATE ${table} SET status = $1 WHERE id = $2 RETURNING *
        `;

        const { rows } = await db.query(query, [status, id]);

        return rows[0] ?? null;
    }

    /**
     * Create new product category
     * @param {string} title category title
     * @param {string} slug category slug identifier
     * @param {string} description category details/description
     * @returns {object|null} created category or null
     */
    static async createProductCategory(title, slug, description) {
        const { rows } = await db.query(`
            INSERT INTO categories(title, slug, description) 
            VALUES ($1, $2, $3) RETURNING *;
            `, [title, slug, description]);

        return rows[0] ?? null
    }

    /**
     * Soft deleting category
     * @param {number} id system category unique identifier
     * @returns {object|null} returns object of the removed category or null
     */
    static async removeProductCategory(id) {
        const result = await this.#setStatus('deleted', id);

        return result;
    }

    /**
     * Re-Activate category by its id
     * @param {number} id system category unique identifier
     * @returns {object|null} object of the activated category or null
     */
    static async activateProductCategory(id) {
        const result = await this.#setStatus('active', id)

        return result;
    }

    /**
     * Hard deleting category
     * @param {number} id system category unique identifier
     * @returns {object|null} object of the deleted category or null
     */
    static async deleteProductCategory(id) {
        const { rows } = await db.query(`
            DELETE FROM categories WHERE id = $1 RETURNING *
            `, [id]);

        return rows[0] ?? null;
    }

    /**
     * Get category by id
     * @param {number} id system category unique identifier
     * @returns {object|null} object of category or null
     */
    static async getProductCategoryById(id) {
        const { rows } = await db.query(`
            SELECT * FROM categories WHERE id =  $1
            `, [id]);

        return rows[0] ?? null;
    }

    /**
     * Returns paginated product categories.
     *
     * @param {Object} options
     * @param {number} [options.page=1]
     * @param {number} [options.limit=10]
     * @param {string|null} [options.status='active'] Set to null to fetch all statuses.
     *
     * @returns {Object}
     */
    static async getProductCategories({
        page = 1,
        limit = 10,
        status = 'active'
    } = {}) {

        const offset = (page - 1) * limit;

        const where = [];
        const values = [];
        let index = 1;

        if (!status || status === 'all') status = null;

        if (status !== null) {
            where.push(`status = $${index++}`);
            values.push(status);
        }

        const whereClause = where.length
            ? `WHERE ${where.join(' AND ')}`
            : '';

        // Total records
        const { rows: [{ total }] } = await db.query(`
            SELECT COUNT(*)::INTEGER AS total
            FROM categories
            ${whereClause}
        `, values);

        // Current page
        values.push(limit);
        values.push(offset);

        const { rows: categories } = await db.query(`
            SELECT *
            FROM categories
            ${whereClause}
            ORDER BY id DESC
            LIMIT $${index++}
            OFFSET $${index}
        `, values);

        const totalPages = Math.ceil(total / limit);

        return {
            categories,
            pagination: {
                page,
                limit,
                counts: total,
                totalPages,
                hasPrevPage: page > 1,
                hasNextPage: page < totalPages
            }
        };
    }

    /**
     * Get active categories
     * @returns categories with minimal data
     */
    static async getActiveCategories() {
        const { rows } = await db.query(`SELECT 
            id, 
            title, 
            COALESCE(updated_at, created_at) 
            AS last_updates 
            FROM categories WHERE status = 'active' 
            ORDER BY title ASC`);

        return rows;
    }

    /**
     * Updating category according to provided fields
     * @param {number} id system category unique identifier
     * @returns {object|null} object of the updated category or null
     */
    static async updateProductCategory(id, { title, slug, description }) {
        const updates = [];
        const values = [];
        let index = 1;

        if (title) {
            updates.push(`title = $${index++}`);
            values.push(title);
        }

        if (slug) {
            updates.push(`slug = $${index++}`);
            values.push(slug);
        }

        if (description) {
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


    /**
     * Create new product family
     * @param {number} categoryId 
     * @param {string} title 
     * @param {string} slug
     * @param {string} description 
     * @returns {object|null} Created family or null
     */
    static async createProductFamily(categoryId, title, slug, description) {
        const { rows } = await db.query(`
                WITH inserted_family AS (INSERT INTO families(category_id, title, slug, description) VALUES($1, $2, $3, $4)
                RETURNING *)
                SELECT fm.*, ct.title AS category
                FROM inserted_family fm 
                LEFT JOIN categories ct ON ct.id = fm.category_id;
            `, [categoryId, title, slug, description]);

        return rows[0] ?? null;
    }

    /**
     * 
     * @param {number} id product family identifier 
     * @returns {object} product family or null
     */
    static async getProductFamily(id) {

        const { rows } = await db.query(`
                SELECT fm.*,  ct.id AS category_id, ct.title AS category FROM families fm
                LEFT JOIN categories ct ON ct.id = fm.category_id WHERE fm.id = $1;
            `, [id]);

        return rows[0] ?? null;
    }

    /**
     * Returns paginated product families.
     *
     * @param {Object} options
     * @param {number} [options.page=1]
     * @param {number} [options.limit=10]
     * @param {string|null} [options.status='active'] Set to null to fetch all statuses.
     *
     * @returns {Array} list of matched families
     */
    static async getProductFamilies({
        page = 1,
        limit = 10,
        status = "active"
    } = {}) {

        const offset = (page - 1) * limit;

        const where = [];
        const values = [];
        let index = 1;

        if (!status || status === "all") {
            status = null;
        }

        if (status !== null) {
            where.push(`fm.status = $${index++}`);
            values.push(status);
        }

        const whereClause = where.length
            ? `WHERE ${where.join(" AND ")}`
            : "";

        // Total records
        const { rows: [{ total }] } = await db.query(`
            SELECT COUNT(*)::INTEGER AS total
            FROM families fm
            ${whereClause}
        `, values);

        values.push(limit);
        values.push(offset);

        const { rows: families } = await db.query(`
            SELECT
                fm.*,
                ct.id AS category_id,
                ct.title AS category
            FROM families fm
            LEFT JOIN categories ct
                ON ct.id = fm.category_id
            ${whereClause} 
            ORDER BY fm.created_at DESC
            LIMIT $${index++}
            OFFSET $${index}
        `, values);

        const totalPages = Math.ceil(total / limit);

        return {
            families,
            pagination: {
                page,
                limit,
                counts: total,
                totalPages,
                hasPrevPage: page > 1,
                hasNextPage: page < totalPages
            }
        };
    }

    /**
     * Updating product family according to provided fields
     * @param {number} id system family unique identifier
     * @returns {object} updated product family or null
     */
    static async updateProductFamily(id, { title, category_id, slug, description }) {

        const updates = [];
        const values = [];

        let index = 1;

        if (title) {
            updates.push(`title = $${index++}`);
            values.push(title);
        }

        if (category_id) {
            updates.push(`category_id = $${index++}`);
            values.push(category_id);
        }

        if (slug) {
            updates.push(`slug = $${index++}`);
            values.push(slug);
        }

        if (description) {
            updates.push(`description = $${index++}`);
            values.push(description);
        }

        if (updates.length === 0) {
            throw new Error("No fields to update.");
        }

        values.push(id);

        const query = `
            UPDATE families
            SET
                ${updates.join(", ")} 
            WHERE id = $${index}
            RETURNING *;
        `;

        const { rows } = await db.query(query, values);
        return rows[0] || null;
    }

    /**
     * Re-Activate family by its id
     * @param {number} id system category unique identifier
     * @returns {object|null} activated category or null
     */
    static async activateProductFamily(id) {
        const result = await this.#setStatus('active', id, 'families')

        return result;
    }

    /**
     * Hard deleting category
     * @param {number} id system category unique identifier
     * @returns {object|null} deleted family or null
     */
    static async deleteProductFamily(id) {
        const { rows } = await db.query(`
            DELETE FROM families WHERE id = $1 RETURNING *
            `, [id]);

        return rows[0] ?? null;
    }

    /**
     * Soft deleting category
     * @param {number} id system families unique identifier
     * @returns {object|null} removed category or null
     */
    static async removeProductFamily(id) {
        const result = await this.#setStatus('deleted', id, 'families');
        return result;
    }

    static async getActiveFamilies() {
        const { rows } = await db.query(`SELECT 
            id, 
            title, 
            COALESCE(updated_at, created_at) AS last_updates
            FROM families WHERE status = 'active'
            ORDER BY title ASC`);

        return rows;
    }



    /* =========================================================================
       BRAND METHODS (NEW)
       ========================================================================= */

    /**
     * 
     * @param {string} title brand title
     * @param {string} slug brand slug identifier
     * @param {string} description brand details/description
     * @returns {object|null} created brand or null
     */
    static async createProductBrand({title, slug, logo_url, website, description, meta}) {
        const { rows } = await db.query(`
            INSERT INTO brands(title, slug, logo_url, website, description, meta) 
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;
            `, [title, slug, logo_url || null, website || null,  description, meta || null]);

        return rows[0] ?? null;
    }

    /**
     * Soft deleting brand
     * @param {number} id system brand unique identifier
     * @returns {object|null} returns object of the removed brand or null
     */
    static async removeProductBrand(id) {
        const result = await this.#setStatus('deleted', id, 'brands');

        return result;
    }

    /**
     * Re-Activate brand by its id
     * @param {number} id system brand unique identifier
     * @returns {object|null} object of the activated brand or null
     */
    static async activateProductBrand(id) {
        const result = await this.#setStatus('active', id, 'brands');

        return result;
    }

    /**
     * Hard deleting brand
     * @param {number} id system brand unique identifier
     * @returns {object|null} object of the deleted brand or null
     */
    static async deleteProductBrand(id) {
        const { rows } = await db.query(`
            DELETE FROM brands WHERE id = $1 RETURNING *
            `, [id]);

        return rows[0] ?? null;
    }

    /**
     * Get brand by id
     * @param {number} id system brand unique identifier
     * @returns {object|null} object of brand or null
     */
    static async getProductBrandById(id) {
        const { rows } = await db.query(`
            SELECT * FROM brands WHERE id =  $1
            `, [id]);

        return rows[0] ?? null;
    }

    /**
     * Returns paginated product brands.
     *
     * @param {Object} options
     * @param {number} [options.page=1]
     * @param {number} [options.limit=10]
     * @param {string|null} [options.status='active'] Set to null to fetch all statuses.
     *
     * @returns {Object}
     */
    static async getProductBrands({
        page = 1,
        limit = 10,
        status = 'active'
    } = {}) {

        const offset = (page - 1) * limit;

        const where = [];
        const values = [];
        let index = 1;

        if (!status || status === 'all') status = null;

        if (status !== null) {
            where.push(`status = $${index++}`);
            values.push(status);
        }

        const whereClause = where.length
            ? `WHERE ${where.join(' AND ')}`
            : '';

        // Total records
        const { rows: [{ total }] } = await db.query(`
            SELECT COUNT(*)::INTEGER AS total
            FROM brands
            ${whereClause}
        `, values);

        // Current page
        values.push(limit);
        values.push(offset);

        const { rows: brands } = await db.query(`
            SELECT *
            FROM brands
            ${whereClause}
            ORDER BY id DESC
            LIMIT $${index++}
            OFFSET $${index}
        `, values);

        const totalPages = Math.ceil(total / limit);

        return {
            brands,
            pagination: {
                page,
                limit,
                counts: total,
                totalPages,
                hasPrevPage: page > 1,
                hasNextPage: page < totalPages
            }
        };
    }

    /**
     * Get active brands
     * @returns brands with minimal data
     */
    static async getActiveBrands() {
        const { rows } = await db.query(`SELECT 
            id, 
            title, 
            COALESCE(updated_at, created_at) 
            AS last_updates 
            FROM brands WHERE status = 'active' 
            ORDER BY title ASC`);

        return rows;
    }

    static async updateProductBrand(id, { title, slug, website, logo_url, meta, description }) {
        const updates = [];
        const values = [];
        let index = 1;

        if (title) {
            updates.push(`title = $${index++}`);
            values.push(title);
        }

        if (slug) {
            updates.push(`slug = $${index++}`);
            values.push(slug);
        }

        if (website) {
            updates.push(`website = $${index++}`);
            values.push(website);
        }

        if (logo_url) {
            updates.push(`logo_url = $${index++}`);
            values.push(logo_url);
        }

        if (meta) {
            updates.push(`meta = $${index++}`);
            values.push(meta);
        }

        if (description) {
            updates.push(`description = $${index++}`);
            values.push(description);
        }

        if (updates.length === 0) {
            throw new Error("No fields to update.");
        }

        values.push(id);

        const query = `
            UPDATE brands
            SET
                ${updates.join(", ")} 
            WHERE id = $${index}
            RETURNING *;
        `;

        console.log(query)

        const { rows } = await db.query(query, values);
        return rows[0] || null;
    }

}

module.exports = ProductMetaModel