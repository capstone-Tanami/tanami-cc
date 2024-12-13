const {
  register,
  login,
  logout,
  me,
  updateProfile,
} = require('../controllers/authController');
const { authenticate } = require('../middlewares/authMiddleware');

const authRoutes = [
  // Registrasi pengguna
  {
    method: 'POST',
    path: '/register',
    handler: register,
  },
  // Login pengguna
  {
    method: 'POST',
    path: '/login',
    handler: login,
  },
  // Logout pengguna
  {
    method: 'POST',
    path: '/logout',
    handler: logout,
    options: {
      pre: [{ method: authenticate }], // Middleware authenticate untuk memastikan pengguna terautentikasi
    },
  },
  // Mendapatkan informasi pengguna
  {
    method: 'GET',
    path: '/me',
    handler: me, // Menggunakan handler dari authController
    options: {
      pre: [{ method: authenticate }],
    },
  },
  // Memperbarui profil pengguna
  {
    method: 'PUT',
    path: '/profile',
    options: {
      pre: [{ method: authenticate }],
      payload: {
        maxBytes: 10 * 1024 * 1024,
        output: 'stream',
        parse: true,
        allow: 'multipart/form-data',
        multipart: true,
      },
    },
    handler: updateProfile,
  },
];

module.exports = authRoutes;
