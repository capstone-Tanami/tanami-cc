const errorHandler = (err, request, h) => {
  console.error('Unhandled Error:', err);

  const response = {
    error: true,
    message: err.message || 'Internal Server Error',
  };

  // Tangani error khusus berdasarkan jenisnya
  if (err.isJoi) {
    response.message = 'Validation Error';
    response.details = err.details.map((detail) => detail.message);
    return h.response(response).code(400);
  }

  if (err.name === 'JsonWebTokenError') {
    response.message = 'Invalid authentication token';
    return h.response(response).code(401);
  }

  if (err.name === 'TokenExpiredError') {
    response.message = 'Authentication token has expired';
    return h.response(response).code(401);
  }

  if (err.sql) {
    response.message = 'Database Error';
    response.details = err.sqlMessage || err.message;
    return h.response(response).code(500);
  }

  return h.response(response).code(err.statusCode || 500);
};

module.exports = errorHandler;
