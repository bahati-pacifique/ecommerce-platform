const db = require('../configs/db');

class UserModel {

    /**
     * Find a user by username or email for password authentication.
     */
    async getUserByUsernameOrEmail(identity) {
        const query = `
            SELECT
                u.id,
                u.id_no,
                u.username,
                u.email,
                u.phone_number,
                u.f_name,
                u.l_name,
                u.last_active,
                ua.password_hash,
                ua.verified_at

            FROM users u

            INNER JOIN user_authentications ua
                ON ua.user_id = u.id

            INNER JOIN authentication_providers ap
                ON ap.id = ua.provider_id

            WHERE
                (u.username = $1 OR u.email = $1)
                AND u.status = 'active'
                AND ua.status = 'active'
                AND ap.code = 'password'
                AND ap.is_active = TRUE

            LIMIT 1;
        `;

        const { rows } = await db.query(query, [identity]);

        return rows[0] ?? null;
    }

    /**
     * Get one authentication provider for a user.
     */
    async getUserAuthentication(userId, providerCode) {
        const query = `
            SELECT
                ua.id,
                ua.user_id,
                ua.password_hash,
                ua.verified_at,
                ua.status,

                ap.code AS provider,
                ap.title AS provider_title

            FROM user_authentications ua

            INNER JOIN authentication_providers ap
                ON ap.id = ua.provider_id

            WHERE
                ua.user_id = $1
                AND ap.code = $2
                AND ap.is_active = TRUE

            LIMIT 1;
        `;

        const { rows } = await db.query(query, [
            userId,
            providerCode
        ]);

        return rows[0] ?? null;
    }

    /**
     * Get all authentication providers linked to a user.
     */
    async getUserAuthentications(userId) {
        const query = `
            SELECT
                ua.id,
                ua.verified_at,
                ua.status,

                ap.code AS provider,
                ap.title AS provider_title

            FROM user_authentications ua

            INNER JOIN authentication_providers ap
                ON ap.id = ua.provider_id

            WHERE
                ua.user_id = $1
                AND ap.is_active = TRUE

            ORDER BY ap.title;
        `;

        const { rows } = await db.query(query, [userId]);

        return rows;
    }

    /**
     * Get user accounts.
     */
    async getUserAccounts(userId, { onlyValid = false } = {}) {
        const params = [userId];

        const conditions = [
            'ua.user_id = $1'
        ];

        if (onlyValid) {
            conditions.push(
                "ua.status = 'active'",
                "a.status = 'active'",
                "(ua.valid_from IS NULL OR ua.valid_from <= NOW())",
                "(ua.valid_to IS NULL OR ua.valid_to >= NOW())"
            );
        }

        const query = `
            SELECT
                ua.id AS user_account_id,
                ua.account_id,
                ua.role,
                ua.status,
                ua.joined_at,
                ua.valid_from,
                ua.valid_to,
                ua.last_active,
                a.title AS account_title,
                a.category_id,
                ac.code,
                ac.title AS account_category,
                ac.description,
                a.status AS account_status

            FROM user_accounts ua

            INNER JOIN accounts a
                ON a.id = ua.account_id
            INNER JOIN account_categories ac
                ON ac.id = a.category_id

            WHERE
                ${conditions.join('\n                AND ')}

            ORDER BY a.title;
        `;

        const { rows } = await db.query(query, params);

        return rows;
    }

    /**
     * Get a specific account membership.
     */
    // async getUserAccount(userId, accountId) {
    //     const query = `
    //         SELECT
    //             ua.account_id,
    //             ua.role,
    //             ua.status,
    //             ua.joined_at,
    //             ua.valid_from,
    //             ua.valid_to,
    //             ua.last_active,
    //             a.title AS account_title,
    //             a.category_id,
    //             ac.title AS account_category,
    //             ac.description,
    //             a.status AS account_status

    //         FROM user_accounts ua

    //         INNER JOIN accounts a
    //             ON a.id = ua.account_id
    //         INNER JOIN account_categories ac
    //             ON ac.id = a.category_id

    //         WHERE
    //             ua.user_id = $1
    //             AND ua.id = $2

    //         LIMIT 1;
    //     `;

    //     const { rows } = await db.query(query, [
    //         userId,
    //         accountId
    //     ]);

    //     return rows[0] ?? null;
    // }


    async getUserAccount(userId, accountId) {
        const query = `
            SELECT
                user_account_id,
                user_id,
                CONCAT(f_name, ' ', l_name) AS names,
                username,
                phone_number,
                email,
                account_category_code AS account_code,
                account_title,
                account_category,
                role
                FROM valid_user_accounts
                WHERE user_id = $1 
                AND user_account_id = $2 
            LIMIT 1;
        `;

        const { rows } = await db.query(query, [
            userId,
            accountId
        ]);

        return rows[0] ?? null;
    }


    /**
     * Check whether a user belongs to an account.
     */
    async hasUserAccount(userId, accountId) {
        const query = `
            SELECT EXISTS (
                SELECT 1
                FROM user_accounts
                WHERE
                    user_id = $1
                    AND account_id = $2
            ) AS exists;
        `;

        const { rows } = await db.query(query, [
            userId,
            accountId
        ]);

        return rows[0].exists;
    }

    async createPreauth({ userId, fingerprint = null, ip, agent }) {
        const query = `INSERT INTO preauth_sessions(user_id, fingerprint, ip, agent) 
                        VALUES($1, $2, $3, $4) 
                        RETURNING *`;

        const { rows } = await db.query(query, [userId, fingerprint, ip, agent]);

        return rows[0] || null;
    }

    async setUserAccountActiveStatus(type, id) {

        const LAST_ACTIVE_QUERIES = {
            user: `
                    UPDATE users
                    SET last_active = NOW()
                    WHERE id = $1
                `,
            user_account: `
                            UPDATE user_accounts
                            SET last_active = NOW()
                            WHERE id = $1
                        `
        };


        const query = LAST_ACTIVE_QUERIES[type];
        
        if (!query) {
            throw new Error('Invalid entity type');
        }

        const { rowCount } = await db.query(query, [id]);
        return rowCount === 1;
    }

    async markPreauthUsed(id) {
        const query = `
                        UPDATE preauth_sessions
                            SET used = TRUE
                            WHERE id = $1
                            AND used = FALSE
                            AND expires_at > NOW()
                        RETURNING *
                    `;

        const { rows } = await db.query(query, [id]);
        return rows[0] || null;
    }

    async getUnusedPreauthByUser(userId) {
        const { rows } = await db.query(
            `
        SELECT *
        FROM preauth_sessions
        WHERE user_id = $1
          AND used = false
          AND expires_at > NOW()
        LIMIT 1
        `,
            [userId]
        );
        return rows[0] || null;
    }

    async getUnusedPreauth(preauthId) {
        const { rows } = await db.query(
            `
        SELECT *
        FROM preauth_sessions
        WHERE id = $1
          AND used = false
          AND expires_at > NOW()
        LIMIT 1
        `,
            [preauthId]
        );
        return rows[0] || null;
    }

    async expirePreauthForUser(userId) {
        
        const { rowCount } = await db.query(
            `
                UPDATE preauth_sessions
                SET used = TRUE
                WHERE user_id = $1
                AND used = FALSE
                AND expires_at <= NOW()
            `,
            [userId]
        );

        return rowCount;

    }

    async expireUserPreauths(userId) {
        
        const { rowCount } = await db.query(
            `
                UPDATE preauth_sessions
                SET used = TRUE
                WHERE user_id = $1
                AND used = FALSE
            `,
            [userId]
        );

        return rowCount;
        
    }

    async rotateRefreshToken(sessionId, jwtId, refreshToken) {
        const { rows } = await db.query('UPDATE sessions SET refresh_token = $1, jwt_id = $2, last_used_at = NOW() WHERE id = $3 AND valid = TRUE RETURNING *', [refreshToken, jwtId, sessionId]);

        return rows[0] || null;
    }

}

module.exports = new UserModel();