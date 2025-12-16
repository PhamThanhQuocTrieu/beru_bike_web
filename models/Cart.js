const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product', // Tham chiếu đến model Product
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  price: {
    type: Number,
    required: true // Giá sản phẩm tại thời điểm thêm vào giỏ
  }
}, { _id: false }); // Không tạo _id cho sub-document

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', 
    required: false, // [SỬA] Để false để hỗ trợ khách vãng lai (chưa login)
  },
  sessionId: {       // [GIỮ LẠI] Để định danh khách vãng lai
    type: String,
    required: false
  },
  items: [cartItemSchema], 
  totalItems: {
    type: Number,
    default: 0 // Tổng số lượng sản phẩm (tính động)
  },
  totalPrice: {
    type: Number,
    default: 0 // Tổng giá (tính động)
  }
}, {
  timestamps: true // Tự động thêm createdAt và updatedAt
});

// Middleware tính toán tổng trước khi save
cartSchema.pre('save', function(next) {
  if (this.items) {
      this.totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
      this.totalPrice = this.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  }
  next();
});

module.exports = mongoose.model('Cart', cartSchema);