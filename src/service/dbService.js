const pool = require("../config/db");
const { sql, sqlConfig } = require("../config/db-sqlserver");
const getOracleConnection = require("../config/db-oracle");

// =================================
// POSTGRESQL
// =================================

async function getPostgresData() {
  const result = await pool.query(`
        SELECT 
            nombre,
            categoria,
            marca,
            modelo,
            SUM(ventas) AS ventas,
            SUM((precio_venta - precio_compra) * ventas) AS ganancia,
            SUM(precio_venta * ventas) AS ingresos,
            SUM(precio_compra * ventas) AS inversion,
            SUM(stock) AS stock_total
        FROM producto
        GROUP BY nombre, categoria, marca, modelo
        ORDER BY nombre
        `);
  return result.rows;
}

async function insertPostgresProduct(data) {
  const {
    nombre,
    categoria,
    marca,
    modelo,
    precio_compra,
    precio_venta,
    ventas,
    stock,
    fecha,
  } = data;

  await pool.query(
    `
        INSERT INTO producto 
        (nombre, categoria, marca, modelo, precio_compra, precio_venta, ventas, stock, fecha)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `,
    [
      nombre,
      categoria,
      marca,
      modelo,
      precio_compra,
      precio_venta,
      ventas,
      stock,
      fecha,
    ],
  );
}

// =================================
// SQL SERVER
// =================================

async function getSqlServerData() {
  const conn = await sql.connect(sqlConfig);

  const result = await conn.request().query(`
        SELECT
            nombre,
            categoria,
            marca,
            modelo,
            SUM(ventas) AS ventas,
            SUM((precio_venta - precio_compra) * ventas) AS ganancia,
            SUM(precio_venta * ventas) AS ingresos,
            SUM(precio_compra * ventas) AS inversion,
            SUM(stock) AS stock_total
        FROM producto
        GROUP BY nombre, categoria, marca, modelo
        ORDER BY nombre
    `);
  return result.recordset;
}
async function insertSqlServerProduct(data) {
  const {
    nombre,
    categoria,
    marca,
    modelo,
    precio_compra,
    precio_venta,
    ventas,
    stock,
    fecha,
  } = data;
  const conn = await sql.connect(sqlConfig);

  await conn
    .request()
    .input("nombre", sql.VarChar, nombre)
    .input("categoria", sql.VarChar, categoria)
    .input("marca", sql.VarChar, marca)
    .input("modelo", sql.VarChar, modelo)
    .input("precio_compra", sql.Decimal(10, 2), precio_compra)
    .input("precio_venta", sql.Decimal(10, 2), precio_venta)
    .input("ventas", sql.Int, ventas)
    .input("stock", sql.Int, stock)
    .input("fecha", sql.Date, fecha).query(`
            INSERT INTO producto 
            (nombre, categoria, marca, modelo, precio_compra, precio_venta, ventas, stock, fecha)
            VALUES (@nombre, @categoria, @marca, @modelo, @precio_compra, @precio_venta, @ventas, @stock, @fecha)
        `);
}

// =================================
// ORACLE (PENDIENTE)
// =================================
async function getOracleData() {
  let conn;
  try {
    conn = await getOracleConnection();

    const result = await conn.execute(`
            SELECT
                nombre,
                categoria,
                marca,
                modelo,
                SUM(ventas) AS ventas,
                SUM((precio_venta - precio_compra) * ventas) AS ganancia,
                SUM(precio_venta * ventas) AS ingresos,
                SUM(precio_compra * ventas) AS inversion,
                SUM(stock) AS stock_total
            FROM producto 
            GROUP BY nombre, categoria, marca, modelo
            ORDER BY nombre
        `);

    const columns = result.metaData.map((col) => col.name.toLowerCase());

    const rows = result.rows.map((row) => {
      const obj = {};
      columns.forEach((col, index) => {
        obj[col] = row[index];
      });
      return obj;
    });
    return rows;
  } catch (error) {
    console.error("Oracle error:", error);
    throw error;
  } finally {
    if (conn) await conn.close();
  }
}

async function insertOracleProduct(data) {
  let conn;
  try {
    conn = await getOracleConnection();

    const {
      nombre,
      categoria,
      marca,
      modelo,
      precio_compra,
      precio_venta,
      ventas,
      stock,
      fecha,
    } = data;

    await conn.execute(
      `
            INSERT INTO producto
            (nombre, categoria, marca, modelo, precio_compra, precio_venta, ventas, stock, fecha)
            VALUES
            (:nombre, :categoria, :marca, :modelo, :precio_compra, :precio_venta, :ventas, :stock, TO_DATE(:fecha, 'YYYY-MM-DD'))
            `,
      {
        nombre,
        categoria,
        marca,
        modelo,
        precio_compra,
        precio_venta,
        ventas,
        stock,
        fecha,
      },
      { autoCommit: true },
    );
  } catch (error) {
    console.error("Oracle insert error:", error);
    throw error;
  } finally {
    if (conn) await conn.close();
  }
}

// =================================
// CONTROL DINÁMICO DE BASES DE DATOS
// =================================

async function getDataByDb(dbType) {
  if (dbType === "postgres") return await getPostgresData();
  if (dbType === "sqlserver") return await getSqlServerData();
  if (dbType === "oracle") return await getOracleData();

  throw new Error("Base de datos no soportado");
}

async function insertProductByDb(dbType, data) {
  if (dbType === "postgres") return await insertPostgresProduct(data);
  if (dbType === "sqlserver") return await insertSqlServerProduct(data);
  if (dbType === "oracle") return await insertOracleProduct(data);

  throw new Error("Base de datos no soportado");
}

async function insertProductInAllDbs(data) {
  const resultados = {
    postgres: false,
    sqlserver: false,
    oracle: false,
  };

  try {
    await insertPostgresProduct(data);
    resultados.postgres = true;
  } catch (error) {
    console.error("Error PostgreSQL:", error);
  }

  try {
    await insertSqlServerProduct(data);
    resultados.sqlserver = true;
  } catch (error) {
    console.error("Error SQL Server:", error);
  }

  try {
    await insertOracleProduct(data);
    resultados.oracle = true;
  } catch (error) {
    console.error("Error Oracle:", error);
  }

  return resultados;
}

module.exports = {
  getPostgresData,
  insertPostgresProduct,
  getSqlServerData,
  insertSqlServerProduct,
  getOracleData,
  insertOracleProduct,
  getDataByDb,
  insertProductByDb,
  insertProductInAllDbs,
};
