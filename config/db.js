// config/db.js (Cập nhật: Thêm options cho connect ổn định, event listeners cho log chi tiết, hỗ trợ env var cho URI linh hoạt)
const mongoose = require("mongoose");

async function connectDB() {
  try {
    const dbURI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/web_berubike";  // Hỗ trợ env var cho deploy
    await mongoose.connect(dbURI, {
      // Options cơ bản (tùy chọn, nhưng giúp ổn định kết nối)
      serverSelectionTimeoutMS: 5000,  // Timeout 5s nếu không connect được
      socketTimeoutMS: 45000,  // Socket timeout
      family: 4  // IPv4 only (tùy chọn)
    });

    // Event listeners cho kết nối (log chi tiết)
    mongoose.connection.on('connected', () => {
      console.log(" MongoDB connected successfully to", mongoose.connection.name);
    });
    mongoose.connection.on('error', (err) => {
      console.error(" MongoDB connection error:", err.message);
    });
    mongoose.connection.on('disconnected', () => {
      console.log(" MongoDB disconnected");
    });

    // Graceful shutdown (tùy chọn: Xử lý Ctrl+C)
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log("DB connection closed.");
      process.exit(0);
    });
  } catch (err) {
    console.error(" MongoDB connection failed:", err.message);
    process.exit(1);  // Dừng server nếu connect fail
  }
}

module.exports = connectDB;