const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    // Lưu Snapshot tên và ảnh tại thời điểm mua (tránh sản phẩm bị sửa/xóa sau này)
    name: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    price: {
        type: Number,
        required: true // Giá tại thời điểm đặt hàng
    }
}, { _id: false });

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false // Optional cho khách vãng lai
    },

    items: [orderItemSchema],

    totalItems: {
        type: Number,
        default: 0
    },

    totalPrice: { 
        type: Number,
        required: true,
        default: 0
    },

    shippingAddress: {
        fullName: { type: String, required: true },
        phone: { type: String, required: true },
        address: { type: String, required: true },
        province: { type: String, required: false, default: '' },
        district: { type: String, required: false, default: '' },
        ward: { type: String, required: false, default: '' }
    },

    paymentMethod: {
        type: String,
        // [QUAN TRỌNG] Danh sách các phương thức thanh toán cho phép
        enum: ['cod', 'banking', 'bidv', 'momo', 'vnpay'], 
        required: true,
        default: 'cod'
    },

    shippingMethod: {
        type: String,
        enum: ['store', 'delivery'],
        default: 'delivery' 
    },

    shippingFee: {
        type: Number,
        default: 0
    },

    discountAmount: {
        type: Number,
        default: 0
    },

    note: {
        type: String,
        default: ''
    },

    status: {
        type: String,
        // [CẬP NHẬT] Đã thêm 'shipping' và 'completed' để khớp với Controller
        enum: [
            'pending',          // Chờ xử lý
            'confirmed',        // Đã xác nhận
            'preparing',        // Đang chuẩn bị
            'shipped',          // (Cũ - giữ lại để tương thích)
            'shipping',         // Đang giao hàng (MỚI)
            'delivered',        // Đã giao hàng
            'completed',        // Hoàn thành (MỚI)
            'cancelled',        // Đã hủy
            'returned',         // Trả hàng
            'request_cancel'    // Yêu cầu hủy
        ],
        default: 'pending'
    },

    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending'
    }
}, {
    timestamps: true
});

// Pre-save hook: Tự động tính tổng số lượng item
orderSchema.pre('save', function (next) {
    if (this.isModified('items') || this.isNew) {
        this.totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
    }
    next();
});

module.exports = mongoose.model('Order', orderSchema);