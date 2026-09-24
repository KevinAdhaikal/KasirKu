<svelte:head>
    <title>KasirKu | Kasir</title>
</svelte:head>

<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { cart, type CartItem } from '../stores/cart.svelte';
  import { auth } from '../stores/auth.svelte';
  import { sse } from '../stores/sse.svelte';
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
    if (sse.status !== 'online') return;
    tick().then(() => {
      searchInputElement?.focus();
      searchInputElement?.select();
      setTimeout(() => {
        if (sse.status === 'online' && document.activeElement !== searchInputElement) {
          searchInputElement?.focus();
          searchInputElement?.select();
        }
      }, 50);
    });
  }

  // Otomatis kembalikan fokus ke input scan barcode jika modal pencarian ditutup (Esc, X, dll)
  let prevSearchModalOpen = false;
  $effect(() => {
    if (prevSearchModalOpen && !searchModalOpen) {
      focusSearchInput();
    }
    prevSearchModalOpen = searchModalOpen;
  });

  // Otomatis kembalikan fokus ke input scan barcode jika modal pembayaran ditutup (Esc, X, Batal, dll)
  let prevPaymentModalOpen = false;
  $effect(() => {
    if (prevPaymentModalOpen && !paymentModalOpen) {
      focusSearchInput();
    }
    prevPaymentModalOpen = paymentModalOpen;
  });

  // Otomatis kembalikan fokus ke input scan barcode jika modal struk belanja ditutup
  let prevReceiptModalOpen = false;
  $effect(() => {
    if (prevReceiptModalOpen && !receiptModalOpen) {
      focusSearchInput();
    }
    prevReceiptModalOpen = receiptModalOpen;
  });

  // Saat server tersambung kembali secara realtime, otomatis arahkan fokus kembali ke input barcode
  let prevSseStatus = sse.status;
  $effect(() => {
    if (prevSseStatus !== 'online' && sse.status === 'online') {
      focusSearchInput();
    }
    prevSseStatus = sse.status;
  });

  let isReceiptEnabled = $state(true);
  let sseUnsub: (() => void) | null = null;

  async function checkReceiptSetting() {
    try {
      const res = await api.get<{ enabled?: boolean | string | null }>('/api/settings/struk');
      if (res && res.enabled !== undefined && res.enabled !== null) {
        isReceiptEnabled = String(res.enabled).toLowerCase() === 'true' || res.enabled === true;
      }
    } catch {}
  }

  onMount(() => {
    focusSearchInput();
    checkReceiptSetting();
    auth.fetchPublicInfo();
    const savedLimit = localStorage.getItem('kasir_table_limit');
    if (savedLimit && LIMIT_OPTIONS.includes(Number(savedLimit))) {
      pageSize = Number(savedLimit);
    }

    sseUnsub = sse.subscribe((event) => {
      if (event?.code === 'UPDATE_STRUK_SETTING') {
        if (event?.data?.enabled !== undefined) {
          isReceiptEnabled = String(event.data.enabled).toLowerCase() === 'true' || event.data.enabled === true;
        }
      }
    });
  });

  onDestroy(() => {
    if (sseUnsub) sseUnsub();
  });

  async function handleSearch() {
    if (sse.status !== 'online') {
      toast.warning('Server sedang terputus (SSE offline). Transaksi dinonaktifkan sementara.');
      return;
    }

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
    if (sse.status !== 'online') {
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      searchQuery = '';
      focusSearchInput();
    } else if (e.key === 'Delete') {
      e.preventDefault();
      handleClearCart();
    } else if (e.key === 'F8') {
      e.preventDefault();
      if (cart.items.length === 0) {
        toast.warning('Keranjang kasir masih kosong. Tambahkan barang terlebih dahulu.');
      } else {
        paymentModalOpen = true;
      }
    }
  }

  function handleGlobalKeydown(e: KeyboardEvent) {
    if (sse.status !== 'online') {
      return;
    }

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
      const activeEl = document.activeElement;
      const activeTag = (activeEl?.tagName || '').toLowerCase();
      // Bisa melakukan Delete jika fokus di input scan barcode ATAU bukan sedang di input/textarea lain
      if (activeEl === searchInputElement || (activeTag !== 'input' && activeTag !== 'textarea')) {
        e.preventDefault();
        handleClearCart();
      }
    } else if (e.key === 'Escape') {
      if (document.activeElement === searchInputElement) {
        searchQuery = '';
      }
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
    if (sse.status !== 'online') {
      toast.warning('Server sedang terputus (SSE offline). Aksi dinonaktifkan.');
      return;
    }
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
    if (isReceiptEnabled) {
      receiptModalOpen = true;
    } else {
      focusSearchInput();
    }
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

<div class="space-y-6 {cart.items.length > 0 ? 'pb-24 lg:pb-0' : ''}">
  <!-- Top POS Banner / Status Header -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
    <div>
      <h1 class="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
        <ShoppingBag class="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
        <span>Kasir</span>
      </h1>
    </div>

    <!-- Hotkey Legend -->
    <div class="hidden md:flex items-center gap-2 select-none">
      <div class="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[11px] leading-none">
        <kbd class="inline-flex items-center justify-center min-w-[20px] px-1.5 py-0.5 text-[10px] font-semibold rounded border border-[var(--border-contrast)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xs leading-none">Enter</kbd>
        <span class="text-[var(--text-secondary)] font-medium leading-none">Scan/Cari</span>
      </div>
      <div class="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[11px] leading-none">
        <kbd class="inline-flex items-center justify-center min-w-[20px] px-1.5 py-0.5 text-[10px] font-semibold rounded border border-[var(--border-contrast)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xs leading-none">F8</kbd>
        <span class="text-[var(--text-secondary)] font-medium leading-none">Bayar</span>
      </div>
      <div class="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[11px] leading-none">
        <kbd class="inline-flex items-center justify-center min-w-[20px] px-1.5 py-0.5 text-[10px] font-semibold rounded border border-[var(--border-contrast)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xs leading-none">Del</kbd>
        <span class="text-[var(--text-secondary)] font-medium leading-none">Kosongkan</span>
      </div>
      <div class="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[11px] leading-none">
        <kbd class="inline-flex items-center justify-center min-w-[20px] px-1.5 py-0.5 text-[10px] font-semibold rounded border border-[var(--border-contrast)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xs leading-none">Esc</kbd>
        <span class="text-[var(--text-secondary)] font-medium leading-none">Reset</span>
      </div>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

    <!-- Left Column (Span 8): Cart Items List & Search -->
    <div class="lg:col-span-8 space-y-4">
      <!-- Fast Barcode & Search Bar (Top Position, Sticky on Mobile) -->
      <div class="sticky top-14 lg:static z-20 -mx-4 sm:mx-0 px-4 sm:px-0 py-2 sm:py-0 bg-[var(--bg-canvas)]/95 lg:bg-transparent backdrop-blur-md lg:backdrop-blur-none border-b sm:border-b-0 border-[var(--border-subtle)]">
        <div class="relative flex items-center">
          <div class="absolute left-3.5 flex items-center pointer-events-none text-[var(--text-muted)]">
            <ScanBarcode class="w-5 h-5" />
          </div>
          <input
            bind:this={searchInputElement}
            type="text"
            bind:value={searchQuery}
            onkeydown={handleSearchKeydown}
            placeholder="Scan barcode scanner atau ketik nama produk… (Tekan Enter)"
            aria-label="Scan barcode scanner atau ketik nama produk"
            class="w-full h-11 sm:h-12 pl-11 pr-20 sm:pr-24 rounded-lg sm:rounded-md border text-xs sm:text-sm font-medium transition-all duration-150
              border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs"
            autocomplete="off"
          />
          <div class="absolute right-1.5 sm:right-2 flex items-center gap-1">
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

      <!-- Items Card -->
      <div class="rounded-lg sm:rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden shadow-xs">
        {#if cart.items.length === 0}
          <div class="p-8 sm:p-12 text-center flex flex-col items-center justify-center">
            <div class="w-12 h-12 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-muted)] mb-3">
              <PackageOpen class="w-6 h-6" />
            </div>
            <h3 class="text-sm font-semibold text-[var(--text-primary)]">
              Keranjang Kasir Masih Kosong
            </h3>
            <p class="text-xs text-[var(--text-muted)] mt-1 max-w-sm">
              Arahkan barcode scanner ke produk atau ketik nama barang di kolom atas, lalu tekan <kbd class="px-1.5 py-0.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[10px] font-semibold text-[var(--text-primary)]">Enter</kbd> untuk menambahkan.
            </p>
          </div>
        {:else}
          <!-- Desktop Table View (md and up) -->
          <div class="hidden md:block overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead class="bg-[var(--bg-subtle)] text-[var(--text-muted)] text-[11px] font-medium border-b border-[var(--border-subtle)]">
                <tr>
                  <th class="py-2.5 px-4 font-medium">Nama Barang</th>
                  <th class="py-2.5 px-4 font-medium text-right">Harga Satuan</th>
                  <th class="py-2.5 px-4 font-medium text-center">Jumlah (Qty)</th>
                  <th class="py-2.5 px-4 font-medium text-right">Subtotal</th>
                  <th class="py-2.5 px-4 text-center w-12">Action</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[var(--border-subtle)]">
                {#each paginatedCartItems as item (item.id)}
                  {@const subtotal = item.harga_jual * item.jumlah_barang}
                  <tr class="hover:bg-[var(--bg-hover)] transition-colors">
                    <!-- Name & Barcode -->
                    <td class="py-2.5 px-4">
                      <div class="font-medium text-[var(--text-primary)]">
                        {item.nama_barang}
                      </div>
                      {#if item.barcode_barang}
                        <div class="text-[10px] text-[var(--text-muted)] tabular-nums mt-0.5">
                          {item.barcode_barang}
                        </div>
                      {/if}
                    </td>

                    <!-- Unit Price -->
                    <td class="py-2.5 px-4 text-right font-medium text-[var(--text-secondary)] tabular-nums">
                      <Rupiah value={item.harga_jual} />
                    </td>

                    <!-- Quantity Stepper -->
                    <td class="py-2.5 px-4">
                      <div class="flex flex-col items-center gap-1">
                        <div class="inline-flex items-center border border-[var(--border-subtle)] rounded-md bg-[var(--bg-surface)] overflow-hidden">
                          <button
                            type="button"
                            class="w-7 h-7 flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
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
                            class="w-11 h-7 text-center font-medium tabular-nums text-xs border-x border-[var(--border-subtle)] bg-transparent text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            type="button"
                            class="w-7 h-7 flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-40"
                            disabled={item.jumlah_barang >= item.stok_barang}
                            onclick={() => cart.increment(item.id)}
                            aria-label="Tambah kuantitas"
                          >
                            <Plus class="w-3 h-3" />
                          </button>
                        </div>

                        <!-- Micro stock badge -->
                        <span class="text-[10px] text-[var(--text-muted)] tabular-nums">
                          Sisa: {formatNumber(item.stok_barang)}
                        </span>
                      </div>
                    </td>

                    <!-- Subtotal -->
                    <td class="py-2.5 px-4 text-right font-bold text-[var(--text-primary)] tabular-nums text-sm">
                      <Rupiah value={subtotal} />
                    </td>

                    <!-- Delete Row -->
                    <td class="py-2.5 px-4 text-center">
                      <button
                        type="button"
                        class="p-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex items-center justify-center mx-auto"
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

          <!-- Mobile Card List View (< md) -->
          <div class="md:hidden divide-y divide-[var(--border-subtle)]">
            {#each paginatedCartItems as item (item.id)}
              {@const subtotal = item.harga_jual * item.jumlah_barang}
              <div class="p-3.5 space-y-2.5 bg-[var(--bg-surface)]">
                <!-- Top Row: Name, Barcode & Delete -->
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0 flex-1">
                    <h4 class="font-semibold text-sm text-[var(--text-primary)] leading-tight">
                      {item.nama_barang}
                    </h4>
                    {#if item.barcode_barang}
                      <span class="inline-flex items-center gap-1 text-[11px] text-[var(--text-muted)] mt-0.5">
                        <ScanBarcode class="w-3 h-3 opacity-60" />
                        {item.barcode_barang}
                      </span>
                    {/if}
                  </div>
                  <button
                    type="button"
                    class="p-2 rounded-lg border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0"
                    onclick={() => cart.removeItem(item.id)}
                    aria-label="Hapus item"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>

                <!-- Bottom Row: Price Info & Touch Stepper -->
                <div class="flex items-center justify-between gap-2 pt-1 border-t border-[var(--border-subtle)]/60">
                  <div class="min-w-0">
                    <span class="text-[11px] text-[var(--text-muted)] block">
                      <Rupiah value={item.harga_jual} /> / item
                    </span>
                    <span class="text-sm font-bold text-[var(--brand)] tabular-nums block">
                      <Rupiah value={subtotal} />
                    </span>
                  </div>

                  <!-- Touch-Friendly Mobile Stepper -->
                  <div class="flex flex-col items-end gap-1 shrink-0">
                    <div class="inline-flex items-center border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-subtle)] overflow-hidden shadow-2xs">
                      <button
                        type="button"
                        class="w-9 h-9 flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] active:scale-95 transition-colors"
                        onclick={() => cart.decrement(item.id)}
                        aria-label="Kurangi kuantitas"
                      >
                        <Minus class="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        max={item.stok_barang}
                        value={item.jumlah_barang}
                        onchange={(e) => handleQtyChange(item.id, e)}
                        aria-label={`Jumlah kuantitas ${item.nama_barang}`}
                        class="w-12 h-9 text-center font-bold text-sm bg-[var(--bg-surface)] text-[var(--text-primary)] border-x border-[var(--border-subtle)] focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        class="w-9 h-9 flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] active:scale-95 transition-colors disabled:opacity-40"
                        disabled={item.jumlah_barang >= item.stok_barang}
                        onclick={() => cart.increment(item.id)}
                        aria-label="Tambah kuantitas"
                      >
                        <Plus class="w-4 h-4" />
                      </button>
                    </div>
                    <span class="text-[10px] text-[var(--text-muted)] tabular-nums">
                      Sisa: {formatNumber(item.stok_barang)}
                    </span>
                  </div>
                </div>
              </div>
            {/each}
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
    </div>

    <!-- RIGHT PANEL: Checkout & Summary Card (4 cols) -->
    <div class="lg:col-span-4 lg:sticky lg:top-20 space-y-4">
      <div class="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 space-y-5">
        <!-- Breakdown List -->
        <div class="space-y-2.5 text-xs">
          <div class="flex justify-between text-[var(--text-muted)]">
            <span>Jumlah Item Fisik</span>
            <span class="font-medium text-[var(--text-primary)] tabular-nums">
              {formatNumber(cart.totalItems)} pcs
            </span>
          </div>

          <div class="flex justify-between text-[var(--text-muted)]">
            <span>Variasi Produk</span>
            <span class="font-medium text-[var(--text-primary)] tabular-nums">
              {cart.items.length} Variasi
            </span>
          </div>
        </div>

        <div class="border-t border-[var(--border-subtle)] pt-4">
          <p class="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            TOTAL PEMBAYARAN
          </p>
          <div class="mt-1 flex items-baseline gap-1.5 text-[var(--text-primary)] flex-wrap">
            <Rupiah
              value={cart.totalAmount}
              class="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] break-all"
              prefixClass="text-sm sm:text-base font-semibold text-[var(--text-muted)] tracking-normal mr-1"
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

  <!-- Sticky Bottom Checkout Bar on Mobile Devices (lg:hidden) -->
  {#if cart.items.length > 0}
    <div
      class="fixed bottom-0 left-0 right-0 z-30 bg-[var(--bg-surface)]/95 backdrop-blur-md border-t border-[var(--border-subtle)] p-3.5 shadow-2xl flex items-center justify-between gap-3 lg:hidden ring-1 ring-black/5"
    >
      <div class="min-w-0 flex-1">
        <span class="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
          Total ({formatNumber(cart.totalItems)} item)
        </span>
        <span class="text-base sm:text-lg font-bold text-[var(--text-primary)] tabular-nums tracking-tight truncate block">
          <Rupiah value={cart.totalAmount} />
        </span>
      </div>

      <button
        type="button"
        onclick={() => (paymentModalOpen = true)}
        class="h-11 px-5 rounded-lg font-bold text-sm bg-[var(--brand)] text-[var(--accent-fg)] hover:bg-[var(--brand-hover)] shadow-md flex items-center gap-2 active:scale-95 transition-all shrink-0 cursor-pointer"
      >
        <CreditCard class="w-4 h-4" />
        <span>Bayar</span>
      </button>
    </div>
  {/if}
</div>

<!-- Modals -->
<BarcodeSearchModal
  bind:open={searchModalOpen}
  results={searchResults}
  searchQuery={searchQuery}
  onselect={handleProductSelect}
  onclose={focusSearchInput}
/>

<PaymentModal
  bind:open={paymentModalOpen}
  onsuccess={handlePaymentSuccess}
  onclose={focusSearchInput}
/>

<ReceiptModal
  bind:open={receiptModalOpen}
  data={lastReceiptData}
  onclose={handleReceiptClose}
/>
