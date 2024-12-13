const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {
  createUser,
  getUserByEmail,
  getUserByEmailOrUsername,
  saveTokenToDB,
  deleteTokenByUserId,
  isTokenInDB,
  updateUser,
  getTokenFromDB,
} = require('../models/userModel');
const { Storage } = require('@google-cloud/storage');

// Google Cloud Storage
const storage = new Storage({
  keyFilename: process.env.SERVICE_ACCOUNT,
});
const bucketName = 'capstone-442703-bucket-1';
const bucket = storage.bucket(bucketName);

const register = async (request, h) => {
  try {
    const { email, password, username, name } = request.payload;

    if (!email || !password || !username || !name) {
      return h
        .response({ status: 'fail', message: 'All fields are required' })
        .code(400);
    }

    const existingUser = await getUserByEmailOrUsername(email, username);
    if (existingUser) {
      return h
        .response({
          status: 'fail',
          message: 'Email or Username already exists',
        })
        .code(400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = await createUser({
      username,
      email,
      password: hashedPassword,
      name,
    });

    return h
      .response({
        status: 'success',
        message: 'User registered successfully',
        data: { userId, username, email, name },
      })
      .code(201);
  } catch (error) {
    console.error('Error during registration:', error);
    return h
      .response({
        status: 'error',
        message: 'Internal Server Error',
        error: error.message,
      })
      .code(500);
  }
};

const login = async (request, h) => {
  try {
    const { identifier, password } = request.payload;
    if (!identifier || !password) {
      return h
        .response({
          status: 'fail',
          message: 'Identifier and password are required',
        })
        .code(400);
    }

    // Cari user berdasarkan email atau username
    const user =
      (await getUserByEmail(identifier)) ||
      (await getUserByEmailOrUsername(identifier, identifier));
    if (!user) {
      return h
        .response({
          status: 'fail',
          message: 'Invalid email/username or password',
        })
        .code(401);
    }

    // Verifikasi password
    const isMatch = await bcrypt.compare(password, user.Password);
    if (!isMatch) {
      return h
        .response({
          status: 'fail',
          message: 'Invalid email/username or password',
        })
        .code(401);
    }

    // Ambil token dari database
    let token = await getTokenFromDB(user.UserID);
    if (!token) {
      // Jika token tidak ada, buat token baru
      token = jwt.sign(
        { id: user.UserID, username: user.Username },
        process.env.JWT_SECRET
      );
      // Simpan token baru ke database
      await saveTokenToDB(user.UserID, token);
    }

    // Kembalikan token yang ditemukan atau baru dibuat
    return h
      .response({
        status: 'success',
        message: 'Login successful',
        data: {
          userId: user.UserID,
          username: user.Username,
          email: user.Email,
          name: user.Name,
          token,
        },
      })
      .code(200);
  } catch (error) {
    console.error('Error during login:', error);
    return h
      .response({
        status: 'error',
        message: 'Internal Server Error',
        error: error.message,
      })
      .code(500);
  }
};

const logout = async (request, h) => {
  try {
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return h
        .response({
          status: 'fail',
          message: 'Authentication token is missing',
        })
        .code(400);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    const result = await deleteTokenByUserId(userId, token);
    if (result.affectedRows > 0) {
      return h
        .response({ status: 'success', message: 'Logout successful' })
        .code(200);
    } else {
      return h
        .response({
          status: 'fail',
          message: 'Token not found or already expired',
        })
        .code(400);
    }
  } catch (error) {
    console.error('Error during logout:', error);
    return h
      .response({
        status: 'error',
        message: 'Internal Server Error',
        error: error.message,
      })
      .code(500);
  }
};

const me = async (request, h) => {
  try {
    const token =
      request.headers.authorization?.replace('Bearer ', '') ||
      request.state.token;

    if (!token) {
      return h
        .response({
          status: 'fail',
          message: 'Authentication token is missing',
        })
        .code(400);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const isValid = await isTokenInDB(decoded.id, token);
    if (!isValid) {
      return h
        .response({
          status: 'fail',
          message: 'Token is invalid or expired',
        })
        .code(401);
    }

    const user = await getUserByEmailOrUsername(decoded.username);
    if (!user) {
      return h
        .response({
          status: 'fail',
          message: 'User not found',
        })
        .code(404);
    }

    return h
      .response({
        status: 'success',
        message: 'User info fetched successfully',
        data: {
          userId: user.UserID,
          username: user.Username,
          email: user.Email,
          name: user.Name,
          profilePicture: user.ProfilePicture,
        },
      })
      .code(200);
  } catch (error) {
    console.error('Error fetching user info:', error);
    return h
      .response({
        status: 'error',
        message: 'Internal Server Error during user info fetch',
        error: error.message,
      })
      .code(500);
  }
};

const updateProfile = async (request, h) => {
  try {
    const { name, profilePicture } = request.payload; // Mengambil payload
    const { userId } = request.auth; // Mengambil ID pengguna dari auth

    let updatedFields = {}; // Objek untuk menyimpan field yang akan diupdate

    // Jika ada `profilePicture`, lakukan upload
    if (profilePicture) {
      const file = bucket.file(
        `profiles/${userId}-${Date.now()}-${profilePicture.hapi.filename}`
      );
      const stream = file.createWriteStream({
        resumable: false,
        contentType: profilePicture.hapi.headers['content-type'],
      });
      profilePicture.pipe(stream);

      await new Promise((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
      });

      const uploadedFileURL = `https://storage.googleapis.com/${bucketName}/${file.name}`;
      updatedFields.profilePicture = uploadedFileURL; // Tambahkan ke objek update
    }

    // Jika ada `name`, tambahkan ke objek update
    if (name) {
      updatedFields.name = name;
    }

    // Lakukan update hanya jika ada field yang diupdate
    if (Object.keys(updatedFields).length > 0) {
      await updateUser(userId, updatedFields); // Fungsi update database
    } else {
      return h
        .response({
          status: 'fail',
          message: 'No valid fields to update',
        })
        .code(400);
    }

    return h
      .response({
        status: 'success',
        message: 'Profile updated successfully',
        data: { userId, ...updatedFields }, // Mengembalikan data yang diupdate
      })
      .code(200);
  } catch (error) {
    console.error('Error updating profile:', error);
    return h
      .response({
        status: 'error',
        message: 'Internal Server Error',
        error: error.message,
      })
      .code(500);
  }
};


module.exports = { register, login, logout, me, updateProfile };
