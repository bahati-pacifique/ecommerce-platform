const db = require('../configs/db');
const bcrypt = require('bcrypt');

class UserModel {


    static async #findBy(column, value) {
        const { rows } = await db.query(
            `SELECT * FROM users WHERE ${column} = $1`,
            [value]
        );

        return rows[0] ?? null;
    }

    /**
     * Fetches a user by their system ID.
     * @param {uuid} id - The internal system user ID.
     * @returns {user|null} Return th user data matched or null
    */
    static getById(id) {
        return this.#findBy("id", id);
    }

    /**
    * Fetches a user by their system user legal ID number.
    * @param {string} idNo - The internal system user legal ID number.
    * @returns {user|null} Return th user data matched or null
   */
    static getByIdNo(idNo) {
        return this.#findBy("id_no", idNo);
    }

    /**
    * Fetches a user by their system user email address.
    * @param {string} email - The internal system user email.
    * @returns {user|null} Return th user data matched or null
   */
    static getByEmail(email) {
        return this.#findBy("email", email);
    }

    /**
    * Fetches a user by their system user phone number.
    * @param {string} phone - The internal system user phone number.
    * @returns {user|null} Return th user data matched or null
   */
    static getByPhone(phone) {
        return this.#findBy("phone", phone);
    }

    /**
    * Fetches a user by their system user username identifier.
    * @param {string} username - The internal system user's username.
    * @returns {user|null} Return th user data matched or null
   */
    static getByUsername(username) {
        return this.#findBy("username", username);
    }

    /**
     * Checks whether a username already exists.
     * @param {string} username - The username to check.
     * @returns {Promise<boolean>} True if the username exists, otherwise false.
     */
    static async isUsernameExist(username) {
        const { rows } = await db.query(
            `SELECT EXISTS(
                SELECT 1
                FROM users
                WHERE username = $1
            ) AS exists`,
            [username]
        );

        return rows[0].exists;
    }

    static async createUser({
        f_name,
        l_name,
        phone_number,
        email,
        username,
        id_no,
        password,
        provider = 'password',
        provider_id = 1
    }) {

        // Validate required fields
        if (!f_name) {
            throw new Error('First name is required');
        }

        if (!l_name) {
            throw new Error('Last name is required');
        }

        if (!email) {
            throw new Error('Email is required');
        }

        if (!username) {
            throw new Error('Username is required');
        }

        if (provider === 'password' && !password) {
            throw new Error('Password is required');
        }

        // Validate authentication provider
        const allowedProviders = ['password', 'google', 'github', 'apple', 'facebook'];

        if (!allowedProviders.includes(provider)) {
            throw new Error('Invalid authentication provider');
        }

        const client = await db.connect();

        try {
            await client.query('BEGIN');

            /*
             * Local authentication
             */
            if (provider === 'password') {

                const hashedPassword = await bcrypt.hash(
                    password,
                    Number(process.env.BCRYPT_ROUNDS) || 12
                );

                /*
                 * Create user
                 */
                const { rows: userRows } = await client.query(`
                    INSERT INTO users (
                        id_no,
                        username,
                        email,
                        phone_number,
                        f_name,
                        l_name
                    )
                    VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING *
                `, [
                    id_no,
                    username,
                    email,
                    phone_number,
                    f_name,
                    l_name
                ]);

                if (!userRows[0]) {
                    throw new Error(
                        'Failed — Unable to create user'
                    );
                }

                const user = userRows[0];

                /*
                 * Create authentication record
                 */
                const { rows: authenticationRows } = await client.query(`
                INSERT INTO user_authentications (
                    user_id,
                    provider_id,
                    provider_user_id,
                    password_hash
                )
                VALUES ($1, $2, $3, $4)
                RETURNING *
            `, [
                    user.id,
                    provider_id,
                    user.username,
                    hashedPassword
                ]);

                if (!authenticationRows[0]) {
                    throw new Error(
                        'Failed — Unable to create authentication record'
                    );
                }

                await client.query('COMMIT');

                return user;
            }

            /*
             * Social authentication
             *
             * Google/GitHub authentication should be implemented
             * separately once the provider has authenticated the user.
             */
            throw new Error(
                `Authentication provider "${provider}" is not implemented`
            );

        } catch (error) {

            console.log(error)
            await client.query('ROLLBACK');

            /*
             * unique constraint violation
             */
            if (error.code === '23505') {
                const error = new Error('A user with this email, phone number, username, or ID already exists');
                error.code = 23505;
                throw error;
            }

            /*
             * foreign key violation
             */
            if (error.code === '23503') {
                const error = new Error('Invalid authentication provider or related record');
                error.code = 23505;
                throw error;
            }

            throw error;

        } finally {
            client.release();
        }
    }

    /**
     * Verifies the current password and updates it to a new hashed password.
     * @param {uuid} userId - The unique internal system user ID.
     * @param {string} currentPassword - The user's current plain-text password.
     * @param {string} newPassword - The user's desired new plain-text password.
     * @returns user's {id, username, email, id_no, updated_at}
     */
    // static async changePassword(userId, currentPassword, newPassword) {
    //     const { rows } = await db.query(
    //         `
    //     SELECT
    //         ua.password_hash
    //     FROM user_authentications ua
    //     INNER JOIN authentication_providers ap
    //         ON ap.id = ua.provider_id
    //     WHERE ua.user_id = $1
    //       AND ap.code = 'password'
    //     `,
    //         [userId]
    //     );

    //     if (rows.length === 0) {
    //         throw new Error("User not found");
    //     }

    //     const { password_hash } = rows[0];

    //     const isMatch = await bcrypt.compare(currentPassword, password_hash);

    //     if (!isMatch) {
    //         throw new Error("Incorrect current password");
    //     }

    //     const isSamePassword = await bcrypt.compare(newPassword, password_hash);

    //     if (isSamePassword) {
    //         throw new Error("New password must be different from the current password");
    //     }

    //     const hashedPassword = await bcrypt.hash(
    //         newPassword,
    //         Number(process.env.BCRYPT_ROUNDS) || 12
    //     );

    //     const { rows: updatedRows } = await db.query(
    //         `
    //     UPDATE user_authentications
    //     SET
    //         password_hash = $1,
    //         updated_at = NOW()
    //     WHERE user_id = $2
    //     RETURNING user_id, updated_at
    //     `,
    //         [hashedPassword, userId]
    //     );

    //     return updatedRows[0];
    // }

    static async findByUserIdAndProvider(userId, providerCode) {
        const { rows } = await db.query(
            `
            SELECT ua.*
            FROM user_authentications ua
            JOIN authentication_providers ap
                ON ap.id = ua.provider_id
            WHERE ua.user_id = $1
              AND ap.code = $2
            `,
            [userId, providerCode]
        );

        return rows[0] ?? null;
    }

    static async updatePasswordHash(userId, hash) {
        const { rows } = await db.query(
            `
            UPDATE user_authentications
            SET
                password_hash = $1,
                updated_at = NOW()
            WHERE user_id = $2
            RETURNING *
            `,
            [hash, userId]
        );

        return rows[0];
    }

    /**
     * Updates a user's first and last name.
     * @param {number|string} userId - The unique internal system user ID.
     * @param {string} fName - The user's new first name.
     * @param {string} lName - The user's new last name.
     * @returns {Promise<Object>} The updated user record without the password field.
     * @throws {Error} If the user does not exist.
     */
    static async updateNames({ userId, firstName, lastName }) {
        const updates = [];
        const params = [];

        if (firstName !== undefined) {
            params.push(firstName);
            updates.push(`f_name = $${params.length}`);
        }

        if (lastName !== undefined) {
            params.push(lastName);
            updates.push(`l_name = $${params.length}`);
        }

        if (updates.length === 0) {
            throw new Error("Nothing to update");
        }

        params.push(userId);

        const { rows } = await db.query(
            `
        UPDATE users
        SET ${updates.join(", ")}
        WHERE id = $${params.length}
        RETURNING id, f_name, l_name, email, id_no, updated_at
        `,
            params
        );

        return rows[0] ?? null;
    }

    /**
     * Updates the JSONB profile payload for a user.
     * @param {uuid|string} userId - The unique internal system user ID.
     * @param {Object} profileData - The raw Object containing bio, avatar, or settings.
     * @returns {Promise<Object>} The updated user record containing the profile object.
     * @throws {Error} If the user does not exist.
     */
    static async updateProfile(userId, profile) {
        const { rows } = await db.query(
            `
            UPDATE users
            SET
                profile = COALESCE(profile, '{}'::jsonb) || $1::jsonb
            WHERE id = $2
            RETURNING id, f_name, l_name, email, profile, updated_at
        `,
            [profile, userId]
        );

        return rows[0] ?? null;
    }

    /**
     * Updates a user's phone number.
     * @param {number|string} userId - The unique internal system user ID.
     * @param {string} phoneNumber - The user's new phone number.
     * @returns {Promise<Object>} The updated user record with the new phone number.
     * @throws {Error} If the user does not exist.
     */
    static async updatePhoneNumber(userId, phoneNumber) {
        const { rows } = await db.query(
            `UPDATE users 
                SET phone_number = $1 
                WHERE id = $2 
            RETURNING id, f_name, l_name, email, phone_number, updated_at`,
            [phoneNumber, userId]
        );

        return rows[0] ?? null;
    }

    /**
     * Updates the user's operational account status.
     * @param {number|string} userId - The unique internal system user ID.
     * @param {'active'|'suspended'|'blocked'|'deleted'} status - The new status state.
     * @returns {Promise<Object>} The updated user record containing the new status.
     * @throws {Error} If the user does not exist or status violates constraints.
     */
    static async updateStatus(userId, status) {
        const { rows } = await db.query(
            `UPDATE users 
                SET status = $1 
                WHERE id = $2 
            RETURNING id, f_name, l_name, email, status, updated_at`,
            [status, userId]
        );

        return rows[0] ?? null;
    }

    /**
    * Updates a unique username only if the account status is active.
    * @param {uuid|string} userId - The unique internal system user ID.
    * @param {string} username - The user's new desired username.
    * @returns {Promise<Object>} The updated user record.
    * @throws {Error} If the user does not exist or is not active.
    */
    static async updateUsername(userId, username) {
        const { rows } = await db.query(
            `UPDATE users 
             SET username = $1 
             WHERE id = $2 AND status = 'active'
             RETURNING id, username, email, status, updated_at`,
            [username, userId]
        );

        if (rows.length === 0) {
            throw new Error('User not found or account is not active');
        }

        return rows[0] || null;
    }

    static async getRandomUserByAccountCategory({ code = null, title = null } = {}) {
        if (!code && !title) {
            throw new Error('Account category code or title is required');
        }

        const conditions = [];
        const values = [];
        let paramIndex = 1;

        if (code) {
            conditions.push(`ac.code = $${paramIndex++}`);
            values.push(code);
        }

        if (title) {
            conditions.push(`ac.title = $${paramIndex++}`);
            values.push(title);
        }

        const query = `
                SELECT u.*
                FROM users u
                INNER JOIN user_accounts ua
                    ON ua.user_id = u.id
                INNER JOIN accounts a
                    ON a.id = ua.account_id
                INNER JOIN account_categories ac
                    ON ac.id = a.category_id
                WHERE u.status = 'active'
                AND ${conditions.join(' AND ')}
                ORDER BY RANDOM()
                LIMIT 1
        `;

        const result = await db.query(query, values);

        return result.rows[0] ?? null;
    }

    /**
     * This function check if username can be used by another user
     * @param {string} username to look for
     * @returns false if the username already exist or true if it does not exist (Can be used by another user)
     */
    static async checkUsernameAvailable(username) {
        const {rows} = await db.query(`
                SELECT 1 FROM users WHERE LOWER(username) = LOWER($1)
            `, [username]);

            return rows.length === 0;
    }

}

module.exports = UserModel;