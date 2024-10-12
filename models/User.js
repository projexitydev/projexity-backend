const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserSchema = new Schema({
    github_username: {
        type: String,
        required: true,
        unique: true,
    },
    total_xp: {
        type: Number,
        default: 0,
    },
    projects: [{
        project_id: {
            type: Number,
            required: true,
        },
        tickets: [{
            ticket_id: {
                type: Number,
                required: true,
            },
            ticket_status: {
                type: String,
                enum: ['To Do', 'In Progress', 'Done'],
                default: 'To Do',
                required: true,
            },
        }],
    }],
});

module.exports = mongoose.model('User', UserSchema);
