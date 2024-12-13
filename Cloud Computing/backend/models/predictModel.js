const { Storage } = require("@google-cloud/storage");
const tf = require("@tensorflow/tfjs-node");
const sharp = require("sharp");
require("dotenv").config();

let model = null;
let soilModel = null;

//load crop prediction model
const loadModel = async () => {
  if (model) return model;
  const modelUrl = `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/models/model-crop/model.json`;
  model = await tf.loadLayersModel(modelUrl);
  return model;
};

//error in loading
//not used in v1
//load soil detection model
const loadSoilModel = async () => {
  if (soilModel) return soilModel;
  const soilModelUrl = `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/models/model-soil/model.json`;
  soilModel = await tf.loadLayersModel(soilModelUrl);
  console.log(soilModel.summary());
  return soilModel;
};

//uses crop prediction model and returns plant name label
const predict = async (inputData) => {
  const model = await loadModel();
  
  const inputTensor = tf.tensor([
    [
      inputData.N,
      inputData.P,
      inputData.K,
      inputData.temperature,
      inputData.humidity,
      inputData.ph,
      inputData.rainfall,
    ],
  ]);

  const prediction = model.predict(inputTensor);
  const labelIndex = prediction.argMax(-1).dataSync()[0];

  const labels = [
    "rice", "maize", "chickpea", "kidneybeans", "pigeonpeas",
    "mothbeans", "mungbean", "blackgram", "lentil", "pomegranate",
    "banana", "mango", "grapes", "watermelon", "muskmelon",
    "apple", "orange", "papaya", "coconut", "cotton", "jute", "coffee",
  ];

  return { label: labels[labelIndex] };
};

//not used in v1
//uses Soil detection model to recognize soil types
const predictSoil = async (imageBuffer) => {
  const soilModel = await loadSoilModel();

  const processedImage = await sharp(imageBuffer)
    .resize({ width: 64, height: 64 })
    .toFormat("png")
    .raw()
    .toBuffer();

    const tensor = tf.tensor3d(new Uint8Array(processedImage), [64, 64, 3]) // Shape: [224, 224, 3]
    .expandDims(0) // Add batch dimension: [1, 224, 224, 3]
    .div(255.0); // Normalize pixel values to [0, 1]
  const prediction = soilModel.predict(tensor);
  const labelIndex = prediction.argMax(-1).dataSync()[0];

  const labels = [
    "Black", "Cinder", "Laterite", "Peat", "Yellow",
    "Alluvial", "Red", "Loamy", "Sandy", "Clay", "Sandy_Loam",
  ];

  return { label: labels[labelIndex] };
};

module.exports = { predict, predictSoil };
