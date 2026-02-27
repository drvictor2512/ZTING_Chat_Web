# ZTING - Chat Application Frontend

Frontend của ứng dụng chat ZTING được xây dựng bằng **React** với **Vite** và **React Router**.

## 🎯 Tính năng

- ✅ **Đăng nhập (Login)** - 2 bước: Email/Password + OTP
- ✅ **Đăng ký (Register)** - 2 bước: Email + OTP, sau đó nhập thông tin cá nhân
- ✅ **Quên mật khẩu (Forgot Password)** - 2 bước: Email + OTP, sau đó nhập mật khẩu mới
- ✅ **Trang chủ (Home)** - Hiển thị thông tin người dùng
- ✅ **Đăng xuất (Logout)**
- ✅ **Responsive Design** - Tương thích trên mọi thiết bị

## 📁 Cấu trúc Project

```
src/
├── pages/               # Các trang chính
│   ├── Login.jsx       # Trang đăng nhập
│   ├── Register.jsx    # Trang đăng ký
│   ├── ForgotPassword.jsx  # Trang quên mật khẩu
│   └── Home.jsx        # Trang chủ
├── services/           # API service
│   └── authService.js  # Hàm gọi API authentication
├── config/             # Configuration
│   └── api.js          # Cấu hình Axios
├── styles/             # CSS files
│   ├── auth.css        # Styles cho auth pages
│   └── home.css        # Styles cho home page
├── App.jsx             # Root component
├── main.jsx            # Entry point
└── index.css           # Global styles
```

## 🚀 Cài đặt và Chạy

### Yêu cầu
- Node.js 16+
- npm hoặc yarn

### Bước 1: Cài đặt Dependencies
```bash
npm install
```

### Bước 2: Chạy Development Server
```bash
npm run dev
```

Server sẽ chạy tại `http://localhost:5173/`

### Bước 3: Build cho Production
```bash
npm run build
```

## 🔌 API Integration

Frontend kết nối với Backend API đã deploy tại:
```
https://chatapp-backend-eiae.onrender.com
```

### API Endpoints

1. **Đăng nhập**
   - Endpoint: `POST /auth/signin`
   - Body: `{ email, password, otp? }`
   - Note: Lần đầu không cần OTP, sẽ nhận lỗi "OTP required", lần thứ 2 cần OTP

2. **Đăng ký**
   - Gửi OTP: `POST /auth/otp`
   - Body: `{ email }`
   - Đăng ký: `POST /auth/signup`
   - Body: `{ email, name, password, dateOfBirth, gender }`

3. **Quên mật khẩu**
   - Gửi OTP: `POST /auth/forgot-password`
   - Body: `{ email }`
   - Reset: `POST /auth/reset-password`
   - Body: `{ email, otp, newPassword }`

4. **Đăng xuất**
   - Endpoint: `POST /auth/signout`
   - Headers: `Authorization: Bearer {token}`

## 📝 Luồng Người Dùng

### Đăng Nhập
1. User nhập email + password → Click "ĐĂNG NHẬP"
2. Backend yêu cầu OTP
3. User nhập OTP từ email → Click "XÁC NHẬN"
4. Đăng nhập thành công → Redirect đến `/home`

### Đăng Ký
1. User nhập thông tin: Email, Họ tên, Password, Ngày sinh, Giới tính
2. Click "ĐĂNG KÝ"
3. Backend tạo tài khoản
4. Redirect đến `/login` để đăng nhập

### Quên Mật Khẩu
1. User nhập email → Click "Gửi mã OTP"
2. Backend gửi OTP đến email
3. User nhập OTP + mật khẩu mới
4. Click "Đổi mật khẩu" → Thành công
5. Redirect đến `/login`

## 🎨 Styling

- **Framework**: CSS Vanilla
- **Layout**: Flexbox, Grid
- **Responsive**: Mobile-first approach
- **Color Scheme**: Gradient (Purple/Blue)

## 🔐 Security

- Token lưu trong `localStorage`
- Axios interceptor tự động attach token vào requests
- Auto redirect đến `/login` khi token hết hạn (401 Unauthorized)

## 🛠️ Technologies

- **React 18** - UI library
- **Vite** - Build tool
- **React Router v6** - Routing
- **Axios** - HTTP client
- **CSS3** - Styling

## 📖 Hướng Dẫn Phát Triển

### Thêm Tính Năng Mới

1. Tạo component: `src/pages/YourPage.jsx`
2. Thêm route vào `App.jsx`
3. Nếu cần gọi API, dùng `authService` hoặc tạo service mới tương tự
4. Style trong `src/styles/`

### Gọi API
```javascript
import authService from '../services/authService'

// Ví dụ:
const response = await authService.login(email, password, otp)
if (response.token) {
  navigate('/home')
}
```

## 📞 Liên Hệ & Hỗ Trợ

Nếu gặp vấn đề:
1. Kiểm tra console browser (F12) xem lỗi gì
2. Kiểm tra Network tab xem API call thành công không
3. Kiểm tra Backend API documentation

---

**Created**: February 2026  
**Version**: 1.0.0
