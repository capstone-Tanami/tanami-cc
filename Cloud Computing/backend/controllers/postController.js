const { Storage } = require("@google-cloud/storage");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const {
  createPost,
  getAllPosts,
  updatePostCaption,
  getPostPhoto,
  deletePost,
} = require("../models/postModel");

// Google Cloud Storage
const storage = new Storage({
  keyFilename: process.env.SERVICE_ACCOUNT,
});
const bucketName = "capstone-442703-bucket-1";
const bucket = storage.bucket(bucketName);

const postHandler = {
  //create new post
  createPost: async (request, h) => {
    const { image } = request.payload;
    let { caption } = request.payload;

    if (!caption || typeof caption !== "string") {
      return h
        .response({
          message: "Caption is required and must be a string or JSON",
        })
        .code(400);
    }

    try {
      // Parse caption if it's a JSON string
      try {
        caption = JSON.parse(caption); // Convert to object if JSON format
      } catch (e) {
        // If parsing fails, keep it as a string
        caption = caption.trim();
      }

      if (!image || !image.hapi) {
        return h.response({ message: "Image file is required" }).code(400);
      }

      //upload image to bucket
      const filename = `posts/${uuidv4()}_${path.basename(
        image.hapi.filename
      )}`;
      const file = bucket.file(filename);

      const stream = file.createWriteStream({
        metadata: { contentType: image.hapi.headers["content-type"] },
      });

      stream.on("error", (err) => {
        throw err;
      });

      //store new post in database
      stream.on("finish", async () => {
        const imageUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;
        await createPost(
          request.auth.userId,
          request.auth.username,
          imageUrl,
          caption
        );
      });

      stream.end(image._data);
      const uploadTime = new Date().toISOString(); // Format waktu ISO 8601
      return h
        .response({
          message: "Post created successfully",
          uploadTime,
        })
        .code(201);
    } catch (error) {
      console.error("Error creating post:", error);
      return h
        .response({ message: "Error creating post", error: error.message })
        .code(500);
    }
  },

  readPosts: async (request, h) => {
    try {
      const offset = parseInt(request.query.offset, 10) || 0;
      const limit = parseInt(request.query.limit, 10) || 10;

      const posts = await getAllPosts(offset, limit);

      return h
        .response({
          message: "Posts retrieved successfully",
          posts: posts.map((post) => ({
            postId: post.PostID,
            userId: post.UserID,
            username: post.Username,
            photo: post.Photo,
            caption: post.Caption,
            uploadDate: post.UploadDate,
            name: post.Name,
            profilePicture: post.ProfilePicture,
          })),
        })
        .code(200);
    } catch (error) {
      console.error("Error retrieving posts:", error);
      return h
        .response({
          message: "Error retrieving posts",
          error: error.message,
        })
        .code(500);
    }
  },

  updatePost: async (request, h) => {
    const { postId, caption } = request.payload;

    if (!postId || isNaN(postId)) {
      return h
        .response({ message: "Post ID is required and must be a number" })
        .code(400);
    }
    if (!caption || typeof caption !== "string") {
      return h
        .response({ message: "Caption is required and must be a string" })
        .code(400);
    }

    try {
      const affectedRows = await updatePostCaption(postId, caption);
      if (affectedRows === 0) {
        return h.response({ message: "Post not found" }).code(404);
      }

      return h.response({ message: "Post updated successfully" }).code(200);
    } catch (error) {
      console.error("Error updating post:", error);
      return h
        .response({ message: "Error updating post", error: error.message })
        .code(500);
    }
  },

  deletePost: async (request, h) => {
    const { postId } = request.params;

    if (!postId || isNaN(postId)) {
      return h
        .response({ message: "Post ID is required and must be a number" })
        .code(400);
    }

    try {
      const rows = await getPostPhoto(postId);
      if (rows.length === 0) {
        return h.response({ message: "Post not found" }).code(404);
      }

      const imageUrl = rows[0].Photo;
      const filename = imageUrl.split("/").pop();
      const file = bucket.file(`posts/${filename}`);

      const [exists] = await file.exists();
      if (exists) await file.delete();

      const affectedRows = await deletePost(postId);
      if (affectedRows === 0) {
        return h.response({ message: "Post not found" }).code(404);
      }

      return h.response({ message: "Post deleted successfully" }).code(200);
    } catch (error) {
      console.error("Error deleting post:", error);
      return h
        .response({ message: "Error deleting post", error: error.message })
        .code(500);
    }
  },

  getPostDetails: async (request, h) => {
    const { postId } = request.params;

    if (!postId || isNaN(postId)) {
      return h
        .response({ message: "Post ID is required and must be a number" })
        .code(400);
    }

    try {
      const post = await getPostById(postId);
      if (!post) {
        return h.response({ message: "Post not found" }).code(404);
      }

      return h
        .response({
          message: "Post retrieved successfully",
          post: {
            postId: post.PostID,
            userId: post.UserID,
            username: post.Username,
            photo: post.Photo,
            caption: post.Caption,
            uploadDate: post.UploadDate,
            name: post.Name,
            profilePicture: post.ProfilePicture,
          },
        })
        .code(200);
    } catch (error) {
      console.error("Error retrieving post:", error);
      return h
        .response({ message: "Error retrieving post", error: error.message })
        .code(500);
    }
  },
};

module.exports = { postHandler };
