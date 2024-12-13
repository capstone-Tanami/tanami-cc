const jwt = require('jsonwebtoken');
const { isTokenInDB } = require('../models/userModel'); // Sesuaikan path dengan file model Anda

const authenticate = async (request, h) => {
  try {
    const token =
      request.headers.authorization?.replace('Bearer ', '') ||
      request.state.token; // Ambil token dari cookie jika tersedia

    if (!token) {
      return h
        .response({
          status: 'fail',
          message: 'Authentication token is missing',
        })
        .code(401)
        .takeover();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const isValid = await isTokenInDB(decoded.id, token);
    if (!isValid) {
      return h
        .response({
          status: 'fail',
          message: 'Token is invalid or expired',
        })
        .code(401)
        .takeover();
    }

    request.auth = { userId: decoded.id, username: decoded.username };

    return h.continue;
  } catch (error) {
    console.error('Authentication Error:', error);
    return h
      .response({
        status: 'error',
        message: 'Authentication failed',
      })
      .code(500)
      .takeover();
  }
};

// Fungsi utilitas untuk merespons dengan kesalahan
const respondWithError = (h, message, code) => {
  return h
    .response({
      error: message,
      code,
      timestamp: new Date().toISOString(),
    })
    .code(code)
    .takeover();
};
const getTokenFromDB = async (userId) => {
  // Query ke database untuk mendapatkan token berdasarkan userId
  const result = await db.query('SELECT token FROM tokens WHERE userId = ?', [userId]);
  return result.length > 0 ? result[0].token : null;
};


// Fungsi utilitas untuk menangani kesalahan JWT
const handleJwtError = (error, h) => {
  const errorMessage =
    error.name === 'JsonWebTokenError'
      ? 'Invalid authentication token'
      : error.name === 'TokenExpiredError'
      ? 'Authentication token has expired'
      : 'Authentication token verification failed';

  return respondWithError(h, errorMessage, 401);
};

module.exports = { authenticate };
