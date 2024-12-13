const ArticleController = require('../controllers/articleController');

const articleRoutes = [
  {
    method: 'POST',
    path: '/articles',
    config: { payload: { parse: true, output: 'stream' } },
    handler: ArticleController.createArticle,
  },
  {
    method: 'DELETE',
    path: '/articles/{id}',
    handler: ArticleController.deleteArticle,
  },
  {
    method: 'PUT',
    path: '/articles/{id}',
    handler: ArticleController.updateArticle,
  },
  { method: 'GET', path: '/articles', handler: ArticleController.getArticles },
];

module.exports = articleRoutes;
