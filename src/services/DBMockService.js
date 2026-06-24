const dbModel = require('../models/DbMockModel');

class DBMockService {
    async testConnection(){
        try {
            const result = await dbModel.testDb();
            console.log(result);
        } catch (error) {
            console.log(error);
            throw new Error(error.message)
        }
    }
}

module.exports = new DBMockService();