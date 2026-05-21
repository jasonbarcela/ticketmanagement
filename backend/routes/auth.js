// ============================================================
// routes/auth.js — Authentication Router (Updated v2)
//
// Mounts authentication endpoints under the /api/auth namespace.
// Maps requests to the real database-driven authController.
// ============================================================

const express = require('express');
const router = express.Router();
const controller = require('../controllers/authController');

/**
 * Route: POST /api/auth/login
 * Desc:  Validates crew credentials against staff_users table
 * Access: Public
 */
router.post('/login', controller.login);

module.exports = router;