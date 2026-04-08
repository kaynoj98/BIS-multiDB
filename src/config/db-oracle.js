const oracledb = require('oracledb');

async function getOracleConnection() {
    return await oracledb.getConnection({
        user: 'system',
        password: '220198',
        connectString: 'localhost/XEPDB1'
    });    
}
module.exports = getOracleConnection;

