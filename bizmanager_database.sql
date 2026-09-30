-- =============================================================
-- BizManager Database Dump for MySQL Workbench & phpMyAdmin
-- Generated on: 2026-08-30T11:03:28.165Z
-- =============================================================

CREATE DATABASE IF NOT EXISTS `bizmanager_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `bizmanager_db`;

SET FOREIGN_KEY_CHECKS = 0;

-- -------------------------------------------------------------
-- Table structure for businesses
-- -------------------------------------------------------------
DROP TABLE IF EXISTS `businesses`;
CREATE TABLE `businesses` (
  `id` VARCHAR(64) PRIMARY KEY,
  `businessName` VARCHAR(255) NOT NULL,
  `ownerName` VARCHAR(255),
  `email` VARCHAR(255) UNIQUE NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `mobile` VARCHAR(32),
  `address` TEXT,
  `gstin` VARCHAR(64),
  `currency` VARCHAR(16) DEFAULT '₹',
  `upiId` VARCHAR(128),
  `thermalPrintWidth` VARCHAR(16) DEFAULT '80mm',
  `invoicePrefix` VARCHAR(32) DEFAULT 'INV',
  `invoiceNotes` TEXT,
  `smsConfig` JSON,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `businesses` VALUES 
('70c18ee7-e769-4bfa-b060-0b304f7dd658', 'Business1', 'Aatman Satra', 'aatmansatra1@gmail.com', '$2a$10$Dlbm2lylmIuYRUfPnCg2/eLteAtTLa.zYy/BjupH2ycW8Voj4vU4a', '7021724584', 'shop no 1 , akurli road ,kandivali east', '27AAFPS0464B1ZZ', '₹', '7021724584@yespop', '80mm', 'INV', 'Thank you for your business! Items once sold can be exchanged within 7 days.', '{"provider":"simulator","twilioSid":"","twilioAuthToken":"","twilioFrom":"","fast2smsApiKey":"","senderId":"BIZMAN"}', '2026-08-26T03:21:56.042Z');

-- -------------------------------------------------------------
-- Table structure for customers
-- -------------------------------------------------------------
DROP TABLE IF EXISTS `customers`;
CREATE TABLE `customers` (
  `id` VARCHAR(64) PRIMARY KEY,
  `businessId` VARCHAR(64) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(32),
  `email` VARCHAR(255),
  `address` TEXT,
  `gstin` VARCHAR(64),
  `totalBalance` DECIMAL(12,2) DEFAULT 0.00,
  `notes` TEXT,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_cust_businessId` (`businessId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `customers` VALUES 
('655af8ae-d9aa-4b09-bd31-eaf41b5ea0d4', '70c18ee7-e769-4bfa-b060-0b304f7dd658', 'Aatman', '7021724584', NULL, '', NULL, 0, NULL, '2026-08-26T03:23:04.828Z'),
('83a4d029-b4a8-417b-bfa4-306a00c941b4', '70c18ee7-e769-4bfa-b060-0b304f7dd658', 'Dishank Shah', '9224101205', NULL, '', NULL, 0, NULL, '2026-08-26T03:29:26.575Z'),
('a7c9c71d-8b6d-4152-9225-883e830e4bd2', '70c18ee7-e769-4bfa-b060-0b304f7dd658', 'Aatmaan Satra', '7021724584', '', '', '', 0, '', '2026-08-26T13:31:42.775Z');

-- -------------------------------------------------------------
-- Table structure for products
-- -------------------------------------------------------------
DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
  `id` VARCHAR(64) PRIMARY KEY,
  `businessId` VARCHAR(64) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `sku` VARCHAR(64),
  `category` VARCHAR(128),
  `unit` VARCHAR(32) DEFAULT 'pcs',
  `costPrice` DECIMAL(12,2) DEFAULT 0.00,
  `price` DECIMAL(12,2) NOT NULL,
  `quantity` INT DEFAULT 0,
  `lowStockThreshold` INT DEFAULT 5,
  `batchNo` VARCHAR(64),
  `expiryDate` DATE,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_prod_businessId` (`businessId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `products` VALUES 
('2f074c28-aa6c-4f32-be7d-b16e5e01ec39', '70c18ee7-e769-4bfa-b060-0b304f7dd658', 'tv', NULL, 'electronics', NULL, 1000, 10000, 25, 5, NULL, NULL, NULL);

-- -------------------------------------------------------------
-- Table structure for invoices
-- -------------------------------------------------------------
DROP TABLE IF EXISTS `invoices`;
CREATE TABLE `invoices` (
  `id` VARCHAR(64) PRIMARY KEY,
  `businessId` VARCHAR(64) NOT NULL,
  `invoiceNumber` VARCHAR(64) NOT NULL,
  `customerId` VARCHAR(64),
  `customerName` VARCHAR(255),
  `customerPhone` VARCHAR(32),
  `customerAddress` TEXT,
  `customerGstin` VARCHAR(64),
  `subtotal` DECIMAL(12,2) DEFAULT 0.00,
  `discountTotal` DECIMAL(12,2) DEFAULT 0.00,
  `taxRate` DECIMAL(5,2) DEFAULT 0.00,
  `taxTotal` DECIMAL(12,2) DEFAULT 0.00,
  `taxMode` VARCHAR(32) DEFAULT 'inclusive',
  `grandTotal` DECIMAL(12,2) NOT NULL,
  `amountPaid` DECIMAL(12,2) DEFAULT 0.00,
  `balance` DECIMAL(12,2) DEFAULT 0.00,
  `paymentMethod` VARCHAR(64) DEFAULT 'Cash',
  `cashAmount` DECIMAL(12,2) DEFAULT 0.00,
  `upiAmount` DECIMAL(12,2) DEFAULT 0.00,
  `cardAmount` DECIMAL(12,2) DEFAULT 0.00,
  `status` VARCHAR(32) DEFAULT 'PAID',
  `notes` TEXT,
  `date` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `dueDate` DATETIME,
  `paymentHistory` JSON,
  KEY `idx_inv_businessId` (`businessId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- Table structure for invoice_items
-- -------------------------------------------------------------
DROP TABLE IF EXISTS `invoice_items`;
CREATE TABLE `invoice_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `invoiceId` VARCHAR(64) NOT NULL,
  `productId` VARCHAR(64),
  `productName` VARCHAR(255),
  `sku` VARCHAR(64),
  `quantity` INT NOT NULL DEFAULT 1,
  `unitPrice` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `discount` DECIMAL(12,2) DEFAULT 0.00,
  `taxRate` DECIMAL(5,2) DEFAULT 0.00,
  `total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  KEY `idx_item_invoiceId` (`invoiceId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `invoices` VALUES 
('40a70229-153b-48c3-a624-6b1093cd9028', '70c18ee7-e769-4bfa-b060-0b304f7dd658', 'INV-20260826-0001', '655af8ae-d9aa-4b09-bd31-eaf41b5ea0d4', 'Aatman', '7021724584', '', '', 10000, 0, 18, 1800, 'inclusive', 11800, 0, 11800, 'UPI', 0, 0, 0, 'UNPAID', 'Thank you for your business! Items once sold can be exchanged within 7 days.', '2026-08-26T12:59:07.837Z', NULL, '[]'),
('d78ca80f-82d5-4641-8e5d-e6b0a41e0f97', '70c18ee7-e769-4bfa-b060-0b304f7dd658', 'INV-20260826-0002', '83a4d029-b4a8-417b-bfa4-306a00c941b4', 'Dishank Shah', '9224101205', '', '', 10000, 0, 18, 1800, 'inclusive', 11800, 11800, 0, 'Credit/Due', 0, 0, 0, 'PAID', 'Thank you for your business! Items once sold can be exchanged within 7 days.', '2026-08-26T13:14:31.997Z', NULL, '[{"id":"30be5252-8c76-49e4-8a64-afe571cb85d5","amount":11800,"method":"Credit/Due","notes":"Initial payment at billing","date":"2026-08-26T13:14:31.997Z"}]'),
('869f4a40-d990-464c-90da-8a09f1700c36', '70c18ee7-e769-4bfa-b060-0b304f7dd658', 'INV-20260826-0003', 'WALK_IN', 'Walk-in Customer', '', '', '', 10000, 0, 0, 0, 'inclusive', 10000, 10000, 0, 'Cash', 0, 0, 0, 'PAID', 'Thank you for your business! Items once sold can be exchanged within 7 days.', '2026-08-26T13:16:02.882Z', NULL, '[{"id":"c2895983-fbd1-4304-82db-a2cee702cebd","amount":10000,"method":"Cash","notes":"Initial payment at billing","date":"2026-08-26T13:16:02.882Z"}]'),
('9de9c899-a6ae-4569-bae5-d34640b2fa6c', '70c18ee7-e769-4bfa-b060-0b304f7dd658', 'INV-20260826-0004', 'a7c9c71d-8b6d-4152-9225-883e830e4bd2', 'Aatmaan Satra', '7021724584', '', '', 7812.5, 0, 28, 2187.5, 'inclusive', 10000, 10000, 0, 'Cash', 0, 0, 0, 'PAID', 'Thank you for your business! Items once sold can be exchanged within 7 days.', '2026-08-26T16:01:56.700Z', NULL, '[{"id":"9b278e1d-32ed-4843-8010-cda8c1aabafa","amount":10000,"method":"Cash","notes":"Initial payment at billing","date":"2026-08-26T16:01:56.700Z"}]'),
('f2981dd9-5d68-4e27-b66d-e4bbacd25fea', '70c18ee7-e769-4bfa-b060-0b304f7dd658', 'INV-20260826-0005', 'WALK_IN', 'Walk-in Customer', '', '', '', 7812.5, 0, 28, 2187.5, 'inclusive', 10000, 10000, 0, 'UPI', 0, 0, 0, 'PAID', 'Thank you for your business! Items once sold can be exchanged within 7 days.', '2026-08-26T16:03:30.557Z', NULL, '[{"id":"f63058b0-df02-451a-9625-18cfe899faba","amount":10000,"method":"UPI","notes":"Initial payment at billing","date":"2026-08-26T16:03:30.557Z"}]'),
('0041e61d-856c-470e-9007-6fbd4d4ce5b0', '70c18ee7-e769-4bfa-b060-0b304f7dd658', 'INV-20260826-0006', 'WALK_IN', 'Walk-in Customer', '', '', '', 10000, 0, 0, 0, 'inclusive', 10000, 10000, 0, 'Cash', 0, 0, 0, 'PAID', 'Thank you for your business! Items once sold can be exchanged within 7 days.', '2026-08-26T16:12:24.559Z', NULL, '[{"id":"86b6e980-ff88-4768-8ce6-f8cc21edef73","amount":10000,"method":"Cash","notes":"Initial payment at billing","date":"2026-08-26T16:12:24.559Z"}]'),
('f31118ea-54b7-4d31-a710-98f1d27b6d15', '70c18ee7-e769-4bfa-b060-0b304f7dd658', 'INV-20260826-0007', 'a7c9c71d-8b6d-4152-9225-883e830e4bd2', 'Aatmaan Satra', '7021724584', '', '', 10000, 0, 0, 0, 'inclusive', 10000, 5000, 5000, 'Cash', 0, 0, 0, 'PARTIAL', 'Thank you for your business! Items once sold can be exchanged within 7 days.', '2026-08-26T16:13:09.970Z', NULL, '[{"id":"01068bc9-90d8-46c6-a6a1-f303eff314a5","amount":5000,"method":"Cash","notes":"Initial payment at billing","date":"2026-08-26T16:13:09.970Z"}]'),
('4b559c27-a41b-4baa-95a7-103e48758017', '70c18ee7-e769-4bfa-b060-0b304f7dd658', 'INV-20260826-0008', '655af8ae-d9aa-4b09-bd31-eaf41b5ea0d4', 'Aatman', '7021724584', '', '', 8474.58, 0, 18, 1525.42, 'inclusive', 10000, 10000, 0, 'Card', 0, 0, 10000, 'PAID', 'Thank you for your business! Items once sold can be exchanged within 7 days.', '2026-08-26T16:25:50.471Z', NULL, '[{"id":"4667550c-508a-4322-9721-f484f19fcf37","amount":10000,"method":"Card","notes":"Initial payment at billing","date":"2026-08-26T16:25:50.471Z"}]'),
('b15a7320-788c-4939-b39d-cc13574eaaa8', '70c18ee7-e769-4bfa-b060-0b304f7dd658', 'INV-20260826-0009', '83a4d029-b4a8-417b-bfa4-306a00c941b4', 'Dishank Shah', '9224101205', '', '', 16949.15, 0, 18, 3050.85, 'inclusive', 20000, 20000, 0, 'Cash', 0, 0, 0, 'PAID', 'Thank you for your business! Items once sold can be exchanged within 7 days.', '2026-08-26T17:41:03.440Z', NULL, '[{"id":"0b241d3d-90ce-43bb-b489-19ca695b9a6d","amount":20000,"method":"Cash","notes":"Initial payment at billing","date":"2026-08-26T17:41:03.440Z"}]'),
('48e672a6-6631-47f4-8b78-10130a83663d', '70c18ee7-e769-4bfa-b060-0b304f7dd658', 'INV-20260826-0010', 'WALK_IN', 'Walk-in Customer', '', '', '', 8474.58, 0, 18, 1525.42, 'inclusive', 10000, 10000, 0, 'Cash', 0, 0, 0, 'PAID', 'Thank you for your business! Items once sold can be exchanged within 7 days.', '2026-08-26T17:41:26.121Z', NULL, '[{"id":"cab939a0-d830-4fb0-a273-dbfea221a125","amount":10000,"method":"Cash","notes":"Initial payment at billing","date":"2026-08-26T17:41:26.121Z"}]');

INSERT INTO `invoice_items` VALUES 
(NULL, '40a70229-153b-48c3-a624-6b1093cd9028', '2f074c28-aa6c-4f32-be7d-b16e5e01ec39', 'tv', '', 1, 10000, 0, 18, 10000),
(NULL, 'd78ca80f-82d5-4641-8e5d-e6b0a41e0f97', '2f074c28-aa6c-4f32-be7d-b16e5e01ec39', 'tv', '', 1, 10000, 0, 18, 10000),
(NULL, '869f4a40-d990-464c-90da-8a09f1700c36', '2f074c28-aa6c-4f32-be7d-b16e5e01ec39', 'tv', '', 1, 10000, 0, 0, 10000),
(NULL, '9de9c899-a6ae-4569-bae5-d34640b2fa6c', '2f074c28-aa6c-4f32-be7d-b16e5e01ec39', 'tv', '', 1, 10000, 0, 28, 10000),
(NULL, 'f2981dd9-5d68-4e27-b66d-e4bbacd25fea', '2f074c28-aa6c-4f32-be7d-b16e5e01ec39', 'tv', '', 1, 10000, 0, 28, 10000),
(NULL, '0041e61d-856c-470e-9007-6fbd4d4ce5b0', '2f074c28-aa6c-4f32-be7d-b16e5e01ec39', 'tv', '', 1, 10000, 0, 0, 10000),
(NULL, 'f31118ea-54b7-4d31-a710-98f1d27b6d15', '2f074c28-aa6c-4f32-be7d-b16e5e01ec39', 'tv', '', 1, 10000, 0, 0, 10000),
(NULL, '4b559c27-a41b-4baa-95a7-103e48758017', '2f074c28-aa6c-4f32-be7d-b16e5e01ec39', 'tv', '', 1, 10000, 0, 18, 10000),
(NULL, 'b15a7320-788c-4939-b39d-cc13574eaaa8', '2f074c28-aa6c-4f32-be7d-b16e5e01ec39', 'tv', '', 2, 10000, 0, 18, 20000),
(NULL, '48e672a6-6631-47f4-8b78-10130a83663d', '2f074c28-aa6c-4f32-be7d-b16e5e01ec39', 'tv', '', 1, 10000, 0, 18, 10000);

-- -------------------------------------------------------------
-- Table structure for suppliers
-- -------------------------------------------------------------
DROP TABLE IF EXISTS `suppliers`;
CREATE TABLE `suppliers` (
  `id` VARCHAR(64) PRIMARY KEY,
  `businessId` VARCHAR(64) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(32),
  `email` VARCHAR(255),
  `address` TEXT,
  `gstin` VARCHAR(64),
  `totalPurchased` DECIMAL(12,2) DEFAULT 0.00,
  `balancePayable` DECIMAL(12,2) DEFAULT 0.00,
  `notes` TEXT,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_sup_businessId` (`businessId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `suppliers` VALUES 
('f670a35b-4feb-4113-ae61-154dd7fee610', '70c18ee7-e769-4bfa-b060-0b304f7dd658', 'Suplier1', '7021724584', '', '', '', 0, 0, '', '2026-08-30T10:59:47.717Z');

-- -------------------------------------------------------------
-- Table structure for purchase_orders
-- -------------------------------------------------------------
DROP TABLE IF EXISTS `purchase_orders`;
CREATE TABLE `purchase_orders` (
  `id` VARCHAR(64) PRIMARY KEY,
  `businessId` VARCHAR(64) NOT NULL,
  `purchaseNumber` VARCHAR(64) NOT NULL,
  `supplierId` VARCHAR(64),
  `supplierName` VARCHAR(255),
  `date` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `subtotal` DECIMAL(12,2) DEFAULT 0.00,
  `taxTotal` DECIMAL(12,2) DEFAULT 0.00,
  `totalAmount` DECIMAL(12,2) NOT NULL,
  `amountPaid` DECIMAL(12,2) DEFAULT 0.00,
  `balanceDue` DECIMAL(12,2) DEFAULT 0.00,
  `paymentMode` VARCHAR(64) DEFAULT 'CASH',
  `notes` TEXT,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_po_businessId` (`businessId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- Table structure for purchase_items
-- -------------------------------------------------------------
DROP TABLE IF EXISTS `purchase_items`;
CREATE TABLE `purchase_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `purchaseId` VARCHAR(64) NOT NULL,
  `productId` VARCHAR(64),
  `productName` VARCHAR(255),
  `sku` VARCHAR(64),
  `qty` INT NOT NULL DEFAULT 1,
  `unitCost` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `lineTotal` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  KEY `idx_pitem_purchaseId` (`purchaseId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `purchase_orders` VALUES 
('54eb6b1e-af7b-4534-8559-cc7f50d4e8c5', '70c18ee7-e769-4bfa-b060-0b304f7dd658', 'PO-20260830-0001', 'f670a35b-4feb-4113-ae61-154dd7fee610', 'Suplier1', '2026-08-30T11:00:11.327Z', 0, 0, 10000, 10000, 0, 'CASH', '', '2026-08-30T11:00:11.327Z');

INSERT INTO `purchase_items` VALUES 
(NULL, '54eb6b1e-af7b-4534-8559-cc7f50d4e8c5', '2f074c28-aa6c-4f32-be7d-b16e5e01ec39', 'tv', NULL, 10, 1000, 10000);

-- -------------------------------------------------------------
-- Table structure for expenses
-- -------------------------------------------------------------
DROP TABLE IF EXISTS `expenses`;
CREATE TABLE `expenses` (
  `id` VARCHAR(64) PRIMARY KEY,
  `businessId` VARCHAR(64) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `category` VARCHAR(128) NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `paymentMode` VARCHAR(64) DEFAULT 'CASH',
  `date` DATE NOT NULL,
  `receiptNo` VARCHAR(64),
  `notes` TEXT,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_exp_businessId` (`businessId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `expenses` VALUES 
('ebb286b6-1f5c-4d12-af1a-e3e6181777c6', '70c18ee7-e769-4bfa-b060-0b304f7dd658', 'rent', 'Rent & Lease', 5000, 'CASH', '2026-08-30', '', '', '2026-08-30T11:00:54.338Z');

-- -------------------------------------------------------------
-- Table structure for stock_logs
-- -------------------------------------------------------------
DROP TABLE IF EXISTS `stock_logs`;
CREATE TABLE `stock_logs` (
  `id` VARCHAR(64) PRIMARY KEY,
  `businessId` VARCHAR(64) NOT NULL,
  `productId` VARCHAR(64) NOT NULL,
  `productName` VARCHAR(255),
  `type` VARCHAR(64) NOT NULL,
  `quantity` INT NOT NULL,
  `previousQuantity` INT NOT NULL,
  `newQuantity` INT NOT NULL,
  `reason` TEXT,
  `date` DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_stock_prod` (`productId`) 
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `stock_logs` VALUES 
('f6ba49b7-05c6-419c-813a-33ef03cca60d', '70c18ee7-e769-4bfa-b060-0b304f7dd658', '2f074c28-aa6c-4f32-be7d-b16e5e01ec39', 'tv', 'SALE', -1, 6, 5, 'Invoice #INV-20260826-0001', '2026-08-26T12:59:07.837Z'),
('eefb988f-9e2a-4680-8adf-c7321c649c3b', '70c18ee7-e769-4bfa-b060-0b304f7dd658', '2f074c28-aa6c-4f32-be7d-b16e5e01ec39', 'tv', 'RESTOCK', 10, 5, 15, 'Restocked from Dashboard alert', '2026-08-26T13:13:21.001Z'),
('80e45765-ba02-476d-a68b-e012bb53062f', '70c18ee7-e769-4bfa-b060-0b304f7dd658', '2f074c28-aa6c-4f32-be7d-b16e5e01ec39', 'tv', 'SALE', -1, 15, 14, 'Invoice #INV-20260826-0002', '2026-08-26T13:14:31.997Z'),
('9e442f08-ff58-4e1a-8713-ced66ae0e9a1', '70c18ee7-e769-4bfa-b060-0b304f7dd658', '2f074c28-aa6c-4f32-be7d-b16e5e01ec39', 'tv', 'SALE', -1, 14, 13, 'Invoice #INV-20260826-0003', '2026-08-26T13:16:02.882Z'),
('f03be6a7-60e3-4ed0-a5cd-4ce11c62fbae', '70c18ee7-e769-4bfa-b060-0b304f7dd658', '2f074c28-aa6c-4f32-be7d-b16e5e01ec39', 'tv', 'SALE', -1, 13, 12, 'Invoice #INV-20260826-0004', '2026-08-26T16:01:56.700Z'),
('e76890bb-9b26-4318-a8de-749b9899cce1', '70c18ee7-e769-4bfa-b060-0b304f7dd658', '2f074c28-aa6c-4f32-be7d-b16e5e01ec39', 'tv', 'SALE', -1, 12, 11, 'Invoice #INV-20260826-0005', '2026-08-26T16:03:30.557Z'),
('d1bd53be-e43b-40c0-94dc-004cbdf1939d', '70c18ee7-e769-4bfa-b060-0b304f7dd658', '2f074c28-aa6c-4f32-be7d-b16e5e01ec39', 'tv', 'SALE', -1, 11, 10, 'Invoice #INV-20260826-0006', '2026-08-26T16:12:24.559Z'),
('7a894339-422a-4d81-9418-c2c65882874d', '70c18ee7-e769-4bfa-b060-0b304f7dd658', '2f074c28-aa6c-4f32-be7d-b16e5e01ec39', 'tv', 'SALE', -1, 10, 9, 'Invoice #INV-20260826-0007', '2026-08-26T16:13:09.970Z'),
('795020cf-04d0-4da0-91ca-bd52c21c8bb0', '70c18ee7-e769-4bfa-b060-0b304f7dd658', '2f074c28-aa6c-4f32-be7d-b16e5e01ec39', 'tv', 'SALE', -1, 9, 8, 'Invoice #INV-20260826-0008', '2026-08-26T16:25:50.471Z'),
('a905a139-1c1f-4ac2-b8a4-b26f3f865bc3', '70c18ee7-e769-4bfa-b060-0b304f7dd658', '2f074c28-aa6c-4f32-be7d-b16e5e01ec39', 'tv', 'SALE', -2, 8, 6, 'Invoice #INV-20260826-0009', '2026-08-26T17:41:03.440Z'),
('a06d03f6-f2b5-43c5-9fd7-a891fde8cde1', '70c18ee7-e769-4bfa-b060-0b304f7dd658', '2f074c28-aa6c-4f32-be7d-b16e5e01ec39', 'tv', 'SALE', -1, 6, 5, 'Invoice #INV-20260826-0010', '2026-08-26T17:41:26.121Z'),
('c1099e57-88da-4dab-a833-07c203f0d43e', '70c18ee7-e769-4bfa-b060-0b304f7dd658', '2f074c28-aa6c-4f32-be7d-b16e5e01ec39', 'tv', 'RESTOCK', 10, 5, 15, 'Restocked from Dashboard alert', '2026-08-30T10:58:57.543Z'),
('dbeeeced-0ee3-4296-b396-5ab2b8ac15ce', '70c18ee7-e769-4bfa-b060-0b304f7dd658', '2f074c28-aa6c-4f32-be7d-b16e5e01ec39', 'tv', 'RESTOCK_PURCHASE', 10, 15, 25, 'Purchase Order #PO-20260830-0001 from Suplier1', '2026-08-30T11:00:11.319Z');

-- -------------------------------------------------------------
-- Table structure for sms_logs
-- -------------------------------------------------------------
DROP TABLE IF EXISTS `sms_logs`;
CREATE TABLE `sms_logs` (
  `id` VARCHAR(64) PRIMARY KEY,
  `businessId` VARCHAR(64) NOT NULL,
  `customerId` VARCHAR(64),
  `customerName` VARCHAR(255),
  `phone` VARCHAR(32),
  `message` TEXT,
  `templateType` VARCHAR(64),
  `status` VARCHAR(32),
  `gateway` VARCHAR(64),
  `date` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `sms_logs` VALUES 
('0ba25d7f-083c-4a3f-bd40-13a766c94b18', '70c18ee7-e769-4bfa-b060-0b304f7dd658', '655af8ae-d9aa-4b09-bd31-eaf41b5ea0d4', 'Aatman', '7021724584', 'Hello Aatman, thank you for your purchase at Business1! Your Invoice #INV-20260826-0001 for ₹11,800 is confirmed. Paid: ₹0, Balance: ₹11,800. Have a great day!', 'bill_receipt', 'DELIVERED (SIMULATED)', 'Built-in Instant SMS Simulator', '2026-08-26T12:59:54.812Z'),
('fd405a17-d80a-492b-9d66-cf0638538294', '70c18ee7-e769-4bfa-b060-0b304f7dd658', NULL, 'Test Recipient', '7021724584', 'Hello! This is a test SMS from Business1 testing SMS configuration.', 'test', 'DELIVERED (SIMULATED)', 'Built-in Instant SMS Simulator', '2026-08-26T13:01:37.786Z'),
('2d00d573-bee3-46d2-ab7a-67b63d007c38', '70c18ee7-e769-4bfa-b060-0b304f7dd658', '655af8ae-d9aa-4b09-bd31-eaf41b5ea0d4', 'Aatman', '7021724584', 'Dear Aatman, this is a gentle reminder that you have a pending balance of ₹21,800 with Business1. Please clear it at your earliest convenience. Thank you!', 'payment_reminder', 'DELIVERED (SIMULATED)', 'Built-in Instant SMS Simulator', '2026-08-26T13:31:57.706Z'),
('c58e5b78-ac21-4743-8745-fcdd1b67d537', '70c18ee7-e769-4bfa-b060-0b304f7dd658', '655af8ae-d9aa-4b09-bd31-eaf41b5ea0d4', 'Aatman', '7021724584', 'Hello Aatman, thank you for your purchase at Business1! Your Invoice #INV for ₹0 is confirmed. Paid: ₹0, Balance: ₹0. Have a great day!', 'bill_receipt', 'DELIVERED (SIMULATED)', 'Built-in Instant SMS Simulator', '2026-08-26T13:32:07.060Z'),
('b9958a73-579d-4397-ae1d-c0a7d25128e6', '70c18ee7-e769-4bfa-b060-0b304f7dd658', '655af8ae-d9aa-4b09-bd31-eaf41b5ea0d4', 'Aatman', '7021724584', 'Dear Aatman, this is a gentle reminder that you have a pending balance of ₹21,800 with Business1. Please clear it at your earliest convenience. Thank you!', 'payment_reminder', 'DELIVERED (SIMULATED)', 'Built-in Instant SMS Simulator', '2026-08-26T13:35:13.406Z'),
('85cd0a60-513e-401b-b400-ab01e59d4d26', '70c18ee7-e769-4bfa-b060-0b304f7dd658', '655af8ae-d9aa-4b09-bd31-eaf41b5ea0d4', 'Aatman', '7021724584', 'Hello Aatman, thank you for your purchase at Business1! Your Invoice #INV-20260826-0008 for ₹10,000 is confirmed. Paid: ₹10,000, Balance: ₹0. Have a great day!', 'bill_receipt', 'DELIVERED (SIMULATED)', 'Built-in Instant SMS Simulator', '2026-08-26T16:26:47.182Z'),
('95c95a73-139c-46e2-9804-ab59e4ca4117', '70c18ee7-e769-4bfa-b060-0b304f7dd658', '83a4d029-b4a8-417b-bfa4-306a00c941b4', 'Dishank Shah', '9224101205', 'Dear Dishank Shah, thank you for choosing Business1! We deeply value your trust and look forward to serving you again soon.', 'thank_you', 'DELIVERED (SIMULATED)', 'Built-in Instant SMS Simulator', '2026-08-26T17:43:56.819Z'),
('b323bfad-693b-48d9-8537-187b60efafaa', '70c18ee7-e769-4bfa-b060-0b304f7dd658', '655af8ae-d9aa-4b09-bd31-eaf41b5ea0d4', 'Aatman', '7021724584', 'Hello Aatman, thank you for your purchase at Business1! Your Invoice #INV-20260826-0008 for ₹10,000 is confirmed. Paid: ₹10,000, Balance: ₹0. Have a great day!', 'bill_receipt', 'DELIVERED (SIMULATED)', 'Built-in Instant SMS Simulator', '2026-08-30T11:01:43.027Z');

SET FOREIGN_KEY_CHECKS = 1;
-- ================= END OF SQL DUMP =================
