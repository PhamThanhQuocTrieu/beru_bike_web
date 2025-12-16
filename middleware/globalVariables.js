const Cart = require('../models/Cart');
const mongoose = require('mongoose');

// Helper: Tính tổng quantity (Logic giống Controller)
function recalculateCartTotals(cart) {
    cart.totalItems = cart.items.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
    cart.totalPrice = cart.items.reduce((sum, item) => sum + ((parseInt(item.quantity) || 0) * (item.price || 0)), 0);
}

exports.setupGlobals = async (req, res, next) => {
    try {
        // 1. Setup Flash
        res.locals.messages = {
            success: req.flash('success'),
            error: req.flash('error')
        };

        // 2. Xác định User hiện tại
        // Ưu tiên req.user (từ Passport/Middleware auth), sau đó đến session
        const currentUser = req.user || (req.session && req.session.user);
        res.locals.user = currentUser || null;

        // 3. Tìm cart
        // Lưu ý: Nếu không có user và không có sessionID thì không tìm (tránh lỗi)
        if (!currentUser && !req.sessionID) {
            res.locals.totalCartItems = 0;
            return next();
        }

        let filter = currentUser ? { userId: currentUser._id } : { sessionId: req.sessionID };
        
        let cart = await Cart.findOne(filter)
            .sort({ updatedAt: -1 })
            .populate('items.productId');

        // Xóa các giỏ hàng cũ nếu bị trùng lặp (Cleanup)
        if (cart) {
            await Cart.deleteMany({ ...filter, _id: { $ne: cart._id } });
        }

        let totalCartItems = 0;

        if (cart && cart.items && cart.items.length > 0) {
            // Fetch raw để kiểm tra và clean items rác (sản phẩm đã bị xóa khỏi DB)
            const rawCart = await Cart.findById(cart._id);
            
            if (!rawCart) {
                res.locals.totalCartItems = 0;
                return next();
            }

            const rawItems = rawCart.items || [];
            // Lọc những item có productId hợp lệ
            const validRawItems = rawItems.filter(item => item.productId && mongoose.Types.ObjectId.isValid(item.productId.toString()));

            // Nếu phát hiện item rác -> Clean & Save lại
            if (validRawItems.length !== rawItems.length) {
                rawCart.items = validRawItems;
                recalculateCartTotals(rawCart); // Tính lại tổng
                await rawCart.save();
                
                // Cập nhật lại biến cart sau khi save để tính toán hiển thị
                cart = await Cart.findById(cart._id).populate('items.productId');
                // console.log("⚠️ Middleware cleaned invalid items.");
            }

            // [QUAN TRỌNG] Tính số lượng hiển thị ra Header
            // Lọc item valid (có đầy đủ thông tin product)
            const validItems = cart.items.filter(item => item.productId && item.productId._id);
            
            // Logic: Cộng tổng quantity (VD: 1 áo mua số lượng 2 -> Tổng là 2)
            totalCartItems = validItems.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
        }

        res.locals.totalCartItems = totalCartItems;

        // Debug log (Bật lên nếu cần kiểm tra Session ID có bị đổi không)
        // console.log(`[Middleware] Path: ${req.path} | SessionID: ${req.sessionID} | Cart Items: ${totalCartItems}`);

        next();

    } catch (error) {
        console.error("Middleware Global Error:", error.message);
        res.locals.totalCartItems = 0;
        next();
    }
};