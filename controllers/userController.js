const User = require('../models/User');
const Project = require('../models/Project');

// // Create a new user
// exports.createUser = async (req, res) => {
//   try {
//     const user = new User(req.body);
//     await user.save();
//     res.status(201).json(user);
//   } catch (err) {
//     if (err.name === 'ValidationError') {
//       const validationErrors = Object.keys(err.errors).reduce((acc, key) => {
//         acc[key] = err.errors[key].message;
//         return acc;
//       }, {});
//       res.status(400).json({ error: 'Validation failed', details: validationErrors });
//     } else {
//       res.status(500).json({ error: 'Server error', message: err.message });
//     }
//   }
// };

// Update a user
exports.updateUser = async (req, res) => {
  try {
    const { github_username } = req.params;
    
    // Check if user is authenticated and username matches
    if (!req.isAuthenticated() || req.user.github_username !== github_username) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

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
    
    // Check if user is authenticated and username matches
    if (!req.isAuthenticated() || req.user.github_username !== github_username) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }
    
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

// Initialize user projects
exports.initializeUserProjects = async (req, res) => {
  try {
    const { github_username } = req.params;
    
    // Check if user is authenticated and username matches
    if (!req.isAuthenticated() || req.user.github_username !== github_username) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }
    
    const user = await User.findOne({ github_username });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Fetch all projects from master collection
    const masterProjects = await Project.find();

    // Create projects array formatted for user's structure
    const userProjects = masterProjects.map(project => ({
      project_id: project.id,
      tickets: project.tickets.map(ticket => ({
        ticket_id: ticket.id,
        ticket_status: 'To Do',
      })),
    }));

    // Update user with initialized projects
    user.projects = userProjects;
    await user.save();

    res.status(200).json({ 
      message: 'User projects initialized successfully',
      projects: user.projects 
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error initializing user projects', 
      error: error.message 
    });
  }
};

// Add this to your existing exports
exports.updateTicketStatus = async (req, res) => {
  try {
    const { github_username } = req.params;
    
    // Check if user is authenticated and username matches
    if (!req.isAuthenticated() || req.user.github_username !== github_username) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const { project_id, ticket_id, new_status, xpReward } = req.body;

    // Validate status
    const validStatuses = ['To Do', 'In Progress', 'Done'];
    if (!validStatuses.includes(new_status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const user = await User.findOne({ github_username });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find the project and ticket
    const project = user.projects.find(p => p.project_id === project_id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const ticket = project.tickets.find(t => t.ticket_id === ticket_id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Update XP if moving to/from Done status
    if (new_status === 'Done' && ticket.ticket_status !== 'Done') {
      user.total_xp = (user.total_xp || 0) + (xpReward || 0);
    } else if (ticket.ticket_status === 'Done' && new_status !== 'Done') {
      user.total_xp = Math.max(0, (user.total_xp || 0) - (xpReward || 0));
    }

    // Update the ticket status
    ticket.ticket_status = new_status;
    await user.save();

    res.status(200).json({ 
      message: 'Ticket status updated successfully',
      ticket: ticket,
      total_xp: user.total_xp
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error updating ticket status', 
      error: error.message 
    });
  }
};

// Get user projects
exports.getUserProjects = async (req, res) => {
  try {
    const { github_username } = req.params;
    
    // Check if user is authenticated and username matches
    if (!req.isAuthenticated() || req.user.github_username !== github_username) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }
    
    const user = await User.findOne({ github_username })
      .select('projects');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ 
      projects: user.projects || [] 
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching user projects', 
      error: error.message 
    });
  }
};
