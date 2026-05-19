// ============================================================
// controllers/authController.js — Dual-Flow Authentication Engine
// ============================================================
const pool = require('../config/db');
const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');

const JWT_SECRET = process.env.JWT_SECRET || 'code_and_locks_secret_passphrase_key';

/**
 * Handles security checks for the 2 approved roles (Admin / Technician)
 * POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const { username, password } = req.body;

    // 1. Validation check for missing structural properties
    if (!username || !password) {
      throw new AppError('Please provide both a username and password.', 400);
    }

    // 2. Query data matrix to extract target profile credentials
    // FIXED: Removed 'is_active' from selection criteria
    const [userRows] = await pool.execute(
      'SELECT user_id, username, password, role FROM staff_users WHERE username = ?',
      [username.trim()]
    );

    if (!userRows.length) {
      throw new AppError('Invalid username or password credentials.', 401);
    }

    const user = userRows[0];

    // 3. Clear-text matching verification sequence (as dictated for simple seed checking)
    if (password !== user.password) {
      throw new AppError('Invalid username or password credentials.', 401);
    }

    // 4. CRITICAL GUARD: Hard-restrict user session pipeline to the two specified project roles
    if (user.role !== 'admin' && user.role !== 'technician') {
      throw new AppError('Access Denied: Unauthorized internal shop role classification.', 403);
    }

    // 5. Package session security sign contexts
    const token = jwt.sign(
      { 
        userId: user.user_id, 
        username: user.username, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    // 6. Return response values mapped to match active frontend state listeners
    res.json({
      message: 'Authentication successful. Access granted.',
      token,
      user: {
        id: user.user_id,
        username: user.username,
        role: user.role,
        fullName: user.username.charAt(0).toUpperCase() + user.username.slice(1)
      }
    });

  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me
 * Verifies active token persistence across full page reboots
 */
async function getMe(req, res, next) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('Unauthorized token trace sequence context.', 401);
    }

    const [userRows] = await pool.execute(
      'SELECT user_id, username, role FROM staff_users WHERE user_id = ?',
      [userId]
    );

    if (!userRows.length) {
      throw new AppError('User session reference missing from system database.', 404);
    }

    res.json(userRows[0]);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  getMe
};