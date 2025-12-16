// Import các Model để truy vấn dữ liệu thật
const Product = require("../../models/Product");
const User = require("../../models/User");
const Order = require("../../models/Order");

exports.getReports = async (req, res) => {
  try {
    // -----------------------------------------------------------
    // 1. LẤY TOP SẢN PHẨM BÁN CHẠY (Dữ liệu thật từ DB)
    // -----------------------------------------------------------
    // Sắp xếp giảm dần theo 'sold', lấy 5 sản phẩm đầu
    const topProductsDocs = await Product.find()
      .sort({ sold: -1 }) 
      .limit(5)
      .select('name sold price'); 

    // Tính toán doanh thu cho từng sản phẩm (sold * price)
    // Map dữ liệu để khớp với giao diện reports.ejs
    const topProducts = topProductsDocs.map(p => ({
        name: p.name,
        sold: p.sold || 0,
        revenue: (p.sold || 0) * (p.price || 0)
    }));

    // -----------------------------------------------------------
    // 2. LẤY DANH SÁCH USER MỚI NHẤT (Sửa lỗi không cập nhật user)
    // -----------------------------------------------------------
    // Lọc role là 'user' (bỏ qua admin), sắp xếp createdAt giảm dần (mới nhất lên đầu)
    const newUsers = await User.find({ role: 'user' })
      .sort({ createdAt: -1 })
      .limit(5); // Chỉ lấy 5 người mới nhất

    // -----------------------------------------------------------
    // 3. RENDER RA VIEW
    // -----------------------------------------------------------
    res.render("admin/reports", {
      title: "Báo cáo & Thống kê",
      path: "/admin/reports", // Dùng để highlight sidebar
      user: req.user,         // Truyền user để hiển thị tên trên Header
      reports: {
        topProducts: topProducts,
        newUsers: newUsers
      }
    });

  } catch (error) {
    console.error("Lỗi controller reports:", error);
    // Render trang báo cáo nhưng với dữ liệu rỗng để không crash web
    res.render("admin/reports", {
        title: "Báo cáo (Lỗi)",
        path: "/admin/reports",
        user: req.user,
        reports: { topProducts: [], newUsers: [] }
    });
  }
};