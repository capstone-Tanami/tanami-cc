const { Storage } = require('@google-cloud/storage');

const storage = new Storage({
  keyFilename: process.env.GCLOUD_KEYFILE,
});
const bucket = storage.bucket(process.env.GCLOUD_BUCKET_NAME);

module.exports = { storage, bucket };
