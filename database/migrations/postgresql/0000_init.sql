CREATE TABLE "barang" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "barang_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"nama_barang" text NOT NULL,
	"stok_barang" integer NOT NULL,
	"kategori_barang_id" integer NOT NULL,
	"harga_modal" integer NOT NULL,
	"harga_jual" integer NOT NULL,
	"barcode_barang" text,
	"created_ms" bigint NOT NULL,
	"modified_ms" bigint NOT NULL,
	CONSTRAINT "barang_barcode_barang_unique" UNIQUE("barcode_barang")
);
--> statement-breakpoint
CREATE TABLE "barang_masuk" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "barang_masuk_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"barang_id" integer NOT NULL,
	"deskripsi" text NOT NULL,
	"jumlah_barang" integer NOT NULL,
	"tanggal_key" integer NOT NULL,
	"created_ms" bigint NOT NULL,
	"modified_ms" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kategori_barang" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "kategori_barang_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"nama_kategori" text NOT NULL,
	"created_ms" bigint NOT NULL,
	"modified_ms" bigint NOT NULL,
	CONSTRAINT "kategori_barang_nama_kategori_unique" UNIQUE("nama_kategori")
);
--> statement-breakpoint
CREATE TABLE "pembukuan" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "pembukuan_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tipe" integer NOT NULL,
	"deskripsi" text,
	"jumlah_uang" integer NOT NULL,
	"referensi_id" integer,
	"tanggal_key" integer NOT NULL,
	"created_ms" bigint NOT NULL,
	"modified_ms" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "penjualan" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "penjualan_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"kasir_id" integer DEFAULT 1 NOT NULL,
	"no_struk" text NOT NULL,
	"total_barang" integer NOT NULL,
	"total_harga_modal" integer NOT NULL,
	"total_harga_jual" integer NOT NULL,
	"tanggal_key" integer NOT NULL,
	"created_ms" bigint NOT NULL,
	"modified_ms" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "penjualan_item" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "penjualan_item_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"penjualan_id" integer NOT NULL,
	"barang_id" integer NOT NULL,
	"nama_barang" text NOT NULL,
	"jumlah" bigint NOT NULL,
	"harga_modal" bigint NOT NULL,
	"total_harga_modal" bigint NOT NULL,
	"harga_jual" bigint NOT NULL,
	"total_harga_jual" bigint NOT NULL,
	"tanggal_key" integer NOT NULL,
	"created_ms" bigint NOT NULL,
	"modified_ms" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "retur_barang" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "retur_barang_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tanggal_key" integer NOT NULL,
	"barang_id" integer NOT NULL,
	"deskripsi" text,
	"jumlah_barang" integer NOT NULL,
	"created_ms" bigint NOT NULL,
	"modified_ms" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "roles_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"permission_level" integer NOT NULL,
	"created_ms" bigint NOT NULL,
	"modified_ms" bigint NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "settings_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"section" text NOT NULL,
	"key" text NOT NULL,
	"value" text,
	"type" text NOT NULL,
	"created_ms" bigint,
	"modified_ms" bigint
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"username" varchar(255) NOT NULL,
	"full_name" text NOT NULL,
	"password_hash" text NOT NULL,
	"profile_img" text,
	"role_id" integer NOT NULL,
	"created_ms" bigint NOT NULL,
	"modified_ms" bigint NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "barang" ADD CONSTRAINT "barang_kategori_barang_id_kategori_barang_id_fk" FOREIGN KEY ("kategori_barang_id") REFERENCES "public"."kategori_barang"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "barang_masuk" ADD CONSTRAINT "barang_masuk_barang_id_barang_id_fk" FOREIGN KEY ("barang_id") REFERENCES "public"."barang"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "penjualan" ADD CONSTRAINT "penjualan_kasir_id_users_id_fk" FOREIGN KEY ("kasir_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "penjualan_item" ADD CONSTRAINT "penjualan_item_penjualan_id_penjualan_id_fk" FOREIGN KEY ("penjualan_id") REFERENCES "public"."penjualan"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "retur_barang" ADD CONSTRAINT "retur_barang_barang_id_barang_id_fk" FOREIGN KEY ("barang_id") REFERENCES "public"."barang"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE cascade;