const Project = require('../models/Project');

// Create a new project
exports.createProject = async (req, res) => {
  console.log('Received request body:', JSON.stringify(req.body, null, 2));
  try {
    const project = new Project(req.body);
    await project.save();
    res.status(201).json(project);
  } catch (err) {
    console.error('Full error:', err);
    if (err.name === 'ValidationError') {
      const validationErrors = Object.keys(err.errors).reduce((acc, key) => {
        acc[key] = err.errors[key].message;
        return acc;
      }, {});
      console.log('Validation errors:', validationErrors);
      res.status(400).json({ error: 'Validation failed', details: validationErrors });
    } else {
      res.status(500).json({ error: 'Server error', message: err.message });
    }
  }
};

// Get all projects
exports.getProjects = async (req, res) => {
  try {
    const projects = await Project.find();
    res.status(200).json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete a project
exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.status(200).json({ message: 'Project deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
