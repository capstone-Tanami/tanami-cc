const { getDB } = require('../config/db');

const ArticleModel = {
  async createArticle(title, content, image) {
    const sql = 'INSERT INTO ARTICLE (title, content, image) VALUES (?, ?, ?)';
    const [result] = await getDB().query(sql, [title, content, image]);
    return result;
  },

  async deleteArticle(id) {
    const sql = 'DELETE FROM ARTICLE WHERE id = ?';
    const [result] = await getDB().query(sql, [id]);
    return result;
  },

  async updateArticle(id, title, content) {
    const sql = 'UPDATE ARTICLE SET title = ?, content = ? WHERE id = ?';
    const [result] = await getDB().query(sql, [title, content, id]);
    return result;
  },

  async getArticleById(id) {
    const sql = 'SELECT * FROM ARTICLE WHERE id = ?';
    const [result] = await getDB().query(sql, [id]);
    return result[0];
  },

  async getAllArticles() {
    const sql = 'SELECT * FROM ARTICLE';
    const [results] = await getDB().query(sql);
    return results;
  },
};


module.exports = ArticleModel;
