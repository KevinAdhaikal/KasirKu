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
	`section` text NOT NULL,
	`key` text NOT NULL,
	`value` text,
	`type` text NOT NULL,
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