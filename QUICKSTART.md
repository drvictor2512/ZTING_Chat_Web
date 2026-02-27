# 🚀 Quick Start Guide - ZTING Frontend

## Step 1: Chạy Ứng Dụng ✅

Dev server đã chạy tại: **http://localhost:5173**

Nếu cần restart:
```bash
cd "c:\IUH LEARN\2026\Project\ChatApp\ChatApp-Frontend"
npm run dev
```

## Step 2: Tài Khoản Test

### Test Registration:
1. Truy cập: http://localhost:5173/register
2. Điền thông tin: Họ tên, Email, Password, Ngày sinh, Giới tính
3. Click "ĐĂNG KÝ" 
4. Nếu thành công sẽ tự động chuyển sang trang Login
5. Dùng tài khoản vừa đăng ký để test login

### Test Login:
1. Truy cập: http://localhost:5173/login
2. Nhập tài khoản đã đăng ký
3. Email/Password → Click "ĐĂNG NHẬP"
4. Nhập OTP từ email → Click "XÁC NHẬN"
5. Vào trang Home

## Step 3: Kiểm tra Giao Diện

### ✅ Pages:
- [x] Login: http://localhost:5173/login
- [x] Register: http://localhost:5173/register
- [x] Forgot Password: http://localhost:5173/forgot-password
- [x] Home: http://localhost:5173/home (require login)

### ✅ Features:
- [x] Email validation
- [x] Password validation (min 8 chars)
- [x] OTP flow
- [x] User session
- [x] Error messages
- [x] Responsive design

## Step 4: API Details

**Backend URL**: https://chatapp-backend-eiae.onrender.com

```
POST /auth/signin      → Login with OTP
POST /auth/signup      → Register
POST /auth/otp         → Send OTP
POST /auth/forgot-password → Reset OTP
POST /auth/reset-password  → Reset password
```

## Troubleshooting

### ❌ Lỗi: "OTP không hợp lệ"
→ Check email inbox/spam folder lại  
→ OTP hết hạn sau 15 phút  
→ Gửi OTP mới

### ❌ Lỗi: "Email đã được sử dụng"
→ Dùng email khác cho test registration  
→ Hoặc check database xem email có được dùng chưa

### ❌ Trang không load
→ Kiểm tra dev server đang chạy (terminal)  
→ Refresh browser (Ctrl+F5)  
→ Check console (F12) xem lỗi gì

### ❌ API không respond
→ Check backend deploy tại: https://chatapp-backend-eiae.onrender.com  
→ Nếu backend down, hãy check network tab (F12)

## 📁 Project Files

```
ChatApp-Frontend/
├── src/              # Source code
├── README.md         # Full documentation
├── TESTING.md        # Testing guide
├── PROJECT_SUMMARY.md # Project overview
└── package.json      # Dependencies
```

## 🎯 Next Steps

1. ✅ Test all workflows (refer to TESTING.md)
2. ✅ Check error handling
3. ✅ Test on mobile (Responsive)
4. ✅ Check console for warnings
5. ✅ Deploy to production (npm run build)

## 📞 Documentation

- **README.md** - Full setup & features
- **TESTING.md** - Test cases & QA guide
- **PROJECT_SUMMARY.md** - Project overview
- **.env.example** - Configuration template

---

**Status**: ✅ Ready to Use  
**Last Updated**: Feb 27, 2026

**Need Help?** Check the documentation files above or the browser console (F12).
