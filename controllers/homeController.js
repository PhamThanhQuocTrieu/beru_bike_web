// controllers/homeController.js
const Product = require("../models/Product");

// Render trang chủ với sản phẩm grouped by loaiXe
exports.getHome = async (req, res) => {
  try {
    console.log("Loading home page...");

    // [FIX QUAN TRỌNG] Thêm điều kiện { stock: { $gt: 0 } }
    // Chỉ lấy sản phẩm có số lượng > 0
    const products = await Product.find({ stock: { $gt: 0 } })
                                  .sort({ createdAt: -1 })
                                  .limit(20);
                                  
    console.log(`Found ${products.length} in-stock products from DB`);

    // Group sản phẩm theo loaiXe (linh hoạt với .includes, ignore case)
    const groupedProducts = {
      'trẻ em': products.filter(p => p.loaiXe && p.loaiXe.toLowerCase().includes('trẻ em')).slice(0, 4),
      'địa hình': products.filter(p => p.loaiXe && p.loaiXe.toLowerCase().includes('địa hình')).slice(0, 4),
      'đua': products.filter(p => p.loaiXe && p.loaiXe.toLowerCase().includes('đua')).slice(0, 4)
    };

    // console.log("Grouped products:", groupedProducts);

    res.render("index", {
      title: "Beru Bike - Xe Đạp Tốt",
      productsByCategory: groupedProducts, 
      error: null,
      user: req.session.user || null 
    });
  } catch (error) {
    console.error("Lỗi getHome:", error.message);
    
    // Fallback: Render với data rỗng nếu lỗi
    res.status(500).render("index", {
      title: "Beru Bike - Xe Đạp Tốt",
      productsByCategory: { 'trẻ em': [], 'địa hình': [], 'đua': [] },
      error: "Lỗi tải sản phẩm: " + error.message,
      user: req.session.user || null
    });
  }
};