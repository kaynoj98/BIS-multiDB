const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

app.use(express.static('public'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
    session({
        secret: 'secreto',
        resave: false,
        saveUninitialized: false
    })
);

app.use('/', authRoutes);
app.listen(3000, () => {
    console.log('Servidor en http://localhost:3000');
});

//Conexion a la base de datos POSTGRESQL
const pool = require('./config/db');

app.get('/test-db', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.send(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al conectar a la base de datos');
    }
});

        