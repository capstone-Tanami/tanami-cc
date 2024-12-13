// Controller: articleController.js
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { Storage } = require('@google-cloud/storage');
const ArticleModel = require('../models/articleModel');

const storage = new Storage({
  keyFilename: process.env.SERVICE_ACCOUNT,
});
const bucketName = 'capstone-442703-bucket-1';
const bucket = storage.bucket(bucketName);

const ArticleController = {
  async createArticle(request, h) {
    const { title, content } = request.payload;
    const image = request.payload.image;

    if (!title || !content || !image || !image.hapi) {
      return h
        .response({
          message: 'All fields (title, content, image) are required.',
        })
        .code(400);
    }

    try {
      const filename = `articles/${uuidv4()}_${path.basename(
        image.hapi.filename
      )}`;
      const file = bucket.file(filename);

      const stream = file.createWriteStream({
        metadata: { contentType: image.hapi.headers['content-type'] },
      });

      await new Promise((resolve, reject) => {
        stream.on('error', reject);
        stream.on('finish', resolve);
        stream.end(image._data);
      });

      const imageUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;
      await ArticleModel.createArticle(title, content, imageUrl);

      return h.response({ message: 'Article created successfully' }).code(201);
    } catch (error) {
      console.error('Error creating article:', error);
      return h
        .response({ message: 'Error creating article', error: error.message })
        .code(500);
    }
  },

  async deleteArticle(request, h) {
    const { id } = request.params;

    try {
      const article = await ArticleModel.getArticleById(id);
      if (!article) {
        return h.response({ message: 'Article not found' }).code(404);
      }

      // Delete image from bucket
      const file = bucket.file(article.image);
      await file.delete();

      // Delete article from database
      await ArticleModel.deleteArticle(id);

      return h.response({ message: 'Article deleted successfully' }).code(200);
    } catch (error) {
      console.error('Error deleting article:', error);
      return h
        .response({ message: 'Error deleting article', error: error.message })
        .code(500);
    }
  },

  async updateArticle(request, h) {
    const { id } = request.params;
    const { title, content } = request.payload;

    try {
      const article = await ArticleModel.getArticleById(id);
      if (!article) {
        return h.response({ message: 'Article not found' }).code(404);
      }

      // Update fields in database
      await ArticleModel.updateArticle(id, title, content);

      return h.response({ message: 'Article updated successfully' }).code(200);
    } catch (error) {
      console.error('Error updating article:', error);
      return h
        .response({ message: 'Error updating article', error: error.message })
        .code(500);
    }
  },

  async getArticles(request, h) {
    try {
      const articles = await ArticleModel.getAllArticles();
      return h.response({ articles }).code(200);
    } catch (error) {
      console.error('Detailed error:', error); // Log error
      return h.response({ message: error.message }).code(500); // Handle error
    }
  },
};

module.exports = ArticleController;
