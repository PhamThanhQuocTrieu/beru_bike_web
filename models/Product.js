const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    trim: true 
  },
  
  // [MỚI] Slug dùng cho URL thân thiện (VD: /products/xe-dap-dia-hinh)
  slug: { 
    type: String, 
    unique: true, 
    lowercase: true, 
    trim: true 
  },

  brand: { 
    type: String, 
    required: true, 
    trim: true 
  },
  
  price: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  
  oldPrice: { 
    type: Number, 
    default: 0 
  },
  
  mainImage: {  
    type: String, 
    required: true, 
    default: "" 
  },
  
  galleryImages: {  
    type: [String],  
    default: [] 
  },
  
  loaiXe: {  
    type: String, 
    required: true, 
    trim: true,
    enum: [
      "xe đạp cho trẻ em",
      "xe đạp địa hình",
      "xe đạp đua",
      "xe đạp thể thao",
      "xe đạp đô thị"
    ]
  },
  
  description: { 
    type: String, 
    default: "" 
  },
  
  stock: {  
    type: Number, 
    default: 0,
    min: 0 
  },

  // [QUAN TRỌNG] Trường này để tính Báo cáo doanh thu (đừng xóa)
  sold: { 
    type: Number, 
    default: 0 
  },

  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// [MỚI] Pre-save hook: Tự động tạo Slug từ Tên sản phẩm (Hỗ trợ Tiếng Việt)
productSchema.pre('save', function(next) {
  // Chỉ tạo lại slug nếu tên thay đổi hoặc chưa có slug
  if (this.isModified('name') || !this.slug) {
    let str = this.name.toLowerCase();
    
    // Xóa dấu tiếng Việt
    str = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    str = str.replace(/[đĐ]/g, "d");
    
    // Xóa ký tự đặc biệt
    str = str.replace(/([^0-9a-z-\s])/g, "");
    
    // Thay khoảng trắng bằng dấu gạch ngang
    str = str.replace(/(\s+)/g, "-");
    
    // Xóa ký tự gạch ngang ở đầu và cuối
    str = str.replace(/^-+|-+$/g, "");
    
    // Xóa các gạch ngang trùng nhau (vd: -- thành -)
    str = str.replace(/-+/g, "-");

    this.slug = str;
  }
  next();
});

module.exports = mongoose.model("Product", productSchema);