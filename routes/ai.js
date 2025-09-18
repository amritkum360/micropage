const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { generateContent, generateHero, generateEmbeddingEndpoint } = require('../controllers/aiController');

// Generate website content
router.post('/generate-content', authenticateToken, generateContent);

// Generate hero section content
router.post('/generate-hero', authenticateToken, generateHero);

// Generate embeddings for text analysis
router.post('/generate-embedding', authenticateToken, generateEmbeddingEndpoint);


module.exports = router;
