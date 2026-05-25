const express = require('express');
const router = express.Router();
const controller = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

router.post('/login', controller.login);
router.get('/me', requireAuth, controller.getMe);

module.exports = router;