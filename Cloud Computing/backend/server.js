require('dotenv').config();
const Hapi = require('@hapi/hapi');
const Cookie = require('@hapi/cookie');
const { connectDB } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const postRoutes = require('./routes/postRoutes');
const articleRoutes = require('./routes/articleRoutes');
const errorHandler = require('./middlewares/errorHandler');
const predictRoutes = require('./routes/predictRoutes');

const init = async () => {
  await connectDB();

  const server = Hapi.server({
    port: process.env.PORT || 4000,
    host: '0.0.0.0',
    routes: {
      cors: {
        origin: ['*'], // Allow all origins for development
      },
    },
  });

  await server.register(Cookie);

  // Configure cookie parsing
  server.state('token', {
    isHttpOnly: true,
    isSecure: false, // true if using HTTPS
    path: '/',
    isSameSite: 'Lax', // Use isSameSite instead of sameSite
  });

  server.route(authRoutes);
  server.route(postRoutes);
  server.route(predictRoutes);
  server.route(articleRoutes);

  server.ext('onPreResponse', (request, h) => {
    const response = request.response;
    if (response.isBoom) {
      return errorHandler(response, request, h);
    }
    return h.continue;
  });

  await server.start();
  console.log(`Server running on ${server.info.uri}`);
};

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

init();
