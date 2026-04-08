const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();
const {
  getDataByDb,
  insertProductByDb,
  insertProductInAllDbs,
} = require("../service/dbService");

const {
  getDataByDb,
  insertProductByDb,
  insertProductInAllDbs,
} = require("../service/dbService");

// ================================
// RUTAS
// ================================

// Usuario de prueba
const user = {
  username: "admin",
  password: "$2b$10$SBpzOjPWv8aEYmuCjopyCu51kXM6zF0v6ZjH6L8zMe.2HSF7ALWG2",
};

// Ruta de login
router.get("/login", (_, res) => {
  res.render("login", { error: null });
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (username !== user.username) {
    return res.render("login", { error: "Usuario Incorrecto" });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.render("login", { error: "Contraseña Incorrecta" });
  }

  const codigo = Math.floor(100000 + Math.random() * 900000).toString();

  req.session.pendingUser = username;
  req.session.twoFactorCode = codigo;
  req.session.twoFactorVerified = false;

  console.log("Código 2FA generado:", codigo);

  return res.redirect("/verificar-2fa");
});

// Ruta Verificación 2FA
router.get("/verificar-2fa", (req, res) => {
  if (!req.session.pendingUser || !req.session.twoFactorCode) {
    return res.redirect("/login");
  }
  res.render("verify2fa", { error: null });
});

router.post("/verificar-2fa", (req, res) => {
  const { codigo } = req.body;

  if (!req.session.pendingUser || !req.session.twoFactorCode) {
    return res.redirect("/login");
  }
  if (codigo !== req.session.twoFactorCode) {
    return res.render("verify2fa", { error: "Código incorrecto" });
  }
  req.session.user = req.session.pendingUser;
  req.session.twoFactorVerified = true;

  req.session.pendingUser = null;
  req.session.twoFactorCode = null;

  return res.redirect("/dashboard");
});

// Ruta de dashboard
router.get("/dashboard", (req, res) => {
  if (!req.session.user || !req.session.twoFactorVerified) {
    return res.redirect("/login");
  }
  console.log("Seleccione Base de Datos en dashboard:", req.session.dbType);

  function getDbDisplayName(dbType) {
    if (dbType === "postgres") return "PostgreSQL";
    if (dbType === "sqlserver") return "SQL Server";
    if (dbType === "oracle") return "Oracle";
    return "No seleccionada";
  }

  res.render("dashboard", {
    user: req.session.user,
    dbSeleccionada: req.session.dbType || null,
    dbNombre: getDbDisplayName(req.session.dbType),
  });
});

// Ruta para seleccionar base de datos
router.post("/seleccionar-db", (req, res) => {
  const { dbType } = req.body;
  console.log("Base de Datos Seleccionada:", dbType);

  if (!dbType) {
    return res.send("Debe seleccionar una base de datos");
  }
  req.session.dbType = dbType;
  console.log(
    "Base de Datos seleccionado guardado en sesión: ",
    req.session.dbType,
  );
  return res.redirect("/dashboard");
});

// Ruta para el formulario
router.get("/formulario", (req, res) => {
  if (!req.session.user || !req.session.twoFactorVerified) {
    return res.redirect("/login");
  }

  const mensaje = req.session.mensaje;
  req.session.mensaje = null; // Limpiar mensaje después de mostrarlo
  res.render("formulario", { mensaje });
});

// Ruta para ingreso de productos dinámico
router.post("/productos", async (req, res) => {
  try {
    if (!req.session.dbType) {
      return res.send(
        "Debe seleccionar una base de datos antes de agregar productos",
      );
    }

    const { modoEnvio, accion } = req.body;

    if (modoEnvio === "todas") {
      const resultados = await insertProductInAllDbs(req.body);

      req.session.mensaje =
        `PostgreSQL: ${resultados.postgres ? "OK" : "Error"} | ` +
        `SQL Server: ${resultados.sqlserver ? "OK" : "Error"} | ` +
        `Oracle: ${resultados.oracle ? "OK" : "Error"}`;
    } else {
      await insertProductByDb(req.session.dbType, req.body);
      req.session.mensaje = "Producto agregado exitosamente";
    }

    if ((accion || "").toLowerCase() === "kpi") {
      return res.redirect("/kpi");
    }
    return res.redirect("/formulario");
  } catch (error) {
    console.error("Error al ingresar producto:", error);
    return res.send("Error al ingresar producto");
  }
});

// Ruta de KPI dinámico
router.get("/kpi", async (req, res) => {
  try {
    if (!req.session.user || !req.session.twoFactorVerified) {
      return res.redirect;
    }

    if (!req.session.dbType) {
      return res.send("Debe seleccionar una base de datos");
    }

    const data = await getDataByDb(req.session.dbType);

    function getDbDisplayName(dbType) {
      if (dbType === "postgres") return "PostgreSQL";
      if (dbType === "sqlserver") return "SQL Server";
      if (dbType === "oracle") return "Oracle";
      return "No seleccionada";
    }

    res.render("kpi", {
      data,
      dbSeleccionada: req.session.dbType,
      dbNombre: getDbDisplayName(req.session.dbType),
    });
  } catch (error) {
    console.error("Error KPI:", error);
    res.send("Error al cargar KPI");
  }
});

module.exports = router;

// Temporal
const getOracleConnection = require("../config/db-oracle");

router.get("/test-oracle", async (req, res) => {
  let conn;
  try {
    conn = await getOracleConnection();
    const result = await conn.execute("SELECT * FROM producto");
    res.json(result.rows);
  } catch (error) {
    console.error("Oracle error:", error);
    res.status(500).send("Errro Oracle");
  } finally {
    if (conn) await conn.close();
  }
});

// Ruta Cerrar Sesion
router.get("/logout", (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      console.error("Error al cerrar sesión:", error);
      return res.redirect("/dashboard");
    }
    res.clearCookie("connect.sid");
    return res.redirect("/login");
  });
});
