const Order = require('../models/Order');
const Cart = require('../models/Cart');
const User = require('../models/User');
const Product = require('../models/Product'); // [MỚI] Import Product Model để update kho
const mongoose = require('mongoose');

// ======================== HELPER ========================= //
function recalculateCartTotals(cart) {
    cart.totalItems = cart.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    cart.totalPrice = cart.items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.price || 0)), 0);
}

async function getCart(req) {
    if (req.user) {
        let cart = await Cart.findOne({ userId: req.user._id }).populate("items.productId");
        if (cart) return cart;
    }
    return await Cart.findOne({ sessionId: req.sessionID }).populate("items.productId");
}

// ======================== CONTROLLERS ========================= //

// [GET] /checkout/payment
const getPaymentPage = async (req, res) => {
    // ... (Giữ nguyên logic cũ của bạn ở đây) ...
    try {
        let cart = await getCart(req);
        let cartItems = [];

        if (cart && cart.items.length > 0) {
            const validItems = [];
            for (const item of cart.items) {
                if (item.productId && item.productId._id) {
                    validItems.push(item);
                    cartItems.push({
                        _id: item.productId._id,
                        name: item.productId.name,
                        price: item.price,
                        quantity: item.quantity,
                        image: item.productId.mainImage
                    });
                }
            }
            if (validItems.length !== cart.items.length) {
                cart.items = validItems;
                recalculateCartTotals(cart);
                await cart.save();
            }
        }

        if (!cart || cartItems.length === 0) {
            req.flash("warning", "Giỏ hàng trống!");
            return res.redirect("/checkout");
        }

        const subtotal = cart.totalPrice;
        const total = subtotal;

        let fullUser = null;
        if (req.user) {
            fullUser = await User.findById(req.user._id).select("firstName lastName phone address email");
            if (fullUser) fullUser.fullName = fullUser.firstName + " " + fullUser.lastName;
        }

        res.render("payment", {
            title: "Thanh toán - Beru Bike",
            cartItems,
            subtotal,
            shippingFee: 0,
            discount: 0,
            total,
            user: fullUser
        });

    } catch (err) {
        console.error("Payment Page Error:", err);
        req.flash("error", "Lỗi hệ thống!");
        res.redirect("/checkout");
    }
};

// [POST] /checkout/orders/order (ĐÃ CẬP NHẬT TRỪ KHO)
const placeOrder = async (req, res) => {
    try {
        // 1. Debug
        if (process.env.NODE_ENV !== 'production') {
            console.log("=== PLACE ORDER (PaymentController) ===");
        }

        // 2. Lấy dữ liệu
        const rawData = req.body.customer || req.body;
        const fullName = rawData.fullName || req.body.fullName;
        const phone = rawData.phone || req.body.phone;
        const address = rawData.address || req.body.address;
        const note = rawData.note || req.body.note || '';
        const paymentMethod = req.body.paymentMethod || rawData.paymentMethod || "cod";

        // 3. Validate
        if (!fullName || !phone || !address) {
            return res.status(400).json({ success: false, message: "Vui lòng điền đủ thông tin: Họ tên, SĐT, Địa chỉ" });
        }

        // 4. Lấy giỏ hàng
        let cart = await getCart(req);
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: "Giỏ hàng trống" });
        }

        // Filter item hợp lệ
        cart.items = cart.items.filter(item => item.productId && mongoose.Types.ObjectId.isValid(item.productId._id));
        recalculateCartTotals(cart);
        await cart.save();

        const orderItems = cart.items.map(i => ({
            productId: i.productId._id,
            name: i.productId.name,
            image: i.productId.mainImage,
            quantity: i.quantity,
            price: i.price
        }));

        const total = cart.totalPrice;

        // 5. Tạo Order
        const newOrder = new Order({
            userId: req.user ? req.user._id : null,
            shippingAddress: {
                fullName: fullName,
                phone: phone,
                address: address,
                province: rawData.province || '',
                district: rawData.district || '',
                ward: rawData.ward || ''
            },
            note: note,
            items: orderItems,
            totalPrice: total,
            paymentMethod: paymentMethod,
            status: "pending",
            paymentStatus: "pending"
        });

        await newOrder.save();

        // ============================================================
        // [QUAN TRỌNG] CẬP NHẬT TỒN KHO VÀ SỐ LƯỢNG ĐÃ BÁN
        // ============================================================
        // Duyệt qua từng sản phẩm trong đơn hàng để cập nhật
        for (const item of orderItems) {
            await Product.findByIdAndUpdate(item.productId, {
                $inc: { 
                    stock: -item.quantity,  // Trừ tồn kho
                    sold: item.quantity     // Tăng số lượng đã bán (phục vụ báo cáo)
                }
            });
        }
        // ============================================================
        
        // 6. Xóa giỏ hàng
        await Cart.deleteOne({ _id: cart._id });
        if (req.session) req.session.cart = null;

        // 7. Trả về kết quả
        const orderIdAsString = newOrder._id.toString();
        const url = `/checkout/orders/order-complete?orderId=${orderIdAsString}`;

        res.json({
            success: true,
            message: "Đặt hàng thành công",
            redirectUrl: url,
            orderId: orderIdAsString
        });

    } catch (err) {
        console.error("Place Order Error:", err);
        res.status(500).json({ success: false, message: "Lỗi hệ thống: " + err.message });
    }
};

// [GET] /checkout/orders/order-complete
const getOrderComplete = async (req, res) => {
    // ... (Giữ nguyên logic cũ của bạn ở đây) ...
    try {
        const { orderId } = req.query;
        if (!orderId) {
            req.flash("error", "Tham số đơn hàng không hợp lệ.");
            return res.redirect("/checkout");
        }
        const order = await Order.findById(orderId);
        if (!order) {
            req.flash("error", "Không tìm thấy đơn hàng!");
            return res.redirect("/checkout");
        }
        const cartItemsForDisplay = order.items.map(item => ({
            _id: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            image: item.image
        }));
        res.render("order-complete", {
            title: "Hoàn tất đơn hàng",
            orderId: order._id.toString(),
            totalPrice: order.totalPrice,
            orderItems: cartItemsForDisplay,
            shippingAddress: order.shippingAddress,
            user: req.user
        });
    } catch (err) {
        console.error("Order Complete Error:", err);
        req.flash("error", "Lỗi hệ thống!");
        res.redirect("/checkout");
    }
};

module.exports = {
    getPaymentPage,
    placeOrder,
    getOrderComplete
};