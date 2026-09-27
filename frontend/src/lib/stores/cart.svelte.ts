// Svelte 5 Rune-based POS Cart Store
export interface CartItem {
  id: number;
  nama_barang: string;
  barcode_barang?: string | null;
  harga_modal: number;
  harga_jual: number;
  jumlah_barang: number;
  stok_barang: number;
}

class CartStore {
  items = $state<CartItem[]>([]);

  totalItems = $derived(
    this.items.reduce((acc, item) => acc + item.jumlah_barang, 0)
  );

  totalAmount = $derived(
    this.items.reduce((acc, item) => acc + item.harga_jual * item.jumlah_barang, 0)
  );

  totalModal = $derived(
    this.items.reduce((acc, item) => acc + item.harga_modal * item.jumlah_barang, 0)
  );

  addItem(product: {
    id: number;
    nama_barang: string;
    barcode_barang?: string | null;
    harga_modal: number;
    harga_jual: number;
    stok_barang: number;
  }, qty = 1): { success: boolean; message?: string } {
    const existingIndex = this.items.findIndex((item) => item.id === product.id);

    if (existingIndex !== -1) {
      const current = this.items[existingIndex];
      const newQty = current.jumlah_barang + qty;

      if (newQty > product.stok_barang) {
        return {
          success: false,
          message: `Stok produk "${product.nama_barang}" tidak mencukupi (sisa ${product.stok_barang}).`,
        };
      }

      current.jumlah_barang = newQty;
      return { success: true };
    } else {
      if (qty > product.stok_barang) {
        return {
          success: false,
          message: `Stok produk "${product.nama_barang}" habis atau tidak mencukupi (sisa ${product.stok_barang}).`,
        };
      }

      this.items.push({
        id: product.id,
        nama_barang: product.nama_barang,
        barcode_barang: product.barcode_barang,
        harga_modal: product.harga_modal,
        harga_jual: product.harga_jual,
        jumlah_barang: qty,
        stok_barang: product.stok_barang,
      });

      return { success: true };
    }
  }

  updateQuantity(id: number, qty: number): { success: boolean; message?: string } {
    const item = this.items.find((i) => i.id === id);
    if (!item) return { success: false, message: 'Barang tidak ada di keranjang' };

    if (qty <= 0) {
      this.removeItem(id);
      return { success: true };
    }

    if (qty > item.stok_barang) {
      return {
        success: false,
        message: `Jumlah melebihi stok tersedia (${item.stok_barang}).`,
      };
    }

    item.jumlah_barang = qty;
    return { success: true };
  }

  increment(id: number): { success: boolean; message?: string } {
    const item = this.items.find((i) => i.id === id);
    if (!item) return { success: false };
    return this.updateQuantity(id, item.jumlah_barang + 1);
  }

  decrement(id: number): { success: boolean; message?: string } {
    const item = this.items.find((i) => i.id === id);
    if (!item) return { success: false };
    return this.updateQuantity(id, item.jumlah_barang - 1);
  }

  removeItem(id: number) {
    this.items = this.items.filter((i) => i.id !== id);
  }

  clear() {
    this.items = [];
  }
}

export const cart = new CartStore();
