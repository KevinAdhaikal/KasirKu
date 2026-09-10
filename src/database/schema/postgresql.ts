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

import { pgTable, integer, varchar, bigint, text } from "drizzle-orm/pg-core";

export const roles = pgTable("roles", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    name: varchar("name", { length: 255 }).unique().notNull(),
    permission_level: integer("permission_level").notNull(),
    created_ms: bigint("created_ms", { mode: "number" }).notNull(),
    modified_ms: bigint("modified_ms", { mode: "number" }).notNull(),
});

export const users = pgTable("users", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    username: varchar("username", { length: 255 }).unique().notNull(),
    full_name: text("full_name").notNull(),
    password_hash: text("password_hash").notNull(),
    profile_img: text("profile_img"),
    role_id: integer("role_id").notNull().references(() => roles.id, { onDelete: "cascade", onUpdate: "cascade" }),
    created_ms: bigint("created_ms", { mode: "number" }).notNull(),
    modified_ms: bigint("modified_ms", { mode: "number" }).notNull(),
});

export const kategori_barang = pgTable("kategori_barang", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    nama_kategori: text("nama_kategori").unique().notNull(),
    created_ms: bigint("created_ms", { mode: "number" }).notNull(),
    modified_ms: bigint("modified_ms", { mode: "number" }).notNull(),
});

export const barang = pgTable("barang", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    nama_barang: text("nama_barang").notNull(),
    stok_barang: integer("stok_barang").notNull(),
    kategori_barang_id: integer("kategori_barang_id").notNull().references(() => kategori_barang.id, { onDelete: "cascade", onUpdate: "cascade" }),
    harga_modal: integer("harga_modal").notNull(),
    harga_jual: integer("harga_jual").notNull(),
    barcode_barang: text("barcode_barang").unique(),
    created_ms: bigint("created_ms", { mode: "number" }).notNull(),
    modified_ms: bigint("modified_ms", { mode: "number" }).notNull(),
});

export const barang_masuk = pgTable("barang_masuk", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    barang_id: integer("barang_id").notNull().references(() => barang.id, { onDelete: "cascade", onUpdate: "cascade" }),
    deskripsi: text("deskripsi").notNull(),
    jumlah_barang: integer("jumlah_barang").notNull(),
    tanggal_key: integer("tanggal_key").notNull(),
    created_ms: bigint("created_ms", { mode: "number" }).notNull(),
    modified_ms: bigint("modified_ms", { mode: "number" }).notNull(),
});

export const penjualan = pgTable("penjualan", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    kasir_id: integer("kasir_id").notNull().default(1).references(() => users.id, { onDelete: "restrict", onUpdate: "cascade" }),
    no_struk: text("no_struk").notNull(),
    total_barang: integer("total_barang").notNull(),
    total_harga_modal: integer("total_harga_modal").notNull(),
    total_harga_jual: integer("total_harga_jual").notNull(),
    tanggal_key: integer("tanggal_key").notNull(),
    created_ms: bigint("created_ms", { mode: "number" }).notNull(),
    modified_ms: bigint("modified_ms", { mode: "number" }).notNull(),
});

export const penjualan_item = pgTable("penjualan_item", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    penjualan_id: integer("penjualan_id").notNull().references(() => penjualan.id, { onDelete: "cascade", onUpdate: "cascade" }),
    barang_id: integer("barang_id").notNull(),
    nama_barang: text("nama_barang").notNull(),
    jumlah: bigint("jumlah", { mode: "number" }).notNull(),
    harga_modal: bigint("harga_modal", { mode: "number" }).notNull(),
    total_harga_modal: bigint("total_harga_modal", { mode: "number" }).notNull(),
    harga_jual: bigint("harga_jual", { mode: "number" }).notNull(),
    total_harga_jual: bigint("total_harga_jual", { mode: "number" }).notNull(),
    tanggal_key: integer("tanggal_key").notNull(),
    created_ms: bigint("created_ms", { mode: "number" }).notNull(),
    modified_ms: bigint("modified_ms", { mode: "number" }).notNull(),
});

export const pembukuan = pgTable("pembukuan", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    tipe: integer("tipe").notNull(),
    deskripsi: text("deskripsi"),
    jumlah_uang: integer("jumlah_uang").notNull(),
    referensi_id: integer("referensi_id"),
    tanggal_key: integer("tanggal_key").notNull(),
    created_ms: bigint("created_ms", { mode: "number" }).notNull(),
    modified_ms: bigint("modified_ms", { mode: "number" }).notNull(),
});

export const retur_barang = pgTable("retur_barang", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    tanggal_key: integer("tanggal_key").notNull(),
    barang_id: integer("barang_id").notNull().references(() => barang.id, { onDelete: "cascade", onUpdate: "cascade" }),
    deskripsi: text("deskripsi"),
    jumlah_barang: integer("jumlah_barang").notNull(),
    created_ms: bigint("created_ms", { mode: "number" }).notNull(),
    modified_ms: bigint("modified_ms", { mode: "number" }).notNull(),
});

export const settings = pgTable("settings", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    key: text("key"),
    value: text("value"),
    type: text("type"),
    created_ms: bigint("created_ms", { mode: "number" }),
    modified_ms: bigint("modified_ms", { mode: "number" }),
});