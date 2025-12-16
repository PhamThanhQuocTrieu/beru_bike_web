const { VNPay, ignoreLogger } = require('vnpay');
const vnpayConfig = require('../config/vnpay');
const Order = require('../models/Order');
const Product = require('../models/Product');

// 1. Khởi tạo instance VNPay
const vnpay = new VNPay({
    tmnCode: vnpayConfig.vnp_TmnCode,
    secureSecret: vnpayConfig.vnp_HashSecret,
    vnpayHost: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    testMode: true, // Tự động chọn môi trường Sandbox
    hashAlgorithm: 'SHA512', // Thuật toán mã hóa
    enableLog: true, // Bật log để dễ debug (tùy chọn)
    loggerFn: ignoreLogger, // Bỏ qua logger mặc định cho gọn console
});

// 2. Tạo URL thanh toán
exports.createPaymentUrl = (req, order) => {
    
    // Lấy IP người dùng
    const ipAddr = req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress || '127.0.0.1';

    const orderId = order._id.toString();
    const amount = order.totalPrice; 
    
    // Build URL (Thư viện tự lo sắp xếp và mã hóa)
    const paymentUrl = vnpay.buildPaymentUrl({
        vnp_Amount: amount, // Thư viện vnpay tự nhân 100, bạn chỉ cần truyền số tiền thực
        vnp_IpAddr: ipAddr,
        vnp_TxnRef: orderId,
        vnp_OrderInfo: `Thanh toan don hang ${orderId}`,
        vnp_OrderType: 'other',
        vnp_ReturnUrl: vnpayConfig.vnp_ReturnUrl,
        vnp_Locale: 'vn', // Tiếng Việt
        vnp_CurrCode: 'VND',
    });

    return paymentUrl;
};

// 3. Xử lý kết quả trả về (Return URL)
exports.vnpayReturn = async (req, res) => {
    try {
        // Thư viện tự động verify checksum từ query params
        const verify = vnpay.verifyReturnUrl(req.query);

        const orderId = req.query.vnp_TxnRef;

        if (!verify.isVerified) {
            // Sai chữ ký (Checksum failed)
            return res.status(200).send({ code: '97', data: 'Checksum failed' });
        }

        if (verify.isSuccess) {
            // --- THANH TOÁN THÀNH CÔNG ---
            await Order.findByIdAndUpdate(orderId, {
                paymentStatus: 'paid',
                status: 'confirmed'
            });
            return res.redirect(`/checkout/orders/order-complete?orderId=${orderId}&payment=success`);
        
        } else {
            // --- THANH TOÁN THẤT BẠI / HỦY ---
            const order = await Order.findById(orderId);
            if (order) {
                // Hoàn lại kho (Logic cũ của bạn)
                for (const item of order.items) {
                    await Product.findByIdAndUpdate(item.productId, {
                        $inc: { sold: -item.quantity, stock: item.quantity }
                    });
                }
                
                order.paymentStatus = 'failed';
                order.status = 'cancelled';
                await order.save();
            }
            
            return res.redirect(`/checkout/orders/list?error=Giao dịch VNPay thất bại`);
        }

    } catch (error) {
        console.error("VNPAY LIBRARY ERROR:", error);
        res.redirect('/checkout');
    }
};