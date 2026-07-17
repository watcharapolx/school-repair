// ============================================================
// app.js — Express Backend (Production Ready)
// School Repair Management System
// ============================================================

require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const session = require('express-session');
const bcrypt = require('bcrypt');
const multer = require('multer');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

// ─── Dynamic Port (แก้ปัญหา EADDRINUSE) ───
const PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = '127.0.0.1';

// ─── สร้าง uploads folder ถ้ายังไม่มี ───
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ─── MySQL Connection Pool ───
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+07:00'
});

// ─── ทดสอบเชื่อมต่อ Database ───
async function testDB() {
  try {
    const [rows] = await db.execute('SELECT 1 + 1 AS result');
    console.log('✅ Database connected! 1 + 1 =', rows[0].result);
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error('ตรวจสอบ .env และ MariaDB ว่ารันอยู่หรือไม่');
  }
}
testDB();

// ─── Middleware ───
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Session ───
app.use(session({
  secret: process.env.SESSION_SECRET || 'default-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 1000 * 60 * 60 * 8 // 8 ชั่วโมง
  }
}));

// ─── Multer Config ───
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/'),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// ─── Auth Middleware ───
const isAuth = (req, res, next) => {
  console.log(`[AUTH CHECK] isAuth - userId: ${req.session.userId}, role: ${req.session.role}`);
  if (req.session.userId) return next();
  res.status(401).json({ success: false, message: 'กรุณาเข้าสู่ระบบ' });
};

const isAdmin = (req, res, next) => {
  console.log(`[AUTH CHECK] isAdmin - userId: ${req.session.userId}, role: ${req.session.role}`);
  if (req.session.role === 'SuperAdmin') return next();
  res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง' });
};

const isStaff = (req, res, next) => {
  console.log(`[AUTH CHECK] isStaff - userId: ${req.session.userId}, role: ${req.session.role}`);
  if (['SuperAdmin', 'SuperUser'].includes(req.session.role)) return next();
  res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง' });
};

// ─── Serve Static Files ───
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// ─── Serve Views (HTML) ───
function renderGASHtml(filePath) {
  if (!fs.existsSync(filePath)) return '';
  let content = fs.readFileSync(filePath, 'utf8');

  // แปลง tag <?!= include ('filename') ?> ให้ดึงเนื้อหาจากไฟล์มารวมกัน
  const includeRegex = /<\?!= include\s*\(\s*['"](.*?)['"]\s*\)\s*\?>/g;
  content = content.replace(includeRegex, (match, filename) => {
    let includePath = path.join(__dirname, 'views', filename);
    // ถ้าผู้ใช้ไม่ได้ใส่ .html ต่อท้าย ให้เติมให้
    if (!includePath.endsWith('.html')) includePath += '.html';
    return renderGASHtml(includePath); // เรียกซ้ำ (Recursive) เผื่อไฟล์ทีถูก include มี include ซ้อนอีก
  });

  // ลบตัวแปร <?= params ?> ของ GAS ให้เป็น Object ว่างเพื่อป้องกัน JS Error ตอนรันใน Node
  const paramsRegex = /<\?=\s*params\s*\?>/g;
  content = content.replace(paramsRegex, '{"scanned": false}');

  return content;
}

app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'views', 'index.html');
  const html = renderGASHtml(indexPath);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

app.get('/views/:view', (req, res) => {
  const viewPath = path.join(__dirname, 'views', req.params.view);
  if (fs.existsSync(viewPath)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(renderGASHtml(viewPath));
  } else {
    res.status(404).send('View not found');
  }
});

// ═══════════════════════════════════════
//  HELPER FUNCTIONS
// ═══════════════════════════════════════

async function logUserAction(userId, username, action, req) {
  try {
    await db.execute(
      `INSERT INTO log_users (user_id, username, action, ip_address, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [userId, username, action, req.ip, req.headers['user-agent']]
    );
  } catch (e) {
    console.error('Log error:', e);
  }
}

async function addRepairLog(repairId, statusId, actorName, actorId, actionDetail, note = '') {
  await db.execute(
    `INSERT INTO repair_logs (repair_id, status_id, actor_name, actor_id, action_detail, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [repairId, statusId, actorName, actorId, actionDetail, note]
  );
}

const https = require('https');
const querystring = require('querystring');

async function sendLineNotify(message) {
  try {
    const [rows] = await db.execute("SELECT setting_value FROM settings WHERE setting_key = 'line_notify_token'");
    let token = rows[0]?.setting_value;
    if (!token) {
      token = process.env.LINE_NOTIFY_TOKEN;
    }
    if (!token || token.includes('your_line_notify_token_here')) {
      console.log('⚠️ LINE Notify Token is not set or using default template');
      return false;
    }
    const postData = querystring.stringify({ message });
    return new Promise((resolve) => {
      const req = https.request(
        {
          hostname: 'notify-api.line.me',
          path: '/api/notify',
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${token}`,
            'Content-Length': Buffer.byteLength(postData)
          }
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => body += chunk);
          res.on('end', () => {
            console.log('LINE Notify response:', body);
            resolve(res.statusCode === 200);
          });
        }
      );
      req.on('error', (e) => {
        console.error('LINE Notify request error:', e);
        resolve(false);
      });
      req.write(postData);
      req.end();
    });
  } catch (err) {
    console.error('LINE Notify helper error:', err);
    return false;
  }
}


// ═══════════════════════════════════════
//  AUTH ROUTES
// ═══════════════════════════════════════

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });
    }

    const [rows] = await db.execute(
      "SELECT * FROM users WHERE username = ? AND status != 'inactive'",
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    const user = rows[0];
    // ตรวจสอบแบบรหัสผ่านตรงตัว (Plain Text) ตามที่ผู้ใช้ระบุ ไม่ใช้ Bcrypt Hashing
    const match = (password === user.password_hash);
    console.log(`[LOGIN] Username: ${username}, Input: ${password}, DB: ${user.password_hash}, Match: ${match}`);

    if (!match) {
      return res.status(401).json({ success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.status;
    req.session.fullname = user.fullname;

    await db.execute(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [user.id]
    );

    await logUserAction(user.id, username, 'เข้าสู่ระบบ', req);

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        fullname: user.fullname,
        department: user.department_id,
        status: user.status,
        avatar_url: user.avatar_url
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด: ' + err.message });
  }
});

// Logout
app.post('/api/auth/logout', isAuth, async (req, res) => {
  await logUserAction(req.session.userId, req.session.username, 'ออกจากระบบ', req);
  req.session.destroy((err) => {
    if (err) console.error('Session destroy error:', err);
  });
  res.json({ success: true });
});

// Get current user
app.get('/api/auth/me', isAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT u.id, u.username, u.fullname, u.department_id, u.location_id, u.status, u.avatar_url, u.phone, u.email, u.last_login,
              d.name AS department_name, l.name AS location_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       LEFT JOIN locations l ON u.location_id = l.id
       WHERE u.id = ?`,
      [req.session.userId]
    );
    if (rows.length === 0) {
      req.session.destroy();
      return res.status(401).json({ success: false, message: 'ผู้ใช้ไม่พบ' });
    }
    res.json({ success: true, user: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update profile (for logged-in user to update their own info & upload avatar)
app.put('/api/auth/profile', isAuth, upload.single('avatar'), async (req, res) => {
  try {
    const { fullname, password, phone, email } = req.body;
    const userId = req.session.userId;

    let avatar_url = null;
    if (req.file) {
      avatar_url = `/public/uploads/${req.file.filename}`;
    } else if (req.body.avatar_url) {
      avatar_url = req.body.avatar_url;
    }

    let sql = 'UPDATE users SET fullname = ?, phone = ?, email = ?';
    const params = [fullname, phone || null, email || null];

    if (avatar_url) {
      sql += ', avatar_url = ?';
      params.push(avatar_url);
    }

    if (password) {
      const hash = await bcrypt.hash(password, 10);
      sql += ', password_hash = ?';
      params.push(hash);
    }

    sql += ' WHERE id = ?';
    params.push(userId);

    await db.execute(sql, params);

    // Fetch updated user info
    const [rows] = await db.execute(
      `SELECT u.id, u.username, u.fullname, u.department_id, u.location_id, u.status, u.avatar_url, u.phone, u.email,
              d.name AS department_name, l.name AS location_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       LEFT JOIN locations l ON u.location_id = l.id
       WHERE u.id = ?`,
      [userId]
    );

    res.json({ success: true, user: rows[0] });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════
//  SETTINGS ROUTES
// ═══════════════════════════════════════

app.get('/api/settings', isAuth, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT setting_key, setting_value FROM settings');
    const settings = {};
    rows.forEach(r => settings[r.setting_key] = r.setting_value);
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/settings/:key', isAdmin, async (req, res) => {
  try {
    const { setting_value } = req.body;
    await db.execute(
      'UPDATE settings SET setting_value = ? WHERE setting_key = ?',
      [setting_value, req.params.key]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Bulk update settings
app.put('/api/settings', isAdmin, async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const settings = req.body;
    for (const [key, val] of Object.entries(settings)) {
      const [rows] = await conn.execute('SELECT 1 FROM settings WHERE setting_key = ?', [key]);
      if (rows.length > 0) {
        await conn.execute('UPDATE settings SET setting_value = ? WHERE setting_key = ?', [val, key]);
      } else {
        await conn.execute('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)', [key, val]);
      }
    }
    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
});

// Test LINE Notify
app.post('/api/settings/line-notify/test', isAuth, async (req, res) => {
  try {
    const { message } = req.body;
    const success = await sendLineNotify(message || 'ทดสอบส่งข้อความแจ้งเตือนจากระบบแจ้งซ่อม');
    if (success) {
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, message: 'ส่งข้อความทดสอบล้มเหลว กรุณาตรวจสอบ Token ของคุณ' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// ═══════════════════════════════════════
//  MASTER DATA ROUTES
// ═══════════════════════════════════════

// Departments
app.get('/api/departments', isAuth, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM departments ORDER BY id');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/departments', isAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    const [result] = await db.execute('INSERT INTO departments (name) VALUES (?)', [name]);
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/departments/:id', isAdmin, async (req, res) => {
  try {
    await db.execute('UPDATE departments SET name = ? WHERE id = ?', [req.body.name, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/departments/:id', isAdmin, async (req, res) => {
  try {
    await db.execute('DELETE FROM departments WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Locations
app.get('/api/locations', isAuth, async (req, res) => {
  try {
    const { department_id } = req.query;
    let sql = 'SELECT * FROM locations WHERE 1=1';
    const params = [];
    if (department_id) {
      sql += ' AND department_id = ?';
      params.push(department_id);
    }
    sql += ' ORDER BY id';
    const [rows] = await db.execute(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/locations', isAdmin, async (req, res) => {
  try {
    const { name, department_id } = req.body;
    const [result] = await db.execute('INSERT INTO locations (name, department_id) VALUES (?, ?)', [name, department_id || null]);
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/locations/:id', isAdmin, async (req, res) => {
  try {
    const { name, department_id } = req.body;
    await db.execute('UPDATE locations SET name = ?, department_id = ? WHERE id = ?', [name, department_id || null, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/locations/:id', isAdmin, async (req, res) => {
  try {
    await db.execute('DELETE FROM locations WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Class Types
app.get('/api/class-types', isAuth, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM class_types ORDER BY id');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/class-types', isAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    const [result] = await db.execute('INSERT INTO class_types (name) VALUES (?)', [name]);
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/class-types/:id', isAdmin, async (req, res) => {
  try {
    await db.execute('UPDATE class_types SET name = ? WHERE id = ?', [req.body.name, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/class-types/:id', isAdmin, async (req, res) => {
  try {
    await db.execute('DELETE FROM class_types WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Repair Statuses
app.get('/api/repair-statuses', isAuth, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM repair_statuses ORDER BY display_order');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Objectives (วัตถุประสงค์)
app.get('/api/objectives', isAuth, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM objectives ORDER BY id');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/objectives', isAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'กรุณาระบุชื่อวัตถุประสงค์' });
    const [result] = await db.execute('INSERT INTO objectives (name) VALUES (?)', [name]);
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/objectives/:id', isAdmin, async (req, res) => {
  try {
    await db.execute('UPDATE objectives SET name = ? WHERE id = ?', [req.body.name, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/objectives/:id', isAdmin, async (req, res) => {
  try {
    await db.execute('DELETE FROM objectives WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════
//  USER MANAGEMENT ROUTES
// ═══════════════════════════════════════

// List all users (admin only)
app.get('/api/users', isAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT u.id, u.username, u.fullname, u.department_id, u.location_id, u.status, u.avatar_url, u.phone, u.email, u.last_login, u.created_at,
              d.name AS department_name, l.name AS location_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       LEFT JOIN locations l ON u.location_id = l.id
       ORDER BY u.created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Search users by name or username (for repair form autocomplete)
app.get('/api/users/search', isAuth, async (req, res) => {
  try {
    const q = req.query.q ? `%${req.query.q}%` : '%';
    const [rows] = await db.execute(
      `SELECT u.id, u.username, u.fullname, u.department_id, u.location_id, u.phone,
              d.name AS department_name, l.name AS location_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       LEFT JOIN locations l ON u.location_id = l.id
       WHERE (u.fullname LIKE ? OR u.username LIKE ? OR u.id LIKE ?)
         AND u.status != 'inactive'
       LIMIT 10`,
      [q, q, q]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get single user by ID
app.get('/api/users/:id', isAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT u.id, u.username, u.fullname, u.department_id, u.location_id, u.status, u.avatar_url, u.phone, u.email, u.sig_url, u.last_login,
              d.name AS department_name, l.name AS location_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       LEFT JOIN locations l ON u.location_id = l.id
       WHERE u.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// ═══════════════════════════════════════
//  REPAIR ROUTES
// ═══════════════════════════════════════

// Get all repairs (with filters)
app.get('/api/repairs', isAuth, async (req, res) => {
  try {
    const { status, dept, search, assignee, limit = 20, offset = 0 } = req.query;

    let sql = `
      SELECT r.*, rs.name AS status_name, rs.color_code, rs.is_terminal,
             d.name AS department_name, l.name AS location_name, ct.name AS class_type_name,
             u.fullname AS assignee_name
      FROM repairs r
      LEFT JOIN repair_statuses rs ON r.status_id = rs.id
      LEFT JOIN departments d ON r.department_id = d.id
      LEFT JOIN locations l ON r.location_id = l.id
      LEFT JOIN class_types ct ON r.class_type_id = ct.id
      LEFT JOIN users u ON r.assignee_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND r.status_id = ?';
      params.push(status);
    }
    if (dept) {
      sql += ' AND r.department_id = ?';
      params.push(dept);
    }
    if (assignee) {
      sql += ' AND r.assignee_id = ?';
      params.push(assignee);
    }
    if (search) {
      sql += ' AND (r.repair_id LIKE ? OR r.reporter_name LIKE ? OR r.detail LIKE ? OR r.asset_no LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY r.reported_date DESC, r.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await db.execute(sql, params);

    // Count total
    let countSql = 'SELECT COUNT(*) AS total FROM repairs r WHERE 1=1';
    const countParams = [];
    if (status) { countSql += ' AND r.status_id = ?'; countParams.push(status); }
    if (dept) { countSql += ' AND r.department_id = ?'; countParams.push(dept); }
    if (assignee) { countSql += ' AND r.assignee_id = ?'; countParams.push(assignee); }
    if (search) { countSql += ' AND (r.repair_id LIKE ? OR r.reporter_name LIKE ? OR r.detail LIKE ? OR r.asset_no LIKE ?)'; countParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`); }
    const [countRows] = await db.execute(countSql, countParams);

    res.json({ success: true, data: rows, total: countRows[0].total });
  } catch (err) {
    console.error('Get repairs error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get single repair
app.get('/api/repairs/:id', isAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT r.*, rs.name AS status_name, rs.color_code, rs.is_terminal,
             d.name AS department_name, l.name AS location_name, ct.name AS class_type_name,
             u.fullname AS assignee_name
      FROM repairs r
      LEFT JOIN repair_statuses rs ON r.status_id = rs.id
      LEFT JOIN departments d ON r.department_id = d.id
      LEFT JOIN locations l ON r.location_id = l.id
      LEFT JOIN class_types ct ON r.class_type_id = ct.id
      LEFT JOIN users u ON r.assignee_id = u.id
      WHERE r.repair_id = ?
    `, [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบรายการ' });
    }

    const [logs] = await db.execute(
      `SELECT rl.*, rs.name AS status_name, rs.color_code
       FROM repair_logs rl
       LEFT JOIN repair_statuses rs ON rl.status_id = rs.id
       WHERE rl.repair_id = ?
       ORDER BY rl.created_at ASC`,
      [req.params.id]
    );

    res.json({ success: true, data: { ...rows[0], logs } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create repair
app.post('/api/repairs', isAuth, upload.array('images', 3), async (req, res) => {
  try {
    const {
      repair_id, reported_date, reporter_name, department_id, phone,
      location_id, class_type_id, asset_no, detail, problem
    } = req.body;

    const imgUrls = req.files?.map(f => `/uploads/${f.filename}`) || [];

    const valRepairId = repair_id || '';
    const valReportedDate = reported_date || null;
    const valReporterName = reporter_name || '';
    const valDeptId = department_id !== undefined && department_id !== '' ? department_id : null;
    const valPhone = phone !== undefined ? phone : null;
    const valLocId = location_id !== undefined && location_id !== '' ? location_id : null;
    const valClassTypeId = class_type_id !== undefined && class_type_id !== '' ? class_type_id : null;
    const valAssetNo = asset_no !== undefined ? asset_no : '-';
    const valDetail = detail || '';
    const valProblem = problem !== undefined ? problem : null;

    const valImg1 = imgUrls[0] !== undefined ? imgUrls[0] : null;
    const valImg2 = imgUrls[1] !== undefined ? imgUrls[1] : null;
    const valImg3 = imgUrls[2] !== undefined ? imgUrls[2] : null;

    await db.execute(`
      INSERT INTO repairs (repair_id, status_id, reported_date, reporter_name, department_id, phone,
        location_id, class_type_id, asset_no, detail, problem,
        img1_url, img2_url, img3_url, created_at)
      VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      valRepairId, valReportedDate, valReporterName, valDeptId, valPhone,
      valLocId, valClassTypeId, valAssetNo, valDetail, valProblem,
      valImg1, valImg2, valImg3
    ]);

    await addRepairLog(valRepairId, 1, valReporterName, req.session.userId, 'รอตรวจสอบ', 'แจ้งซ่อมใหม่');

    // Send automatic LINE Notify
    try {
      const [[deptRow]] = department_id ? await db.execute('SELECT name FROM departments WHERE id = ?', [department_id]) : [[null]];
      const [[locRow]] = location_id ? await db.execute('SELECT name FROM locations WHERE id = ?', [location_id]) : [[null]];
      
      const message = `
🔔 มีรายการแจ้งซ่อมใหม่!
เลขที่: ${repair_id}
ผู้แจ้ง: ${reporter_name}
หน่วยงาน: ${deptRow?.name || '-'}
สถานที่: ${locRow?.name || '-'}
รายละเอียด: ${detail}
      `.trim();
      await sendLineNotify(message);
    } catch (lineErr) {
      console.error('Failed to send LINE notification on create:', lineErr);
    }

    res.json({ success: true, repair_id });
  } catch (err) {
    console.error('Create repair error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update repair (general info)
app.put('/api/repairs/:id', isStaff, async (req, res) => {
  try {
    const {
      reporter_name, department_id, phone, location_id, class_type_id,
      asset_no, detail, problem, repair_list, cost
    } = req.body;

    await db.execute(`
      UPDATE repairs SET
        reporter_name = ?, department_id = ?, phone = ?, location_id = ?,
        class_type_id = ?, asset_no = ?, detail = ?, problem = ?,
        repair_list = ?, cost = ?, updated_at = NOW()
      WHERE repair_id = ?
    `, [
      reporter_name, department_id || null, phone || null, location_id || null,
      class_type_id || null, asset_no || '-', detail, problem || null,
      repair_list || null, cost || 0, req.params.id
    ]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update status
app.put('/api/repairs/:id/status', isStaff, async (req, res) => {
  try {
    const { status_id, note, assignee_id } = req.body;
    const repairId = req.params.id;

    const [repairRows] = await db.execute('SELECT * FROM repairs WHERE repair_id = ?', [repairId]);
    if (repairRows.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบรายการ' });
    }

    const updateFields = ['status_id = ?', 'updated_at = NOW()'];
    const updateValues = [status_id];

    if (assignee_id) {
      updateFields.push('assignee_id = ?');
      updateValues.push(assignee_id);
    }

    // If status is "ซ่อมสำเร็จ" (4) or terminal, set received_date if not set
    const [statusRows] = await db.execute('SELECT * FROM repair_statuses WHERE id = ?', [status_id]);
    if (statusRows.length > 0 && statusRows[0].is_terminal && !repairRows[0].received_date) {
      updateFields.push('received_date = CURDATE()');
    }

    await db.execute(
      `UPDATE repairs SET ${updateFields.join(', ')} WHERE repair_id = ?`,
      [...updateValues, repairId]
    );

    await addRepairLog(
      repairId, status_id,
      req.session.fullname || 'ช่างซ่อม',
      req.session.userId,
      statusRows[0]?.name || 'อัปเดตสถานะ',
      note || ''
    );

    // Send automatic LINE Notify on status update
    try {
      const statusName = statusRows[0]?.name || 'อัปเดตสถานะ';
      const actorName = req.session.fullname || 'ช่างซ่อม';
      const message = `
🔔 อัปเดตสถานะใบแจ้งซ่อม
เลขที่: ${repairId}
สถานะใหม่: ${statusName}
ผู้ดำเนินการ: ${actorName}
หมายเหตุ: ${note || '-'}
      `.trim();
      await sendLineNotify(message);
    } catch (lineErr) {
      console.error('Failed to send LINE notification on status update:', lineErr);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Assign repair
app.put('/api/repairs/:id/assign', isStaff, async (req, res) => {
  try {
    const { assignee_id, sig_assignee_url } = req.body;
    await db.execute(
      'UPDATE repairs SET assignee_id = ?, sig_assignee_url = ?, updated_at = NOW() WHERE repair_id = ?',
      [assignee_id, sig_assignee_url || null, req.params.id]
    );

    const [userRows] = await db.execute('SELECT fullname FROM users WHERE id = ?', [assignee_id]);
    await addRepairLog(
      req.params.id, 2, req.session.fullname, req.session.userId,
      'มอบหมายงาน', `มอบหมายให้ ${userRows[0]?.fullname || assignee_id}`
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get PDF Report
app.get('/api/repairs/:id/pdf', isAuth, async (req, res) => {
  try {
    const repairId = req.params.id;
    const [rows] = await db.execute(`
      SELECT r.*, rs.name AS status_name, rs.color_code, rs.is_terminal,
             d.name AS department_name, l.name AS location_name, ct.name AS class_type_name,
             u.fullname AS assignee_name
      FROM repairs r
      LEFT JOIN repair_statuses rs ON r.status_id = rs.id
      LEFT JOIN departments d ON r.department_id = d.id
      LEFT JOIN locations l ON r.location_id = l.id
      LEFT JOIN class_types ct ON r.class_type_id = ct.id
      LEFT JOIN users u ON r.assignee_id = u.id
      WHERE r.repair_id = ?
    `, [repairId]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบรายการ' });
    }

    const repair = rows[0];
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="repair-${repairId}.pdf"`);

    doc.pipe(res);

    const regularFont = path.join(__dirname, 'public', 'fonts', 'Sarabun-Regular.ttf');
    const boldFont = path.join(__dirname, 'public', 'fonts', 'Sarabun-Bold.ttf');

    if (fs.existsSync(regularFont)) {
      doc.registerFont('Sarabun', regularFont);
    }
    if (fs.existsSync(boldFont)) {
      doc.registerFont('Sarabun-Bold', boldFont);
    }

    const useFont = (bold = false) => {
      if (fs.existsSync(regularFont)) {
        doc.font(bold ? 'Sarabun-Bold' : 'Sarabun');
      } else {
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica');
      }
    };

    useFont(true);
    doc.fontSize(20).text('ใบแจ้งซ่อมบำรุงสถานศึกษา', { align: 'center' });
    doc.moveDown(0.5);

    useFont(false);
    doc.fontSize(10);
    doc.text(`เลขที่ใบสั่งซ่อม: ${repair.repair_id}`, { align: 'right' });
    doc.text(`วันที่แจ้ง: ${new Date(repair.reported_date).toLocaleDateString('th-TH')}`, { align: 'right' });
    doc.moveDown(1);

    const startY = doc.y;
    doc.rect(50, startY, 495, 110).stroke();

    useFont(true);
    doc.text('ข้อมูลผู้แจ้งและครุภัณฑ์', 60, startY + 10);
    useFont(false);
    doc.text(`ผู้แจ้ง: ${repair.reporter_name}`, 60, startY + 30);
    doc.text(`เบอร์โทร: ${repair.phone || '-'}`, 60, startY + 45);
    doc.text(`หน่วยงาน: ${repair.department_name || '-'}`, 60, startY + 60);
    doc.text(`สถานที่: ${repair.location_name || '-'}`, 60, startY + 75);

    doc.text(`ประเภทครุภัณฑ์: ${repair.class_type_name || '-'}`, 300, startY + 30);
    doc.text(`เลขครุภัณฑ์: ${repair.asset_no || '-'}`, 300, startY + 45);
    doc.text(`สถานะ: ${repair.status_name}`, 300, startY + 60);

    doc.y = startY + 120;
    doc.moveDown(1);

    useFont(true);
    doc.fontSize(12).text('รายละเอียดปัญหา:', 50, doc.y);
    useFont(false);
    doc.fontSize(10).text(repair.detail, 55, doc.y + 5, { width: 480 });
    doc.moveDown(2);

    if (repair.problem || repair.repair_list || repair.cost) {
      useFont(true);
      doc.fontSize(12).text('บันทึกการซ่อมโดยช่าง:', 50, doc.y + 15);
      useFont(false);
      doc.fontSize(10).text(`ปัญหาที่พบ: ${repair.problem || '-'}`, 55, doc.y + 20);
      doc.text(`การดำเนินการแก้ปัญหา: ${repair.repair_list || '-'}`, 55, doc.y + 35);
      doc.text(`ค่าใช้จ่าย: ${parseFloat(repair.cost || 0).toLocaleString('th-TH')} บาท`, 55, doc.y + 50);
      doc.moveDown(4);
    }

    const currentY = doc.y + 10;
    doc.lineCap('butt')
       .moveTo(50, currentY)
       .lineTo(545, currentY)
       .stroke();

    doc.moveDown(1);
    const sigY = doc.y + 20;

    doc.text('ลงชื่อ..................................................ผู้แจ้งซ่อม', 70, sigY);
    doc.text(`( ${repair.reporter_name} )`, 95, sigY + 20);

    doc.text('ลงชื่อ..................................................ผู้รับผิดชอบ', 320, sigY);
    doc.text(`( ${repair.assignee_name || 'ช่างซ่อมบำรุง'} )`, 345, sigY + 20);

    doc.end();
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ success: false, message: 'ไม่สามารถสร้าง PDF ได้: ' + err.message });
  }
});

// Update PDF URL
app.put('/api/repairs/:id/pdf', isStaff, async (req, res) => {
  try {
    const { pdf_url } = req.body;
    await db.execute('UPDATE repairs SET pdf_url = ? WHERE repair_id = ?', [pdf_url, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete repair
app.delete('/api/repairs/:id', isAdmin, async (req, res) => {
  try {
    await db.execute('DELETE FROM repair_logs WHERE repair_id = ?', [req.params.id]);
    await db.execute('DELETE FROM repairs WHERE repair_id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Manual send LINE Notify for a repair
app.post('/api/repairs/:id/line-notify', isAuth, async (req, res) => {
  try {
    const repairId = req.params.id;
    const [rows] = await db.execute(`
      SELECT r.*, rs.name AS status_name, d.name AS department_name, l.name AS location_name
      FROM repairs r
      LEFT JOIN repair_statuses rs ON r.status_id = rs.id
      LEFT JOIN departments d ON r.department_id = d.id
      LEFT JOIN locations l ON r.location_id = l.id
      WHERE r.repair_id = ?
    `, [repairId]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบรายการแจ้งซ่อม' });
    }

    const r = rows[0];
    const message = `
🔧 แจ้งซ่อมบำรุง
เลขที่: ${r.repair_id}
ผู้แจ้ง: ${r.reporter_name}
หน่วยงาน: ${r.department_name || '-'}
สถานที่: ${r.location_name || '-'}
รายละเอียด: ${r.detail}
สถานะ: ${r.status_name}
    `.trim();

    const success = await sendLineNotify(message);
    if (success) {
      res.json({ success: true, message: 'ส่งแจ้งเตือน LINE สำเร็จ' });
    } else {
      res.status(400).json({ success: false, message: 'ส่งแจ้งเตือน LINE ล้มเหลว กรุณาตรวจสอบการตั้งค่า Token' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// ═══════════════════════════════════════
//  REPAIR LOGS ROUTES
// ═══════════════════════════════════════

app.get('/api/repair-logs', isAuth, async (req, res) => {
  try {
    const { repair_id, limit = 50 } = req.query;
    let sql = `SELECT rl.*, rs.name AS status_name, rs.color_code
               FROM repair_logs rl
               LEFT JOIN repair_statuses rs ON rl.status_id = rs.id
               WHERE 1=1`;
    const params = [];
    if (repair_id) { sql += ' AND rl.repair_id = ?'; params.push(repair_id); }
    sql += ' ORDER BY rl.created_at DESC LIMIT ?';
    params.push(parseInt(limit));
    const [rows] = await db.execute(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════
//  ASSET (ครุภัณฑ์) ROUTES
// ═══════════════════════════════════════

// Get next asset number
app.get('/api/assets/next-no', isAuth, async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT asset_no FROM assets WHERE asset_no REGEXP '^[0-9]+$' ORDER BY CAST(asset_no AS UNSIGNED) DESC LIMIT 1");
    let nextNo = 1;
    if (rows.length > 0) {
      const maxNo = parseInt(rows[0].asset_no, 10);
      if (!isNaN(maxNo)) {
        nextNo = maxNo + 1;
      }
    }
    res.json({ success: true, nextNo: String(nextNo) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/assets', isAuth, async (req, res) => {
  try {
    const { search, class_type_id, status, location_id, limit = 1000, offset = 0 } = req.query;
    let sql = `
      SELECT a.*, ct.name AS class_type_name, l.name AS location_name, 
             u.fullname AS custodian_name, d.name AS department_name
      FROM assets a
      LEFT JOIN class_types ct ON a.class_type_id = ct.id
      LEFT JOIN locations l ON a.location_id = l.id
      LEFT JOIN departments d ON l.department_id = d.id
      LEFT JOIN users u ON a.custodian_user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    if (search) {
      sql += ' AND (a.asset_no LIKE ? OR a.name LIKE ? OR a.register_no LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (class_type_id) { sql += ' AND a.class_type_id = ?'; params.push(class_type_id); }
    if (status) { sql += ' AND a.status = ?'; params.push(status); }
    if (location_id) { sql += ' AND a.location_id = ?'; params.push(location_id); }
    sql += ' ORDER BY a.asset_no LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    const [rows] = await db.execute(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/assets/:id', isAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT a.*, ct.name AS class_type_name, l.name AS location_name, 
              u.fullname AS custodian_name, d.name AS department_name
       FROM assets a
       LEFT JOIN class_types ct ON a.class_type_id = ct.id
       LEFT JOIN locations l ON a.location_id = l.id
       LEFT JOIN departments d ON l.department_id = d.id
       LEFT JOIN users u ON a.custodian_user_id = u.id
       WHERE a.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบครุภัณฑ์' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/assets', isStaff, upload.single('image'), async (req, res) => {
  try {
    const { 
      asset_no, class_type_id, name, price, register_no, acquired_date, status, 
      qr_code_url, link_url, location_id,
      brand, serial_number, custodian_user_id, supplier_info, warranty_expire_date, funding_source
    } = req.body;
    let image_url = req.body.image_url || null;
    if (req.file) {
      image_url = `/public/uploads/${req.file.filename}`;
    }
    const [result] = await db.execute(
      `INSERT INTO assets (
        asset_no, class_type_id, name, price, register_no, acquired_date, status, 
        qr_code_url, link_url, image_url, location_id,
        brand, serial_number, custodian_user_id, supplier_info, warranty_expire_date, funding_source
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        asset_no, class_type_id || null, name, price || 0, register_no || null, acquired_date || null, status || 'พร้อมใช้งาน', 
        qr_code_url || null, link_url || null, image_url, location_id || null,
        brand || null, serial_number || null, custodian_user_id || null, supplier_info || null, 
        warranty_expire_date && warranty_expire_date !== '' ? warranty_expire_date : null, funding_source || null
      ]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/assets/:id', isStaff, upload.single('image'), async (req, res) => {
  try {
    const { 
      asset_no, class_type_id, name, price, register_no, acquired_date, status, 
      qr_code_url, link_url, location_id,
      brand, serial_number, custodian_user_id, supplier_info, warranty_expire_date, funding_source
    } = req.body;
    let image_url = req.body.image_url;
    if (req.file) {
      image_url = `/public/uploads/${req.file.filename}`;
    }

    let sql = `UPDATE assets SET 
      asset_no = ?, class_type_id = ?, name = ?, price = ?, register_no = ?, acquired_date = ?, status = ?, 
      qr_code_url = ?, link_url = ?, location_id = ?,
      brand = ?, serial_number = ?, custodian_user_id = ?, supplier_info = ?, warranty_expire_date = ?, funding_source = ?`;
    
    const params = [
      asset_no, class_type_id || null, name, price || 0, register_no || null, acquired_date || null, status, 
      qr_code_url || null, link_url || null, location_id || null,
      brand || null, serial_number || null, custodian_user_id || null, supplier_info || null, 
      warranty_expire_date && warranty_expire_date !== '' ? warranty_expire_date : null, funding_source || null
    ];

    if (image_url !== undefined) {
      sql += `, image_url = ?`;
      params.push(image_url);
    }
    sql += ` WHERE id = ?`;
    params.push(req.params.id);

    await db.execute(sql, params);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/assets/:id', isAdmin, async (req, res) => {
  try {
    await db.execute('DELETE FROM assets WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════
//  SPARE PARTS ROUTES
// ═══════════════════════════════════════

// Get next code
app.get('/api/spare-parts/next-code', isAuth, async (req, res) => {
  try {
    const { class_type_id } = req.query;
    if (!class_type_id) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุหมวดหมู่ครุภัณฑ์' });
    }

    const prefix = `REP-${String(class_type_id).padStart(2, '0')}-`;

    const [rows] = await db.execute(
      `SELECT code FROM spare_parts 
       WHERE class_type_id = ? AND code LIKE ? 
       ORDER BY CAST(SUBSTRING(code, CHAR_LENGTH(?) + 1) AS UNSIGNED) DESC LIMIT 1`,
      [class_type_id, `${prefix}%`, prefix]
    );

    let nextNum = 1;
    if (rows.length > 0) {
      const maxCode = rows[0].code;
      const numPart = parseInt(maxCode.replace(prefix, ''));
      if (!isNaN(numPart)) {
        nextNum = numPart + 1;
      }
    } else {
      const [oldRows] = await db.execute(
        `SELECT code FROM spare_parts WHERE class_type_id = ? ORDER BY id DESC LIMIT 1`,
        [class_type_id]
      );
      if (oldRows.length > 0) {
        const oldCode = oldRows[0].code;
        const cleanNum = oldCode.replace('REP-', '');
        const numPart = parseInt(cleanNum);
        if (!isNaN(numPart)) {
          nextNum = numPart + 1;
        }
      }
    }

    const nextCode = `${prefix}${String(nextNum).padStart(4, '0')}`;
    res.json({ success: true, nextCode });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/spare-parts', isAuth, async (req, res) => {
  try {
    const { search, low_stock, class_type_id, limit = 50, offset = 0 } = req.query;
    let sql = `
      SELECT sp.*, ct.name AS class_type_name
      FROM spare_parts sp
      LEFT JOIN class_types ct ON sp.class_type_id = ct.id
      WHERE 1=1
    `;
    const params = [];
    if (search) {
      sql += ' AND (sp.code LIKE ? OR sp.name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (low_stock === 'true') {
      sql += ' AND sp.quantity <= sp.min_stock';
    }
    if (class_type_id) {
      sql += ' AND sp.class_type_id = ?';
      params.push(class_type_id);
    }
    sql += ' ORDER BY sp.code LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    const [rows] = await db.execute(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/spare-parts/:id', isAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT sp.*, ct.name AS class_type_name FROM spare_parts sp
       LEFT JOIN class_types ct ON sp.class_type_id = ct.id WHERE sp.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบอะไหล่' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/spare-parts', isStaff, upload.single('image'), async (req, res) => {
  try {
    const { code, class_type_id, name, quantity, min_stock, unit_price, description } = req.body;
    let image_url = req.body.image_url || null;
    if (req.file) {
      image_url = `/public/uploads/${req.file.filename}`;
    }
    const [result] = await db.execute(
      `INSERT INTO spare_parts (code, class_type_id, name, quantity, min_stock, unit_price, image_url, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [code, class_type_id || null, name, quantity || 0, min_stock || 5, unit_price || 0, image_url, description || null]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/spare-parts/:id', isStaff, upload.single('image'), async (req, res) => {
  try {
    const { code, class_type_id, name, quantity, min_stock, unit_price, description, is_active } = req.body;
    let image_url = req.body.image_url;
    if (req.file) {
      image_url = `/public/uploads/${req.file.filename}`;
    }

    let sql = 'UPDATE spare_parts SET code = ?, class_type_id = ?, name = ?, quantity = ?, min_stock = ?, unit_price = ?, description = ?, is_active = ?';
    const params = [
      code,
      class_type_id || null,
      name,
      quantity !== undefined && quantity !== null && quantity !== '' ? quantity : 0,
      min_stock !== undefined && min_stock !== null && min_stock !== '' ? min_stock : 5,
      unit_price !== undefined && unit_price !== null && unit_price !== '' ? unit_price : 0,
      description || null,
      is_active !== undefined && is_active !== null && is_active !== '' ? is_active : true
    ];

    if (image_url !== undefined) {
      sql += ', image_url = ?';
      params.push(image_url);
    }

    sql += ' WHERE id = ?';
    params.push(req.params.id);

    await db.execute(sql, params);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/spare-parts/:id', isStaff, async (req, res) => {
  try {
    await db.execute('UPDATE spare_parts SET is_active = FALSE WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════
//  STOCK TRANSACTION ROUTES
// ═══════════════════════════════════════

app.get('/api/stock-transactions', isAuth, async (req, res) => {
  try {
    const { type, spare_part_id, repair_id, limit = 50, offset = 0 } = req.query;
    let sql = `
      SELECT st.*, sp.code AS part_code, sp.name AS part_name, u.fullname AS created_by_name
      FROM stock_transactions st
      LEFT JOIN spare_parts sp ON st.spare_part_id = sp.id
      LEFT JOIN users u ON st.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    if (type) { sql += ' AND st.transaction_type = ?'; params.push(type); }
    if (spare_part_id) { sql += ' AND st.spare_part_id = ?'; params.push(spare_part_id); }
    if (repair_id) { sql += ' AND st.repair_id = ?'; params.push(repair_id); }
    sql += ' ORDER BY st.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    const [rows] = await db.execute(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Withdraw stock (OUT)
app.post('/api/stock-transactions/withdraw', isStaff, async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { spare_part_id, quantity, repair_id, note, items } = req.body;

    const listToWithdraw = items && Array.isArray(items) ? items : [{ spare_part_id, quantity }];

    for (const item of listToWithdraw) {
      const pId = item.spare_part_id;
      const qty = parseInt(item.quantity);
      if (!pId || isNaN(qty) || qty <= 0) continue;

      const [partRows] = await conn.execute('SELECT * FROM spare_parts WHERE id = ?', [pId]);
      if (partRows.length === 0) throw new Error('ไม่พบอะไหล่');
      if (partRows[0].quantity < qty) throw new Error(`จำนวนอะไหล่ ${partRows[0].name} ไม่เพียงพอ`);

      await conn.execute('UPDATE spare_parts SET quantity = quantity - ? WHERE id = ?', [qty, pId]);

      const total = qty * partRows[0].unit_price;
      await conn.execute(
        `INSERT INTO stock_transactions (transaction_type, spare_part_id, quantity, unit_price, total, transaction_date, repair_id, note, created_by)
         VALUES ('OUT', ?, ?, ?, ?, CURDATE(), ?, ?, ?)`,
        [pId, qty, partRows[0].unit_price, total, repair_id || null, note || null, req.session.userId]
      );
    }

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
});

// Add stock (IN)
app.post('/api/stock-transactions/add', isStaff, async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { spare_part_id, quantity, unit_price, reference_no, note } = req.body;

    const [partRows] = await conn.execute('SELECT * FROM spare_parts WHERE id = ?', [spare_part_id]);
    if (partRows.length === 0) throw new Error('ไม่พบอะไหล่');

    const price = unit_price || partRows[0].unit_price;
    await conn.execute('UPDATE spare_parts SET quantity = quantity + ?, unit_price = ? WHERE id = ?', [quantity, price, spare_part_id]);

    const total = quantity * price;
    await conn.execute(
      `INSERT INTO stock_transactions (transaction_type, spare_part_id, quantity, unit_price, total, transaction_date, reference_no, note, created_by)
       VALUES ('IN', ?, ?, ?, ?, CURDATE(), ?, ?, ?)`,
      [spare_part_id, quantity, price, total, reference_no || null, note || null, req.session.userId]
    );

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
});

// Adjust stock
app.post('/api/stock-transactions/adjust', isStaff, async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { spare_part_id, quantity, note } = req.body;

    const [partRows] = await conn.execute('SELECT * FROM spare_parts WHERE id = ?', [spare_part_id]);
    if (partRows.length === 0) throw new Error('ไม่พบอะไหล่');

    const diff = quantity - partRows[0].quantity;
    await conn.execute('UPDATE spare_parts SET quantity = ? WHERE id = ?', [quantity, spare_part_id]);

    await conn.execute(
      `INSERT INTO stock_transactions (transaction_type, spare_part_id, quantity, unit_price, total, transaction_date, note, created_by)
       VALUES ('ADJUST', ?, ?, ?, ?, CURDATE(), ?, ?)`,
      [spare_part_id, diff, partRows[0].unit_price, diff * partRows[0].unit_price, note || 'ปรับสต็อก', req.session.userId]
    );

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
});

// ═══════════════════════════════════════
//  REPORTS / DASHBOARD ROUTES
// ═══════════════════════════════════════

app.get('/api/dashboard/summary', isAuth, async (req, res) => {
  try {
    const [statusRows] = await db.execute('SELECT * FROM v_repair_summary');
    const [totalRepairs] = await db.execute('SELECT COUNT(*) AS count FROM repairs');
    const [totalAssets] = await db.execute('SELECT COUNT(*) AS count FROM assets');
    const [totalParts] = await db.execute('SELECT COUNT(*) AS count FROM spare_parts WHERE is_active = TRUE');
    const [lowStock] = await db.execute('SELECT COUNT(*) AS count FROM v_low_stock');
    const [monthlyRepairs] = await db.execute(`
      SELECT DATE_FORMAT(reported_date, '%Y-%m') AS month, COUNT(*) AS count
      FROM repairs
      WHERE reported_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY month
      ORDER BY month
    `);
    const [recentRepairs] = await db.execute(`
      SELECT r.repair_id, r.reporter_name, r.reported_date, rs.name AS status_name, rs.color_code
      FROM repairs r
      JOIN repair_statuses rs ON r.status_id = rs.id
      ORDER BY r.created_at DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      data: {
        status_summary: statusRows,
        total_repairs: totalRepairs[0].count,
        total_assets: totalAssets[0].count,
        total_parts: totalParts[0].count,
        low_stock: lowStock[0].count,
        monthly_repairs: monthlyRepairs,
        recent_repairs: recentRepairs
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/reports/repairs-by-status', isAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT rs.name AS status_name, rs.color_code, COUNT(*) AS count, SUM(r.cost) AS total_cost
      FROM repairs r
      JOIN repair_statuses rs ON r.status_id = rs.id
      GROUP BY rs.id, rs.name, rs.color_code
      ORDER BY rs.display_order
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/reports/repairs-by-department', isAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT d.name AS department_name, COUNT(*) AS count, SUM(r.cost) AS total_cost
      FROM repairs r
      LEFT JOIN departments d ON r.department_id = d.id
      GROUP BY d.id, d.name
      ORDER BY count DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/reports/stock-movement', isAuth, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let sql = `
      SELECT st.transaction_type, st.transaction_date, sp.code, sp.name, st.quantity, st.unit_price, st.total, st.reference_no, st.note
      FROM stock_transactions st
      JOIN spare_parts sp ON st.spare_part_id = sp.id
      WHERE 1=1
    `;
    const params = [];
    if (start_date) { sql += ' AND st.transaction_date >= ?'; params.push(start_date); }
    if (end_date) { sql += ' AND st.transaction_date <= ?'; params.push(end_date); }
    sql += ' ORDER BY st.transaction_date DESC';
    const [rows] = await db.execute(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════
//  PURPOSES ROUTES
// ═══════════════════════════════════════

app.get('/api/purposes', isAuth, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM objectives ORDER BY id');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/purposes', isAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    await db.execute('INSERT INTO objectives (name) VALUES (?)', [name]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/purposes/:id', isAdmin, async (req, res) => {
  try {
    await db.execute('DELETE FROM objectives WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════
//  PURCHASE ORDER ROUTES
// ═══════════════════════════════════════

app.get('/api/purchase-orders', isAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT po.id, po.order_no, po.order_date, po.status,
             pod.spare_part_id, pod.quantity, pod.unit_price, pod.total,
             sp.code AS part_code, sp.name AS part_name
      FROM purchase_orders po
      JOIN purchase_order_details pod ON po.id = pod.purchase_order_id
      JOIN spare_parts sp ON pod.spare_part_id = sp.id
      ORDER BY po.created_at DESC
    `);
    
    const list = rows.map(r => ({
      id: r.id,
      orderNo: r.order_no,
      date: new Date(r.order_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }),
      partId: r.part_code,
      partName: r.part_name,
      qty: r.quantity,
      unitPrice: parseFloat(r.unit_price),
      totalPrice: parseFloat(r.total)
    }));
    
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/purchase-orders', isAuth, async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { order_no, order_date, items } = req.body;
    
    const [result] = await conn.execute(
      'INSERT INTO purchase_orders (order_no, order_date, status, created_by) VALUES (?, ?, "success", ?)',
      [order_no, order_date, req.session.userId]
    );
    const orderId = result.insertId;
    
    for (const item of items) {
      const [partRows] = await conn.execute('SELECT id, name, unit_price FROM spare_parts WHERE code = ? OR id = ?', [item.partId, item.partId]);
      if (partRows.length === 0) throw new Error(`ไม่พบอะไหล่รหัส: ${item.partId}`);
      
      const partId = partRows[0].id;
      const total = item.qty * partRows[0].unit_price;
      
      await conn.execute(
        'INSERT INTO purchase_order_details (purchase_order_id, spare_part_id, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?)',
        [orderId, partId, item.qty, partRows[0].unit_price, total]
      );
      
      // เมื่อกดสั่งซื้อจะไม่เพิ่มสต๊อกอัตโนมัติ จะต้องมาเพิ่มสต๊อกเองภายหลัง
      // await conn.execute('UPDATE spare_parts SET quantity = quantity + ? WHERE id = ?', [item.qty, partId]);
      
      // await conn.execute(
      //   `INSERT INTO stock_transactions (transaction_type, spare_part_id, quantity, unit_price, total, transaction_date, reference_no, note, created_by)
      //    VALUES ('IN', ?, ?, ?, ?, ?, ?, 'สั่งซื้อทางระบบ', ?)`,
      //   [partId, item.qty, partRows[0].unit_price, total, order_date, order_no, req.session.userId]
      // );
    }
    
    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
});
// ═══════════════════════════════════════
//  USER MANAGEMENT ROUTES (CRUD)
// ═══════════════════════════════════════

app.post('/api/users', isAdmin, async (req, res) => {
  try {
    const { username, password, fullname, department_id, location_id, status, phone, email, token, avatar_url } = req.body;
    console.log(`[USER ADD] Username: ${username}, HasPassword: ${!!password}, DeptId: ${department_id}, LocId: ${location_id}`);
    
    const valUsername = username || '';
    const valPassword = password || '';
    const valFullname = fullname || '';
    const valDeptId = department_id !== undefined && department_id !== '' ? department_id : null;
    const valLocId  = location_id !== undefined && location_id !== '' ? location_id : null;
    const valStatus = status || 'User';
    const valPhone  = phone  || null;
    const valEmail  = email  || null;
    const valToken  = token  || null;
    const valAvatar = avatar_url || `https://cdn.jsdelivr.net/gh/EPICCODING17/image/user-${Math.floor(Math.random() * 40) + 1}.png`;

    const [existing] = await db.execute('SELECT 1 FROM users WHERE username = ?', [valUsername]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'ชื่อผู้ใช้นี้มีในระบบแล้ว' });
    }

    const [maxIdRows] = await db.execute("SELECT id FROM users WHERE id LIKE 'USER-%' ORDER BY CAST(SUBSTRING(id, 6) AS UNSIGNED) DESC LIMIT 1");
    let nextNum = 1;
    if (maxIdRows.length > 0) {
      const maxId = maxIdRows[0].id;
      const numPart = parseInt(maxId.replace('USER-', ''));
      nextNum = numPart + 1;
    } else {
      const [countRows] = await db.execute('SELECT COUNT(*) AS total FROM users');
      nextNum = countRows[0].total + 10;
    }
    const newId = `USER-${String(nextNum).padStart(3, '0')}`;

    const params = [newId, valUsername, valPassword, valFullname, valDeptId, valLocId, valStatus, valAvatar, valPhone, valEmail, valToken];
    console.log('[USER ADD] Query params:', params);

    await db.execute(
      `INSERT INTO users (id, username, password_hash, fullname, department_id, location_id, status, avatar_url, phone, email, token)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params
    );

    res.json({ success: true, id: newId });
  } catch (err) {
    console.error('[USER ADD] Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/users/:id', isAdmin, async (req, res) => {
  try {
    const { username, password, fullname, department_id, location_id, status, phone, email, token, avatar_url } = req.body;
    const userId = req.params.id;
    console.log(`[USER UPDATE] ID: ${userId}, Username: ${username}, HasPassword: ${!!password}, LocId: ${location_id}`);

    const valUsername = username || '';
    const valFullname = fullname || '';
    const valDeptId   = department_id !== undefined && department_id !== '' ? department_id : null;
    const valLocId    = location_id !== undefined && location_id !== '' ? location_id : null;
    const valStatus   = status || 'User';
    const valPhone    = phone  || null;
    const valEmail    = email  || null;
    const valToken    = token  || null;

    let sql = 'UPDATE users SET username = ?, fullname = ?, department_id = ?, location_id = ?, status = ?, phone = ?, email = ?, token = ?';
    const params = [valUsername, valFullname, valDeptId, valLocId, valStatus, valPhone, valEmail, valToken];

    if (avatar_url) {
      sql += ', avatar_url = ?';
      params.push(avatar_url);
    }

    if (password) {
      console.log(`[USER UPDATE] New Password: ${password}`);
      sql += ', password_hash = ?';
      params.push(password);
    }

    sql += ' WHERE id = ?';
    params.push(userId);

    const [result] = await db.execute(sql, params);
    console.log(`[USER UPDATE] Affected rows: ${result.affectedRows}`);
    res.json({ success: true });
  } catch (err) {
    console.error('[USER UPDATE] Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/users/:id', isAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    if (userId === req.session.userId) {
      return res.status(400).json({ success: false, message: 'ไม่สามารถลบตัวเองได้' });
    }
    await db.execute('DELETE FROM users WHERE id = ?', [userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════
//  LOG ROUTES
// ═══════════════════════════════════════

app.get('/api/logs/users', isAdmin, async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const [rows] = await db.execute(
      `SELECT l.*, u.fullname
       FROM log_users l
       LEFT JOIN users u ON l.user_id = u.id
       ORDER BY l.created_at DESC
       LIMIT ?`,
      [parseInt(limit)]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════
//  ERROR HANDLING & STARTUP
// ═══════════════════════════════════════

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'ไม่พบ endpoint' });
});

// ─── Start Server with Port Retry ───
function startServer(port) {
  const server = app.listen(port, HOST, () => {
    console.log(`🚀 Server running on http://${HOST}:${port}`);
    console.log(`📁 Uploads: ${path.join(__dirname, 'public', 'uploads')}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️ Port ${port} ถูกใช้งานอยู่ กำลังลอง port ${parseInt(port, 10) + 1}...`);
      setTimeout(() => {
        server.close();
        startServer(parseInt(port, 10) + 1);
      }, 1000);
    } else {
      console.error('❌ Server error:', err);
      process.exit(1);
    }
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}

if (!process.env.VERCEL) {
  startServer(PORT);
}

module.exports = app;