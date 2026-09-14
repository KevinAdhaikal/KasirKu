<svelte:head>
    <title>KasirKu | Kasir</title>
</svelte:head>

<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { cart, type CartItem } from '../stores/cart.svelte';
  import { auth } from '../stores/auth.svelte';
  import { toast } from '../stores/toast.svelte';
  import { dialog } from '../stores/dialog.svelte';
  import { api } from '../api/api';
  import { formatRupiah, formatNumber } from '../utils/format';
  import Button from '../components/ui/Button.svelte';
  import Badge from '../components/ui/Badge.svelte';
  import Card from '../components/ui/Card.svelte';
  import Rupiah from '../components/ui/Rupiah.svelte';
  import BarcodeSearchModal from '../components/pos/BarcodeSearchModal.svelte';
  import PaymentModal, { type ReceiptData } from '../components/pos/PaymentModal.svelte';
  import ReceiptModal from '../components/pos/ReceiptModal.svelte';
  import TablePagination from '../components/ui/TablePagination.svelte';
  import {
    ShoppingBag,
    ScanBarcode,
    Search,
    Trash2,
    Plus,
    Minus,
    ShoppingCart,
    CreditCard,
    RotateCcw,
    CornerDownLeft,
    Keyboard,
    AlertTriangle,
    PackageOpen
  } from 'lucide-svelte';

  let searchQuery = $state('');
  let isSearching = $state(false);
  let searchResults = $state<any[]>([]);
  let searchModalOpen = $state(false);
  let paymentModalOpen = $state(false);
  let receiptModalOpen = $state(false);
  let lastReceiptData = $state<ReceiptData | null>(null);

  let searchInputElement = $state<HTMLInputElement | null>(null);

  // Pagination & Page Size Limit for Cart Items
  const LIMIT_OPTIONS = [5, 10, 100];
  let pageSize = $state(5);
  let currentPage = $state(1);

  const totalPages = $derived(Math.ceil(cart.items.length / pageSize) || 1);

  $effect(() => {
    if (currentPage > totalPages) {
      currentPage = totalPages;
    }
    if (currentPage < 1) {
      currentPage = 1;
    }
  });

  const paginatedCartItems = $derived(
    cart.items.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  );

  function setPageSize(newSize: number) {
    pageSize = newSize;
    currentPage = 1;
    try {
      localStorage.setItem('kasir_table_limit', String(newSize));
    } catch (_) {}
  }

  function jumpToItem(id: number) {
    tick().then(() => {
      const idx = cart.items.findIndex((item) => item.id === id);
      if (idx !== -1) {
        currentPage = Math.floor(idx / pageSize) + 1;
      }
    });
  }

  function focusSearchInput() {
    tick().then(() => {
      searchInputElement?.focus();
      searchInputElement?.select();
    });
  }

  onMount(() => {
    focusSearchInput();
    const savedLimit = localStorage.getItem('kasir_table_limit');
    if (savedLimit && LIMIT_OPTIONS.includes(Number(savedLimit))) {
      pageSize = Number(savedLimit);
    }
  });

  async function handleSearch() {
    const query = searchQuery.trim();
    if (!query) {
      toast.warning('Silakan masukkan barcode atau nama produk terlebih dahulu.');
      focusSearchInput();
      return;
    }

    isSearching = true;
    try {
      const res = await api.get<any[]>(`/api/cari_barang?barang=${encodeURIComponent(query)}`);
      
      if (!Array.isArray(res) || res.length === 0) {
        toast.error(`Produk "${query}" tidak ditemukan dalam sistem.`);
        searchQuery = '';
        focusSearchInput();
        return;
      }

      if (res.length === 1) {
        const item = res[0];
        const addRes = cart.addItem(item, 1);
        if (addRes.success) {
          toast.success(`"${item.nama_barang}" ditambahkan.`);
          jumpToItem(item.id);
        } else {
          toast.error(addRes.message || 'Gagal menambahkan produk');
        }
        searchQuery = '';
        focusSearchInput();
      } else {
        searchResults = res;
        searchModalOpen = true;
      }
    } catch (err: any) {
      toast.error(err?.message || 'Gagal mencari produk');
      focusSearchInput();
    } finally {
      isSearching = false;
    }
  }

  function handleSearchKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  }

  function handleGlobalKeydown(e: KeyboardEvent) {
    // If any modal is active, let modal handle keys
    if (searchModalOpen || paymentModalOpen || receiptModalOpen) {
      return;
    }

    if (e.key === 'F8') {
      e.preventDefault();
      if (cart.items.length === 0) {
        toast.warning('Keranjang kasir masih kosong. Tambahkan barang terlebih dahulu.');
      } else {
        paymentModalOpen = true;
      }
    } else if (e.key === 'Delete') {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag !== 'input' && activeTag !== 'textarea') {
        e.preventDefault();
        handleClearCart();
      }
    } else if (e.key === 'Escape') {
      focusSearchInput();
    } else if (e.key === 'PageDown') {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag !== 'textarea') {
        if (currentPage < totalPages) {
          e.preventDefault();
          currentPage += 1;
        }
      }
    } else if (e.key === 'PageUp') {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag !== 'textarea') {
        if (currentPage > 1) {
          e.preventDefault();
          currentPage -= 1;
        }
      }
    }
  }

  async function handleClearCart() {
    if (cart.items.length === 0) return;
    const confirmed = await dialog.confirm({
      title: 'Kosongkan Keranjang Kasir?',
      message: 'Semua barang dalam transaksi kasir saat ini akan dihapus dari daftar belanja.',
      confirmText: 'Kosongkan Keranjang',
      cancelText: 'Batal',
      variant: 'danger',
    });
    if (confirmed) {
      cart.clear();
      currentPage = 1;
      toast.info('Keranjang belanja telah dikosongkan.');
      focusSearchInput();
    }
  }

  function handleProductSelect(product: any) {
    searchModalOpen = false;
    searchQuery = '';
    jumpToItem(product.id);
    focusSearchInput();
  }

  function handlePaymentSuccess(data: ReceiptData) {
    lastReceiptData = data;
    receiptModalOpen = true;
  }

  function handleReceiptClose() {
    receiptModalOpen = false;
    focusSearchInput();
  }

  function handleQtyChange(id: number, e: Event) {
    const target = e.target as HTMLInputElement;
    const val = parseInt(target.value, 10);
    if (isNaN(val) || val <= 0) {
      cart.removeItem(id);
    } else {
      const res = cart.updateQuantity(id, val);
      if (!res.success) {
        toast.error(res.message || 'Jumlah melebihi stok yang tersedia');
      }
    }
  }
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

<div class="space-y-6">
  <!-- Top POS Banner / Status Header -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800 pb-3">
    <div>
      <h1 class="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
        <ShoppingBag class="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
        <span>Kasir</span>
      </h1>
    </div>

    <!-- Hotkey Legend -->
    <div class="hidden md:flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 font-mono">
      <div class="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-900 px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-800">
        <kbd class="font-bold text-neutral-900 dark:text-neutral-100">Enter</kbd>
        <span>Scan/Cari</span>
      </div>
      <div class="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-900 px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-800">
        <kbd class="font-bold text-neutral-900 dark:text-neutral-100">F8</kbd>
        <span>Bayar</span>
      </div>
      <div class="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-900 px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-800">
        <kbd class="font-bold text-neutral-900 dark:text-neutral-100">Del</kbd>
        <span>Kosongkan</span>
      </div>
      <div class="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-900 px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-800">
        <kbd class="font-bold text-neutral-900 dark:text-neutral-100">Esc</kbd>
        <span>Reset</span>
      </div>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

    <!-- Left Column (Span 8): Cart Items List & Search -->
    <div class="lg:col-span-8 space-y-4">
      <!-- Items Card -->
      <div class="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-[var(--bg-surface)] shadow-xs overflow-hidden">
        {#if cart.items.length === 0}
          <div class="p-12 text-center flex flex-col items-center justify-center">
            <div class="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-neutral-400 dark:text-neutral-600 mb-3">
              <PackageOpen class="w-6 h-6" />
            </div>
            <h3 class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Keranjang Kasir Masih Kosong
            </h3>
            <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm">
              Arahkan barcode scanner ke produk atau ketik nama barang di kolom bawah, lalu tekan <kbd class="font-mono px-1 py-0.5 rounded border text-[10px] bg-neutral-100 dark:bg-neutral-800">Enter</kbd> untuk menambahkan.
            </p>
          </div>
        {:else}
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead class="bg-neutral-50/70 dark:bg-neutral-900/40 text-neutral-500 text-[11px] font-medium uppercase tracking-wider border-b border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th class="px-4 py-3 font-medium">NAMA PRODUK</th>
                  <th class="px-4 py-3 font-medium text-right">HARGA SATUAN</th>
                  <th class="px-4 py-3 font-medium text-center">JUMLAH (QTY)</th>
                  <th class="px-4 py-3 font-medium text-right">SUBTOTAL</th>
                  <th class="px-3 py-3 text-center w-10"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-neutral-200/60 dark:divide-neutral-800/60">
                {#each paginatedCartItems as item (item.id)}
                  {@const subtotal = item.harga_jual * item.jumlah_barang}
                  <tr class="hover:bg-neutral-50/40 dark:hover:bg-neutral-900/30 transition-colors">
                    <!-- Name & Barcode -->
                    <td class="px-4 py-3">
                      <div class="font-medium text-neutral-900 dark:text-neutral-100">
                        {item.nama_barang}
                      </div>
                      {#if item.barcode_barang}
                        <div class="font-mono text-[10px] text-neutral-400 mt-0.5">
                          {item.barcode_barang}
                        </div>
                      {/if}
                    </td>

                    <!-- Unit Price -->
                    <td class="px-4 py-3 text-right font-medium text-neutral-700 dark:text-neutral-300">
                      <Rupiah value={item.harga_jual} />
                    </td>

                    <!-- Quantity Stepper -->
                    <td class="px-4 py-3">
                      <div class="flex flex-col items-center gap-1">
                        <div class="inline-flex items-center border border-neutral-300 dark:border-neutral-700 rounded-md bg-[var(--bg-surface)] overflow-hidden">
                          <button
                            type="button"
                            class="w-7 h-7 flex items-center justify-center text-neutral-600 dark:text-neutral-400 hover:bg-[var(--bg-hover)] transition-colors"
                            onclick={() => cart.decrement(item.id)}
                            aria-label="Kurangi kuantitas"
                          >
                            <Minus class="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            max={item.stok_barang}
                            value={item.jumlah_barang}
                            onchange={(e) => handleQtyChange(item.id, e)}
                            aria-label={`Jumlah kuantitas ${item.nama_barang}`}
                            autocomplete="off"
                            class="w-11 h-7 text-center font-medium tabular-nums text-xs border-x border-neutral-300 dark:border-neutral-700 bg-transparent text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
                          />
                          <button
                            type="button"
                            class="w-7 h-7 flex items-center justify-center text-neutral-600 dark:text-neutral-400 hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-40"
                            disabled={item.jumlah_barang >= item.stok_barang}
                            onclick={() => cart.increment(item.id)}
                            aria-label="Tambah kuantitas"
                          >
                            <Plus class="w-3 h-3" />
                          </button>
                        </div>

                        <!-- Micro stock badge -->
                        <span class="text-[10px] text-neutral-400 tabular-nums">
                          Sisa: {formatNumber(item.stok_barang)}
                        </span>
                      </div>
                    </td>

                    <!-- Subtotal -->
                    <td class="px-4 py-3 text-right font-bold text-neutral-900 dark:text-neutral-100 text-sm">
                      <Rupiah value={subtotal} />
                    </td>

                    <!-- Delete Row -->
                    <td class="px-3 py-3 text-center">
                      <button
                        type="button"
                        class="p-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/40 shadow-2xs transition-all flex items-center justify-center mx-auto"
                        onclick={() => cart.removeItem(item.id)}
                        aria-label="Hapus item"
                        title="Hapus dari keranjang"
                      >
                        <Trash2 class="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>

          <!-- Table Footer with Pagination and Page Size Limit -->
          <TablePagination
            bind:currentPage
            bind:pageSize
            totalItems={cart.items.length}
            currentItemsCount={paginatedCartItems.length}
            itemLabel="produk"
            storageKey="kasir_table_limit"
          />
        {/if}
      </div>

      <!-- Fast Barcode & Search Bar (Bottom Position) -->
      <div class="relative flex items-center">
        <div class="absolute left-3.5 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
          <ScanBarcode class="w-5 h-5" />
        </div>
        <input
          bind:this={searchInputElement}
          type="text"
          bind:value={searchQuery}
          onkeydown={handleSearchKeydown}
          placeholder="Scan barcode scanner atau ketik nama produk… (Tekan Enter)"
          aria-label="Scan barcode scanner atau ketik nama produk"
          class="w-full h-12 pl-11 pr-24 rounded-lg border text-sm font-medium transition-colors
            border-neutral-300 dark:border-neutral-800 bg-[var(--bg-surface)] text-neutral-900 dark:text-neutral-100
            focus:border-neutral-900 dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-[var(--brand)]/50 shadow-2xs"
          autocomplete="off"
        />
        <div class="absolute right-2 flex items-center gap-1">
          <Button
            variant="primary"
            size="sm"
            loading={isSearching}
            onclick={handleSearch}
          >
            <Search class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">Cari</span>
          </Button>
        </div>
      </div>
    </div>

    <!-- RIGHT PANEL: Checkout & Summary Card (4 cols) -->
    <div class="lg:col-span-4 lg:sticky lg:top-20 space-y-4">
      <div class="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-[var(--bg-surface)] shadow-xs p-5 space-y-5">
        <div class="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
          <span class="text-xs font-semibold text-neutral-900 dark:text-neutral-100 uppercase tracking-wide">
            Ringkasan Transaksi
          </span>
          {#if cart.items.length > 0}
            <Badge variant="success" size="sm">
              Siap Checkout
            </Badge>
          {/if}
        </div>

        <!-- Breakdown List -->
        <div class="space-y-2.5 text-xs">
          <div class="flex justify-between text-neutral-500 dark:text-neutral-400">
            <span>Jumlah Item Fisik</span>
            <span class="font-medium text-neutral-900 dark:text-neutral-100 tabular-nums">
              {formatNumber(cart.totalItems)} pcs
            </span>
          </div>

          <div class="flex justify-between text-neutral-500 dark:text-neutral-400">
            <span>Variasi Produk</span>
            <span class="font-medium text-neutral-900 dark:text-neutral-100 tabular-nums">
              {cart.items.length} SKU
            </span>
          </div>

          <div class="flex justify-between text-neutral-500 dark:text-neutral-400">
            <span>Pajak & Potongan</span>
            <span class="text-neutral-400 tabular-nums">
              <span class="text-[10px] text-neutral-400 mr-0.5">Rp</span>0,00
            </span>
          </div>
        </div>

        <div class="border-t border-neutral-200 dark:border-neutral-800 pt-4">
          <p class="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
            TOTAL PEMBAYARAN
          </p>
          <div class="mt-1 flex items-baseline gap-1.5 text-neutral-900 dark:text-neutral-100 flex-wrap">
            <Rupiah
              value={cart.totalAmount}
              class="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 break-all"
              prefixClass="text-sm sm:text-base font-semibold text-neutral-400 dark:text-neutral-500 tracking-normal mr-1"
            />
          </div>
        </div>

        <!-- Big Checkout Action Button -->
        <div class="pt-2">
          <Button
            variant="primary"
            size="lg"
            class="w-full py-4 text-sm font-semibold flex items-center justify-center gap-2"
            disabled={cart.items.length === 0}
            onclick={() => (paymentModalOpen = true)}
          >
            <CreditCard class="w-4 h-4" />
            <span>Bayar Sekarang (F8)</span>
          </Button>
        </div>
      </div>
    </div>

  </div>
</div>

<!-- Modals -->
<BarcodeSearchModal
  bind:open={searchModalOpen}
  results={searchResults}
  searchQuery={searchQuery}
  onselect={handleProductSelect}
/>

<PaymentModal
  bind:open={paymentModalOpen}
  onsuccess={handlePaymentSuccess}
/>

<ReceiptModal
  bind:open={receiptModalOpen}
  data={lastReceiptData}
  onclose={handleReceiptClose}
/>
