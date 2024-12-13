const { getDB } = require('../config/db'); // Impor getDB

// Membuat pengguna baru
const createUser = async (user) => {
  try {
    const db = getDB();
    const { email, password, username, name } = user;
    const query = `
      INSERT INTO ACCOUNT (Email, Password, Username, Name)
      VALUES (?, ?, ?, ?)
    `;
    const [result] = await db.execute(query, [email, password, username, name]);
    return result.insertId;
  } catch (error) {
    console.error('Error creating user:', error);
    throw new Error('Could not create user');
  }
};

// Mendapatkan pengguna berdasarkan email
const getUserByEmail = async (email) => {
  try {
    const db = getDB();
    const query = `SELECT * FROM ACCOUNT WHERE Email = ?`;
    const [rows] = await db.execute(query, [email]);
    return rows[0];
  } catch (error) {
    console.error('Error fetching user by email:', error);
    throw new Error('Could not fetch user by email');
  }
};

// Mendapatkan pengguna berdasarkan email atau username
const getUserByEmailOrUsername = async (usernameOrEmail) => {
  try {
    const db = getDB();
    const query = `SELECT * FROM ACCOUNT WHERE Email = ? OR Username = ?`;
    const [rows] = await db.execute(query, [usernameOrEmail, usernameOrEmail]);
    return rows[0];
  } catch (error) {
    console.error('Error fetching user by email or username:', error);
    throw new Error('Could not fetch user by email or username');
  }
};


// Menyimpan token ke database, memperbarui jika UserID sudah ada
const saveTokenToDB = async (userId, token) => {
  try {
    const db = getDB();
    const query = `
      INSERT INTO ACTIVETOKENS (UserID, Token)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE Token = VALUES(Token)
    `;
    const [result] = await db.execute(query, [userId, token]);
    return result;
  } catch (error) {
    console.error('Error saving token to DB:', error);
    throw new Error('Could not save token');
  }
};

// Menghapus token berdasarkan UserID dan token
const deleteTokenByUserId = async (userId, token) => {
  try {
    const db = getDB();
    const query = `DELETE FROM ACTIVETOKENS WHERE UserID = ? AND Token = ?`;
    const [rows] = await db.execute(query, [userId, token]);
    return rows;
  } catch (error) {
    console.error('Error deleting token by UserID:', error);
    throw new Error('Could not delete token');
  }
};

// Mengecek apakah token ada di database
const isTokenInDB = async (userId, token) => {
  try {
    console.log('Checking token in DB:', { userId, token });
    const db = getDB();
    const query = 'SELECT * FROM ACTIVETOKENS WHERE UserID = ? AND Token = ?';
    const [rows] = await db.execute(query, [userId, token]);
    console.log('Query result:', rows);
    return rows.length > 0;
  } catch (error) {
    console.error('Error checking token in DB:', error);
    throw new Error('Could not check token');
  }
};


// Memperbarui data pengguna
const updateUser = async (userId, fieldsToUpdate) => {
  try {
    const db = getDB();

    // Bangun query dinamis berdasarkan fieldsToUpdate
    const setClauses = [];
    const params = [];

    if (fieldsToUpdate.name !== undefined) {
      setClauses.push('Name = ?');
      params.push(fieldsToUpdate.name);
    }

    if (fieldsToUpdate.profilePicture !== undefined) {
      setClauses.push('ProfilePicture = ?');
      params.push(fieldsToUpdate.profilePicture);
    }

    if (setClauses.length === 0) {
      throw new Error('No fields to update');
    }

    const query = `
      UPDATE ACCOUNT
      SET ${setClauses.join(', ')}
      WHERE UserID = ?
    `;
    params.push(userId); // Tambahkan userId ke akhir parameter

    const [result] = await db.execute(query, params);
    return result;
  } catch (error) {
    console.error('Error updating user:', error);
    throw new Error('Could not update user');
  }
};


// Mendapatkan token dari database
const getTokenFromDB = async (userId) => {
  try {
    const db = getDB();
    const query = 'SELECT Token FROM ACTIVETOKENS WHERE UserID = ?';
    const [rows] = await db.execute(query, [userId]);

    // Log hasil query
    console.log('Hasil query getTokenFromDB:', rows);

    // Periksa apakah ada token
    if (rows.length === 0) {
      console.log('Token tidak ditemukan untuk UserID:', userId);
      return null;
    }

    // Ambil token pertama (jika ada)
    const token = rows[0].Token;
    console.log('Token dari database:', token);
    return token;
  } catch (error) {
    console.error('Error fetching token from DB:', error);
    throw new Error('Could not fetch token from database');
  }
};


module.exports = {
  createUser,
  getUserByEmail,
  getUserByEmailOrUsername,
  saveTokenToDB,
  deleteTokenByUserId,
  isTokenInDB,
  updateUser,
  getTokenFromDB,
};
