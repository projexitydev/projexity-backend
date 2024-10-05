const mongoose = require('mongoose');
const { Schema } = mongoose

const TicketSchema = new Schema({
    id: {
        type: Number,
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    descripton: {
        type: String,
    },
    status: {
        type: String,
        enum: ['To Do', 'In Progress', 'Done'],
        default: 'To Do',
        required: true,
    },
    completion: {
        type: Number,
        default: 0,
    },
    xpReward: {
        type: Number,
        default: 0,
    },
});

const ProjectSchema = new Schema({
    id: {
        type: Number,
        unique: true,
        required: true,
    },
    repoId: {
        type: Number,
        default: null
    },
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    difficulty: {
        type: String,
    },
    skills: [{
        type: String,
    }],
    completion: {
        type: Number,
        default: 0,
    },
    estimatedTime: {
        type: String,
        required: true,
    },
    xpReward: {
        type: Number,
    },
    tickets: [TicketSchema]
});

const Project = mongoose.model('Project', ProjectSchema);

module.exports = Project;
