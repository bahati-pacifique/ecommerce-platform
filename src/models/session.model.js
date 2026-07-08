const db = require('../configs/db');

class Session {
    constructor(row) {
        this.id = row.id;
        this.userAccount = row.user_account;
        this.jwtId = row.jwt_id;
        this.ipAddress = row.ip_address;
        this.timezone = row.timezone;
        this.userAgent = row.user_agent;
        this.refreshToken = row.refresh_token;
        this.valid = row.valid;
        this.createdAt = row.created_at;
        this.expiresAt = row.expires_at;
        this.lastUsedAt = row.last_used_at;
    }

    /* -----------------------------
     * CREATE
     * --------------------------- */

    static async create({
        userAccount,
        jwtId,
        refreshToken,
        ipAddress,
        timezone,
        userAgent
    }) {
        const { rows } = await db.query(
            `
            INSERT INTO sessions (
                user_account,
                jwt_id,
                refresh_token,
                ip_address,
                user_agent,
                timezone
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
            `,
            [
                userAccount,
                jwtId,
                refreshToken,
                ipAddress,
                userAgent,
                timezone
            ]
        );

        return new Session(rows[0]);
    }

    /* -----------------------------
     * FIND / VALIDATE
     * --------------------------- */

    static async findValidByRefresh({
        userAccount,
        jwtId,
        rawRefreshToken
    }) {
        const { rows } = await db.query(
            `
            SELECT *
            FROM sessions
            WHERE user_account = $1
              AND jwt_id = $2
              AND refresh_token = $3
              AND valid = true
              AND expires_at > NOW()
            LIMIT 1
            `,
            [userAccount, jwtId, rawRefreshToken]
        );

        return rows.length ? new Session(rows[0]) : null;
    }

    static async findById(id) {
        const { rows } = await db.query(
            `SELECT * FROM sessions WHERE id = $1`,
            [id]
        );

        return rows.length ? new Session(rows[0]) : null;
    }

    static async findActiveByUser(userAccount) {
        const { rows } = await db.query(
            `
            SELECT
                id,
                user_account,
                ip_address,
                timezone,
                user_agent,
                created_at,
                last_used_at,
                expires_at
            FROM sessions
            WHERE user_account = $1
              AND valid = true
              AND expires_at > NOW()
            ORDER BY last_used_at DESC NULLS LAST
            `,
            [userAccount]
        );

        return rows.map(row => new Session(row));
    }

    /* -----------------------------
     * UPDATE
     * --------------------------- */

    static async touch(id) {
        const { rows } = await db.query(
            `
            UPDATE sessions
            SET last_used_at = NOW()
            WHERE id = $1
            RETURNING *
            `,
            [id]
        );

        return rows.length ? new Session(rows[0]) : null;
    }

    static async touch(id) {
        const { rows } = await db.query(
            `
            UPDATE sessions
            SET last_used_at = NOW()
            WHERE id = $1
            RETURNING *
            `,
            [id]
        );

        return rows.length ? new Session(rows[0]) : null;
    }

    static async invalidate(id) {
        const { rows } = await db.query(
            `
            UPDATE sessions
            SET valid = false
            WHERE id = $1
            RETURNING *
            `,
            [id]
        );

        return rows.length ? new Session(rows[0]) : null;
    }

    static async invalidateAllForUser(userAccount) {
        await db.query(
            `
            UPDATE sessions
            SET valid = false
            WHERE user_account = $1 RETURNING id
            `,
            [userAccount]
        );

        return true;
    }

    /* -----------------------------
     * DELETE (hard)
     * --------------------------- */

    static async delete(id) {
        const { rows } = await db.query(
            `
            DELETE FROM sessions
            WHERE id = $1
            RETURNING *
            `,
            [id]
        );

        return rows.length ? new Session(rows[0]) : null;
    }
}

module.exports = Session;