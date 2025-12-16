
  // Giả sử bạn có dữ liệu sản phẩm giống như:
  const products = [
    {
      id: "rpd-v5",
      title: "RPD V5",
      price: 4890000,
      images: [
        "../images/rpd-v5-1.jpg",
        "../images/rpd-v5-2.jpg"
      ],
      colors: ["Đen", "Trắng", "Xanh"],
      sku: "Không áp dụng",
      categories: ["Sản Phẩm", "Sports Bikes", "Xe Đạp Thể Thao"],
      extraInfo: {
        "Màu xe": "Đen, Trắng, Xanh"
      },
      specs: {
        "Đối tượng sử dụng": "Học sinh, sinh viên, người dùng phổ thông, năng động mạnh mẽ",
        "Chiều cao phù hợp": "155cm - 180cm",
        "Khung xe": "Nhôm",
        "Phuộc": "Thép",
        "Tay bấm đề": "Shimano",
        "Gạt đĩa": "Shimano Tourney",
        "Gạt líp": "Shimano Tourney",
        "Đùi đĩa": "Nhôm 3 tầng",
        "Phanh": "Đĩa cơ",
        "Size bánh": "27,5\"",
        "Lốp": "KENDA",
        "Vành": "Nhôm 2 lớp",
        "Ghi đông": "Thép",
        "Moay Ơ": "Thép"
      },
      desc: `<p>Chi tiết mô tả sản phẩm ở đây...</p>`
    },
    // ... các sản phẩm khác
  ];

  function getQueryParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
  }

  function formatVND(n) {
    return '₫' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  // Khi trang load
  window.addEventListener("DOMContentLoaded", () => {
    const id = getQueryParam("id");
    const prod = products.find(p => p.id === id);
    if (!prod) {
      document.querySelector(".product-page").innerHTML = "<h2>Sản phẩm không tồn tại.</h2>";
      return;
    }

    // Set title, price
    document.getElementById("prodTitle").textContent = prod.title;
    document.getElementById("prodPrice").textContent = formatVND(prod.price);

    // Ảnh chính
    const imgEl = document.getElementById("prodMainImg");
    imgEl.src = prod.images[0];

    // thumbnails nếu có
    const thumbsEl = document.getElementById("prodThumbs");
    prod.images.forEach((src, idx) => {
      const t = document.createElement("img");
      t.src = src;
      t.className = "thumb";
      t.style.cursor = "pointer";
      t.style.width = "60px";
      t.style.marginRight = "8px";
      t.addEventListener("click", () => {
        imgEl.src = src;
      });
      thumbsEl.appendChild(t);
    });

    // Màu sắc chọn lựa
    const colorSelect = document.getElementById("colorSelect");
    prod.colors.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      colorSelect.appendChild(opt);
    });

    // SKU & danh mục
    document.getElementById("prodSKU").textContent = prod.sku;
    document.getElementById("prodCategories").textContent = prod.categories.join(", ");

    // Thông tin bổ sung
    const exEl = document.getElementById("extraInfo");
    for (let key in prod.extraInfo) {
      const d = document.createElement("div");
      d.textContent = `${key}: ${prod.extraInfo[key]}`;
      exEl.appendChild(d);
    }

    // Specs
    const specUl = document.getElementById("specList");
    for (let key in prod.specs) {
      const li = document.createElement("li");
      li.textContent = `${key}: ${prod.specs[key]}`;
      specUl.appendChild(li);
    }

    // Mô tả
    document.getElementById("prodDesc").innerHTML = prod.desc;

    // Bấm thêm vào giỏ hàng
    document.getElementById("addCartBtn").addEventListener("click", () => {
      // logic giống như addToCart bạn đã có (localStorage)
      const cart = JSON.parse(localStorage.getItem("dh_cart") || "[]");
      const item = cart.find(x => x.id === prod.id);
      if (item) item.qty++;
      else cart.push({ id: prod.id, qty: 1 });
      localStorage.setItem("dh_cart", JSON.stringify(cart));
      alert("Đã thêm vào giỏ hàng!");
    });
  });

