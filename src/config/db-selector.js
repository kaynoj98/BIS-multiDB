const pgPool = require('./db-postgres');
const { sql, sqlConfig } = require('./db-sqlserver');
const getOracleConnection = require('./db-oracle');

async function getConnection(dbtype) {
    switch (dbtype) {
        case 'postgres':
            return {type: 'postgres', conn: pgPool};

        case 'sqlserver': {
            const conn = await sql.connect(sqlConfig);
            return { type: 'sqlserver', conn};
        }

        case 'oracle': {
            const conn = await getOracleConnection();
            return { type: 'oracle', conn };
        }

        default:
            throw new Error('Tipo de base de datos no soportado');  
    }
}
module.exports = getConnection;



