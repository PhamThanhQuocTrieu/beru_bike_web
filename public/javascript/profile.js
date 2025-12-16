
    // Function toggle password (cập nhật với hover và click)
    function togglePassword(inputId, eyeImg) {
      const input = document.getElementById(inputId);
      if (input.type === 'password') {
        input.type = 'text';
        eyeImg.src = '/image/icon/eye.png'; // Icon xem (visible)
        eyeImg.alt = 'Ẩn mật khẩu';
      } else {
        input.type = 'password';
        eyeImg.src = '/image/icon/noeye.png'; // Icon ẩn (hidden)
        eyeImg.alt = 'Xem mật khẩu';
      }
    }

    document.addEventListener('DOMContentLoaded', () => {
      // Auto-hide alerts after 5 seconds
      const successAlert = document.getElementById('successAlert');
      const errorAlert = document.getElementById('errorAlert');
      if (successAlert) {
        setTimeout(() => {
          successAlert.classList.add('hide');
        }, 5000);
      }
      if (errorAlert) {
        setTimeout(() => {
          errorAlert.classList.add('hide');
        }, 5000);
      }

       if (page === 'info') { 
        // Script cho page info (edit profile) - Giữ nguyên
        const editBtn = document.getElementById('editBtn');
        const saveBtn = document.getElementById('saveBtn');
        const cancelBtn = document.getElementById('cancelBtn');
        
        const formFields = document.querySelectorAll('.profile-form input[readonly], .profile-form select[disabled]');
        
        const avatarInput = document.getElementById('avatarInput');
        const avatarPreview = document.getElementById('avatarPreview');
        const dobInput = document.getElementById('dob');
        
        const originalValues = {};
        formFields.forEach(field => {
          if (field.tagName === 'INPUT') {
            originalValues[field.id] = field.value;
          } else if (field.tagName === 'SELECT') {
            originalValues[field.id] = field.value;
          }
        });
        const originalAvatarSrc = avatarPreview.src;
        
        editBtn.addEventListener('click', () => {
          formFields.forEach(input => {
            if (input.name !== 'email') {
              input.removeAttribute('readonly');
              input.removeAttribute('disabled');
              input.style.border = "1px solid #007bff";
              if (input.type === 'date') {
                input.focus();
                input.showPicker();
              }
            }
          });
          
          avatarInput.removeAttribute('disabled');
          
          console.log('🔓 Đã mở khóa fields:', formFields.length);
          
          editBtn.style.display = 'none';
          saveBtn.style.display = 'inline-block';
          cancelBtn.style.display = 'inline-block';
        });

        avatarInput.addEventListener('change', function(event) {
          const file = event.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
              avatarPreview.src = e.target.result;
            }
            reader.readAsDataURL(file);
          }
        });

        cancelBtn.addEventListener('click', () => {
          formFields.forEach(field => {
            if (field.name !== 'email') {
              if (field.tagName === 'INPUT') {
                field.value = originalValues[field.id] || '';
                field.setAttribute('readonly', true);
              } else if (field.tagName === 'SELECT') {
                field.value = originalValues[field.id] || '';
                field.setAttribute('disabled', true);
              }
              field.style.border = '';
            }
          });
          avatarInput.setAttribute('disabled', true);
          avatarPreview.src = originalAvatarSrc;
          avatarInput.value = '';
          
          console.log('❌ Đã hủy, restore fields');
          
          editBtn.style.display = 'inline-block';
          saveBtn.style.display = 'none';
          cancelBtn.style.display = 'none';
        });

        const form = document.querySelector('.profile-form-wrapper');
        form.addEventListener('submit', (e) => {
          const dobValue = dobInput.value;
          if (dobValue && isNaN(new Date(dobValue).getTime())) {
            e.preventDefault();
            alert('Ngày sinh không hợp lệ!');
            return;
          }
          const phoneValue = document.getElementById('phone').value;
          const phoneRegex = /^0\d{9,10}$/;
          if (phoneValue && !phoneRegex.test(phoneValue)) {
            e.preventDefault();
            alert('Số điện thoại không hợp lệ!');
            return;
          }
          console.log('📤 Submit form data:', new FormData(form));
        });
     } else if (page === 'change-password') { 
        // Script cho page change-password
        const newPassword = document.getElementById('newPassword');
        const confirmPassword = document.getElementById('confirmPassword');
        const form = document.querySelector('.profile-form-wrapper');

        confirmPassword.addEventListener('input', () => {
          if (newPassword.value !== confirmPassword.value) {
            confirmPassword.setCustomValidity('Mật khẩu xác nhận không khớp!');
          } else {
            confirmPassword.setCustomValidity('');
          }
        });

        form.addEventListener('submit', (e) => {
          const current = document.getElementById('currentPassword').value;
          const newPass = newPassword.value;
          const confirm = confirmPassword.value;

          if (!current || !newPass || !confirm) {
            e.preventDefault();
            alert('Vui lòng điền đầy đủ thông tin!');
            return;
          }
          if (newPass.length < 8) {
            e.preventDefault();
            alert('Mật khẩu mới phải ít nhất 8 ký tự!');
            return;
          }
          if (newPass !== confirm) {
            e.preventDefault();
            alert('Mật khẩu xác nhận không khớp!');
            return;
          }

          const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
          if (!passwordRegex.test(newPass)) {
            e.preventDefault();
            alert('Mật khẩu phải có chữ hoa, chữ thường, số và ký tự đặc biệt!');
            return;
          }
        });
       } 

      // Mobile dropdown logic (chung)
      const mobileToggle = document.getElementById('mobile-user-toggle');
      const mobileMenu = document.querySelector('.mobile-dropdown-menu');
      let isMobileOpen = false;
      if (mobileToggle && mobileMenu) {
        mobileToggle.addEventListener('click', (e) => {
          e.preventDefault();
          isMobileOpen = !isMobileOpen;
          mobileMenu.style.display = isMobileOpen ? 'block' : 'none';
        });
        document.addEventListener('click', (e) => {
          if (!mobileToggle.contains(e.target) && isMobileOpen) {
             mobileMenu.style.display = 'none';
             isMobileOpen = false;
          }
        });
      }
    });