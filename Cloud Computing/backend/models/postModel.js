const { getDB } = require("../config/db");

const createPost = async (userId, username, imageUrl, caption) => {
  const query = `INSERT INTO POST (UserID, Username, Photo, Caption, UploadDate) VALUES (?, ?, ?, ?, NOW())`;
  const pool = getDB();
  const connection = await pool.getConnection();

  try {
    // Convert caption to JSON string if it's an object
    const captionString =
      typeof caption === "object" ? JSON.stringify(caption) : caption;

    await connection.query(query, [userId, username, imageUrl, captionString]);
  } finally {
    connection.release();
  }
};

const getAllPosts = async (offset = 0, limit = 10) => {
  const query = `
    SELECT 
      POST.PostID, POST.UserID, POST.Username, POST.Photo, POST.Caption, POST.UploadDate,
      ACCOUNT.Name, ACCOUNT.ProfilePicture
    FROM 
      POST
    JOIN 
      ACCOUNT ON POST.UserID = ACCOUNT.UserID
    ORDER BY 
      POST.UploadDate DESC
    LIMIT ? OFFSET ?`;
  const pool = getDB();
  const connection = await pool.getConnection();

  try {
    const [rows] = await connection.query(query, [limit, offset]);
    return rows;
  } catch (error) {
    throw error;
  } finally {
    connection.release();
  }
};

const updatePostCaption = async (postId, caption) => {
  const query = "UPDATE POST SET Caption = ? WHERE PostID = ?";
  const pool = getDB();
  const connection = await pool.getConnection();
  const [result] = await connection.query(query, [caption, postId]);
  connection.release();
  return result.affectedRows;
};

const getPostPhoto = async (postId) => {
  const query = "SELECT Photo FROM POST WHERE PostID = ?";
  const pool = getDB();
  const connection = await pool.getConnection();
  const [rows] = await connection.query(query, [postId]);
  connection.release();
  return rows;
};

const deletePost = async (postId) => {
  const query = "DELETE FROM POST WHERE PostID = ?";
  const pool = getDB();
  const connection = await pool.getConnection();
  const [result] = await connection.query(query, [postId]);
  connection.release();
  return result.affectedRows;
};

const getPostById = async (postId) => {
  const query = `
    SELECT 
      POST.PostID, POST.UserID, POST.Username, POST.Photo, POST.Caption, POST.UploadDate,
      ACCOUNT.Name, ACCOUNT.ProfilePicture
    FROM 
      POST
    JOIN 
      ACCOUNT ON POST.UserID = ACCOUNT.UserID
    WHERE 
      POST.PostID = ?`;
  const pool = getDB();
  const connection = await pool.getConnection();

  try {
    const [rows] = await connection.query(query, [postId]);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  createPost,
  getAllPosts,
  updatePostCaption,
  getPostPhoto,
  deletePost,
  getPostById, // Tambahkan export ini
};
