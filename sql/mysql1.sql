SET SESSION sql_require_primary_key = 0;

-- Dumping database structure for school_repair
CREATE DATABASE IF NOT EXISTS `school_repair` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */;
USE `school_repair`;

-- Dumping structure for table school_repair.assets
CREATE TABLE IF NOT EXISTS `assets` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `asset_no` varchar(50) NOT NULL COMMENT 'เลขครุภัณฑ์ เช่น COM-3001-01',
  `class_type_id` int(10) unsigned DEFAULT NULL,
  `name` varchar(150) NOT NULL COMMENT 'ชื่อครุภัณฑ์',
  `price` decimal(12,2) DEFAULT 0.00,
  `register_no` varchar(50) DEFAULT NULL COMMENT 'ทะเบียน',
  `acquired_date` date DEFAULT NULL COMMENT 'วันเดือนปีที่ได้มา',
  `status` enum('พร้อมใช้งาน','ไม่พร้อมใช้งาน','จำหน่าย','ส่งซ่อม') DEFAULT 'พร้อมใช้งาน',
  `qr_code_url` varchar(500) DEFAULT NULL,
  `link_url` varchar(500) DEFAULT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  `brand` varchar(150) DEFAULT NULL COMMENT 'ยี่ห้อและรุ่น',
  `serial_number` varchar(100) DEFAULT NULL COMMENT 'หมายเลขเครื่อง S/N',
  `custodian_user_id` varchar(20) DEFAULT NULL COMMENT 'รหัสอาจารย์ผู้ดูแล (FK users.id)',
  `supplier_info` varchar(255) DEFAULT NULL COMMENT 'ข้อมูลผู้จัดจำหน่าย',
  `warranty_expire_date` date DEFAULT NULL COMMENT 'วันที่สิ้นสุดการรับประกัน',
  `funding_source` varchar(150) DEFAULT NULL COMMENT 'แหล่งงบประมาณ',
  `location_id` int(10) unsigned DEFAULT NULL COMMENT 'สถานที่ตั้ง (FK locations.id)',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_asset_no` (`asset_no`),
  KEY `location_id` (`location_id`),
  KEY `custodian_user_id` (`custodian_user_id`),
  KEY `idx_asset_status` (`status`),
  KEY `idx_asset_class` (`class_type_id`),
  CONSTRAINT `fk_asset_class` FOREIGN KEY (`class_type_id`) REFERENCES `class_types` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_asset_location` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_asset_custodian` FOREIGN KEY (`custodian_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=501 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table school_repair.class_types
CREATE TABLE IF NOT EXISTS `class_types` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_class_name` (`name`),
  KEY `idx_class_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table school_repair.departments
CREATE TABLE IF NOT EXISTS `departments` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dept_name` (`name`),
  KEY `idx_dept_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table school_repair.locations
CREATE TABLE IF NOT EXISTS `locations` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `department_id` int(10) unsigned DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_loc_name` (`name`),
  KEY `idx_loc_name` (`name`),
  KEY `idx_loc_dept` (`department_id`),
  CONSTRAINT `fk_locations_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table school_repair.log_users
CREATE TABLE IF NOT EXISTS `log_users` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` varchar(20) DEFAULT NULL,
  `username` varchar(50) NOT NULL,
  `action` enum('เข้าสู่ระบบ','ออกจากระบบ') NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `location` varchar(100) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_log_user` (`user_id`),
  KEY `idx_log_date` (`created_at`),
  CONSTRAINT `fk_log_users_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table school_repair.objectives
CREATE TABLE IF NOT EXISTS `objectives` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_objective_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table school_repair.purchase_order_details
CREATE TABLE IF NOT EXISTS `purchase_order_details` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `purchase_order_id` int(10) unsigned NOT NULL,
  `spare_part_id` int(10) unsigned NOT NULL,
  `quantity` int(11) NOT NULL,
  `unit_price` decimal(12,2) NOT NULL,
  `total` decimal(12,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `purchase_order_id` (`purchase_order_id`),
  KEY `spare_part_id` (`spare_part_id`),
  CONSTRAINT `fk_po_details_order` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_po_details_part` FOREIGN KEY (`spare_part_id`) REFERENCES `spare_parts` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table school_repair.purchase_orders
CREATE TABLE IF NOT EXISTS `purchase_orders` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `order_no` varchar(50) NOT NULL COMMENT 'เลขที่สั่งซื้อ เช่น PM-95105/2568',
  `order_date` date NOT NULL,
  `status` varchar(50) DEFAULT 'success',
  `created_by` varchar(20) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_no` (`order_no`),
  KEY `created_by` (`created_by`),
  KEY `idx_po_date` (`order_date`),
  CONSTRAINT `fk_po_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table school_repair.purposes
CREATE TABLE IF NOT EXISTS `purposes` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_purpose_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table school_repair.repair_logs
CREATE TABLE IF NOT EXISTS `repair_logs` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `repair_id` varchar(20) NOT NULL,
  `status_id` int(10) unsigned NOT NULL,
  `actor_name` varchar(100) NOT NULL COMMENT 'ชื่อผู้ดำเนินการ',
  `actor_id` varchar(20) DEFAULT NULL COMMENT 'user_id ถ้ามี',
  `action_detail` varchar(255) DEFAULT NULL COMMENT 'รายละเอียดการอัปเดต',
  `note` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `status_id` (`status_id`),
  KEY `actor_id` (`actor_id`),
  KEY `idx_log_repair` (`repair_id`),
  KEY `idx_log_date` (`created_at`),
  CONSTRAINT `fk_repair_logs_repair` FOREIGN KEY (`repair_id`) REFERENCES `repairs` (`repair_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_repair_logs_status` FOREIGN KEY (`status_id`) REFERENCES `repair_statuses` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_repair_logs_actor` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table school_repair.repair_statuses
CREATE TABLE IF NOT EXISTS `repair_statuses` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `display_order` int(10) unsigned DEFAULT 0,
  `color_code` varchar(20) DEFAULT 'secondary',
  `is_terminal` tinyint(1) DEFAULT 0 COMMENT 'TRUE = สถานะสุดท้าย (ซ่อมสำเร็จ/ไม่สำเร็จ/ยกเลิก)',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_status_name` (`name`),
  KEY `idx_status_order` (`display_order`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table school_repair.repairs
CREATE TABLE IF NOT EXISTS `repairs` (
  `repair_id` varchar(20) NOT NULL COMMENT 'เลขที่ใบแจ้งซ่อม เช่น RP6800001',
  `status_id` int(10) unsigned NOT NULL DEFAULT 1,
  `reported_date` date NOT NULL COMMENT 'วันที่แจ้ง',
  `reporter_name` varchar(100) NOT NULL COMMENT 'ชื่อผู้แจ้ง',
  `department_id` int(10) unsigned DEFAULT NULL COMMENT 'หน่วยงานผู้แจ้ง',
  `phone` varchar(20) DEFAULT NULL COMMENT 'เบอร์โทร',
  `location_id` int(10) unsigned DEFAULT NULL COMMENT 'สถานที่',
  `class_type_id` int(10) unsigned DEFAULT NULL COMMENT 'ประเภทครุภัณฑ์',
  `asset_no` varchar(50) DEFAULT NULL COMMENT 'เลขครุภัณฑ์ (ถ้ามี)',
  `detail` text NOT NULL COMMENT 'รายละเอียดปัญหา',
  `img1_url` varchar(500) DEFAULT NULL,
  `img2_url` varchar(500) DEFAULT NULL,
  `img3_url` varchar(500) DEFAULT NULL,
  `assignee_id` varchar(20) DEFAULT NULL COMMENT 'ผู้รับแจ้ง/ช่าง (user_id)',
  `received_date` date DEFAULT NULL COMMENT 'วันที่รับงาน',
  `pdf_url` varchar(500) DEFAULT NULL COMMENT 'PDF ใบแจ้งซ่อม',
  `problem` varchar(255) DEFAULT NULL COMMENT 'สรุปปัญหาหลังตรวจสอบ',
  `repair_list` varchar(255) DEFAULT NULL COMMENT 'รายการซ่อมที่ทำ',
  `cost` decimal(12,2) DEFAULT 0.00 COMMENT 'ค่าใช้จ่ายรวม',
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`repair_id`),
  KEY `location_id` (`location_id`),
  KEY `class_type_id` (`class_type_id`),
  KEY `idx_repair_status` (`status_id`),
  KEY `idx_repair_date` (`reported_date`),
  KEY `idx_repair_dept` (`department_id`),
  KEY `idx_repair_assignee` (`assignee_id`),
  CONSTRAINT `fk_repairs_status` FOREIGN KEY (`status_id`) REFERENCES `repair_statuses` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_repairs_dept` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_repairs_location` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_repairs_class` FOREIGN KEY (`class_type_id`) REFERENCES `class_types` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_repairs_assignee` FOREIGN KEY (`assignee_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table school_repair.settings
CREATE TABLE IF NOT EXISTS `settings` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `setting_key` (`setting_key`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table school_repair.spare_parts
CREATE TABLE IF NOT EXISTS `spare_parts` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(20) NOT NULL COMMENT 'รหัสอะไหล่ เช่น REP-0001',
  `class_type_id` int(10) unsigned DEFAULT NULL COMMENT 'หมวดหมู่ที่เกี่ยวข้อง',
  `name` varchar(150) NOT NULL,
  `quantity` int(10) unsigned DEFAULT 0,
  `min_stock` int(10) unsigned DEFAULT 5 COMMENT 'แจ้งเตือนสต็อกต่ำ',
  `unit_price` decimal(12,2) DEFAULT 0.00,
  `image_url` varchar(500) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_part_code` (`code`),
  KEY `class_type_id` (`class_type_id`),
  KEY `idx_part_active` (`is_active`),
  CONSTRAINT `fk_spare_parts_class` FOREIGN KEY (`class_type_id`) REFERENCES `class_types` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table school_repair.stock_transactions
CREATE TABLE IF NOT EXISTS `stock_transactions` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `transaction_type` enum('IN','OUT','ADJUST') NOT NULL COMMENT 'IN=รับเข้า, OUT=เบิกออก, ADJUST=ปรับยอด',
  `spare_part_id` int(10) unsigned NOT NULL,
  `quantity` int(11) NOT NULL,
  `unit_price` decimal(12,2) DEFAULT 0.00,
  `total` decimal(12,2) DEFAULT 0.00,
  `transaction_date` date NOT NULL,
  `reference_no` varchar(50) DEFAULT NULL COMMENT 'เลขที่อ้างอิง',
  `repair_id` varchar(20) DEFAULT NULL COMMENT 'เบิกเพื่อใบซ่อมไหน',
  `note` varchar(255) DEFAULT NULL,
  `created_by` varchar(20) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `repair_id` (`repair_id`),
  KEY `created_by` (`created_by`),
  KEY `idx_stock_part` (`spare_part_id`),
  KEY `idx_stock_date` (`transaction_date`),
  KEY `idx_stock_type` (`transaction_type`),
  CONSTRAINT `fk_stock_trans_part` FOREIGN KEY (`spare_part_id`) REFERENCES `spare_parts` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_stock_trans_repair` FOREIGN KEY (`repair_id`) REFERENCES `repairs` (`repair_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_stock_trans_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table school_repair.users
CREATE TABLE IF NOT EXISTS `users` (
  `id` varchar(20) NOT NULL COMMENT 'เช่น USER-001',
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL COMMENT 'bcrypt hashed',
  `fullname` varchar(100) NOT NULL,
  `department_id` int(10) unsigned DEFAULT NULL,
  `location_id` int(10) unsigned DEFAULT NULL,
  `status` enum('SuperAdmin','SuperUser','User','inactive') NOT NULL DEFAULT 'User',
  `avatar_url` varchar(500) DEFAULT NULL,
  `token` varchar(255) DEFAULT NULL COMMENT 'LINE Token หรือ Session Token',
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `last_login` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  KEY `idx_user_dept` (`department_id`),
  KEY `idx_user_loc` (`location_id`),
  KEY `idx_user_status` (`status`),
  CONSTRAINT `fk_users_dept` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_users_loc` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for view school_repair.v_assets_full
-- Creating temporary table to overcome VIEW dependency errors
CREATE TABLE `v_assets_full` (
	`id` INT(10) UNSIGNED NOT NULL,
	`asset_no` VARCHAR(50) NOT NULL COMMENT 'เลขครุภัณฑ์ เช่น COM-3001-01' COLLATE 'utf8mb4_unicode_ci',
	`class_type_id` INT(10) UNSIGNED NULL,
	`name` VARCHAR(150) NOT NULL COMMENT 'ชื่อครุภัณฑ์' COLLATE 'utf8mb4_unicode_ci',
	`price` DECIMAL(12,2) NULL,
	`register_no` VARCHAR(50) NULL COMMENT 'ทะเบียน' COLLATE 'utf8mb4_unicode_ci',
	`acquired_date` DATE NULL COMMENT 'วันเดือนปีที่ได้มา',
	`status` ENUM('พร้อมใช้งาน','ไม่พร้อมใช้งาน','จำหน่าย','ส่งซ่อม') NULL COLLATE 'utf8mb4_unicode_ci',
	`qr_code_url` VARCHAR(500) NULL COLLATE 'utf8mb4_unicode_ci',
	`link_url` VARCHAR(500) NULL COLLATE 'utf8mb4_unicode_ci',
	`image_url` VARCHAR(500) NULL COLLATE 'utf8mb4_unicode_ci',
	`brand` VARCHAR(150) NULL COMMENT 'ยี่ห้อและรุ่น' COLLATE 'utf8mb4_unicode_ci',
	`serial_number` VARCHAR(100) NULL COMMENT 'หมายเลขเครื่อง S/N' COLLATE 'utf8mb4_unicode_ci',
	`custodian_user_id` VARCHAR(20) NULL COMMENT 'รหัสอาจารย์ผู้ดูแล (FK users.id)' COLLATE 'utf8mb4_unicode_ci',
	`supplier_info` VARCHAR(255) NULL COMMENT 'ข้อมูลผู้จัดจำหน่าย' COLLATE 'utf8mb4_unicode_ci',
	`warranty_expire_date` DATE NULL COMMENT 'วันที่สิ้นสุดการรับประกัน',
	`funding_source` VARCHAR(150) NULL COMMENT 'แหล่งงบประมาณ' COLLATE 'utf8mb4_unicode_ci',
	`location_id` INT(10) UNSIGNED NULL,
	`created_at` DATETIME NULL,
	`updated_at` DATETIME NULL,
	`class_type_name` VARCHAR(100) NULL COLLATE 'utf8mb4_unicode_ci',
	`location_name` VARCHAR(150) NULL COLLATE 'utf8mb4_unicode_ci',
	`department_name` VARCHAR(100) NULL COLLATE 'utf8mb4_unicode_ci',
	`custodian_name` VARCHAR(100) NULL COLLATE 'utf8mb4_unicode_ci'
);

-- Dumping structure for view school_repair.v_low_stock
-- Creating temporary table to overcome VIEW dependency errors
CREATE TABLE `v_low_stock` (
	`id` INT(10) UNSIGNED NOT NULL,
	`code` VARCHAR(1) NOT NULL COMMENT 'รหัสอะไหล่ เช่น REP-0001' COLLATE 'utf8mb4_unicode_ci',
	`class_type_id` INT(10) UNSIGNED NULL COMMENT 'หมวดหมู่ที่เกี่ยวข้อง',
	`name` VARCHAR(1) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`quantity` INT(10) UNSIGNED NULL,
	`min_stock` INT(10) UNSIGNED NULL COMMENT 'แจ้งเตือนสต็อกต่ำ',
	`unit_price` DECIMAL(12,2) NULL,
	`image_url` VARCHAR(1) NULL COLLATE 'utf8mb4_unicode_ci',
	`description` TEXT NULL COLLATE 'utf8mb4_unicode_ci',
	`is_active` TINYINT(1) NULL,
	`created_at` DATETIME NULL,
	`updated_at` DATETIME NULL,
	`class_type_name` VARCHAR(1) NULL COLLATE 'utf8mb4_unicode_ci'
);

-- Dumping structure for view school_repair.v_repair_logs_full
-- Creating temporary table to overcome VIEW dependency errors
CREATE TABLE `v_repair_logs_full` (
	`id` INT(10) UNSIGNED NOT NULL,
	`repair_id` VARCHAR(1) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`status_id` INT(10) UNSIGNED NOT NULL,
	`actor_name` VARCHAR(1) NOT NULL COMMENT 'ชื่อผู้ดำเนินการ' COLLATE 'utf8mb4_unicode_ci',
	`actor_id` VARCHAR(1) NULL COMMENT 'user_id ถ้ามี' COLLATE 'utf8mb4_unicode_ci',
	`action_detail` VARCHAR(1) NULL COMMENT 'รายละเอียดการอัปเดต' COLLATE 'utf8mb4_unicode_ci',
	`note` TEXT NULL COLLATE 'utf8mb4_unicode_ci',
	`created_at` DATETIME NULL,
	`status_name` VARCHAR(1) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`reporter_name` VARCHAR(1) NOT NULL COMMENT 'ชื่อผู้แจ้ง' COLLATE 'utf8mb4_unicode_ci'
);

-- Dumping structure for view school_repair.v_repair_summary
-- Creating temporary table to overcome VIEW dependency errors
CREATE TABLE `v_repair_summary` (
	`status_id` INT(10) UNSIGNED NOT NULL,
	`status_name` VARCHAR(1) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`color_code` VARCHAR(1) NULL COLLATE 'utf8mb4_unicode_ci',
	`count` BIGINT(21) NOT NULL,
	`total_cost` DECIMAL(34,2) NOT NULL
);

-- Dumping structure for view school_repair.v_repairs_full
-- Creating temporary table to overcome VIEW dependency errors
CREATE TABLE `v_repairs_full` (
	`repair_id` VARCHAR(1) NOT NULL COMMENT 'เลขที่ใบแจ้งซ่อม เช่น RP6800001' COLLATE 'utf8mb4_unicode_ci',
	`status_id` INT(10) UNSIGNED NOT NULL,
	`reported_date` DATE NOT NULL COMMENT 'วันที่แจ้ง',
	`reporter_name` VARCHAR(1) NOT NULL COMMENT 'ชื่อผู้แจ้ง' COLLATE 'utf8mb4_unicode_ci',
	`department_id` INT(10) UNSIGNED NULL COMMENT 'หน่วยงานผู้แจ้ง',
	`phone` VARCHAR(1) NULL COMMENT 'เบอร์โทร' COLLATE 'utf8mb4_unicode_ci',
	`location_id` INT(10) UNSIGNED NULL COMMENT 'สถานที่',
	`class_type_id` INT(10) UNSIGNED NULL COMMENT 'ประเภทครุภัณฑ์',
	`asset_no` VARCHAR(1) NULL COMMENT 'เลขครุภัณฑ์ (ถ้ามี)' COLLATE 'utf8mb4_unicode_ci',
	`detail` TEXT NOT NULL COMMENT 'รายละเอียดปัญหา' COLLATE 'utf8mb4_unicode_ci',
	`img1_url` VARCHAR(1) NULL COLLATE 'utf8mb4_unicode_ci',
	`img2_url` VARCHAR(1) NULL COLLATE 'utf8mb4_unicode_ci',
	`img3_url` VARCHAR(1) NULL COLLATE 'utf8mb4_unicode_ci',
	`assignee_id` VARCHAR(1) NULL COMMENT 'ผู้รับแจ้ง/ช่าง (user_id)' COLLATE 'utf8mb4_unicode_ci',
	`received_date` DATE NULL COMMENT 'วันที่รับงาน',
	`pdf_url` VARCHAR(1) NULL COMMENT 'PDF ใบแจ้งซ่อม' COLLATE 'utf8mb4_unicode_ci',
	`problem` VARCHAR(1) NULL COMMENT 'สรุปปัญหาหลังตรวจสอบ' COLLATE 'utf8mb4_unicode_ci',
	`repair_list` VARCHAR(1) NULL COMMENT 'รายการซ่อมที่ทำ' COLLATE 'utf8mb4_unicode_ci',
	`cost` DECIMAL(12,2) NULL COMMENT 'ค่าใช้จ่ายรวม',
	`updated_at` DATETIME NULL,
	`created_at` DATETIME NULL,
	`status_name` VARCHAR(1) NULL COLLATE 'utf8mb4_unicode_ci',
	`color_code` VARCHAR(1) NULL COLLATE 'utf8mb4_unicode_ci',
	`department_name` VARCHAR(1) NULL COLLATE 'utf8mb4_unicode_ci',
	`location_name` VARCHAR(1) NULL COLLATE 'utf8mb4_unicode_ci',
	`class_type_name` VARCHAR(1) NULL COLLATE 'utf8mb4_unicode_ci',
	`assignee_name` VARCHAR(1) NULL COLLATE 'utf8mb4_unicode_ci'
);

-- Dumping structure for view school_repair.v_stock_balance
-- Creating temporary table to overcome VIEW dependency errors
CREATE TABLE `v_stock_balance` (
	`id` INT(10) UNSIGNED NOT NULL,
	`code` VARCHAR(1) NOT NULL COMMENT 'รหัสอะไหล่ เช่น REP-0001' COLLATE 'utf8mb4_unicode_ci',
	`name` VARCHAR(1) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`class_type_id` INT(10) UNSIGNED NULL COMMENT 'หมวดหมู่ที่เกี่ยวข้อง',
	`class_type_name` VARCHAR(1) NULL COLLATE 'utf8mb4_unicode_ci',
	`quantity` INT(10) UNSIGNED NULL,
	`min_stock` INT(10) UNSIGNED NULL COMMENT 'แจ้งเตือนสต็อกต่ำ',
	`unit_price` DECIMAL(12,2) NULL,
	`is_active` TINYINT(1) NULL,
	`total_in` DECIMAL(32,0) NOT NULL,
	`total_out` DECIMAL(32,0) NOT NULL
);

-- Removing temporary table and create final VIEW structure
DROP TABLE IF EXISTS `v_assets_full`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_assets_full` AS SELECT 
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

-- Removing temporary table and create final VIEW structure
DROP TABLE IF EXISTS `v_low_stock`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_low_stock` AS SELECT 
  sp.*, 
  ct.name AS class_type_name
FROM spare_parts sp
LEFT JOIN class_types ct ON sp.class_type_id = ct.id
WHERE sp.quantity <= sp.min_stock AND sp.is_active = TRUE;

-- Removing temporary table and create final VIEW structure
DROP TABLE IF EXISTS `v_repair_logs_full`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_repair_logs_full` AS SELECT 
  rl.*, 
  rs.name AS status_name, 
  r.reporter_name
FROM repair_logs rl
JOIN repair_statuses rs ON rl.status_id = rs.id
JOIN repairs r ON rl.repair_id = r.repair_id;

-- Removing temporary table and create final VIEW structure
DROP TABLE IF EXISTS `v_repair_summary`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_repair_summary` AS SELECT 
  rs.id AS status_id, 
  rs.name AS status_name, 
  rs.color_code,
  COUNT(r.repair_id) AS count, 
  COALESCE(SUM(r.cost), 0) AS total_cost
FROM repair_statuses rs
LEFT JOIN repairs r ON rs.id = r.status_id
GROUP BY rs.id, rs.name, rs.color_code
ORDER BY rs.display_order;

-- Removing temporary table and create final VIEW structure
DROP TABLE IF EXISTS `v_repairs_full`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_repairs_full` AS SELECT 
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

-- Removing temporary table and create final VIEW structure
DROP TABLE IF EXISTS `v_stock_balance`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_stock_balance` AS SELECT 
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
GROUP BY sp.id, sp.code, sp.name, sp.class_type_id, ct.name, sp.quantity, sp.min_stock, sp.unit_price, sp.is_active 
;

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
