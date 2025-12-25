// controllers/productController.js
const Product = require("../models/Product");

// CẤU HÌNH: Số sản phẩm trên mỗi trang
const ITEMS_PER_PAGE = 9;

/**
 * 1. RENDER TRANG SẢN PHẨM (Load lần đầu - Server Side Render)
 * Method: GET
 * URL: /products
 */
exports.getProducts = async (req, res) => {
    try {
        // Lấy số trang từ query (vd: ?page=2), mặc định là 1
        let page = +req.query.page || 1;
        if (page < 1) page = 1;

        // Điều kiện cơ bản: Chỉ lấy sản phẩm còn hàng
        const filter = { stock: { $gt: 0 } };

        // Xử lý tìm kiếm (nếu có keyword trên URL)
        const keyword = req.query.keyword || "";
        if (keyword) {
            filter.name = { $regex: keyword, $options: "i" };
        }

        // Đếm tổng số sản phẩm thỏa điều kiện (để tính tổng số trang)
        const totalProducts = await Product.countDocuments(filter);
        const lastPage = Math.ceil(totalProducts / ITEMS_PER_PAGE);

        // Lấy danh sách sản phẩm theo phân trang
        const products = await Product.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * ITEMS_PER_PAGE) // Bỏ qua sản phẩm các trang trước
            .limit(ITEMS_PER_PAGE);            // Giới hạn số lượng lấy ra

        console.log(`Loaded ${products.length} products (Page ${page}/${lastPage})`);

        // Render view EJS
        res.render("product", {
            title: "Sản Phẩm - Beru Bike",
            products: products,
            keyword: keyword,
            user: req.session.user || null, // Truyền user session nếu có (cho header)
            
            // Dữ liệu phân trang gửi xuống EJS
            currentPage: page,
            hasNextPage: ITEMS_PER_PAGE * page < totalProducts,
            hasPreviousPage: page > 1,
            nextPage: page + 1,
            previousPage: page - 1,
            lastPage: lastPage, // Quan trọng: Tổng số trang để EJS render nút số
            total: totalProducts
        });

    } catch (error) {
        console.error("Lỗi getProducts:", error);
        res.status(500).render("error", { 
            message: "Lỗi tải danh sách sản phẩm",
            user: req.session.user || null
        });
    }
};

/**
 * 2. API LỌC & PHÂN TRANG (Dùng cho AJAX fetch từ client)
 * Method: GET
 * URL: /products/filter
 */
exports.filterProducts = async (req, res) => {
    try {
        let page = +req.query.page || 1;
        if (page < 1) page = 1;
        
        // Lấy các tham số lọc từ query string
        const { brands, bikeTypes, priceRanges } = req.query;

        // Khởi tạo query lọc cơ bản: Còn hàng
        let query = { stock: { $gt: 0 } };

        // --- Xử lý lọc Thương Hiệu (Brand) ---
        if (brands) {
            const brandList = brands.split(','); // vd: "giant,trinx" -> ['giant', 'trinx']
            // Tìm brand không phân biệt hoa thường
            query.brand = { $in: brandList.map(b => new RegExp(`^${b}$`, 'i')) };
        }

        // --- Xử lý lọc Loại Xe (Bike Type) ---
        if (bikeTypes) {
            // Giả sử trong DB trường lưu loại xe là 'loaiXe'
            const typeList = bikeTypes.split(',');
            query.loaiXe = { $in: typeList.map(t => new RegExp(t, 'i')) };
        }

        // --- Xử lý lọc Khoảng Giá (Price Range) ---
        if (priceRanges) {
            const ranges = priceRanges.split(','); // vd: ['2-3', '6-15']
            const priceQueries = ranges.map(range => {
                const [min, max] = range.split('-');
                return {
                    price: {
                        $gte: Number(min) * 1000000, // Đổi triệu đồng ra VNĐ
                        $lte: Number(max) * 1000000
                    }
                };
            });
            
            // Dùng $or: Giá thuộc khoảng A HOẶC khoảng B
            if (priceQueries.length > 0) {
                query.$or = priceQueries;
            }
        }

        // Đếm lại tổng số kết quả sau khi lọc
        const totalProducts = await Product.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);

        // Đảm bảo page không vượt quá totalPages (trừ khi totalPages = 0)
        if (page > totalPages && totalPages > 0) {
            page = totalPages;
        }

        // Query DB lấy dữ liệu
        const products = await Product.find(query)
            .sort({ createdAt: -1 }) // Mới nhất lên đầu
            .skip((page - 1) * ITEMS_PER_PAGE)
            .limit(ITEMS_PER_PAGE);

        // Trả về JSON cho Frontend JS xử lý
        res.status(200).json({
            products: products,
            currentPage: page,
            totalPages: totalPages,
            total: totalProducts
        });

    } catch (error) {
        console.error("Lỗi filterProducts:", error);
        res.status(500).json({ message: "Lỗi server khi lọc sản phẩm" });
    }
};

/**
 * 3. CHI TIẾT SẢN PHẨM
 * Method: GET
 * URL: /product-detail/:id
 */
exports.getProductDetail = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).render("error", { 
                message: "Sản phẩm không tồn tại!", 
                user: req.session.user || null 
            });
        }

        // Lấy sản phẩm liên quan (Cùng loại xe, khác ID hiện tại, còn hàng)
        const relatedProducts = await Product.find({
            loaiXe: product.loaiXe,
            _id: { $ne: product._id },
            stock: { $gt: 0 }
        }).limit(4); // Lấy 4 sp cho đẹp hàng ngang

        res.render("product-detail", {
            title: `${product.name} - Chi Tiết Sản Phẩm`,
            product,
            relatedProducts,
            user: req.session.user || null
        });
    } catch (error) {
        console.error("Product detail error:", error);
        res.status(500).render("error", { 
            message: "Lỗi tải chi tiết sản phẩm!", 
            user: req.session.user || null 
        });
    }
};