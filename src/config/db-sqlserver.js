const sql = require('mssql');

const sqlConfig = {
    user: 'sa',
    password: '220198',
    server: 'localhost',
    port: 1433,
    database: 'bis_sqlserver',
    options: {
        trustServerCertificate: true,
        encrypt: true    
    }
};

module.exports = { sql, sqlConfig };

