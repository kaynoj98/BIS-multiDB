const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",
  host: "localhost", // Host para la conexión a la nube
  database: "bis_db",
  password: "220198",
  port: 5432,
  ssl: {
    rejectUnauthorized: false, // Permitir conexiones sin verificar el certificado
  },
});
module.exports = pool;
