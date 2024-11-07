const User = require('../models/User');

// Create a new user
exports.createUser = async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).json(user);
  } catch (err) {
    if (err.name === 'ValidationError') {
      const validationErrors = Object.keys(err.errors).reduce((acc, key) => {
        acc[key] = err.errors[key].message;
        return acc;
      }, {});
      res.status(400).json({ error: 'Validation failed', details: validationErrors });
    } else {
      res.status(500).json({ error: 'Server error', message: err.message });
    }
  }
};

// Update a user
exports.updateUser = async (req, res) => {
  try {
    const { github_username } = req.params;
    const updateData = req.body;

    const updatedUser = await User.findOneAndUpdate(
      { github_username: github_username },
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: 'Error updating user', error: error.message });
  }
};

// Add this new function to the existing exports
exports.getUserXP = async (req, res) => {
  try {
    const { github_username } = req.params;
    
    const user = await User.findOne({ github_username });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ 
      github_username: user.github_username,
      total_xp: user.total_xp 
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching user XP', 
      error: error.message 
    });
  }
};
