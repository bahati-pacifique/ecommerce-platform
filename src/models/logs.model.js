const db = require('../configs/db');

class LogsModel {

    /**
     * Create an email log.
     *
     * @param {Object} data
     * @returns {Object|null}
     */
    static async createEmailLog({
        recipient_email,
        subject,
        title,
        body_html,
        body_text,
        reference,
        email_type,
        status = "pending",
        provider_message_id,
        error_message,
        sent_at
    }) {
        const { rows } = await db.query(`
            INSERT INTO email_logs (
                recipient_email,
                subject,
                title,
                body_html,
                body_text,
                reference,
                email_type,
                status,
                provider_message_id,
                error_message,
                sent_at
            )
            VALUES (
                $1, $2, $3, $4, $5, 
                $6, $7, $8, $9, $10, $11
            )
            RETURNING *;
        `, [
            recipient_email,
            subject,
            title,
            body_html,
            body_text,
            reference,
            email_type,
            status,
            provider_message_id,
            error_message,
            sent_at
        ]);

        return rows[0] ?? null;
    }


    /**
     * Get paginated email logs.
     *
     * If selector is provided, logs are filtered by that column.
     *
     * @param {number} limit
     * @param {number} offset
     * @param {Object} options
     * @param {string} options.selector
     * @param {*} options.value
     * @returns {Object}
     */
    static async getEmailLogs(
        limit = 20,
        offset = 0,
        { selector = null, value = null } = {}
    ) {

        const allowedSelectors = [
            "recipient_email",
            "reference",
            "email_type",
            "status",
            "provider_message_id"
        ];

        let query = `
            SELECT *
            FROM email_logs
        `;

        const values = [];

        if (selector) {

            if (!allowedSelectors.includes(selector)) {
                throw new Error(`Invalid email log selector: ${selector}`);
            }

            values.push(value);

            query += `
                WHERE ${selector} = $${values.length}
            `;
        }

        values.push(limit);
        const limitIndex = values.length;

        values.push(offset);
        const offsetIndex = values.length;

        query += `
            ORDER BY created_at DESC
            LIMIT $${limitIndex}
            OFFSET $${offsetIndex};
        `;

        const { rows } = await db.query(query, values);

        return rows;
    }
}

module.exports = LogsModel;