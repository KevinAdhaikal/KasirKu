CREATE TABLE `barang` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nama_barang` text NOT NULL,
	`stok_barang` int NOT NULL,
	`kategori_barang_id` int NOT NULL,
	`harga_modal` int NOT NULL,
	`harga_jual` int NOT NULL,
	`barcode_barang` text,
	`created_ms` bigint NOT NULL,
	`modified_ms` bigint NOT NULL,
	CONSTRAINT `barang_id` PRIMARY KEY(`id`),
	CONSTRAINT `barang_barcode_barang_unique` UNIQUE(`barcode_barang`)
);
--> statement-breakpoint
CREATE TABLE `barang_masuk` (
	`id` int AUTO_INCREMENT NOT NULL,
	`barang_id` int NOT NULL,
	`deskripsi` text NOT NULL,
	`jumlah_barang` int NOT NULL,
	`tanggal_key` int NOT NULL,
	`created_ms` bigint NOT NULL,
	`modified_ms` bigint NOT NULL,
	CONSTRAINT `barang_masuk_id` PRIMARY KEY(`id`)
);
CREATE TABLE `kasirku` (
	`k` text NOT NULL,
	`v` text NOT NULL
);

--> statement-breakpoint
CREATE TABLE `kategori_barang` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nama_kategori` text NOT NULL,
	`created_ms` bigint NOT NULL,
	`modified_ms` bigint NOT NULL,
	CONSTRAINT `kategori_barang_id` PRIMARY KEY(`id`),
	CONSTRAINT `kategori_barang_nama_kategori_unique` UNIQUE(`nama_kategori`)
);
--> statement-breakpoint
CREATE TABLE `pembukuan` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tipe` int NOT NULL,
	`deskripsi` text,
	`jumlah_uang` int NOT NULL,
	`referensi_id` int,
	`tanggal_key` int NOT NULL,
	`created_ms` bigint NOT NULL,
	`modified_ms` bigint NOT NULL,
	CONSTRAINT `pembukuan_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `penjualan` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kasir_id` int NOT NULL DEFAULT 1,
	`no_struk` text NOT NULL,
	`total_barang` int NOT NULL,
	`total_harga_modal` int NOT NULL,
	`total_harga_jual` int NOT NULL,
	`tanggal_key` int NOT NULL,
	`created_ms` bigint NOT NULL,
	`modified_ms` bigint NOT NULL,
	CONSTRAINT `penjualan_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `penjualan_item` (
	`id` int AUTO_INCREMENT NOT NULL,
	`penjualan_id` int NOT NULL,
	`barang_id` int NOT NULL,
	`nama_barang` text NOT NULL,
	`jumlah` bigint NOT NULL,
	`harga_modal` bigint NOT NULL,
	`total_harga_modal` bigint NOT NULL,
	`harga_jual` bigint NOT NULL,
	`total_harga_jual` bigint NOT NULL,
	`tanggal_key` int NOT NULL,
	`created_ms` bigint NOT NULL,
	`modified_ms` bigint NOT NULL,
	CONSTRAINT `penjualan_item_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `retur_barang` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tanggal_key` int NOT NULL,
	`barang_id` int NOT NULL,
	`deskripsi` text,
	`jumlah_barang` int NOT NULL,
	`created_ms` bigint NOT NULL,
	`modified_ms` bigint NOT NULL,
	CONSTRAINT `retur_barang_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`permission_level` int NOT NULL,
	`created_ms` bigint NOT NULL,
	`modified_ms` bigint NOT NULL,
	CONSTRAINT `roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `roles_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` text,
	`value` text,
	`type` text,
	`created_ms` bigint,
	`modified_ms` bigint,
	CONSTRAINT `settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(255) NOT NULL,
	`full_name` text NOT NULL,
	`password_hash` text NOT NULL,
	`profile_img` text,
	`role_id` int NOT NULL,
	`created_ms` bigint NOT NULL,
	`modified_ms` bigint NOT NULL,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
ALTER TABLE `barang` ADD CONSTRAINT `barang_kategori_barang_id_kategori_barang_id_fk` FOREIGN KEY (`kategori_barang_id`) REFERENCES `kategori_barang`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `barang_masuk` ADD CONSTRAINT `barang_masuk_barang_id_barang_id_fk` FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `penjualan` ADD CONSTRAINT `penjualan_kasir_id_users_id_fk` FOREIGN KEY (`kasir_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `penjualan_item` ADD CONSTRAINT `penjualan_item_penjualan_id_penjualan_id_fk` FOREIGN KEY (`penjualan_id`) REFERENCES `penjualan`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `retur_barang` ADD CONSTRAINT `retur_barang_barang_id_barang_id_fk` FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE cascade ON UPDATE cascade;

-- =========================================================
-- ROLES
-- =========================================================

INSERT INTO roles
    (name, permission_level, created_ms, modified_ms)
VALUES
    ('Administrator', 100, UNIX_TIMESTAMP() * 1000, UNIX_TIMESTAMP() * 1000),
    ('Kasir', 50, UNIX_TIMESTAMP() * 1000, UNIX_TIMESTAMP() * 1000);


-- =========================================================
-- USERS
-- =========================================================

INSERT INTO users
    (username, full_name, password_hash, profile_img, role_id, created_ms, modified_ms)
VALUES
    ('admin', 'Administrator', 'TEST_PASSWORD_HASH', NULL, 1, UNIX_TIMESTAMP() * 1000, UNIX_TIMESTAMP() * 1000),
    ('kasir', 'Kasir Testing', 'TEST_PASSWORD_HASH', NULL, 2, UNIX_TIMESTAMP() * 1000, UNIX_TIMESTAMP() * 1000);


-- =========================================================
-- KATEGORI BARANG
-- =========================================================

INSERT INTO kategori_barang
    (nama_kategori, created_ms, modified_ms)
VALUES
    ('Makanan', UNIX_TIMESTAMP() * 1000, UNIX_TIMESTAMP() * 1000),
    ('Minuman', UNIX_TIMESTAMP() * 1000, UNIX_TIMESTAMP() * 1000),
    ('Sembako', UNIX_TIMESTAMP() * 1000, UNIX_TIMESTAMP() * 1000),
    ('Peralatan Rumah', UNIX_TIMESTAMP() * 1000, UNIX_TIMESTAMP() * 1000);


-- =========================================================
-- BARANG
-- =========================================================

INSERT INTO barang
    (nama_barang, stok_barang, kategori_barang_id, harga_modal, harga_jual, barcode_barang, created_ms, modified_ms)
VALUES
    ('Indomie Goreng', 50, 1, 2500, 3500, '089686010001', UNIX_TIMESTAMP() * 1000, UNIX_TIMESTAMP() * 1000),
    ('Indomie Ayam Bawang', 40, 1, 2500, 3500, '089686010002', UNIX_TIMESTAMP() * 1000, UNIX_TIMESTAMP() * 1000),
    ('Aqua 600ml', 100, 2, 2500, 4000, '089686010003', UNIX_TIMESTAMP() * 1000, UNIX_TIMESTAMP() * 1000),
    ('Teh Pucuk 350ml', 75, 2, 3000, 5000, '089686010004', UNIX_TIMESTAMP() * 1000, UNIX_TIMESTAMP() * 1000),
    ('Beras 5kg', 20, 3, 65000, 75000, '089686010005', UNIX_TIMESTAMP() * 1000, UNIX_TIMESTAMP() * 1000),
    ('Gula Pasir 1kg', 30, 3, 15000, 18000, '089686010006', UNIX_TIMESTAMP() * 1000, UNIX_TIMESTAMP() * 1000),
    ('Sabun Mandi', 25, 4, 3500, 5000, '089686010007', UNIX_TIMESTAMP() * 1000, UNIX_TIMESTAMP() * 1000),
    ('Pasta Gigi', 25, 4, 9000, 12000, '089686010008', UNIX_TIMESTAMP() * 1000, UNIX_TIMESTAMP() * 1000);


-- =========================================================
-- BARANG MASUK
-- =========================================================

INSERT INTO barang_masuk
    (barang_id, deskripsi, jumlah_barang, tanggal_key, created_ms, modified_ms)
VALUES
    (1, 'Stok awal Indomie Goreng', 50, 20260903, UNIX_TIMESTAMP() * 1000, UNIX_TIMESTAMP() * 1000),
    (2, 'Stok awal Indomie Ayam Bawang', 40, 20260903, UNIX_TIMESTAMP() * 1000, UNIX_TIMESTAMP() * 1000),
    (3, 'Stok awal Aqua 600ml', 100, 20260903, UNIX_TIMESTAMP() * 1000, UNIX_TIMESTAMP() * 1000),
    (4, 'Stok awal Teh Pucuk', 75, 20260903, UNIX_TIMESTAMP() * 1000, UNIX_TIMESTAMP() * 1000),
    (5, 'Stok awal Beras 5kg', 20, 20260903, UNIX_TIMESTAMP() * 1000, UNIX_TIMESTAMP() * 1000),
    (6, 'Stok awal Gula Pasir', 30, 20260903, UNIX_TIMESTAMP() * 1000, UNIX_TIMESTAMP() * 1000);


-- =========================================================
-- PENJUALAN
-- =========================================================

INSERT INTO penjualan
    (kasir_id, no_struk, total_barang, total_harga_modal, total_harga_jual, tanggal_key, created_ms, modified_ms)
VALUES
    (2, 'STRUK-20260903-0001', 3, 7500, 10500, 20260903, UNIX_TIMESTAMP() * 1000, UNIX_TIMESTAMP() * 1000),
    (2, 'STRUK-20260903-0002', 4, 14000, 21000, 20260903, UNIX_TIMESTAMP() * 1000, UNIX_TIMESTAMP() * 1000);


-- =========================================================
-- PENJUALAN ITEM
-- =========================================================

-- STRUK-20260903-0001
INSERT INTO penjualan_item
    (penjualan_id, barang_id, nama_barang, jumlah,
     harga_modal, total_harga_modal,
     harga_jual, total_harga_jual,
     tanggal_key, created_ms, modified_ms)
VALUES
    (1, 1, 'Indomie Goreng', 2,
     2500, 5000,
     3500, 7000,
     20260903, UNIX_TIMESTAMP() * 1000, UNIX_TIMESTAMP() * 1000),

    (1, 3, 'Aqua 600ml', 1,
     2500, 2500,
     4000, 4000,
     20260903, UNIX_TIMESTAMP() * 1000, UNIX_TIMESTAMP() * 1000);


-- STRUK-20260903-0002
INSERT INTO penjualan_item
    (penjualan_id, barang_id, nama_barang, jumlah,
     harga_modal, total_harga_modal,
     harga_jual, total_harga_jual,
     tanggal_key, created_ms, modified_ms)
VALUES
    (2, 4, 'Teh Pucuk 350ml', 2,
     3000, 6000,
     5000, 10000,
     20260903, UNIX_TIMESTAMP() * 1000, UNIX_TIMESTAMP() * 1000),

    (2, 6, 'Gula Pasir 1kg', 2,
     15000, 30000,
     18000, 36000,
     20260903, UNIX_TIMESTAMP() * 1000, UNIX_TIMESTAMP() * 1000);


-- =========================================================
-- RETUR BARANG
-- =========================================================

INSERT INTO retur_barang
    (tanggal_key, barang_id, deskripsi, jumlah_barang, created_ms, modified_ms)
VALUES
    (20260903, 1, 'Barang rusak', 2, UNIX_TIMESTAMP() * 1000, UNIX_TIMESTAMP() * 1000),
    (20260903, 3, 'Kemasan bocor', 1, UNIX_TIMESTAMP() * 1000, UNIX_TIMESTAMP() * 1000);


-- =========================================================
-- PEMBUKUAN
-- =========================================================

INSERT INTO pembukuan
    (tipe, deskripsi, jumlah_uang, referensi_id, tanggal_key, created_ms, modified_ms)
VALUES
    (1, 'Pendapatan penjualan STRUK-20260903-0001', 10500, 1, 20260903, UNIX_TIMESTAMP() * 1000, UNIX_TIMESTAMP() * 1000),
    (1, 'Pendapatan penjualan STRUK-20260903-0002', 46000, 2, 20260903, UNIX_TIMESTAMP() * 1000, UNIX_TIMESTAMP() * 1000),
    (2, 'Pengeluaran pembelian stok barang', 500000, NULL, 20260903, UNIX_TIMESTAMP() * 1000, UNIX_TIMESTAMP() * 1000);


-- =========================================================
-- SETTINGS
-- =========================================================

INSERT INTO settings
    (`key`, `value`, `type`, created_ms, modified_ms)
VALUES
    ('store_name', 'Toko Testing', 'string', UNIX_TIMESTAMP() * 1000, UNIX_TIMESTAMP() * 1000),
    ('store_desc', 'Toko untuk testing KasirKu', 'string', UNIX_TIMESTAMP() * 1000, UNIX_TIMESTAMP() * 1000),
    ('store_address', 'Jl. Testing No. 123', 'string', UNIX_TIMESTAMP() * 1000, UNIX_TIMESTAMP() * 1000),
    ('store_phone_num', '081234567890', 'string', UNIX_TIMESTAMP() * 1000, UNIX_TIMESTAMP() * 1000);

INSERT INTO kasirku (k, v) VALUES ('version', '2');