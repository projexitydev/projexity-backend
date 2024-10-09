const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const connectDatabase = async () => {
  try {
    const conn = await mongoose.connect('mongodb+srv://peal-admin:OW01XCOq6sOHRXg4@projexity-cluster.hfgtx.mongodb.net/?retryWrites=true&w=majority&appName=projexity-cluster');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDatabase;

