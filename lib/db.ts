
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Menjaga koneksi tetap hidup untuk cPanel/Shared hosting yang sering memutus koneksi idle
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  // Mengaktifkan kompresi untuk mengurangi ukuran paket data saat transfer data besar
  compress: true,
});

export default pool;