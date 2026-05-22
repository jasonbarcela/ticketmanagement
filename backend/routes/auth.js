// ============================================================
// routes/auth.js — Authentication Router (Updated v2)
//
// Mounts authentication endpoints under the /api/auth namespace.
// Maps requests to the real database-driven authController.
// ============================================================

const express = require('express');
const router = express.Router();
const controller = require('../controllers/authController');
const { requireAuth, requireRole } = require('../middleware/auth');

/**
 * Route: POST /api/auth/login
 * Desc:  Validates crew credentials against staff_users table
 * Access: Public
 */
router.post('/login', controller.login);

/**
 * Route: POST /api/auth/register
 * Desc:  Creates a new staff user (admin only)
 * Access: Requires admin role
 */
router.post('/register', requireAuth, requireRole(['admin']), controller.register);

/**
 * Route: GET /api/auth/users
 * Desc:  Lists all staff users (admin only)
 * Access: Requires admin role
 */
router.get('/users', requireAuth, requireRole(['admin']), controller.getUsers);

module.exports = router;