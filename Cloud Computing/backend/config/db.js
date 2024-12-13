const mysql = require('mysql2/promise'); // Menggunakan mysql2 dengan promise

let db;

const connectDB = async () => {
  try {
    db = await mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
    console.log('Connected to MySQL database');
  } catch (error) {
    console.error('Failed to connect to MySQL:', error.message);
    process.exit(1); // Keluar jika koneksi gagal
  }
};

// Fungsi untuk mendapatkan pool yang telah terhubung
const getDB = () => db;

module.exports = { connectDB, getDB };
