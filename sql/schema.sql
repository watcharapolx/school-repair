-- ============================================================
-- School Repair System — Database Schema (Normalized 3NF)
-- MariaDB / MySQL 8.0+
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- DROP tables in order of dependency (child to parent)
DROP TABLE IF EXISTS `purchase_order_details`;
DROP TABLE IF EXISTS `purchase_orders`;
DROP TABLE IF EXISTS `stock_transactions`;
DROP TABLE IF EXISTS `repair_logs`;
DROP TABLE IF EXISTS `repairs`;
DROP TABLE IF EXISTS `assets`;
DROP TABLE IF EXISTS `spare_parts`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `log_users`;
DROP TABLE IF EXISTS `settings`;
DROP TABLE IF EXISTS `repair_statuses`;
DROP TABLE IF EXISTS `objectives`;
DROP TABLE IF EXISTS `locations`;
DROP TABLE IF EXISTS `departments`;
DROP TABLE IF EXISTS `class_types`;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 1. MASTER TABLES (ตารางหลัก)
-- ============================================================

-- 1.1 SETTINGS — ตั้งค่าระบบ
CREATE TABLE `settings` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `setting_key` VARCHAR(100) NOT NULL UNIQUE,
  `setting_value` TEXT,
  `description` VARCHAR(255),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.2 CLASS_TYPES — ประเภทครุภัณฑ์ (เช่น โต๊ะ, เก้าอี้, คอมพิวเตอร์)
CREATE TABLE `class_types` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_class_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.3 DEPARTMENTS — หน่วยงาน/แผนก
CREATE TABLE `departments` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_dept_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.4 LOCATIONS — สถานที่/ห้องเรียน
CREATE TABLE `locations` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL UNIQUE,
  `department_id` INT UNSIGNED,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  KEY `idx_loc_name` (`name`),
  KEY `idx_loc_dept` (`department_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.5 OBJECTIVES — วัตถุประสงค์ในการแจ้งซ่อม
CREATE TABLE `objectives` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.6 REPAIR_STATUSES — สถานะการซ่อม
CREATE TABLE `repair_statuses` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL UNIQUE,
  `display_order` INT UNSIGNED DEFAULT 0,
  `color_code` VARCHAR(20) DEFAULT 'secondary',
  `is_terminal` TINYINT(1) DEFAULT 0 COMMENT '1 = สถานะสิ้นสุด เช่น ซ่อมเสร็จ/ยกเลิก',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_status_order` (`display_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. USER & LOG TABLES
-- ============================================================

-- 2.1 USERS — ผู้ใช้งาน
CREATE TABLE `users` (
  `id` VARCHAR(20) NOT NULL PRIMARY KEY COMMENT 'เช่น USER-001',
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL COMMENT 'bcrypt hashed',
  `fullname` VARCHAR(100) NOT NULL,
  `department_id` INT UNSIGNED,
  `location_id` INT UNSIGNED,
  `status` ENUM('SuperAdmin','SuperUser','User','inactive') NOT NULL DEFAULT 'User',
  `avatar_url` VARCHAR(500),
  `token` VARCHAR(255) COMMENT 'LINE Token / Session Token',
  `phone` VARCHAR(20),
  `email` VARCHAR(100),
  `last_login` DATETIME,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  KEY `idx_user_dept` (`department_id`),
  KEY `idx_user_loc` (`location_id`),
  KEY `idx_user_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.2 LOG_USERS — ประวัติการเข้าสู่ระบบ
CREATE TABLE `log_users` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` VARCHAR(20),
  `username` VARCHAR(50) NOT NULL,
  `action` ENUM('เข้าสู่ระบบ','ออกจากระบบ') NOT NULL,
  `ip_address` VARCHAR(45),
  `user_agent` VARCHAR(500),
  `location` VARCHAR(100),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  KEY `idx_log_user` (`user_id`),
  KEY `idx_log_date` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. ASSETS & SPARE PARTS
-- ============================================================

-- 3.1 SPARE_PARTS — รายการอะไหล่
CREATE TABLE `spare_parts` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(20) NOT NULL UNIQUE COMMENT 'รหัสอะไหล่ เช่น REP-0001',
  `class_type_id` INT UNSIGNED COMMENT 'หมวดหมู่ครุภัณฑ์ที่ใช้',
  `name` VARCHAR(150) NOT NULL,
  `quantity` INT UNSIGNED DEFAULT 0,
  `min_stock` INT UNSIGNED DEFAULT 5 COMMENT 'แจ้งเตือนสต็อกต่ำ',
  `unit_price` DECIMAL(12,2) DEFAULT 0.00,
  `image_url` VARCHAR(500),
  `description` TEXT,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`class_type_id`) REFERENCES `class_types`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  KEY `idx_part_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.2 ASSETS — ทะเบียนครุภัณฑ์
CREATE TABLE `assets` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `asset_no` VARCHAR(50) NOT NULL UNIQUE COMMENT 'เลขครุภัณฑ์ เช่น COM-3001-01',
  `class_type_id` INT UNSIGNED,
  `name` VARCHAR(150) NOT NULL COMMENT 'ชื่อครุภัณฑ์',
  `price` DECIMAL(12,2) DEFAULT 0.00,
  `register_no` VARCHAR(50) COMMENT 'ทะเบียน',
  `acquired_date` DATE COMMENT 'วันเดือนปีที่ได้มา',
  `status` ENUM('พร้อมใช้งาน','ไม่พร้อมใช้งาน','จำหน่าย','ส่งซ่อม') DEFAULT 'พร้อมใช้งาน',
  `qr_code_url` VARCHAR(500),
  `link_url` VARCHAR(500),
  `image_url` VARCHAR(500),
  `brand` VARCHAR(150) COMMENT 'ยี่ห้อและรุ่น',
  `serial_number` VARCHAR(100) COMMENT 'หมายเลขเครื่อง S/N',
  `custodian_user_id` VARCHAR(20) COMMENT 'รหัสอาจารย์ผู้ดูแล (FK users.id)',
  `supplier_info` VARCHAR(255) COMMENT 'ข้อมูลผู้จัดจำหน่าย',
  `warranty_expire_date` DATE COMMENT 'วันที่สิ้นสุดการรับประกัน',
  `funding_source` VARCHAR(150) COMMENT 'แหล่งงบประมาณ',
  `location_id` INT UNSIGNED COMMENT 'สถานที่ตั้ง (FK locations.id)',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`class_type_id`) REFERENCES `class_types`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (`custodian_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  KEY `idx_asset_status` (`status`),
  KEY `idx_asset_class` (`class_type_id`),
  KEY `idx_asset_location` (`location_id`),
  KEY `idx_asset_custodian` (`custodian_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. REPAIR TABLES
-- ============================================================

-- 4.1 REPAIRS — ใบแจ้งซ่อม
CREATE TABLE `repairs` (
  `repair_id` VARCHAR(20) NOT NULL PRIMARY KEY COMMENT 'เลขที่ใบแจ้งซ่อม เช่น RP2026-001',
  `status_id` INT UNSIGNED NOT NULL DEFAULT 1,
  `reported_date` DATE NOT NULL COMMENT 'วันที่แจ้ง',
  `reporter_name` VARCHAR(100) NOT NULL COMMENT 'ชื่อผู้แจ้ง',
  `department_id` INT UNSIGNED COMMENT 'หน่วยงานผู้แจ้ง',
  `phone` VARCHAR(20) COMMENT 'เบอร์โทร',
  `location_id` INT UNSIGNED COMMENT 'สถานที่',
  `class_type_id` INT UNSIGNED COMMENT 'ประเภทครุภัณฑ์',
  `asset_no` VARCHAR(50) COMMENT 'เลขครุภัณฑ์ (ถ้ามี)',
  `detail` TEXT NOT NULL COMMENT 'รายละเอียดปัญหา',
  `img1_url` VARCHAR(500),
  `img2_url` VARCHAR(500),
  `img3_url` VARCHAR(500),
  `assignee_id` VARCHAR(20) COMMENT 'ผู้รับแจ้ง/ช่าง (user_id)',
  `received_date` DATE COMMENT 'วันที่รับงาน',
  `pdf_url` VARCHAR(500) COMMENT 'PDF ใบแจ้งซ่อม',
  `problem` VARCHAR(255) COMMENT 'สรุปปัญหาหลังตรวจสอบ',
  `repair_list` VARCHAR(255) COMMENT 'รายการซ่อมที่ทำ',
  `cost` DECIMAL(12,2) DEFAULT 0.00 COMMENT 'ค่าใช้จ่ายรวม',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`status_id`) REFERENCES `repair_statuses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (`class_type_id`) REFERENCES `class_types`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (`assignee_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  KEY `idx_repair_status` (`status_id`),
  KEY `idx_repair_date` (`reported_date`),
  KEY `idx_repair_dept` (`department_id`),
  KEY `idx_repair_assignee` (`assignee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4.2 REPAIR_LOGS — ประวัติการเปลี่ยนสถานะซ่อม
CREATE TABLE `repair_logs` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `repair_id` VARCHAR(20) NOT NULL,
  `status_id` INT UNSIGNED NOT NULL,
  `actor_name` VARCHAR(100) NOT NULL COMMENT 'ชื่อผู้ดำเนินการ',
  `actor_id` VARCHAR(20) COMMENT 'user_id ถ้ามี',
  `action_detail` VARCHAR(255) COMMENT 'รายละเอียดการอัปเดต',
  `note` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`repair_id`) REFERENCES `repairs`(`repair_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (`status_id`) REFERENCES `repair_statuses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  KEY `idx_log_repair` (`repair_id`),
  KEY `idx_log_date` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. INVENTORY & PURCHASING
-- ============================================================

-- 5.1 STOCK_TRANSACTIONS — รายการรับเข้า/เบิกออกอะไหล่
CREATE TABLE `stock_transactions` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `transaction_type` ENUM('IN','OUT','ADJUST') NOT NULL COMMENT 'IN=รับเข้า, OUT=เบิกออก, ADJUST=ปรับยอด',
  `spare_part_id` INT UNSIGNED NOT NULL,
  `quantity` INT NOT NULL,
  `unit_price` DECIMAL(12,2) DEFAULT 0.00,
  `total` DECIMAL(12,2) DEFAULT 0.00,
  `transaction_date` DATE NOT NULL,
  `reference_no` VARCHAR(50) COMMENT 'เลขที่อ้างอิง',
  `repair_id` VARCHAR(20) COMMENT 'เบิกเพื่อใบซ่อมไหน',
  `note` VARCHAR(255),
  `created_by` VARCHAR(20),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`spare_part_id`) REFERENCES `spare_parts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (`repair_id`) REFERENCES `repairs`(`repair_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  KEY `idx_stock_part` (`spare_part_id`),
  KEY `idx_stock_date` (`transaction_date`),
  KEY `idx_stock_type` (`transaction_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5.2 PURCHASE_ORDERS — ใบสั่งซื้อ
CREATE TABLE `purchase_orders` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `order_no` VARCHAR(50) NOT NULL UNIQUE COMMENT 'เลขที่สั่งซื้อ เช่น PM-95105/2568',
  `order_date` DATE NOT NULL,
  `status` VARCHAR(50) DEFAULT 'success',
  `created_by` VARCHAR(20),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  KEY `idx_po_date` (`order_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5.3 PURCHASE_ORDER_DETAILS — รายละเอียดใบสั่งซื้อ
CREATE TABLE `purchase_order_details` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `purchase_order_id` INT UNSIGNED NOT NULL,
  `spare_part_id` INT UNSIGNED NOT NULL,
  `quantity` INT NOT NULL,
  `unit_price` DECIMAL(12,2) NOT NULL,
  `total` DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`spare_part_id`) REFERENCES `spare_parts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 6. VIEWS (วิวสรุปข้อมูล)
-- ============================================================

DROP VIEW IF EXISTS `v_assets_full`;
CREATE VIEW `v_assets_full` AS 
SELECT 
  a.*, 
  ct.name AS class_type_name, 
  l.name AS location_name, 
  d.name AS department_name,
  u.fullname AS custodian_name
FROM assets a
LEFT JOIN class_types ct ON a.class_type_id = ct.id
LEFT JOIN locations l ON a.location_id = l.id
LEFT JOIN departments d ON l.department_id = d.id
LEFT JOIN users u ON a.custodian_user_id = u.id;

DROP VIEW IF EXISTS `v_low_stock`;
CREATE VIEW `v_low_stock` AS 
SELECT 
  sp.*, 
  ct.name AS class_type_name
FROM spare_parts sp
LEFT JOIN class_types ct ON sp.class_type_id = ct.id
WHERE sp.quantity <= sp.min_stock AND sp.is_active = TRUE;

DROP VIEW IF EXISTS `v_repair_logs_full`;
CREATE VIEW `v_repair_logs_full` AS 
SELECT 
  rl.*, 
  rs.name AS status_name, 
  r.reporter_name
FROM repair_logs rl
JOIN repair_statuses rs ON rl.status_id = rs.id
JOIN repairs r ON rl.repair_id = r.repair_id;

DROP VIEW IF EXISTS `v_repair_summary`;
CREATE VIEW `v_repair_summary` AS 
SELECT 
  rs.id AS status_id, 
  rs.name AS status_name, 
  rs.color_code,
  COUNT(r.repair_id) AS count, 
  COALESCE(SUM(r.cost), 0) AS total_cost
FROM repair_statuses rs
LEFT JOIN repairs r ON rs.id = r.status_id
GROUP BY rs.id, rs.name, rs.color_code;

DROP VIEW IF EXISTS `v_repairs_full`;
CREATE VIEW `v_repairs_full` AS 
SELECT 
  r.*,
  rs.name AS status_name,
  rs.color_code,
  d.name AS department_name,
  l.name AS location_name,
  ct.name AS class_type_name,
  u.fullname AS assignee_name
FROM repairs r
LEFT JOIN repair_statuses rs ON r.status_id = rs.id
LEFT JOIN departments d ON r.department_id = d.id
LEFT JOIN locations l ON r.location_id = l.id
LEFT JOIN class_types ct ON r.class_type_id = ct.id
LEFT JOIN users u ON r.assignee_id = u.id;

DROP VIEW IF EXISTS `v_stock_balance`;
CREATE VIEW `v_stock_balance` AS 
SELECT 
  sp.id,
  sp.code,
  sp.name,
  sp.class_type_id,
  ct.name AS class_type_name,
  sp.quantity,
  sp.min_stock,
  sp.unit_price,
  sp.is_active,
  COALESCE(SUM(CASE WHEN st.transaction_type = 'IN' THEN st.quantity ELSE 0 END), 0) AS total_in,
  COALESCE(SUM(CASE WHEN st.transaction_type = 'OUT' THEN st.quantity ELSE 0 END), 0) AS total_out
FROM spare_parts sp
LEFT JOIN class_types ct ON sp.class_type_id = ct.id
LEFT JOIN stock_transactions st ON sp.id = st.spare_part_id
GROUP BY sp.id, sp.code, sp.name, sp.class_type_id, ct.name, sp.quantity, sp.min_stock, sp.unit_price, sp.is_active;
