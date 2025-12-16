const Cart = require('../models/Cart');

module.exports = async function mergeCart(req, res, next) {
    if (!req.user || !req.session.cart) return next(); // Không cần merge nếu không có session cart

    try {
        let userCart = await Cart.findOne({ userId: req.user._id })
            .populate('items.productId');

        if (!userCart) {
            // Tạo user cart mới từ session
            userCart = new Cart({
                userId: req.user._id,
                items: req.session.cart.items.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    price: item.price // Giả sử price vẫn valid
                }))
            });
        } else {
            // Merge: Thêm/cập nhật items từ session vào user cart
            req.session.cart.items.forEach(sItem => {
                const exists = userCart.items.find(uItem =>
                    uItem.productId.toString() === sItem.productId.toString()
                );

                if (exists) {
                    exists.quantity += sItem.quantity;
                } else {
                    userCart.items.push({
                        productId: sItem.productId,
                        quantity: sItem.quantity,
                        price: sItem.price
                    });
                }
            });
        }

        await userCart.save();
        req.session.cart = null; // Clear session cart sau merge

        console.log('Cart merged successfully');
        next();

    } catch (err) {
        console.error("Merge Cart Error:", err);
        next(); // Không block flow
    }
    };