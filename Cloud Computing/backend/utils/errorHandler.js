const Boom = require('@hapi/boom');

const handleDatabaseError = (err, context) => {
  console.error(`[Database Error - ${context}]:`, err.message);

  if (err.code === 'ER_DUP_ENTRY') {
    return Boom.conflict('Duplicate entry detected'); // Mengembalikan Boom error
  }

  return Boom.internal('A database error occurred'); // Mengembalikan Boom error
};

const handleGeneralError = (err, context) => {
  console.error(`[Error - ${context}]:`, err.message);
  return Boom.internal('An unexpected error occurred');
};

module.exports = {
  handleDatabaseError,
  handleGeneralError,
};
