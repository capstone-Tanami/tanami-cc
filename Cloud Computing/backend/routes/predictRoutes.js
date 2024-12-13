const {
  predictCropWithImage,
  predictCropWithFields,
  getPredictionsByUser,
  getPredictionById,
  predictCropWithFieldsWithImage,
  deletePrediction,
} = require("../controllers/predictController");
const { authenticate } = require('../middlewares/authMiddleware');

const routes = [
  {
    method: "POST",
    path: "/predict/image",
    handler: predictCropWithFieldsWithImage,
    options: {
      pre: [{ method: authenticate }],
      payload: {
        maxBytes: 10 * 1024 * 1024, // 10 MB limit
        output: "stream",
        parse: true,
        allow: "multipart/form-data",
        multipart: true,
      },
    },
  },
  {
    method: "POST",
    path: "/predict/fields",
    options: {
      pre: [{ method: authenticate }],
    },
    handler: predictCropWithFields,
  },
  {
    method: "GET",
    path: "/predictions",
    options: {
      pre: [{ method: authenticate }],
    },
    handler: getPredictionsByUser,
  },
  {
    method: "GET",
    path: "/prediction/{id}",
    options: {
      pre: [{ method: authenticate }],
    },
    handler: getPredictionById,
  },
  {
    method: "DELETE",
    path: "/prediction/{id}",
    options: {
      pre: [{ method: authenticate }],
    },
    handler: deletePrediction,
  },
];

module.exports = routes;
