const { Storage } = require('@google-cloud/storage');
const fs = require('fs');
const path = require('path');
const { predict, predictSoil } = require('../models/predictModel');
const { getDB } = require('../config/db');
require('dotenv').config();

const storage = new Storage({
  keyFilename: process.env.SERVICE_ACCOUNT,
});
const bucketName = "capstone-442703-bucket-1";

const soilData = {
  alluvial: { N: 1500, P: 20, K: 150, pH: 6.5 },
  black: { N: 1200, P: 15, K: 200, pH: 6.8 },
  cinder: { N: 1000, P: 10, K: 80, pH: 5.5 },
  clay: { N: 1800, P: 25, K: 180, pH: 6.8 },
  laterite: { N: 800, P: 8, K: 100, pH: 5.0 },
  loamy: { N: 1500, P: 20, K: 200, pH: 6.2 },
  peat: { N: 2500, P: 5, K: 80, pH: 4.5 },
  red: { N: 1000, P: 10, K: 150, pH: 5.2 },
  sandy: { N: 500, P: 5, K: 50, pH: 6.0 },
  sandy_loam: { N: 1200, P: 15, K: 100, pH: 6.5 },
  yellow: { N: 800, P: 10, K: 100, pH: 5.8 },
};

//load plants-collection.json for plant details
const loadPlantDetails = () => {
  const dataPath = path.join(__dirname, '../data/plants-collection.json');
  return JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
};

//search plant details according to label
const getPlantDetailsByLabel = (label) => {
  const plantsData = loadPlantDetails();
  return plantsData.plants.find(
    (plant) => plant.name.toLowerCase() === label.toLowerCase()
  );
};

//not used in v1
//model process in cloud
//if the user chooses to use a picture
//uses Soil identification model first to get soil type and then converts soil type to composition
//uses the soil composition then feed it to the crop prediction model
const predictCropWithImage = async (request, h) => {
  try {
    const db = await getDB();
    const { image, humidity, rainfall, userId } = request.payload;

    const timestamp = Date.now();
    const fileName = `predictions/${userId}_${timestamp}_${path.basename(image.hapi.filename)}`;
    const file = storage.bucket(bucketName).file(fileName);

    await file.save(image._data, {
      metadata: {
        contentType: image.hapi.headers['content-type'],
      },
    });

    console.log(`Image uploaded to GCS: ${fileName}`);

    const [fileBuffer] = await file.download();
    const soilPrediction = await predictSoil(fileBuffer);

    const soilDetails = soilData[soilPrediction.label.toLowerCase()];
    const result = await predict({
      ...soilDetails,
      humidity,
      rainfall,
    });

    const plantDetails = getPlantDetailsByLabel(result.label);

    const predictionDate = new Date().toISOString().split('T')[0];
    const [saveResult] = await db.query(
      `INSERT INTO PREDICTION (UserID, PlantPhoto, Label, Input_Data) 
       VALUES (?, ?, ?, ?)`,
      [
        request.auth.userId,
        fileName,
        result.label,
        JSON.stringify({
          humidity,
          rainfall,
          soilDetails,
          imagePath: fileName,
        }),
      ]
    );

    return h.response({
      status: 'success',
      predictionId: saveResult.insertId,
      prediction: result.label,
      imagePath: fileName,
      plantDetails: plantDetails ? plantDetails.details : null,
    }).code(201);
  } catch (err) {
    console.error(err);
    return h.response({ status: 'error', message: err.message }).code(500);
  }
};

//if the user manually fills in all the data
//immediately uses crop prediction model to get result
const predictCropWithFields = async (request, h) => {
  try {
    const db = await getDB();
    const { inputData } = request.payload;

    if (!inputData || !inputData.N || !inputData.P || !inputData.K) {
      return h.response({ status: 'error', message: 'Missing input data' }).code(400);
    }

    const result = await predict(inputData);
    const plantDetails = getPlantDetailsByLabel(result.label);

    const predictionDate = new Date().toISOString();
    const [saveResult] = await db.query(
      `INSERT INTO PREDICTION (UserID, PlantPhoto, Label, Input_Data) 
       VALUES (?, ?, ?, ?)`,
      [
        request.auth.userId,
        null,
        result.label,
        JSON.stringify(inputData),
      ]
    );

    return h.response({
      status: 'success',
      predictionId: saveResult.insertId,
      prediction: result.label,
      plantDetails: plantDetails ? plantDetails.details : null,
      predictionDate,
    }).code(201);
  } catch (err) {
    console.error(err);
    return h.response({ status: 'error', message: err.message }).code(500);
  }
};

//model process is in android app
//if the user chooses to use a picture
//immediately uses crop prediction model to get result
const predictCropWithFieldsWithImage = async (request, h) => {
  try {
    const db = await getDB();
    const { image, N, P, K, temperature, humidity, rainfall } = request.payload;

    if ( !image || !N || !P || !K || !temperature || !humidity || !rainfall) {
      return h.response({ status: 'error', message: 'Missing input data' }).code(400);
    }

    const timestamp = Date.now();
    const fileName = `predictions/${request.auth.userId}_${timestamp}_${path.basename(image.hapi.filename)}`;
    const imageUrl = `https://storage.googleapis.com/capstone-442703-bucket-1/predictions/${request.auth.userId}_${timestamp}_${path.basename(image.hapi.filename)}`;
    const file = storage.bucket(bucketName).file(fileName);

    await file.save(image._data, {
      metadata: {
        contentType: image.hapi.headers['content-type'],
      },
    });

    console.log(`Image uploaded to GCS: ${fileName}`);

    const inputData = [N, P, K, temperature, humidity, rainfall];

    const result = await predict(inputData);
    const plantDetails = getPlantDetailsByLabel(result.label);

    const predictionDate = new Date().toISOString();
    const [saveResult] = await db.query(
      `INSERT INTO PREDICTION (UserID, PlantPhoto, Label, Input_Data) 
       VALUES (?, ?, ?, ?)`,
      [
        request.auth.userId,
        imageUrl,
        result.label,
        JSON.stringify({
          humidity,
          rainfall,
          inputData,
          imagePath: imageUrl,
        }),
      ]
    );

    return h.response({
      status: 'success',
      predictionId: saveResult.insertId,
      prediction: result.label,
      imagePath: imageUrl,
      plantDetails: plantDetails ? plantDetails.details : null,
      predictionDate,
    }).code(201);
  } catch (err) {
    console.error(err);
    return h.response({ status: 'error', message: err.message }).code(500);
  }
};

//get user prediction history
const getPredictionsByUser = async (request, h, offset = 0, limit = 5) => {
  try {
    const db = await getDB();
    const userId = request.auth.userId;
    const [results] = await db.query(
      'SELECT * FROM PREDICTION WHERE UserID = ? ORDER BY PREDICTION.PredictionDate DESC LIMIT ? OFFSET ?',
      [userId, limit, offset]
    );

    const enrichedResults = results.map((prediction) => {
      const plantDetails = getPlantDetailsByLabel(prediction.Label);
      return {
        ...prediction,
        plantDetails: plantDetails ? plantDetails.details : null,
      };
    });

    return h.response({ status: 'success', data: enrichedResults }).code(200);
  } catch (err) {
    console.error(err);
    return h.response({ status: 'error', message: err.message }).code(500);
  }
};

//get details of a specific prediction
const getPredictionById = async (request, h) => {
  try {
    const db = await getDB();
    const id = request.params.id;
    const [result] = await db.query(
      'SELECT * FROM PREDICTION WHERE PredictionID = ?',
      [id]
    );

    if (result.length === 0) {
      return h.response({ status: 'fail', message: 'Prediction not found' }).code(404);
    }

    const plantDetails = getPlantDetailsByLabel(result[0].Label);
    const enrichedResult = {
      ...result[0],
      plantDetails: plantDetails ? plantDetails.details : null,
    };

    return h.response({ status: 'success', data: enrichedResult }).code(200);
  } catch (err) {
    console.error(err);
    return h.response({ status: 'error', message: err.message }).code(500);
  }
};

const deletePrediction = async (request, h) => {
  const id = request.params.id;

  if (!id || isNaN(id)) {
    return h.response({ message: "Prediction ID is required and must be a number" }).code(400);
  }
  

  try {
    const db = await getDB();

    // Fetch prediction details from the database
    const [rows] = await db.query('SELECT * FROM PREDICTION WHERE PredictionID = ?', [id]);
    if (rows.length === 0) {
      return h.response({ message: "Prediction not found" }).code(404);
    }

    const prediction = rows[0];
    const imagePath = prediction.PlantPhoto;

    if (imagePath) {
      const filename = imagePath.split('/').pop();
      const file = storage.bucket(bucketName).file(`predictions/${filename}`);

      // Check if the file exists in GCS
      const [exists] = await file.exists();
      if (exists) {
        await file.delete();
        console.log(`Deleted file from GCS: predictions/${filename}`);
      }
    }

    // Delete the prediction record from the database
    const [deleteResult] = await db.query('DELETE FROM PREDICTION WHERE PredictionID = ?', [id]);
    if (deleteResult.affectedRows === 0) {
      return h.response({ message: "Prediction not found" }).code(404);
    }

    return h.response({ message: "Prediction deleted successfully" }).code(200);
  } catch (error) {
    console.error("Error deleting prediction:", error);
    return h.response({ message: "Error deleting prediction", error: error.message }).code(500);
  }
};

module.exports = {
  predictCropWithImage,
  predictCropWithFields,
  predictCropWithFieldsWithImage,
  getPredictionsByUser,
  getPredictionById,
  deletePrediction
};
