const {Pool} = require('pg');

const pool = new Pool({ 
    user: 'postgres',
    host: 'localhost',
    database: 'bis_db',
    password: '220198',
    port: 5432,
}); 
module.exports = pool;
