// File: controllers/checkoutController.js

const Product = require('../models/Product');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const mongoose = require('mongoose');
const vnpayController = require('./vnpayController'); // Import Controller VNPay

// Helper: Tính lại tổng số lượng và tổng tiền của giỏ hàng
function recalculateCartTotals(cart) {
  cart.totalItems = cart.items.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
  cart.totalPrice = cart.items.reduce((sum, item) => sum + ((parseInt(item.quantity) || 0) * (item.price || 0)), 0);
}

// Helper: Lấy giỏ hàng mới nhất và xóa các giỏ hàng cũ
async function getCart(req) {
  const filter = req.user ? { userId: req.user._id } : { sessionId: req.sessionID };
  let cart = await Cart.findOne(filter)
    .sort({ updatedAt: -1 })
    .populate('items.productId');

  if (cart) {
    await Cart.deleteMany({ ...filter, _id: { $ne: cart._id } });
  }
  return cart;
}

// Helper: Tính tổng số lượng item hợp lệ
function calculateTotalItemsFromCart(cart) {
  if (!cart || !cart.items || cart.items.length === 0) return 0;
  const validItems = cart.items.filter(item => item.productId && item.productId._id);
  return validItems.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
}

// [GET] /checkout - Hiển thị trang thanh toán
exports.getCheckoutPage = async (req, res) => {
  try {
    let cart = await getCart(req);
    let cartItems = [];

    if (process.env.NODE_ENV !== 'production') {
      console.log('=== CHECKOUT DEBUG ===');
      console.log('User:', req.user ? req.user.email : 'Guest');
    }

    if (cart && cart.items && cart.items.length > 0) {
      // Làm sạch item rác
      const rawCart = await Cart.findById(cart._id);
      if (rawCart) {
        const rawItems = rawCart.items || [];
        const validRawItems = rawItems.filter(item => item.productId && mongoose.Types.ObjectId.isValid(item.productId.toString()));

        if (validRawItems.length !== rawItems.length) {
          rawCart.items = validRawItems;
          recalculateCartTotals(rawCart);
          await rawCart.save();
          cart = await getCart(req);
        }
      }

      // Build cart items display
      if (cart && cart.items) {
        const validItems = cart.items.filter(item => item.productId && item.productId._id);
        validItems.forEach(item => {
          cartItems.push({
            _id: item.productId._id,
            name: item.productId.name,
            price: item.price,
            image: item.productId.mainImage,
            quantity: item.quantity,
            stock: item.productId.stock
          });
        });
      }
    }

    res.locals.totalCartItems = calculateTotalItemsFromCart(cart) || 0;

    let subtotal = cart ? cart.totalPrice : 0;
    const shippingFee = 0;
    const discount = 0;
    const total = subtotal + shippingFee - discount;

    res.render('checkout', {
      title: 'Thanh toán - Beru Bike',
      cartItems,
      subtotal,
      shippingFee,
      discount,
      total,
      user: req.user || null
    });
  } catch (error) {
    console.error('Checkout Page Error:', error);
    res.status(500).send('Lỗi hệ thống');
  }
};

// [POST] /checkout/cart/add - Thêm vào giỏ (CÓ CHECK TỒN KHO)
exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const qty = parseInt(quantity);

    // 1. Tìm sản phẩm & Check Stock
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Sản phẩm không tồn tại' });

    let cart = await getCart(req);
    if (!cart) {
      cart = new Cart({
        userId: req.user ? req.user._id : undefined,
        sessionId: req.sessionID,
        items: []
      });
    }

    const itemIndex = cart.items.findIndex(i => {
      const prodId = i.productId._id || i.productId;
      return prodId.toString() === productId;
    });

    // 2. Logic Check Stock
    let currentQtyInCart = 0;
    if (itemIndex > -1) {
      currentQtyInCart = cart.items[itemIndex].quantity;
    }
    
    const totalDesiredQty = currentQtyInCart + qty;

    if (totalDesiredQty > product.stock) {
      return res.status(400).json({ 
        success: false, 
        error: `Sản phẩm này chỉ còn ${product.stock} cái trong kho!` 
      });
    }

    // 3. Update Cart
    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += qty;
    } else {
      cart.items.push({
        productId: product._id,
        quantity: qty,
        price: product.price
      });
    }

    recalculateCartTotals(cart);
    await cart.save();

    req.session.cartUpdated = Date.now();
    req.session.save(async () => {
      cart = await getCart(req);
      const newTotal = calculateTotalItemsFromCart(cart);
      res.json({ success: true, totalItems: newTotal, productName: product.name });
    });

  } catch (error) {
    console.error('Add Cart Error:', error);
    res.status(500).json({ error: 'Server Error' });
  }
};

// [POST] /checkout/cart/update - Cập nhật giỏ (CÓ CHECK TỒN KHO)
exports.updateCart = async (req, res) => {
  try {
    const { action, id, quantity } = req.body; 
    let cart = await getCart(req);
    if (!cart) return res.json({ success: false, message: 'Giỏ hàng không tồn tại' });

    if (action === 'remove') {
      cart.items = cart.items.filter(item => {
        const prodId = item.productId._id || item.productId;
        return prodId.toString() !== id;
      });
    } else if (action === 'update') {
      const index = cart.items.findIndex(item => {
        const prodId = item.productId._id || item.productId;
        return prodId.toString() === id;
      });

      if (index > -1) {
        const newQty = parseInt(quantity);
        
        // Check Stock Realtime
        const product = await Product.findById(id);
        if (product && newQty > product.stock) {
            return res.json({ 
                success: false, 
                message: `Kho chỉ còn ${product.stock} sản phẩm.` 
            });
        }

        if (newQty < 1) {
            cart.items.splice(index, 1);
        } else {
            cart.items[index].quantity = newQty;
        }
      }
    }

    recalculateCartTotals(cart);
    await cart.save();

    req.session.cartUpdated = Date.now();
    req.session.save(async () => {
      cart = await getCart(req);
      const newTotal = calculateTotalItemsFromCart(cart);
      res.json({ success: true, cart: cart.items, subtotal: cart.totalPrice, totalItems: newTotal });
    });

  } catch (error) {
    console.error('Update Cart Error:', error);
    res.status(500).json({ error: 'Server Error' });
  }
};

// [POST] /checkout/order - Đặt hàng (FULL LOGIC: COD + VNPAY + STOCK)
exports.placeOrder = async (req, res) => {
  try {
    // 1. Debug Log
    if (process.env.NODE_ENV !== 'production') {
      console.log("=== PLACE ORDER ===");
      console.log("Req Body:", req.body);
    }

    // 2. Lấy dữ liệu
    const rawData = req.body.customer || req.body;
    const fullName = rawData.fullName || req.body.fullName;
    const phone = rawData.phone || req.body.phone;
    const address = rawData.address || req.body.address;
    const note = rawData.note || req.body.note || '';
    const paymentMethod = req.body.paymentMethod || rawData.paymentMethod || 'cod';

    // 3. Validate
    if (!fullName || !phone || !address) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin giao hàng!' });
    }

    // 4. Lấy giỏ hàng
    let cart = await getCart(req);
    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Giỏ hàng trống!' });
    }

    // 5. [QUAN TRỌNG] Kiểm tra tồn kho lần cuối cho TOÀN BỘ giỏ hàng
    for (const item of cart.items) {
        const prodId = item.productId._id || item.productId;
        const product = await Product.findById(prodId);

        if (!product) {
             return res.status(400).json({ success: false, message: 'Có sản phẩm trong giỏ hàng không còn tồn tại.' });
        }

        if (item.quantity > product.stock) {
            return res.status(400).json({ 
                success: false, 
                message: `Sản phẩm "${product.name}" hiện không đủ hàng (Chỉ còn ${product.stock}).` 
            });
        }
    }

    // 6. Chuẩn bị items
    const orderItems = cart.items.map(item => ({
      productId: item.productId._id, 
      name: item.productId.name,
      quantity: item.quantity,
      price: item.price,
      image: item.productId.mainImage
    }));

    const total = cart.totalPrice;

    // 7. Tạo Order (Pending)
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
      shippingMethod: 'delivery',
      status: 'pending',
      paymentStatus: 'pending' // Mặc định là chưa thanh toán
    });

    await newOrder.save();

    // 8. [TRỪ KHO NGAY LẬP TỨC] 
    // Trừ kho trước để giữ chỗ, nếu VNPay fail thì hoàn lại sau
    for (const item of orderItems) {
        await Product.findByIdAndUpdate(item.productId, {
            $inc: { 
                sold: item.quantity,   // Tăng đã bán
                stock: -item.quantity  // Giảm tồn kho
            }
        });
    }

    // 9. Xóa giỏ hàng
    await Cart.deleteOne({ _id: cart._id });
    if (req.session) {
        req.session.cart = null;
    }

    // 10. Phân luồng thanh toán
    // --- NẾU LÀ VNPAY ---
    if (paymentMethod === 'vnpay') {
        // Gọi hàm tạo URL từ controller vnpayController
        const paymentUrl = vnpayController.createPaymentUrl(req, newOrder);
        
        return res.json({ 
            success: true, 
            paymentUrl: paymentUrl, // Frontend sẽ redirect sang link này
            message: 'Đang chuyển hướng sang VNPay...' 
        });
    }

    // --- NẾU LÀ COD (Thanh toán khi nhận hàng) ---
    const orderIdAsString = newOrder._id.toString();
    const url = `/checkout/orders/order-complete?orderId=${orderIdAsString}`;

    console.log(" COD Order created:", orderIdAsString);

    req.session.save(() => {
        res.json({ 
            success: true, 
            orderId: orderIdAsString, 
            redirectUrl: url,
            message: 'Đặt hàng thành công!' 
        });
    });

  } catch (error) {
    console.error(' PLACE ORDER ERROR:', error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống: ' + error.message });
  }
};

// [GET] /checkout/vnpay_return (Delegate sang vnpayController xử lý)
exports.vnpayReturn = vnpayController.vnpayReturn;