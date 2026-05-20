// controllers/authController.js — Staff authentication
const pool = require('../config/db');
const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');
const { verifyPassword } = require('../utils/password');

const JWT_SECRET = process.env.JWT_SECRET || 'code_and_locks_secret_passphrase_key';

async function login(req, res, next) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      throw new AppError('Please provide both a username and password.', 400);
    }

    const [userRows] = await pool.execute(
      'SELECT user_id, username, password, role, full_name FROM staff_users WHERE username = ? AND is_active = 1',
      [username.trim()]
    );

    if (!userRows.length) {
      throw new AppError('Invalid username or password.', 401);
    }

    const user = userRows[0];
    const valid = await verifyPassword(password, user.password);

    if (!valid) {
      throw new AppError('Invalid username or password.', 401);
    }

    if (user.role !== 'admin' && user.role !== 'technician') {
      throw new AppError('Access denied for this account.', 403);
    }

    const token = jwt.sign(
      { userId: user.user_id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.user_id,
        username: user.username,
        role: user.role,
        fullName: user.full_name || user.username,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Unauthorized.', 401);

    const [userRows] = await pool.execute(
      'SELECT user_id, username, role, full_name FROM staff_users WHERE user_id = ? AND is_active = 1',
      [userId]
    );

    if (!userRows.length) throw new AppError('User not found.', 404);

    res.json(userRows[0]);
  } catch (err) {
    next(err);
  }
}

module.exports = { login, getMe };
