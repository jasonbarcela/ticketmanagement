// controllers/authController.js — Staff authentication
const pool = require('../config/db');
const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');
const { verifyPassword, hashPassword } = require('../utils/password');

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

async function register(req, res, next) {
  try {
    const { username, email, password, role } = req.body;

    // Validation
    if (!username || !email || !password || !role) {
      throw new AppError('Username, email, password, and role are required.', 400);
    }

    if (role !== 'admin' && role !== 'technician') {
      throw new AppError('Invalid role. Must be admin or technician.', 400);
    }

    if (password.length < 6) {
      throw new AppError('Password must be at least 6 characters.', 400);
    }

    // Check if username already exists
    const [existingUsers] = await pool.execute(
      'SELECT user_id FROM staff_users WHERE username = ?',
      [username.trim()]
    );

    if (existingUsers.length > 0) {
      throw new AppError('Username already exists.', 400);
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user (use email as full_name for now)
    const [result] = await pool.execute(
      'INSERT INTO staff_users (username, password, full_name, role, is_active) VALUES (?, ?, ?, ?, 1)',
      [username.trim(), hashedPassword, email, role]
    );

    res.status(201).json({
      success: true,
      message: 'User created successfully.',
      user: {
        user_id: result.insertId,
        username: username.trim(),
        role,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getUsers(req, res, next) {
  try {
    const [users] = await pool.execute(
      'SELECT user_id, username, email, role, is_active as status FROM staff_users ORDER BY username ASC'
    );

    res.json({
      success: true,
      data: users.map(u => ({
        user_id: u.user_id,
        username: u.username,
        email: u.email,
        role: u.role,
        status: u.status ? 'active' : 'disabled',
      })),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, getMe, register, getUsers };
