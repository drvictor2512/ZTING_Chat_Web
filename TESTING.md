# 🧪 Testing Guide - ZTING Frontend

## Cách Test Ứng Dụng

### 1. Đăng Ký (Register)

#### Test Case 1: Đăng ký thành công
1. Truy cập `http://localhost:5173/register`
2. Điền thông tin:
   - Họ tên: `Nguyễn Văn A`
   - Email: `test@example.com` (thay đổi mỗi lần để tránh "Email đã được sử dụng")
   - Password: `Password123` (ít nhất 8 ký tự)
   - Confirm Password: `Password123`
   - Ngày sinh: `01/01/2000`
   - Giới tính: `Nam`
3. Click "ĐĂNG KÝ"
4. Nếu thành công, sẽ redirect về `/login`

#### Test Case 2: Lỗi - Email không hợp lệ
1. Nhập email: `invalidemail`
2. Click "ĐĂNG KÝ"
3. Kỳ vọng: Lỗi "Email không hợp lệ"

#### Test Case 3: Lỗi - Password quá ngắn
1. Nhập password: `Short1`
2. Click "ĐĂNG KÝ"
3. Kỳ vọng: Lỗi "Mật khẩu phải có ít nhất 8 ký tự"

#### Test Case 4: Lỗi - Confirm password không trùng
1. Password: `Password123`
2. Confirm Password: `Password456`
3. Click "ĐĂNG KÝ"
4. Kỳ vọng: Lỗi "Mật khẩu không trùng khớp"

#### Test Case 5: Lỗi - Email đã tồn tại
1. Nhập email: `existing@example.com` (email đã đăng ký trước)
2. Điền thông tin khác
3. Click "ĐĂNG KÝ"
4. Kỳ vọng: Lỗi "Email đã được sử dụng"

---

### 2. Đăng Nhập (Login)

#### Test Case 1: Đăng nhập thành công
1. Truy cập `http://localhost:5173/login`
2. Nhập email: `test@example.com` (email đã đăng ký)
3. Nhập password: `Password123`
4. Click "ĐĂNG NHẬP"
   - Bước 1: Backend gửi OTP
   - Kỳ vọng: Trang chuyển sang nhập OTP
5. Kiểm tra email để lấy OTP
6. Nhập OTP vào form
7. Click "XÁC NHẬN"
8. Nếu thành công, sẽ redirect về `/home`
9. Trang Home sẽ hiển thị thông tin người dùng

#### Test Case 2: Lỗi - Email không tồn tại
1. Nhập email: `nonexistent@example.com`
2. Nhập password: `AnyPassword123`
3. Click "ĐĂNG NHẬP"
4. Kỳ vọng: Lỗi "Người dùng không tồn tại"

#### Test Case 3: Lỗi - Password sai
1. Nhập email: `test@example.com`
2. Nhập password: `WrongPassword123`
3. Click "ĐĂNG NHẬP"
4. Kỳ vọng: Lỗi "Mật khẩu không đúng"

#### Test Case 4: Lỗi - OTP không đúng
1. Hoàn thành bước email/password
2. Nhập OTP sai: `000000`
3. Click "XÁC NHẬN"
4. Kỳ vọng: Lỗi "OTP không hợp lệ" hoặc "OTP đã hết hạn"

---

### 3. Quên Mật Khẩu (Forgot Password)

#### Test Case 1: Reset mật khẩu thành công
1. Truy cập `http://localhost:5173/login`
2. Click "Quên mật khẩu?"
3. Nhập email: `test@example.com`
4. Click "Gửi mã OTP"
5. Chờ email OTP
6. Kiểm tra email để lấy OTP
7. Nhập OTP vào form
8. Nhập mật khẩu mới: `NewPassword123`
9. Confirm: `NewPassword123`
10. Click "Đổi mật khẩu"
11. Nếu thành công, redirect về `/login`
12. Test login với mật khẩu mới

#### Test Case 2: Lỗi - Email không tồn tại
1. Nhập email: `nonexistent@example.com`
2. Click "Gửi mã OTP"
3. Kỳ vọng: Lỗi "Người dùng không tồn tại"

#### Test Case 3: Lỗi - OTP hết hạn
1. Gửi OTP lần 1
2. Chờ > 15 phút hoặc gửi OTP lần 2 (xóa OTP cũ)
3. Nhập OTP lần 1
4. Click "Đổi mật khẩu"
5. Kỳ vọng: Lỗi "OTP đã hết hạn"

#### Test Case 4: Lỗi - Mật khẩu mới quá ngắn
1. Nhập mật khẩu mới: `Short1`
2. Click "Đổi mật khẩu"
3. Kỳ vọng: Lỗi "Mật khẩu phải có ít nhất 8 ký tự"

---

### 4. Home Page (Trang chủ)

#### Test Case 1: Hiển thị thông tin người dùng
1. Login thành công (tham khảo test Login)
2. Trang Home sẽ hiển thị:
   - Tên người dùng: `Hello, Nguyễn Văn A`
   - Email: `test@example.com`
   - Ngày sinh: `01/01/2000` (nếu có)
   - Giới tính: `Nam` (nếu có)

#### Test Case 2: Đăng xuất
1. Click nút "Đăng xuất"
2. Kỳ vọng: Redirect về `/login`
3. Kiểm tra localStorage xóa token: F12 → Application → Local Storage

#### Test Case 3: Protect route (Không login không vào được)
1. Xóa token từ localStorage
2. Truy cập trực tiếp `http://localhost:5173/home`
3. Kỳ vọng: Tự động redirect về `/login`

---

### 5. Navigation Testing

#### Test Case 1: Login → Register
1. Trên trang Login, click tab "Đăng ký"
2. Kỳ vọng: Navigate đến `/register`

#### Test Case 2: Register → Login
1. Trên trang Register, click tab "Đăng nhập"
2. Kỳ vọng: Navigate đến `/login`

#### Test Case 3: Register → Login (sau khi đăng ký thành công)
1. Hoàn thành đăng ký thành công
2. Kỳ vọng: Auto redirect đến `/login`

#### Test Case 4: Forgot Password → Login
1. Trên trang Forgot Password, click "← Quay lại" trong step 2
2. Kỳ vọng: Quay về step 1 (email)
3. Click link "← Quay lại" ở top
4. Kỳ vọng: Navigate đến `/login`

---

## 🐛 Debugging Tips

### 1. Kiểm tra Console Browser
```
F12 → Console → Xem lỗi JavaScript
```

### 2. Kiểm tra Network Requests
```
F12 → Network → Xem request/response API
```

### 3. Kiểm tra localStorage
```
F12 → Application → Local Storage → localhost:5173
- token: JWT token
- user: JSON user object
```

### 4. Kiểm tra API Response
Mở Network tab, click request API, xem Response để kiểm tra lỗi từ backend

---

## 📋 Checklist Testing

- [ ] Register - Email validation
- [ ] Register - OTP sending
- [ ] Register - User creation
- [ ] Register - Password validation
- [ ] Login - OTP flow
- [ ] Login - User authentication
- [ ] Login - Token storage
- [ ] Forgot Password - OTP flow
- [ ] Forgot Password - Password reset
- [ ] Home - User info display
- [ ] Logout - Token removal
- [ ] Navigation - All links working
- [ ] Responsive - Mobile view
- [ ] Error handling - All error messages

---

## 🚀 Test Accounts

Sau khi đăng ký, bạn có thể sử dụng những tài khoản này để test:

| Email | Password | Status |
|-------|----------|--------|
| test@example.com | Password123 | Test |
| user2@example.com | Password123 | Test |

---

**Note**: OTP được gửi qua email, hãy kiểm tra email spam hoặc inbox.
