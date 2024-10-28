const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Create a new user
router.post('/users', userController.createUser);

// Update a user (including their tickets)
router.put('/users/:github_username', userController.updateUser);

// Get a user XP by github username
router.get('/users/:github_username/xp', userController.getUserXP);

module.exports = router;
