// config/vnpay.js
module.exports = {
    vnp_TmnCode: "SKM34TYQ", // Mã Website của bạn
    vnp_HashSecret: "JYXUHU377EU759UUMGZLYXFZF7KX8ELP", // Chuỗi bí mật
    vnp_Url: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
    vnp_ReturnUrl: "http://localhost:3000/checkout/vnpay_return" // URL nhận kết quả
};