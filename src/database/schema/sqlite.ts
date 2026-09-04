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

import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const roles = sqliteTable("roles", {
    id: integer("id").primaryKey(),
    name: text("name").unique().notNull(),
    permission_level: integer("permission_level").notNull(),
    created_ms: integer("created_ms").notNull(),
    modified_ms: integer("modified_ms").notNull(),
});

export const users = sqliteTable("users", {
    id: integer("id").primaryKey(),
    username: text("username").unique().notNull(),
    full_name: text("full_name").notNull(),
    password_hash: text("password_hash").notNull(),
    profile_img: text("profile_img"),
    role_id: integer("role_id").notNull().references(() => roles.id, { onDelete: "cascade", onUpdate: "cascade" }),
    created_ms: integer("created_ms").notNull(),
    modified_ms: integer("modified_ms").notNull(),
});

export const kategori_barang = sqliteTable("kategori_barang", {
    id: integer("id").primaryKey(),
    nama_kategori: text("nama_kategori").unique().notNull(),
    created_ms: integer("created_ms").notNull(),
    modified_ms: integer("modified_ms").notNull(),
});

export const barang = sqliteTable("barang", {
    id: integer("id").primaryKey(),
    nama_barang: text("nama_barang").notNull(),
    stok_barang: integer("stok_barang").notNull(),
    kategori_barang_id: integer("kategori_barang_id").notNull().references(() => kategori_barang.id, { onDelete: "cascade", onUpdate: "cascade" }),
    harga_modal: integer("harga_modal").notNull(),
    harga_jual: integer("harga_jual").notNull(),
    barcode_barang: text("barcode_barang").unique(),
    created_ms: integer("created_ms").notNull(),
    modified_ms: integer("modified_ms").notNull(),
});

export const barang_masuk = sqliteTable("barang_masuk", {
    id: integer("id").primaryKey(),
    barang_id: integer("barang_id").notNull().references(() => barang.id, { onDelete: "cascade", onUpdate: "cascade" }),
    deskripsi: text("deskripsi").notNull(),
    jumlah_barang: integer("jumlah_barang").notNull(),
    tanggal_key: integer("tanggal_key").notNull(),
    created_ms: integer("created_ms").notNull(),
    modified_ms: integer("modified_ms").notNull(),
});

export const penjualan = sqliteTable("penjualan", {
    id: integer("id").primaryKey(),
    kasir_id: integer("kasir_id").notNull().default(1).references(() => users.id, { onDelete: "restrict", onUpdate: "cascade" }),
    no_struk: text("no_struk").notNull(),
    total_barang: integer("total_barang").notNull(),
    total_harga_modal: integer("total_harga_modal").notNull(),
    total_harga_jual: integer("total_harga_jual").notNull(),
    tanggal_key: integer("tanggal_key").notNull(),
    created_ms: integer("created_ms").notNull(),
    modified_ms: integer("modified_ms").notNull(),
});

export const penjualan_item = sqliteTable("penjualan_item", {
    id: integer("id").primaryKey(),
    penjualan_id: integer("penjualan_id").notNull().references(() => penjualan.id, { onDelete: "cascade", onUpdate: "cascade" }),
    barang_id: integer("barang_id").notNull(),
    nama_barang: text("nama_barang").notNull(),
    jumlah: integer("jumlah").notNull(),
    harga_modal: integer("harga_modal").notNull(),
    total_harga_modal: integer("total_harga_modal").notNull(),
    harga_jual: integer("harga_jual").notNull(),
    total_harga_jual: integer("total_harga_jual").notNull(),
    tanggal_key: integer("tanggal_key").notNull(),
    created_ms: integer("created_ms").notNull(),
    modified_ms: integer("modified_ms").notNull(),
});

export const pembukuan = sqliteTable("pembukuan", {
    id: integer("id").primaryKey(),
    tipe: integer("tipe").notNull(),
    deskripsi: text("deskripsi"),
    jumlah_uang: integer("jumlah_uang").notNull(),
    referensi_id: integer("referensi_id"),
    tanggal_key: integer("tanggal_key").notNull(),
    created_ms: integer("created_ms").notNull(),
    modified_ms: integer("modified_ms").notNull(),
});

export const retur_barang = sqliteTable("retur_barang", {
    id: integer("id").primaryKey(),
    tanggal_key: integer("tanggal_key").notNull(),
    barang_id: integer("barang_id").notNull().references(() => barang.id, { onDelete: "cascade", onUpdate: "cascade" }),
    deskripsi: text("deskripsi"),
    jumlah_barang: integer("jumlah_barang").notNull(),
    created_ms: integer("created_ms").notNull(),
    modified_ms: integer("modified_ms").notNull(),
});

export const settings = sqliteTable("settings", {
    id: integer("id").primaryKey(),
    key: text("key"),
    value: text("value"),
    type: text("type"),
    created_ms: integer("created_ms"),
    modified_ms: integer("modified_ms"),
});