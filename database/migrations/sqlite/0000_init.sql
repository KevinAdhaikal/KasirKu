CREATE TABLE `barang` (
	`id` integer PRIMARY KEY NOT NULL,
	`nama_barang` text NOT NULL,
	`stok_barang` integer NOT NULL,
	`kategori_barang_id` integer NOT NULL,
	`harga_modal` integer NOT NULL,
	`harga_jual` integer NOT NULL,
	`barcode_barang` text,
	`created_ms` integer NOT NULL,
	`modified_ms` integer NOT NULL,
	FOREIGN KEY (`kategori_barang_id`) REFERENCES `kategori_barang`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `barang_barcode_barang_unique` ON `barang` (`barcode_barang`);--> statement-breakpoint
CREATE TABLE `barang_masuk` (
	`id` integer PRIMARY KEY NOT NULL,
	`barang_id` integer NOT NULL,
	`deskripsi` text NOT NULL,
	`jumlah_barang` integer NOT NULL,
	`tanggal_key` integer NOT NULL,
	`created_ms` integer NOT NULL,
	`modified_ms` integer NOT NULL,
	FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `kasirku` (
	`id` integer PRIMARY KEY NOT NULL,
	`k` text NOT NULL,
	`v` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `kategori_barang` (
	`id` integer PRIMARY KEY NOT NULL,
	`nama_kategori` text NOT NULL,
	`created_ms` integer NOT NULL,
	`modified_ms` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `kategori_barang_nama_kategori_unique` ON `kategori_barang` (`nama_kategori`);--> statement-breakpoint
CREATE TABLE `pembukuan` (
	`id` integer PRIMARY KEY NOT NULL,
	`tipe` integer NOT NULL,
	`deskripsi` text,
	`jumlah_uang` integer NOT NULL,
	`referensi_id` integer,
	`tanggal_key` integer NOT NULL,
	`created_ms` integer NOT NULL,
	`modified_ms` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `penjualan` (
	`id` integer PRIMARY KEY NOT NULL,
	`kasir_id` integer DEFAULT 1 NOT NULL,
	`no_struk` text NOT NULL,
	`total_barang` integer NOT NULL,
	`total_harga_modal` integer NOT NULL,
	`total_harga_jual` integer NOT NULL,
	`tanggal_key` integer NOT NULL,
	`created_ms` integer NOT NULL,
	`modified_ms` integer NOT NULL,
	FOREIGN KEY (`kasir_id`) REFERENCES `users`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `penjualan_item` (
	`id` integer PRIMARY KEY NOT NULL,
	`penjualan_id` integer NOT NULL,
	`barang_id` integer NOT NULL,
	`nama_barang` text NOT NULL,
	`jumlah` integer NOT NULL,
	`harga_modal` integer NOT NULL,
	`total_harga_modal` integer NOT NULL,
	`harga_jual` integer NOT NULL,
	`total_harga_jual` integer NOT NULL,
	`tanggal_key` integer NOT NULL,
	`created_ms` integer NOT NULL,
	`modified_ms` integer NOT NULL,
	FOREIGN KEY (`penjualan_id`) REFERENCES `penjualan`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `retur_barang` (
	`id` integer PRIMARY KEY NOT NULL,
	`tanggal_key` integer NOT NULL,
	`barang_id` integer NOT NULL,
	`deskripsi` text,
	`jumlah_barang` integer NOT NULL,
	`created_ms` integer NOT NULL,
	`modified_ms` integer NOT NULL,
	FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`permission_level` integer NOT NULL,
	`created_ms` integer NOT NULL,
	`modified_ms` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `roles_name_unique` ON `roles` (`name`);--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`section` text NOT NULL,
	`key` text NOT NULL,
	`value` text,
	`type` text NOT NULL,
	`created_ms` integer,
	`modified_ms` integer
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`full_name` text NOT NULL,
	`password_hash` text NOT NULL,
	`profile_img` text,
	`role_id` integer NOT NULL,
	`created_ms` integer NOT NULL,
	`modified_ms` integer NOT NULL,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);