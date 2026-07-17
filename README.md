# ระบบแจ้งซ่อมบำรุงในสถานศึกษา

School Repair & Maintenance System — Full-Stack Web Application

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express |
| Database | MySQL 8.0 |
| Frontend | HTML5 + Bootstrap 5 + jQuery |
| Auth | express-session + bcrypt |
| Upload | Multer (local) / Google Drive API |
| PDF | PDFKit |
| Notifications | LINE Notify API |

## Quick Start

```bash
# 1. Clone & Install
cd school-repair-frontend
npm install

# 2. Setup Database
cp .env.example .env
# Edit .env with your MySQL credentials
# Run sql/schema.sql and sql/seed.sql

# 3. Start Server
npm run dev

# 4. Open Browser
open http://localhost:3000
```

## Project Structure

```
school-repair-frontend/
├── app.js              # Express backend
├── package.json
├── .env.example
├── public/
│   ├── app.js          # Front-end SPA router & API client
│   ├── css/
│   │   └── custom.css  # Bootstrap overrides
│   ├── js/             # Additional JS modules
│   └── uploads/        # Uploaded images/PDFs
├── views/
│   ├── index.html      # Main layout (sidebar + content area)
│   ├── login.html      # Login page
│   ├── dashboard.html  # Dashboard with stats
│   ├── repair-list.html    # Repair tickets list
│   ├── repair-form.html    # Create new repair
│   ├── repair-detail.html  # Repair detail + status flow
│   ├── inventory.html      # Spare parts & stock
│   ├── assets.html         # Asset management
│   ├── users.html          # User management (admin)
│   └── settings.html       # System settings
└── sql/
    ├── schema.sql      # Database schema
    └── seed.sql        # Initial data
```

## User Roles

| Role | Permissions |
|------|------------|
| **SuperAdmin** | Full access: users, settings, reports, all repairs |
| **SuperUser** | Repair management, inventory, asset view |
| **User** | Create repair tickets, view own tickets |

## API Endpoints

See the design widget for full API documentation.

## Features

- ✅ Session-based authentication with bcrypt
- ✅ Role-based access control
- ✅ Repair ticket creation with image upload (3 images)
- ✅ Digital signature capture (HTML5 Canvas)
- ✅ Status workflow with audit logs
- ✅ Spare parts inventory with stock transactions
- ✅ Asset management with QR code generation
- ✅ LINE Notify integration
- ✅ PDF export for repair tickets
- ✅ Responsive design (mobile-first)

## License

MIT
