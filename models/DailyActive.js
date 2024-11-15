const mongoose = require('mongoose');
const { Schema } = mongoose;

const DailyActiveSchema = new Schema({
    github_username: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('DailyActive', DailyActiveSchema);