const db = require('../configs/db');

class DBMock {
    constructor(database = db) {
        this.db = database;
    }
    async testDb() {

        const { rows } = await db.query('SELECT * FROM users');

        console.log(rows)

        return rows || [];

    }
}

module.exports = new DBMock();