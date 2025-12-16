const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true, // Tự động chuyển lowercase để tránh duplicate case-sensitive
    trim: true // Loại bỏ khoảng trắng
  },
  phone: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true // Loại bỏ khoảng trắng
  },  
  password: { 
    type: String, 
    required: true, 
    minlength: 6,
    select: false // Ẩn password mặc định khi query (phải dùng .select('+password'))
  },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  dob: { type: Date }, // Ngày sinh (ISO format: YYYY-MM-DD)
  gender: { type: String, enum: ['male', 'female', 'other'] }, // Giới tính
  avatar: { type: String, default: '/image/icon/user.png' }, // Ảnh đại diện
  // ---------------------

  createdAt: { type: Date, default: Date.now }
});

// Indexes cho unique fields (tăng tốc query và enforce unique)
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });

// Hash password trước khi save
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Method check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);