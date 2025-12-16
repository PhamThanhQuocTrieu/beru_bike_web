// // config/multer.js (Tách config Multer để reuse ở server.js và routes/user.js)
// const multer = require('multer');
// const path = require('path');
// const fs = require('fs');

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     const uploadDir = path.join(__dirname, '../public/uploads/avatars');
//     if (!fs.existsSync(uploadDir)) {
//       fs.mkdirSync(uploadDir, { recursive: true });
//       console.log('Created directory: public/uploads/avatars');
//     }
//     cb(null, uploadDir);
//   },
//   filename: (req, file, cb) => {
//     // Unique filename: timestamp + random + ext
//     cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
//   }
// });

// const upload = multer({
//   storage,
//   limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max (sync với global error handler)
//   fileFilter: (req, file, cb) => {
//     if (file.mimetype.startsWith('image/')) {
//       cb(null, true);
//     } else {
//       cb(new Error('Chỉ chấp nhận file ảnh!'), false);
//     }
//   }
// });

// module.exports = { upload };