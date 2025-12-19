const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true, // Tự động chuyển lowercase
    trim: true // Loại bỏ khoảng trắng
  },
  phone: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true 
  },  
  password: { 
    type: String, 
    required: true, 
    minlength: 6,
    select: false // Ẩn password mặc định khi query
  },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  dob: { type: Date }, // Ngày sinh
  gender: { type: String, enum: ['male', 'female', 'other'] }, // Giới tính
  avatar: { type: String, default: '/image/icon/user.png' }, // Ảnh đại diện
  
  // [MỚI] Trường trạng thái khóa tài khoản
  isLocked: { 
    type: Boolean, 
    default: false // Mặc định là FALSE (Tài khoản hoạt động bình thường)
  },

  createdAt: { type: Date, default: Date.now }
});

// Indexes cho unique fields (tăng tốc query)
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