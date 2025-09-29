// server/db.js
const { Pool } = require('pg');

// Creamos un "pool" de conexiones. Es más eficiente que crear una
// conexión nueva para cada consulta a la base de datos.
const pool = new Pool({
  user: 'user_dev',
  host: 'localhost',
  database: 'directorio_local_db',
  password: 'password_dev',
  port: 5433, // El puerto que mapeamos en Docker
});

// Exportamos una función 'query' que nos permitirá ejecutar consultas
// desde cualquier parte de nuestro backend de forma segura.
module.exports = {
  query: (text, params) => pool.query(text, params),
};