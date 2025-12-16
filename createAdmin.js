// // createAdmin.js
// const mongoose = require('mongoose');
// const bcrypt = require('bcryptjs');

// // Import model User (điều chỉnh path nếu cần)
// const User = require('./models/User'); // Ví dụ: './models/User' hoặc './models/user'

// const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/web_berubike'; // Thay connection string của bạn

// async function createAdmin() {
//   try {
//     // Kết nối DB
//     await mongoose.connect(MONGO_URI);
//     console.log(' Kết nối DB thành công!');

//     // Kiểm tra admin đã tồn tại chưa
//     const existingAdmin = await User.findOne({ email: 'adminberu@gmail.com' });
//     if (existingAdmin) {
//       console.log(' Admin đã tồn tại, bỏ qua!');
//       // Optional: Cập nhật nếu muốn (nhưng không khuyến khích vì password hash)
//       // await User.findOneAndUpdate({ email: 'adminberu@gmail.com' }, { gender: 'male', dob: new Date('2004-08-28') });
//       return;
//     }

//     // Hash password
//     const hashedPassword = await bcrypt.hash('Admin@2808', 12);

//     // Tạo user admin với thông tin mới
//     const newAdmin = new User({
//       email: 'adminberu@gmail.com',
//       password: hashedPassword,
//       firstName: 'Admin',
//       lastName: 'Beru',
//       role: 'admin',
//       phone: '0389603429', // Optional, có thể xóa nếu không cần
//       gender: 'male', // Giới tính: Nam
//       dob: new Date('2004-08-28'), // Ngày sinh: 28/08/2004 (Date object cho MongoDB)
//       // Thêm field khác nếu schema yêu cầu (ví dụ: avatar, status)
//     });

//     // Lưu vào DB
//     await newAdmin.save();
//     console.log(' Tạo admin thành công!');
//     console.log(' Email: adminberu@gmail.com');
//     console.log(' Password: Admin@2808');
//     console.log(' Giới tính: Nam | Ngày sinh: 28/08/2004');
//   } catch (error) {
//     console.error(' Lỗi tạo admin:', error.message);
//     // Nếu lỗi schema (ví dụ thiếu field), kiểm tra model User
//   } finally {
//     // Đóng kết nối
//     await mongoose.connection.close();
//     console.log(' Đóng kết nối DB.');
//   }
// }

// // Chạy function
// createAdmin();