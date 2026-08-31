const LogsModel = require('../models/logs.model');

class LogsServices {
    static async createEmailLog(data){
        const emailLog = await LogsModel.createEmailLog(data);

        return emailLog;
    }

    static async getEmailLog(limit, offset, filters){
        const emailLogs = await LogsModel.getEmailLogs(limit, offset, filters);

        return emailLogs;
    }
}

module.exports = LogsServices;