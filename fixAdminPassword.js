// // fixAdminPassword.js (Reset password admin thành "Admin@2808" - hook sẽ tự hash)
// const mongoose = require('mongoose');
// const User = require('./models/User'); // Path đúng đến model

// const MONGO_URI = 'mongodb://localhost:27017/web_berubike'; // Thay nếu DB khác (từ config/db.js)

// async function fixAdminPassword() {
//   try {
//     await mongoose.connect(MONGO_URI);
//     console.log(' Kết nối DB thành công!');

//     const admin = await User.findOne({ email: 'adminberu@gmail.com' });
//     if (!admin) {
//       console.log(' Không tìm thấy admin!');
//       return;
//     }

//     // Set plain text password → pre('save') hook sẽ tự hash (vì modified)
//     admin.password = 'Admin@2808'; // Plain text để hook hash
//     await admin.save(); // Trigger hook

//     // Verify hash mới (optional: log hash để check)
//     console.log(' Đã update password admin!');
//     console.log(' Email: adminberu@gmail.com');
//     console.log(' Password (plain để test): Admin@2808');
//     console.log(' New hash:', admin.password); // In hash mới để confirm
//     console.log(' Role vẫn là admin, DOB/Gender OK.');
//   } catch (error) {
//     console.error(' Lỗi update:', error.message);
//     // Nếu lỗi schema (ví dụ phone unique conflict), thêm: await User.updateOne({ email: 'adminberu@gmail.com' }, { password: 'Admin@2808' });
//   } finally {
//     await mongoose.connection.close();
//     console.log('🔌 Đóng kết nối.');
//   }
// }

// fixAdminPassword();