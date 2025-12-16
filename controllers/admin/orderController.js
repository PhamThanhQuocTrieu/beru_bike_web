const Order = require("../../models/Order");
const Product = require("../../models/Product"); 

// ============================================================
// 1. LẤY DANH SÁCH ĐƠN HÀNG
// ============================================================
exports.getOrders = async (req, res) => {
  try {
    // Lấy tất cả đơn hàng, sắp xếp mới nhất lên đầu
    // Populate user để lấy tên nếu cần
    const orders = await Order.find()
        .populate('userId', 'firstName lastName email')
        .sort({ createdAt: -1 });
    
    res.render("admin/admin-orders", {
      title: "Quản lý đơn hàng",
      orders: orders,
      path: "/admin/orders" // Để highlight sidebar
    });
  } catch (err) {
    console.error("Get Orders Error:", err);
    res.status(500).send("Lỗi Server");
  }
};

// ============================================================
// 2. XỬ LÝ YÊU CẦU HỦY (DUYỆT HOẶC TỪ CHỐI)
// ============================================================
exports.handleCancelRequest = async (req, res) => {
  try {
    const { orderId, action } = req.body; // action là 'approve' hoặc 'reject'
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng" });
    }

    if (action === 'approve') {
      // --- ADMIN ĐỒNG Ý HỦY ---
      order.status = 'cancelled';
      
      // Nếu chưa thanh toán hoặc COD thì đánh dấu là failed
      // Nếu đã thanh toán online rồi thì có thể cần quy trình hoàn tiền (refunded)
      if (order.paymentStatus !== 'paid') {
          order.paymentStatus = 'failed'; 
      } else {
          order.paymentStatus = 'refunded'; // Ví dụ: Đã thanh toán online rồi hủy
      }
      
      // [LOGIC HOÀN KHO & CẬP NHẬT SOLD]
      // Khi hủy, phải cộng lại Stock và trừ đi Sold
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { 
              stock: item.quantity,   // Cộng lại kho
              sold: -item.quantity    // Trừ đi số lượng đã bán
          } 
        });
      }
      
    } else if (action === 'reject') {
      // --- ADMIN TỪ CHỐI HỦY ---
      // Quay lại trạng thái trước đó (thường là đang xử lý)
      order.status = 'pending'; 
    }

    await order.save();
    
    res.redirect('/admin/orders');

  } catch (err) {
    console.error("Lỗi xử lý hủy đơn:", err);
    res.status(500).send("Lỗi hệ thống: " + err.message);
  }
};

// ============================================================
// 3. CẬP NHẬT TRẠNG THÁI (GIAO HÀNG, HOÀN THÀNH...)
// ============================================================
exports.updateStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;

    // [DEBUG] In ra để kiểm tra dữ liệu gửi lên
    console.log(`[ADMIN UPDATE] Order: ${orderId} -> Status: ${status}`);

    // 1. Tìm đơn hàng trước
    const order = await Order.findById(orderId);
    if (!order) {
        return res.status(404).send("Không tìm thấy đơn hàng");
    }

    // 2. Cập nhật trạng thái giao hàng
    order.status = status;

    // 3. [LOGIC MỚI] Tự động cập nhật thanh toán cho COD
    // Nếu đơn hàng là COD và Admin chuyển sang trạng thái "Đã giao" hoặc "Hoàn thành"
    // => Đồng nghĩa shipper đã thu tiền => Set Payment là Paid
    if (order.paymentMethod === 'cod' && (status === 'delivered' || status === 'completed')) {
        console.log("-> Auto update COD Payment to PAID");
        order.paymentStatus = 'paid';
    }

    // Lưu lại thay đổi
    await order.save();

    res.redirect('/admin/orders');

  } catch (err) {
    console.error("Update Status Error:", err);

    // Bắt lỗi Validation cụ thể để thông báo rõ ràng
    if (err.name === 'ValidationError') {
        return res.status(400).send(`Lỗi: Trạng thái "${req.body.status}" không hợp lệ (Không khớp với Model Order). Vui lòng kiểm tra lại file Model.`);
    }

    res.status(500).send("Lỗi cập nhật trạng thái: " + err.message);
  }
};

// ... (Các hàm getOrders, handleCancelRequest, updateStatus giữ nguyên) ...

// [POST] /admin/orders/admin-cancel - Admin chủ động hủy đơn
exports.adminCancelOrder = async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).send("Không tìm thấy đơn hàng");
    }

    // Chỉ cho phép hủy khi đơn chưa giao thành công
    const allowCancelStatus = ['pending', 'confirmed', 'preparing'];
    if (!allowCancelStatus.includes(order.status)) {
        return res.status(400).send("Không thể hủy đơn hàng đang giao hoặc đã hoàn thành!");
    }

    // Cập nhật trạng thái
    order.status = 'cancelled';
    
    // Nếu đã thanh toán rồi (VNPay) -> Chuyển thành 'refunded' (để Admin biết cần hoàn tiền thủ công)
    // Nếu chưa thanh toán (COD) -> Chuyển thành 'failed'
    if (order.paymentStatus === 'paid') {
        order.paymentStatus = 'refunded';
    } else {
        order.paymentStatus = 'failed';
    }

    // [QUAN TRỌNG] Hoàn lại kho (Stock)
    for (const item of order.items) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { 
              stock: item.quantity,   // Cộng lại kho
              sold: -item.quantity    // Trừ đi số lượng đã bán
          } 
        });
    }

    await order.save();
    console.log(`[ADMIN] Đã hủy đơn hàng #${orderId}`);

    res.redirect('/admin/orders');

  } catch (err) {
    console.error("Lỗi Admin hủy đơn:", err);
    res.status(500).send("Lỗi hệ thống");
  }
};