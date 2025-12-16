// const Cart = require('../models/Cart');
// const Product = require('../models/Product');

// module.exports = async function splitCart(req, res, next) {
//     if (!req.user) return next();  // Chỉ split nếu đang login

//     try {
//         const userCart = await Cart.findOne({ userId: req.user._id })
//             .populate('items.productId');

//         if (!userCart || userCart.items.length === 0) {
//             return next();
//         }

//         // Tìm hoặc tạo session cart mới
//         let sessionCart = await Cart.findOne({ sessionId: req.sessionID });
//         if (!sessionCart) {
//             sessionCart = new Cart({ sessionId: req.sessionID, items: [] });
//         }

//         // Merge user items vào session (tương tự mergeCart, nhưng ngược)
//         for (const uItem of userCart.items) {
//             if (!uItem.productId) continue;

//             const existingIndex = sessionCart.items.findIndex(sItem =>
//                 sItem.productId && sItem.productId.toString() === uItem.productId._id.toString()
//             );

//             const currentPrice = uItem.price;  // Giữ price từ user cart (vừa merge lúc login)

//             if (existingIndex > -1) {
//                 sessionCart.items[existingIndex].quantity += uItem.quantity;
//                 sessionCart.items[existingIndex].price = currentPrice;
//             } else {
//                 sessionCart.items.push({
//                     productId: uItem.productId._id,
//                     quantity: uItem.quantity,
//                     price: currentPrice
//                 });
//             }
//         }

//         // Clean invalid
//         sessionCart.items = sessionCart.items.filter(item => item.productId);

//         await sessionCart.save();
//         await Cart.deleteOne({ _id: userCart._id });  // Xóa user cart

//         console.log('Cart split to session successfully');
//         next();

//     } catch (err) {
//         console.error("Split Cart Error:", err);
//         next();
//     }
// };