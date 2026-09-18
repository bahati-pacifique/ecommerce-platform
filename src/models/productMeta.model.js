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
     * Batch insert records into a table.
     *
     * @param {string} tableName
     * @param {string[]} columns
     * @param {Object[]} dataArray
     * @param {Object} options
     * @param {string|null} options.onConflict — "(title) DO NOTHING"
     * @param {string} options.returning i.e: "*", "id", "id, title"
     * @returns {Promise<Array>}
     */
    static async batchInsert(
        tableName,
        columns,
        dataArray,
        {
            onConflict = null,
            returning = "*"
        } = {}
    ) {

        if (!tableName || !columns) throw new Error("Required fields was not provided");
        if (!Array.isArray(dataArray) || dataArray.length === 0) throw new Error("No values provided");

        if (!Array.isArray(columns) || columns.length === 0)
            throw new Error("Columns are required.");

        const allowedTables = [
            "attributes",
            "attribute_values",
            "brands",
            "categories",
            "product_families",
            "products"
        ];

        if (!allowedTables.includes(tableName))
            throw new Error(`Table '${tableName}' is not allowed.`);

        // Validate column names
        const identifierRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

        for (const column of columns) {
            if (!identifierRegex.test(column)) {
                throw new Error(`Invalid column name '${column}'.`);
            }
        }

        const placeholders = [];
        const values = [];

        let index = 1;

        for (const row of dataArray) {

            const rowPlaceholders = [];

            for (const column of columns) {
                rowPlaceholders.push(`$${index++}`);
                values.push(row[column] ?? null);
            }

            placeholders.push(`(${rowPlaceholders.join(", ")})`);
        }

        const query = `
            INSERT INTO ${tableName} (${columns.join(", ")})
            VALUES
                ${placeholders.join(",\n            ")}
            ${onConflict ? `ON CONFLICT ${onConflict}` : ""}
            RETURNING ${returning};
        `;

        const { rows } = await db.query(query, values);

        return rows;
    }


    /**
     * Create new product category On admin level
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
     * Create new product category on vendor level
     * @param {string} title category title
     * @param {string} slug category slug identifier
     * @param {string} description category details/description
     * @returns {object|null} created category or null
     */
    static async insertProductCategory(title, slug, description, req_reason, req_by) {
        const { rows } = await db.query(`
            INSERT INTO categories(title, slug, description, status, requested_reason, requested_by, requested_at) 
            VALUES ($1, $2, $3, 'requested', $4, $5, NOW()) RETURNING *;
            `, [title, slug, description, req_reason, req_by]);

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
            SELECT 
            id, 
            slug,
            title, 
            description, 
            status,
            COALESCE(updated_at, created_at) AS last_updates
            FROM categories
            ${whereClause}
            ORDER BY id DESC
            LIMIT $${index++}
            OFFSET $${index}
        `, values);

        const totalPages = Math.ceil(total / limit);

        console.log(categories)
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
     * Search categories with pagination
     *
     * @param {string} searchKey
     * @param {number} page
     * @param {number} limit
     * @returns {Promise<Object>}
     */
    static async searchCategory(searchKey, page = 1, limit = 20) {

        page = Math.max(1, Number(page));
        limit = Math.max(1, Number(limit));

        const offset = (page - 1) * limit;
        const search = `%${searchKey.trim()}%`;

        const countQuery = `
                SELECT COUNT(*)::int AS total
                FROM categories
                WHERE status = 'active'
                AND (
                    title ILIKE $1
                    OR description ILIKE $1
                )
            `;

        const dataQuery = `
            SELECT
                id,
                title,
                description,
                COALESCE(updated_at, created_at) AS last_updates
            FROM categories
            WHERE status = 'active'
            AND (
                title ILIKE $1
                OR description ILIKE $1
            )
            ORDER BY title ASC
            LIMIT $2 OFFSET $3
        `;

        const [countResult, dataResult] = await Promise.all([
            db.query(countQuery, [search]),
            db.query(dataQuery, [search, limit, offset])
        ]);

        const total = countResult.rows[0].total;
        const totalPages = Math.ceil(total / limit);

        return {
            categories: dataResult.rows,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1
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
     * Querying paginated categories by requester
     * @param {*} page query page
     * @param {*} limit query limit
     * @param {*} status query status
     * @param {*} requesterId view owner
     * @returns paginated result array
     */
    static async getCategoriesPaginated(
        page = 1,
        limit = 20,
        status = 'active',
        requesterId = null
    ) {
        page = Math.max(1, Number(page));
        limit = Math.max(1, Number(limit));

        const offset = (page - 1) * limit;

        const conditions = [];
        const params = [];

        // Status
        params.push(status);
        conditions.push(`status = $${params.length}`);

        // Requester
        if (requesterId) {
            params.push(requesterId);
            conditions.push(`requested_by = $${params.length}`);
        }

        const whereClause = `WHERE ${conditions.join(' AND ')}`;

        // Pagination parameters
        const limitParam = params.length + 1;
        const offsetParam = params.length + 2;

        params.push(limit, offset);

        const countQuery = `
            SELECT COUNT(*)::int AS total
            FROM categories
            ${whereClause}
        `;

        const dataQuery = `
            SELECT
            id,
            title,
            slug,
            description,
            status,
            requested_by,
            requested_at,
            verified_by,
            verified_at,
            COALESCE(updated_at, created_at) AS last_updates

            FROM categories

            ${whereClause}

            ORDER BY title ASC

            LIMIT $${limitParam}
            OFFSET $${offsetParam}
        `;

        const [countResult, dataResult] = await Promise.all([
            db.query(countQuery, params.slice(0, -2)),
            db.query(dataQuery, params)
        ]);

        const total = countResult.rows[0].total;
        const totalPages = Math.ceil(total / limit);

        return {
            data: dataResult.rows,

            pagination: {
                page,
                limit,
                total,
                total_pages: totalPages,
                has_next_page: page < totalPages,
                has_previous_page: page > 1
            }
        };
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
     * Create new product family on admin level
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
     * Create new product family on vendor level
     * @param {number} categoryId 
     * @param {string} title 
     * @param {string} slug
     * @param {string} description 
     * @returns {object|null} Created family or null
     */
    static async insertProductFamily(categoryId, title, slug, description, req_reason, req_by) {

        const { rows } = await db.query(`
                WITH inserted_family AS 
                (INSERT INTO families(category_id, 
                    title, 
                    slug, 
                    description, 
                    status, 
                    requested_reason,
                    requested_by,
                    requested_at) VALUES($1, $2, $3, $4, 'requested', $5, $6, NOW())
                RETURNING *)
                SELECT fm.*, ct.title AS category
                FROM inserted_family fm 
                LEFT JOIN categories ct ON ct.id = fm.category_id;
            `, [categoryId, title, slug, description, req_reason, req_by]);

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
            fm.id,
            fm.title,
            fm.slug,
            fm.description,
            fm.status,
            fm.requested_by,
            fm.requested_at,
            fm.verified_by,
            fm.verified_at,
            COALESCE(fm.updated_at, fm.created_at) AS last_updates,
            ct.id AS category_id,
            ct.title AS category_title
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
     * Search families with pagination
     *
     * @param {string} searchKey
     * @param {number} page
     * @param {number} limit
     * @returns {Promise<Object>}
     */
    static async searchFamily(
        searchKey,
        page = 1,
        limit = 100
    ) {

        console.log("SRCH", searchKey);

        page = Math.max(1, Number(page));
        limit = Math.max(1, Number(limit));

        const offset = (page - 1) * limit;

        const search = `%${searchKey.trim()}%`;

        const countQuery = `
        SELECT
            COUNT(*)::int AS total

        FROM families

        WHERE
            status IN ('active', 'requested')

            AND (
                title ILIKE $1
                OR description ILIKE $1
            )
    `;

        const dataQuery = `
        SELECT
            id,
            title,
            description,
            COALESCE(
                updated_at,
                created_at
            ) AS last_updates

        FROM families

        WHERE
            status IN ('active', 'requested')

            AND (
                title ILIKE $1
                OR description ILIKE $1
            )

        ORDER BY
            title ASC

        LIMIT $2
        OFFSET $3
    `;

        const [
            countResult,
            dataResult
        ] = await Promise.all([

            db.query(
                countQuery,
                [search]
            ),

            db.query(
                dataQuery,
                [
                    search,
                    limit,
                    offset
                ]
            )

        ]);

        const total = countResult.rows[0].total;

        const totalPages = Math.ceil(
            total / limit
        );

        console.log(dataResult.rows);

        return {

            families: dataResult.rows,

            pagination: {

                page,

                limit,

                total,

                totalPages,

                hasNextPage:
                    page < totalPages,

                hasPreviousPage:
                    page > 1
            }
        };
    }

    /**
     * Querying paginated families by requester
     *
     * @param {*} page query page
     * @param {*} limit query limit
     * @param {*} status query status
     * @param {*} requesterId view owner
     * @returns paginated result
     */
    static async getProductFamiliesPaginatedRequested(
        page = 1,
        limit = 20,
        status = 'active',
        requesterId = null
    ) {

        page = Math.max(1, Number(page));
        limit = Math.max(1, Number(limit));

        const offset = (page - 1) * limit;

        const conditions = [];
        const params = [];

        // Status
        params.push(status);

        conditions.push(
            `fm.status = $${params.length}`
        );

        // Requester
        if (requesterId) {

            params.push(requesterId);

            conditions.push(
                `fm.requested_by = $${params.length}`
            );
        }

        const whereClause = `
            WHERE ${conditions.join(' AND ')}
        `;

        // Pagination parameters
        const limitParam = params.length + 1;
        const offsetParam = params.length + 2;

        params.push(limit, offset);

        const countQuery = `
            SELECT
                COUNT(*)::int AS total

            FROM families fm

            ${whereClause}
        `;

        const dataQuery = `
            SELECT

                fm.id,

                fm.title,

                fm.slug,

                fm.description,

                fm.status,

                ct.title AS category_title,

                fm.requested_by,

                fm.requested_at,

                fm.verified_by,

                fm.verified_at,

                COALESCE(
                    fm.updated_at,
                    fm.created_at
                ) AS last_updates

            FROM families fm

            LEFT JOIN categories ct
                ON ct.id = fm.category_id

            ${whereClause}

            ORDER BY
                fm.title ASC

            LIMIT $${limitParam}

            OFFSET $${offsetParam}
        `;

        const [countResult, dataResult] = await Promise.all([

            db.query(
                countQuery,
                params.slice(0, -2)
            ),

            db.query(
                dataQuery,
                params
            )

        ]);

        const total = countResult.rows[0].total;

        const totalPages = Math.ceil(
            total / limit
        );

        return {

            data: dataResult.rows,

            pagination: {

                page,

                limit,

                total,

                total_pages: totalPages,

                has_next_page:
                    page < totalPages,

                has_previous_page:
                    page > 1
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

    static async getActiveProductFamilies() {
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
    static async createProductBrand({ title, slug, logo_url, website, description, meta }) {
        const { rows } = await db.query(`
            INSERT INTO brands(title, slug, logo_url, website, description, meta) 
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;
            `, [title, slug, logo_url || null, website || null, description, meta || null]);

        return rows[0] ?? null;
    }

    /**
     * //Vendor level
     * @param {string} title brand title
     * @param {string} slug brand slug identifier
     * @param {string} description brand details/description
     * @returns {object|null} created brand or null
     */
    static async insertProductBrand({ title, slug, logo_url, website, description, meta, req_reason, req_by }) {
        const { rows } = await db.query(`
            INSERT INTO brands(title, slug, logo_url, website, description, meta, status, requested_reason, requested_by) 
            VALUES ($1, $2, $3, $4, $5, $6, 'requested', $7, $8) RETURNING *;
            `, [title, slug, logo_url || null, website || null, description, meta || {}, req_reason, req_by]);

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
     * Querying paginated families by requester
     *
     * @param {*} page query page
     * @param {*} limit query limit
     * @param {*} status query status
     * @param {*} requesterId view owner
     * @returns paginated result
     */
    static async getProductBrandsRequested(
        page = 1,
        limit = 20,
        status = 'active',
        requesterId = null
    ) {

        page = Math.max(1, Number(page));
        limit = Math.max(1, Number(limit));

        const offset = (page - 1) * limit;

        const conditions = [];
        const params = [];

        // Status
        params.push(status);

        conditions.push(
            `br.status = $${params.length}`
        );

        // Requester
        if (requesterId) {

            params.push(requesterId);

            conditions.push(
                `br.requested_by = $${params.length}`
            );
        }

        const whereClause = `
            WHERE ${conditions.join(' AND ')}
        `;

        // Pagination parameters
        const limitParam = params.length + 1;
        const offsetParam = params.length + 2;

        params.push(limit, offset);

        const countQuery = `
            SELECT
                COUNT(*)::int AS total

            FROM brands br

            ${whereClause}
        `;

        const dataQuery = `
            SELECT

            br.id,

            br.title,

            br.slug,

            br.description,
            br.meta,
            br.logo_url,
            br.website,

            br.status,

            br.requested_by,

            br.requested_at,

            br.verified_by,

            br.verified_at,

            COALESCE(
                br.updated_at,
                br.created_at
            ) AS last_updates

            FROM brands br

            LEFT JOIN users u
                ON u.id = br.requested_by

            ${whereClause}

            ORDER BY
                br.title ASC

            LIMIT $${limitParam}

            OFFSET $${offsetParam}
        `;

        const [countResult, dataResult] = await Promise.all([

            db.query(
                countQuery,
                params.slice(0, -2)
            ),

            db.query(
                dataQuery,
                params
            )

        ]);

        const total = countResult.rows[0].total;

        const totalPages = Math.ceil(
            total / limit
        );

        return {

            data: dataResult.rows,

            pagination: {

                page,

                limit,

                total,

                total_pages: totalPages,

                has_next_page:
                    page < totalPages,

                has_previous_page:
                    page > 1
            }
        };
    }

    /**
     * Search categories with pagination
     *
     * @param {string} searchKey
     * @param {number} page
     * @param {number} limit
     * @returns {Promise<Object>}
     */
    static async searchBrands(searchKey, page = 1, limit = 20) {

        page = Math.max(1, Number(page));
        limit = Math.max(1, Number(limit));

        const offset = (page - 1) * limit;
        const search = `%${searchKey.trim()}%`;

        const countQuery = `
                SELECT COUNT(*)::int AS total
                FROM brands
                WHERE status = 'active'
                AND (
                    title ILIKE $1
                    OR description ILIKE $1
                )
            `;

        const dataQuery = `
            SELECT
            br.id,

            br.title,

            br.slug,

            br.description,
            br.meta,
            br.logo_url,
            br.website,

            br.status,

            br.requested_by,

            br.requested_at,

            br.verified_by,

            br.verified_at,

            COALESCE(
                br.updated_at,
                br.created_at
            ) AS last_updates
            FROM brands br
            WHERE status = 'active'
            AND (
                title ILIKE $1
                OR description ILIKE $1
            )
            ORDER BY title ASC
            LIMIT $2 OFFSET $3
        `;

        const [countResult, dataResult] = await Promise.all([
            db.query(countQuery, [search]),
            db.query(dataQuery, [search, limit, offset])
        ]);

        const total = countResult.rows[0].total;
        const totalPages = Math.ceil(total / limit);

        return {
            categories: dataResult.rows,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1
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

        const { rows } = await db.query(query, values);
        return rows[0] || null;
    }


    //Attribute & values operations
    static async createAttribute({ title, description, display_order }) {
        const { rows } = await db.query(`
            INSERT INTO attributes(title, description, display_order) 
            VALUES ($1, $2, $3) RETURNING *;
            `, [title, description, display_order || null]);

        return rows[0] ?? null;
    }

    static async insertAttribute({ title, description, display_order, req_reason, req_by }) {
        const { rows } = await db.query(`
            INSERT INTO attributes(title, description, display_order, status, requested_reason, requested_by) 
            VALUES ($1, $2, $3, 'requested', $4, $5) RETURNING *;
            `, [title, description, display_order || null, req_reason, req_by]);

        return rows[0] ?? null;
    }

    static async removeAttribute(id) {
        const result = await this.#setStatus('deleted', id, 'attributes');

        return result;
    }


    static async activateAttribute(id) {
        const result = await this.#setStatus('active', id, 'attributes');

        return result;
    }

    static async deleteAttribute(id) {
        const { rows } = await db.query(`
            DELETE FROM attributes WHERE id = $1 RETURNING *
            `, [id]);

        return rows[0] ?? null;
    }

    static async getAttributeById(id) {
        const { rows } = await db.query(`
            SELECT * FROM attributes WHERE id =  $1
            `, [id]);

        return rows[0] ?? null;
    }

    static async getAttributes({
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
            FROM attributes
            ${whereClause}
        `, values);

        // Current page
        values.push(limit);
        values.push(offset);

        const { rows: attributes } = await db.query(`
            SELECT *
            FROM attributes
            ${whereClause}
            ORDER BY title ASC
            LIMIT $${index++}
            OFFSET $${index}
        `, values);

        const totalPages = Math.ceil(total / limit);

        return {
            attributes,
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

    static async getActiveAttributes() {
        const { rows } = await db.query(`SELECT 
            id, 
            title, 
            created_at
            FROM attributes WHERE status = 'active' 
            ORDER BY title ASC`);

        return rows;
    }

    static async updateAttribute(id, { title, description, display_order }) {
        const updates = [];
        const values = [];
        let index = 1;

        if (title) {
            updates.push(`title = $${index++}`);
            values.push(title);
        }

        if (description) {
            updates.push(`description = $${index++}`);
            values.push(description);
        }

        if (display_order) {
            updates.push(`display_order = $${index++}`);
            values.push(display_order);
        }

        if (updates.length === 0) {
            throw new Error("No fields to update.");
        }

        values.push(id);

        const query = `
            UPDATE attributes
            SET
                ${updates.join(", ")} 
            WHERE id = $${index}
            RETURNING *;
        `;

        const { rows } = await db.query(query, values);
        return rows[0] || null;
    }


    //Values
    static async createAttributeValue({ attribute_id, value, display_order, meta }) {
        const { rows } = await db.query(`
            INSERT INTO attribute_values(attribute_id, value, display_order, meta) 
            VALUES ($1, $2, $3, $4) RETURNING *;
            `, [attribute_id, value, display_order || null, meta]);

        return rows[0] ?? null;
    }


    static async removeAttributeValue(id) {
        const result = await this.#setStatus('deleted', id, 'attribute_values');

        return result;
    }


    static async activateAttributeValue(id) {
        const result = await this.#setStatus('active', id, 'attribute_values');

        return result;
    }

    static async deleteAttributeValue(id) {
        const { rows } = await db.query(`
            DELETE FROM attribute_values WHERE id = $1 RETURNING *
            `, [id]);

        return rows[0] ?? null;
    }

    static async getAttributeValueById(id) {
        const { rows } = await db.query(`
                        SELECT
                            av.*,
                            at.title AS attribute_title
                        FROM attribute_values av
                        INNER JOIN attributes at
                            ON at.id = av.attribute_id
                        WHERE av.id = $1
                    `, [id]);

        return rows[0] ?? null;
    }

    static async getAttributeValues({
        page = 1,
        limit = 10,
        attribute_id
    } = {}) {

        const offset = (page - 1) * limit;

        const where = [];
        const values = [];
        let index = 1;

        // if (!status || status === 'all')
        //     status = null;

        // if (status !== null) {
        //     where.push(`av.status = $${index++}`);
        //     values.push(status);
        // }

        if (attribute_id) {
            where.push(`av.attribute_id = $${index++}`);
            values.push(attribute_id);
        }

        const whereClause = where.length
            ? `WHERE ${where.join(' AND ')}`
            : '';

        const {
            rows: [{ total }]
        } = await db.query(`
                SELECT COUNT(*)::INTEGER AS total
                FROM attribute_values av
                ${whereClause}
            `, values);

        values.push(limit);
        values.push(offset);

        const { rows: attributeValues } = await db.query(`
                                    SELECT
                                        av.*,
                                        at.id AS attribute_id,
                                        at.title AS attribute_title,
                                        at.status AS attribute_status,
                                        at.description AS attribute_description
                                    FROM attribute_values av
                                    INNER JOIN attributes at
                                        ON av.attribute_id = at.id
                                    ${whereClause}
                                    ORDER BY av.id DESC
                                    LIMIT $${index++}
                                    OFFSET $${index}
                        `, values);

        const totalPages = Math.ceil(total / limit);

        return {
            attributeValues,
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

    static async getActiveAttributeValues() {
        const { rows } = await db.query(`SELECT 
            av.id, 
            av.title, 
            COALESCE(av.updated_at, av.created_at) 
            AS last_updates, 
            at.title AS attribute_title
            INNER JOIN attributes at
                    ON av.attribute_id = at.id
            FROM attribute_values av 
            WHERE status = 'active' 
            ORDER BY title ASC`);

        return rows;
    }

    static async updateAttributeValues(id, { attribute_id, value, display_order, meta }) {
        const updates = [];
        const values = [];
        let index = 1;

        if (value) {
            updates.push(`value = $${index++}`);
            values.push(value);
        }

        if (attribute_id) {
            updates.push(`attribute_id = $${index++}`);
            values.push(description);
        }

        if (meta) {
            updates.push(`meta = $${index++}`);
            values.push(meta);
        }

        if (display_order) {
            updates.push(`display_order = $${index++}`);
            values.push(display_order);
        }

        if (updates.length === 0) {
            throw new Error("No fields to update.");
        }

        values.push(id);

        const query = `
            UPDATE attribute_values
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