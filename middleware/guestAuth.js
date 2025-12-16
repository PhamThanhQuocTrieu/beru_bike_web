// middleware/guestAuth.js
const User = require('../models/User'); // Nếu cần check user

// Middleware cho guest + logged in (không chặn guest)
exports.guestProtect = (req, res, next) => {
  // Nếu chưa login, tiếp tục (guest OK)
  if (!req.user) {
    return next();
  }
  // Nếu login, tiếp tục
  next();
};

// Hoặc dùng protect nhưng skip cho guest routes (nếu muốn giữ strict)
exports.allowGuest = (req, res, next) => {
  if (req.isAuthenticated && !req.isAuthenticated()) {
    // Guest: Lưu session cart
    req.session.isGuest = true;
  }
  next();
};