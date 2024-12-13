const { postHandler } = require('../controllers/postController');
const { authenticate } = require('../middlewares/authMiddleware');

module.exports = [
  {
    method: 'POST',
    path: '/posts',
    options: {
      pre: [{ method: authenticate }],
      payload: {
        maxBytes: 10 * 1024 * 1024, // 10 MB limit
        output: 'stream', // Stream the file directly
        parse: true, // Automatically parse multipart payloads
        allow: 'multipart/form-data', // Allow multipart uploads
        multipart: true,
      }, // Middleware autentikasi
    },
    handler: postHandler.createPost,
  },
  {
    method: 'GET',
    path: '/posts',
    options: {
      pre: [{ method: authenticate }],
    },
    handler: postHandler.readPosts,
  },
  {
    method: 'PUT',
    path: '/posts/{postId}', // Pastikan ID post digunakan dalam path jika diperlukan
    options: {
      pre: [{ method: authenticate }],
    },
    handler: postHandler.updatePost,
  },
  {
    method: 'DELETE',
    path: '/posts/{postId}',
    options: {
      pre: [{ method: authenticate }],
    },
    handler: postHandler.deletePost,
  },
];
