const Order = require('../models/Order');

// [GET] /checkout/orders/list - Xem danh sách đơn hàng
exports.getUserOrders = async (req, res) => {
    try {
        if (!req.user || !req.user._id) {
            req.flash('error', 'Vui lòng đăng nhập để xem đơn hàng.');
            return res.redirect('/auth/login');
        }

        // Lấy danh sách đơn hàng, populate productId để lấy thông tin chi tiết nếu cần
        const orders = await Order.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .populate('items.productId'); 

        res.render('order-list', { 
            title: 'Đơn hàng của tôi',
            orders: orders,
            user: req.user,
            messages: {
                success: req.flash('success'),
                error: req.flash('error')
            }
        });

    } catch (error) {
        console.error('Get Orders Error:', error);
        res.status(500).render('error', { 
            message: 'Lỗi tải danh sách đơn hàng: ' + error.message,
            user: req.user 
        });
    }
};

// [POST] /checkout/orders/cancel/:id - Gửi yêu cầu hủy đơn
exports.cancelOrder = async (req, res) => {
    try {
        const orderId = req.params.id;
        
        // 1. Tìm đơn hàng của user
        const order = await Order.findOne({ 
            _id: orderId, 
            userId: req.user._id 
        });

        // Nếu không tìm thấy
        if (!order) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng!' });
        }

        // 2. Chỉ cho phép hủy khi đang "Chờ xử lý" (pending)
        if (order.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Đơn hàng đang được xử lý hoặc giao, không thể hủy ngay!' });
        }

        // 3. LOGIC MỚI: Chuyển sang trạng thái "Yêu cầu hủy"
        // (Lưu ý: Model Order phải có enum 'request_cancel' như bạn đã thêm)
        order.status = 'request_cancel';
        await order.save();

        // 4. Trả về JSON thành công để Frontend (fetch) nhận được
        res.json({ 
            success: true, 
            message: 'Đã gửi yêu cầu hủy. Vui lòng chờ Admin xác nhận.' 
        });

    } catch (error) {
        console.error('Cancel Order Error:', error);
        // Trả về JSON lỗi hệ thống để Frontend hiển thị alert
        res.status(500).json({ success: false, message: 'Lỗi hệ thống: ' + error.message });
    }
};

// [GET] /checkout/orders/detail/:id - Xem chi tiết đơn hàng
exports.getOrderDetail = async (req, res) => {
    try {
        const orderId = req.params.id;
        
        // Tìm đơn hàng của user hiện tại và populate thông tin sản phẩm
        const order = await Order.findOne({ _id: orderId, userId: req.user._id })
            .populate('items.productId'); // Populate để lấy _id sản phẩm cho link "Mua lại"

        if (!order) {
            req.flash('error', 'Không tìm thấy đơn hàng!');
            return res.redirect('/checkout/orders/list');
        }

        res.render('order-detail', {
            title: 'Chi tiết đơn hàng',
            order: order,
            user: req.user
        });
    } catch (error) {
        console.error('Detail Error:', error);
        req.flash('error', 'Lỗi khi tải chi tiết đơn hàng');
        res.redirect('/checkout/orders/list');
    }
};