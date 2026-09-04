/*
──────────────────────────────────────────────────────────────
                           KasirKu
        Simple & Efficient Point of Sale (PoS) System

            Author      : Kevin Adhaikal
            Copyright   : (C) 2026 Kevin Adhaikal
            License     : AplikasiKasir License

    Permission is granted to modify and distribute this
    software, but the author's name must not be removed
                     or altered.
──────────────────────────────────────────────────────────────
*/

import { mysqlTable, int, varchar, bigint, text, mysqlSchema } from "drizzle-orm/mysql-core";

export const roles = mysqlTable("roles", {
    id: int("id").primaryKey().autoincrement(),
    name: varchar("name", { length: 255 }).unique().notNull(),
    permission_level: int("permission_level").notNull(),
    created_ms: bigint("created_ms", { mode: "number" }).notNull(),
    modified_ms: bigint("modified_ms", { mode: "number" }).notNull(),
});

export const users = mysqlTable("users", {
    id: int("id").primaryKey().autoincrement(),
    username: varchar("username", { length: 255 }).unique().notNull(),
    full_name: text("full_name").notNull(),
    password_hash: text("password_hash").notNull(),
    profile_img: text("profile_img"),
    role_id: int("role_id").notNull().references(() => roles.id, { onDelete: "cascade", onUpdate: "cascade" }),
    created_ms: bigint("created_ms", { mode: "number" }).notNull(),
    modified_ms: bigint("modified_ms", { mode: "number" }).notNull(),
});

export const kategori_barang = mysqlTable("kategori_barang", {
    id: int("id").primaryKey().autoincrement(),
    nama_kategori: text("nama_kategori").unique().notNull(),
    created_ms: bigint("created_ms", { mode: "number" }).notNull(),
    modified_ms: bigint("modified_ms", { mode: "number" }).notNull(),
});

export const barang = mysqlTable("barang", {
    id: int("id").primaryKey().autoincrement(),
    nama_barang: text("nama_barang").notNull(),
    stok_barang: int("stok_barang").notNull(),
    kategori_barang_id: int("kategori_barang_id").notNull().references(() => kategori_barang.id, { onDelete: "cascade", onUpdate: "cascade" }),
    harga_modal: int("harga_modal").notNull(),
    harga_jual: int("harga_jual").notNull(),
    barcode_barang: text("barcode_barang").unique(),
    created_ms: bigint("created_ms", { mode: "number" }).notNull(),
    modified_ms: bigint("modified_ms", { mode: "number" }).notNull(),
});

export const barang_masuk = mysqlTable("barang_masuk", {
    id: int("id").primaryKey().autoincrement(),
    barang_id: int("barang_id").notNull().references(() => barang.id, { onDelete: "cascade", onUpdate: "cascade" }),
    deskripsi: text("deskripsi").notNull(),
    jumlah_barang: int("jumlah_barang").notNull(),
    tanggal_key: int("tanggal_key").notNull(),
    created_ms: bigint("created_ms", { mode: "number" }).notNull(),
    modified_ms: bigint("modified_ms", { mode: "number" }).notNull(),
});

export const penjualan = mysqlTable("penjualan", {
    id: int("id").primaryKey().autoincrement(),
    kasir_id: int("kasir_id").notNull().default(1).references(() => users.id, { onDelete: "restrict", onUpdate: "cascade" }),
    no_struk: text("no_struk").notNull(),
    total_barang: int("total_barang").notNull(),
    total_harga_modal: int("total_harga_modal").notNull(),
    total_harga_jual: int("total_harga_jual").notNull(),
    tanggal_key: int("tanggal_key").notNull(),
    created_ms: bigint("created_ms", { mode: "number" }).notNull(),
    modified_ms: bigint("modified_ms", { mode: "number" }).notNull(),
});

export const penjualan_item = mysqlTable("penjualan_item", {
    id: int("id").primaryKey().autoincrement(),
    penjualan_id: int("penjualan_id").notNull().references(() => penjualan.id, { onDelete: "cascade", onUpdate: "cascade" }),
    barang_id: int("barang_id").notNull(),
    nama_barang: text("nama_barang").notNull(),
    jumlah: bigint("jumlah", { mode: "number" }).notNull(),
    harga_modal: bigint("harga_modal", { mode: "number" }).notNull(),
    total_harga_modal: bigint("total_harga_modal", { mode: "number" }).notNull(),
    harga_jual: bigint("harga_jual", { mode: "number" }).notNull(),
    total_harga_jual: bigint("total_harga_jual", { mode: "number" }).notNull(),
    tanggal_key: int("tanggal_key").notNull(),
    created_ms: bigint("created_ms", { mode: "number" }).notNull(),
    modified_ms: bigint("modified_ms", { mode: "number" }).notNull(),
});

export const pembukuan = mysqlTable("pembukuan", {
    id: int("id").primaryKey().autoincrement(),
    tipe: int("tipe").notNull(),
    deskripsi: text("deskripsi"),
    jumlah_uang: int("jumlah_uang").notNull(),
    referensi_id: int("referensi_id"),
    tanggal_key: int("tanggal_key").notNull(),
    created_ms: bigint("created_ms", { mode: "number" }).notNull(),
    modified_ms: bigint("modified_ms", { mode: "number" }).notNull(),
});

export const retur_barang = mysqlTable("retur_barang", {
    id: int("id").primaryKey().autoincrement(),
    tanggal_key: int("tanggal_key").notNull(),
    barang_id: int("barang_id").notNull().references(() => barang.id, { onDelete: "cascade", onUpdate: "cascade" }),
    deskripsi: text("deskripsi"),
    jumlah_barang: int("jumlah_barang").notNull(),
    created_ms: bigint("created_ms", { mode: "number" }).notNull(),
    modified_ms: bigint("modified_ms", { mode: "number" }).notNull(),
});

export const settings = mysqlTable("settings", {
    id: int("id").primaryKey().autoincrement(),
    key: text("key"),
    value: text("value"),
    type: text("type"),
    created_ms: bigint("created_ms", { mode: "number" }),
    modified_ms: bigint("modified_ms", { mode: "number" }),
});