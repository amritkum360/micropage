const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { generateContent, generateHero } = require('../controllers/aiController');

// Generate website content
router.post('/generate-content', authenticateToken, generateContent);

// Generate hero section content
router.post('/generate-hero', authenticateToken, generateHero);

module.exports = router;
