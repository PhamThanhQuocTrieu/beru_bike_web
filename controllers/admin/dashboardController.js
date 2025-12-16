// controllers/admin/dashboardController.js
const Product = require("../../models/Product");
const User = require("../../models/User");
const Order = require("../../models/Order");

exports.getDashboard = async (req, res) => {
  try {
    // 1. Thống kê cơ bản
    const totalProducts = await Product.countDocuments();
    const totalUsers = await User.countDocuments({ role: 'user' });
    const newOrdersCount = await Order.countDocuments({ status: 'pending' });

    // 2. Tính tổng doanh thu toàn thời gian
    const revenueData = await Order.aggregate([
      { $match: { status: { $in: ['completed', 'delivered'] } } },
      { $group: { _id: null, totalRevenue: { $sum: "$totalPrice" } } }
    ]);
    const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

    // 3. --- LOGIC CHO BIỂU ĐỒ (Doanh thu 7 ngày qua) ---
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - 7);

    const chartDataRaw = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: daysAgo }, // Lấy đơn từ 7 ngày trước
          status: { $in: ['completed', 'delivered'] } // Chỉ tính đơn thành công
        }
      },
      {
        $group: {
          // Nhóm theo ngày (Format YYYY-MM-DD), lưu ý timezone +7 cho Việt Nam
          _id: { 
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "+07:00" } 
          },
          dailyRevenue: { $sum: "$totalPrice" }
        }
      },
      { $sort: { _id: 1 } } // Sắp xếp ngày tăng dần
    ]);

    // Xử lý dữ liệu: Tạo mảng đầy đủ 7 ngày (kể cả ngày không có doanh thu = 0)
    let chartLabels = []; // Trục hoành (Ngày)
    let chartRevenue = []; // Trục tung (Tiền)

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      // Format ngày giống format của MongoDB trả về (YYYY-MM-DD)
      const dayString = d.toLocaleDateString('en-CA'); // en-CA trả về format YYYY-MM-DD
      const showDate = d.toLocaleDateString('vi-VN', {day: '2-digit', month: '2-digit'}); // Format DD/MM để hiển thị đẹp hơn

      chartLabels.push(showDate); 

      // Tìm xem ngày này có trong dữ liệu DB trả về không
      const found = chartDataRaw.find(item => item._id === dayString);
      chartRevenue.push(found ? found.dailyRevenue : 0);
    }

    // 4. Lấy danh sách hoạt động gần đây
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('userId', 'firstName lastName');

    // 5. Render
    res.render("admin/dashboard", {
      title: "Admin Dashboard",
      user: req.user,
      stats: {
        products: totalProducts,
        users: totalUsers,
        orders: newOrdersCount,
        revenue: totalRevenue
      },
      recentActivity: recentOrders,
      // Truyền dữ liệu biểu đồ sang view
      chartData: {
        labels: chartLabels,
        data: chartRevenue
      }
    });

  } catch (err) {
    console.error("Dashboard Error:", err);
    res.status(500).send("Lỗi Server khi tải Dashboard");
  }
};