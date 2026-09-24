<svelte:head>
    <title>KasirKu | Penjualan (Pembukuan)</title>
</svelte:head>

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { api } from '../../api/api';
  import { auth, Permissions } from '../../stores/auth.svelte';
  import { toast } from '../../stores/toast.svelte';
  import { sse } from '../../stores/sse.svelte';
  import Button from '../../components/ui/Button.svelte';
  import Input from '../../components/ui/Input.svelte';
  import Modal from '../../components/ui/Modal.svelte';
  import Badge from '../../components/ui/Badge.svelte';
  import Skeleton from '../../components/ui/Skeleton.svelte';
  import DatePicker from '../../components/ui/DatePicker.svelte';
  import TablePagination from '../../components/ui/TablePagination.svelte';
  import {
    formatRupiah,
    formatNumber,
    formatDate,
    formatDateTime,
    formatTanggalKey,
    getTanggalKey
  } from '../../utils/format';
  import { renderReceiptHtml, type StoreInfo } from '../../utils/receipt';
  import type { ReceiptData } from '../../components/pos/PaymentModal.svelte';
  import ReceiptModal from '../../components/pos/ReceiptModal.svelte';
  import {
    Receipt,
    ReceiptText,
    Search,
    Calendar,
    Filter,
    RefreshCw,
    Eye,
    Printer,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    ShoppingBag,
    TrendingUp,
    DollarSign,
    User,
    Clock,
    Copy,
    Check,
    ChevronRight,
    Sparkles
  } from 'lucide-svelte';

  export interface PenjualanItem {
    id: number;
    kasir_id: number;
    no_struk: string;
    total_barang: number;
    total_harga_modal: number;
    total_harga_jual: number;
    tanggal_key: number;
    created_ms: number;
    modified_ms: number;
    nama_kasir: string | null;
  }

  export interface PenjualanItemDetail {
    nama_barang: string;
    jumlah: number;
    harga_jual: number;
    total_harga_jual: number;
    tanggal_key: number;
    created_ms: number;
  }

  let penjualanList = $state<PenjualanItem[]>([]);
  let loading = $state(true);
  let searchQuery = $state('');

  // Date range filter
  const todayDateStr = formatDate(new Date());
  let filterPreset = $state<'today' | 'week' | 'month' | 'custom'>('today');
  let startDate = $state(todayDateStr);
  let endDate = $state(todayDateStr);

  // Sorting
  let sortField = $state<'id' | 'no_struk' | 'created_ms' | 'nama_kasir' | 'total_barang' | 'total_harga_jual' | 'laba_kotor'>('created_ms');
  let sortAsc = $state(false);

  // Detail Modal State
  let isDetailModalOpen = $state(false);
  let selectedPenjualan = $state<PenjualanItem | null>(null);
  let detailItems = $state<PenjualanItemDetail[]>([]);
  let loadingDetail = $state(false);

  // Thermal print state
  let isPrinting = $state(false);
  let copiedStruk = $state<string | null>(null);
  let receiptModalOpen = $state(false);
  let receiptModalData = $state<ReceiptData | null>(null);

  // Presets handler
  function applyPreset(preset: 'today' | 'week' | 'month') {
    filterPreset = preset;
    const now = new Date();
    endDate = formatDate(now);

    if (preset === 'today') {
      startDate = endDate;
    } else if (preset === 'week') {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      startDate = formatDate(d);
    } else if (preset === 'month') {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate = formatDate(d);
    }
    fetchData();
  }

  async function fetchData() {
    loading = true;
    try {
      const startKey = getTanggalKey(startDate);
      const endKey = getTanggalKey(endDate);

      let res: any;
      res = await api.get(`/api/penjualan?tanggal_start=${startKey}&tanggal_end=${endKey}`);

      const list = typeof res === 'string' ? JSON.parse(res) : (Array.isArray(res) ? res : []);
      penjualanList = list;
    } catch (err: any) {
      toast.error('Gagal memuat riwayat penjualan: ' + (err.message || ''));
      penjualanList = [];
    } finally {
      loading = false;
    }
  }

  async function loadDetailData(item: PenjualanItem) {
    selectedPenjualan = item;
    loadingDetail = true;
    detailItems = [];
    try {
      const res = await api.get(`/api/penjualan_item?penjualan_id=${item.id}`);
      const items = typeof res === 'string' ? JSON.parse(res) : (Array.isArray(res) ? res : []);
      detailItems = items;
    } catch (err: any) {
      toast.error('Gagal mengambil detail item penjualan.');
    } finally {
      loadingDetail = false;
    }
  }

  async function openDetail(item: PenjualanItem) {
    isDetailModalOpen = true;
    await loadDetailData(item);
  }

  async function handlePrint(item?: PenjualanItem) {
    const targetItem = item || selectedPenjualan;
    if (!targetItem) return;

    let itemsToUse = detailItems;
    if (!selectedPenjualan || targetItem.id !== selectedPenjualan.id || detailItems.length === 0) {
      try {
        const res = await api.get<{ items: PenjualanItemDetail[] } | PenjualanItemDetail[]>(`/api/penjualan/${targetItem.id}`);
        const parsed = Array.isArray(res) ? res : res?.items || [];
        itemsToUse = parsed;
      } catch (err) {
        console.error('Failed to load transaction details for receipt:', err);
      }
    }

    // Ensure public info is fresh
    await auth.fetchPublicInfo();

    receiptModalData = {
      receiptNo: targetItem.no_struk,
      timestamp: new Date(targetItem.created_ms).toISOString(),
      cashierName: targetItem.nama_kasir || 'Kasir',
      totalAmount: targetItem.total_harga_jual,
      totalItems: targetItem.total_barang,
      cashPaid: targetItem.total_harga_jual,
      changeAmount: 0,
      items: itemsToUse.map((d: any) => ({
        id: d.id || 0,
        nama_barang: d.nama_barang,
        barcode: '',
        harga_jual: d.harga_jual,
        jumlah_barang: d.jumlah ?? d.jumlah_barang ?? 1,
        subtotal: d.total_harga_jual || ((d.harga_jual || 0) * (d.jumlah ?? d.jumlah_barang ?? 1)),
      })),
    };

    receiptModalOpen = true;
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    copiedStruk = text;
    setTimeout(() => {
      if (copiedStruk === text) copiedStruk = null;
    }, 2000);
  }

  function toggleSort(field: typeof sortField) {
    if (sortField === field) {
      sortAsc = !sortAsc;
    } else {
      sortField = field;
      sortAsc = false;
    }
  }

  // Filtered and sorted list
  let filteredList = $derived.by(() => {
    let list = [...penjualanList];
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(item =>
        item.no_struk.toLowerCase().includes(q) ||
        (item.nama_kasir && item.nama_kasir.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => {
      let va: any;
      let vb: any;
      if (sortField === 'laba_kotor') {
        va = (Number(a.total_harga_jual) || 0) - (Number(a.total_harga_modal) || 0);
        vb = (Number(b.total_harga_jual) || 0) - (Number(b.total_harga_modal) || 0);
      } else {
        va = a[sortField] ?? 0;
        vb = b[sortField] ?? 0;
      }
      if (typeof va === 'string') va = (va as string).toLowerCase();
      if (typeof vb === 'string') vb = (vb as string).toLowerCase();
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });

    return list;
  });

  const sumFilteredBarang = $derived(
    filteredList.reduce((acc, item) => acc + (Number(item.total_barang) || 0), 0)
  );
  const sumFilteredLaba = $derived(
    filteredList.reduce(
      (acc, item) => acc + ((Number(item.total_harga_jual) || 0) - (Number(item.total_harga_modal) || 0)),
      0
    )
  );

  // Pagination
  let currentPage = $state(1);
  let pageSize = $state(10);
  const paginatedList = $derived(
    filteredList.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  );
  const totalPages = $derived(Math.ceil(filteredList.length / pageSize) || 1);

  $effect(() => {
    void searchQuery;
    void startDate;
    void endDate;
    currentPage = 1;
  });

  // KPI Metrics
  let totalTransaksi = $derived(filteredList.length);
  let totalOmzet = $derived(filteredList.reduce((sum, item) => sum + (Number(item.total_harga_jual) || 0), 0));
  let totalModal = $derived(filteredList.reduce((sum, item) => sum + (Number(item.total_harga_modal) || 0), 0));
  let totalLabaKotor = $derived(totalOmzet - totalModal);
  let avgTransaksi = $derived(totalTransaksi > 0 ? Math.round(totalOmzet / totalTransaksi) : 0);

  // SSE subscription to refresh sales on checkout
  let unsubscribeSSE: (() => void) | null = null;

  onMount(() => {
    fetchData();
    auth.fetchPublicInfo();

    unsubscribeSSE = sse.subscribe((event) => {
      // type 2 is TRANSACTION / CHECKOUT event
      if (event.type === 2) {
        fetchData();
      }
    });
  });

  onDestroy(() => {
    unsubscribeSSE?.();
  });
</script>

<div class="space-y-6">
  <!-- Page Header -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200/80 dark:border-neutral-800 pb-4">
    <div class="flex items-center gap-2.5">
      <h1 class="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
        <ReceiptText class="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
        <span>Penjualan</span>
      </h1>
    </div>

    <div class="flex items-center gap-2">
      <Button
        variant="secondary"
        size="sm"
        onclick={fetchData}
        loading={loading}
        title="Refresh Data"
      >
        <RefreshCw class="w-3.5 h-3.5" />
        <span class="hidden sm:inline">Refresh</span>
      </Button>
    </div>
  </div>

  <!-- Filter & Controls Toolbar -->
  <div class="space-y-3">
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      <!-- Quick Date Presets -->
      <div class="flex items-center gap-1.5 overflow-x-auto">
        <span class="text-xs font-medium text-neutral-500 mr-1 hidden sm:inline">Periode:</span>
        <button
          type="button"
          class="px-3 py-1.5 rounded-md text-xs font-medium transition-colors border {filterPreset === 'today' ? 'bg-[var(--brand)] text-[var(--accent-fg)] border-transparent' : 'border-neutral-200 dark:border-neutral-800 hover:bg-[var(--bg-hover)] text-neutral-700 dark:text-neutral-300'}"
          onclick={() => applyPreset('today')}
        >
          Hari Ini
        </button>
        <button
          type="button"
          class="px-3 py-1.5 rounded-md text-xs font-medium transition-colors border {filterPreset === 'week' ? 'bg-[var(--brand)] text-[var(--accent-fg)] border-transparent' : 'border-neutral-200 dark:border-neutral-800 hover:bg-[var(--bg-hover)] text-neutral-700 dark:text-neutral-300'}"
          onclick={() => applyPreset('week')}
        >
          7 Hari Terakhir
        </button>
        <button
          type="button"
          class="px-3 py-1.5 rounded-md text-xs font-medium transition-colors border {filterPreset === 'month' ? 'bg-[var(--brand)] text-[var(--accent-fg)] border-transparent' : 'border-neutral-200 dark:border-neutral-800 hover:bg-[var(--bg-hover)] text-neutral-700 dark:text-neutral-300'}"
          onclick={() => applyPreset('month')}
        >
          Bulan Ini
        </button>
      </div>

      <!-- Custom Date Inputs -->
      <div class="flex items-center gap-2 text-xs">
        <div class="flex items-center gap-1.5 flex-wrap">
          <DatePicker
            bind:value={startDate}
            align="left"
            onchange={() => { filterPreset = 'custom'; fetchData(); }}
          />
          <span class="text-neutral-400 text-xs">s/d</span>
          <DatePicker
            bind:value={endDate}
            align="right"
            onchange={() => { filterPreset = 'custom'; fetchData(); }}
          />
        </div>
      </div>
    </div>

    <!-- Search Input -->
    <div class="relative">
      <Input
        bind:value={searchQuery}
        placeholder="Cari nomor struk (contoh: TRX-) atau nama kasir..."
        clearable
      >
        {#snippet prefix()}
          <Search class="w-4 h-4 text-neutral-400" />
        {/snippet}
      </Input>
    </div>
  </div>

  <!-- Table Card -->
  <div class="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full text-left text-xs border-collapse min-w-[750px]">
        <thead>
          <tr class="border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-muted)] font-medium text-[11px]">
            <th class="px-4 py-2.5">
              <button
                type="button"
                class="flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors cursor-pointer select-none text-[11px] font-medium"
                onclick={() => toggleSort('no_struk')}
              >
                <span>No. Struk</span>
                {#if sortField === 'no_struk'}
                  {#if sortAsc}
                    <ArrowUp class="w-3 h-3 text-[var(--brand)]" />
                  {:else}
                    <ArrowDown class="w-3 h-3 text-[var(--brand)]" />
                  {/if}
                {:else}
                  <ArrowUpDown class="w-3 h-3 opacity-40" />
                {/if}
              </button>
            </th>
            <th class="px-4 py-2.5">
              <button
                type="button"
                class="flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors cursor-pointer select-none text-[11px] font-medium"
                onclick={() => toggleSort('created_ms')}
              >
                <span>Waktu Transaksi</span>
                {#if sortField === 'created_ms'}
                  {#if sortAsc}
                    <ArrowUp class="w-3 h-3 text-[var(--brand)]" />
                  {:else}
                    <ArrowDown class="w-3 h-3 text-[var(--brand)]" />
                  {/if}
                {:else}
                  <ArrowUpDown class="w-3 h-3 opacity-40" />
                {/if}
              </button>
            </th>
            <th class="px-4 py-2.5">
              <button
                type="button"
                class="flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors cursor-pointer select-none text-[11px] font-medium"
                onclick={() => toggleSort('nama_kasir')}
              >
                <span>Kasir</span>
                {#if sortField === 'nama_kasir'}
                  {#if sortAsc}
                    <ArrowUp class="w-3 h-3 text-[var(--brand)]" />
                  {:else}
                    <ArrowDown class="w-3 h-3 text-[var(--brand)]" />
                  {/if}
                {:else}
                  <ArrowUpDown class="w-3 h-3 opacity-40" />
                {/if}
              </button>
            </th>
            <th class="px-4 py-2.5 text-center">
              <button
                type="button"
                class="inline-flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors cursor-pointer select-none mx-auto text-[11px] font-medium"
                onclick={() => toggleSort('total_barang')}
              >
                <span>Item</span>
                {#if sortField === 'total_barang'}
                  {#if sortAsc}
                    <ArrowUp class="w-3 h-3 text-[var(--brand)]" />
                  {:else}
                    <ArrowDown class="w-3 h-3 text-[var(--brand)]" />
                  {/if}
                {:else}
                  <ArrowUpDown class="w-3 h-3 opacity-40" />
                {/if}
              </button>
            </th>
            <th class="px-4 py-2.5 text-right">
              <button
                type="button"
                class="inline-flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors cursor-pointer select-none ml-auto text-[11px] font-medium"
                onclick={() => toggleSort('total_harga_jual')}
              >
                <span>Total Belanja</span>
                {#if sortField === 'total_harga_jual'}
                  {#if sortAsc}
                    <ArrowUp class="w-3 h-3 text-[var(--brand)]" />
                  {:else}
                    <ArrowDown class="w-3 h-3 text-[var(--brand)]" />
                  {/if}
                {:else}
                  <ArrowUpDown class="w-3 h-3 opacity-40" />
                {/if}
              </button>
            </th>
            <th class="px-4 py-2.5 text-right">
              <button
                type="button"
                class="inline-flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors cursor-pointer select-none ml-auto text-[11px] font-medium"
                onclick={() => toggleSort('laba_kotor')}
              >
                <span>Laba Kotor</span>
                {#if sortField === 'laba_kotor'}
                  {#if sortAsc}
                    <ArrowUp class="w-3 h-3 text-[var(--brand)]" />
                  {:else}
                    <ArrowDown class="w-3 h-3 text-[var(--brand)]" />
                  {/if}
                {:else}
                  <ArrowUpDown class="w-3 h-3 opacity-40" />
                {/if}
              </button>
            </th>
            <th class="px-4 py-2.5 text-center">Action</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[var(--border-subtle)]">
          {#if loading}
            {#each Array(5) as _}
              <tr class="h-12">
                <td class="px-4 py-3"><Skeleton class="h-4 w-28" /></td>
                <td class="px-4 py-3"><Skeleton class="h-4 w-32" /></td>
                <td class="px-4 py-3"><Skeleton class="h-4 w-24" /></td>
                <td class="px-4 py-3"><Skeleton class="h-4 w-12 mx-auto" /></td>
                <td class="px-4 py-3"><Skeleton class="h-4 w-24 ml-auto" /></td>
                <td class="px-4 py-3"><Skeleton class="h-4 w-20 ml-auto" /></td>
                <td class="px-4 py-3"><Skeleton class="h-4 w-16 mx-auto" /></td>
              </tr>
            {/each}
          {:else if paginatedList.length === 0}
            <tr>
              <td colspan="7" class="px-4 py-12 text-center text-neutral-400">
                <Receipt class="w-8 h-8 text-neutral-300 dark:text-neutral-700 mx-auto mb-2" />
                <p class="font-medium text-neutral-600 dark:text-neutral-400">Tidak ada riwayat transaksi penjualan</p>
                <p class="text-[11px] text-neutral-400 mt-0.5">
                  {searchQuery ? `Tidak ditemukan transaksi dengan kata kunci "${searchQuery}"` : 'Tidak ada data penjualan'}
                </p>
              </td>
            </tr>
          {:else}
            {#each paginatedList as item (item.id)}
              {@const laba = (Number(item.total_harga_jual) || 0) - (Number(item.total_harga_modal) || 0)}
              <tr class="hover:bg-neutral-50/60 dark:hover:bg-neutral-900/40 transition-colors">
                <!-- Struk No -->
                <td class="px-4 py-3">
                  <div class="flex items-center gap-1.5">
                    <span class="font-medium text-neutral-900 dark:text-neutral-100 text-xs">
                      {item.no_struk}
                    </span>
                    <button
                      type="button"
                      class="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-0.5 rounded transition-colors"
                      onclick={() => copyToClipboard(item.no_struk)}
                      title="Salin No Struk"
                    >
                      {#if copiedStruk === item.no_struk}
                        <Check class="w-3.5 h-3.5 text-emerald-500" />
                      {:else}
                        <Copy class="w-3.5 h-3.5" />
                      {/if}
                    </button>
                  </div>
                </td>

                <!-- Waktu -->
                <td class="px-4 py-3 text-neutral-500 text-xs whitespace-nowrap">
                  {formatDateTime(item.created_ms)}
                </td>

                <!-- Kasir -->
                <td class="px-4 py-3">
                  <div class="flex items-center gap-1.5">
                    <div class="w-5 h-5 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-[10px] font-bold text-neutral-600 dark:text-neutral-300">
                      {item.nama_kasir ? item.nama_kasir.charAt(0).toUpperCase() : 'K'}
                    </div>
                    <span class="text-neutral-800 dark:text-neutral-200 text-xs">
                      {item.nama_kasir || 'Kasir'}
                    </span>
                  </div>
                </td>

                <!-- Total Barang -->
                <td class="px-4 py-3 text-center font-medium text-neutral-700 dark:text-neutral-300 tabular-nums text-xs">
                  {formatNumber(item.total_barang)}
                </td>

                <!-- Total Harga Jual -->
                <td class="px-4 py-3 text-right font-semibold text-neutral-900 dark:text-neutral-100 tabular-nums text-xs">
                  {formatRupiah(item.total_harga_jual)}
                </td>

                <!-- Laba Kotor -->
                <td class="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 tabular-nums font-medium text-xs">
                  +{formatRupiah(laba)}
                </td>

                <!-- Aksi -->
                <td class="px-4 py-3 text-center">
                  <div class="flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      onclick={() => openDetail(item)}
                      title="Lihat Rincian Struk"
                      class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 shadow-2xs transition-all text-[11px] font-medium"
                    >
                      <Eye class="w-3.5 h-3.5" />
                      <span class="hidden md:inline">Detail</span>
                    </button>
                    <button
                      type="button"
                      onclick={() => handlePrint(item)}
                      title="Cetak Ulang Struk Kasir"
                      class="p-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 shadow-2xs transition-all flex items-center justify-center"
                    >
                      <Printer class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>


    <!-- Pagination & Total Indicator with Limit -->
    <TablePagination
      bind:currentPage
      bind:pageSize
      totalItems={filteredList.length}
      currentItemsCount={paginatedList.length}
      itemLabel="transaksi"
      storageKey="penjualan_limit"
    />
  </div>
</div>

<!-- Modal Detail Transaksi & Struk -->
<Modal
  open={isDetailModalOpen}
  title="Rincian Transaksi Penjualan"
  size="xl"
  onclose={() => (isDetailModalOpen = false)}
>
  {#if selectedPenjualan}
    {@const itemLaba = (Number(selectedPenjualan.total_harga_jual) || 0) - (Number(selectedPenjualan.total_harga_modal) || 0)}
    <div class="space-y-4">
      <!-- Header Struk Info Card -->
      <div class="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/50 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div>
          <span class="text-neutral-500 block">Nomor Struk:</span>
          <span class="font-bold text-neutral-900 dark:text-neutral-100 text-sm mt-0.5 block">
            {selectedPenjualan.no_struk}
          </span>
        </div>
        <div>
          <span class="text-neutral-500 block">Waktu Transaksi:</span>
          <span class="text-neutral-800 dark:text-neutral-200 mt-0.5 block">
            {formatDateTime(selectedPenjualan.created_ms)}
          </span>
        </div>
        <div>
          <span class="text-neutral-500 block">Kasir Penanggung Jawab:</span>
          <span class="font-medium text-neutral-800 dark:text-neutral-200 mt-0.5 block">
            {selectedPenjualan.nama_kasir || 'Kasir'}
          </span>
        </div>
        <div>
          <span class="text-neutral-500 block">Total Kuantitas:</span>
          <span class="font-bold text-neutral-900 dark:text-neutral-100 text-sm mt-0.5 block">
            {formatNumber(selectedPenjualan.total_barang)} unit
          </span>
        </div>
      </div>

      <!-- Item Detail Table -->
      <div class="rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/40 text-neutral-500 text-[11px]">
              <th class="px-4 py-2.5 font-medium">PRODUK / ITEM</th>
              <th class="px-4 py-2.5 font-medium text-center">QTY</th>
              <th class="px-4 py-2.5 font-medium text-right">HARGA SATUAN</th>
              <th class="px-4 py-2.5 font-medium text-right">SUBTOTAL</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-200/70 dark:divide-neutral-800/80">
            {#if loadingDetail}
              {#each Array(3) as _}
                <tr class="h-10">
                  <td class="px-4 py-2.5"><Skeleton class="h-4 w-40" /></td>
                  <td class="px-4 py-2.5"><Skeleton class="h-4 w-8 mx-auto" /></td>
                  <td class="px-4 py-2.5"><Skeleton class="h-4 w-20 ml-auto" /></td>
                  <td class="px-4 py-2.5"><Skeleton class="h-4 w-24 ml-auto" /></td>
                </tr>
              {/each}
            {:else if detailItems.length === 0}
              <tr>
                <td colspan="4" class="px-4 py-8 text-center text-neutral-400">
                  Data rincian item tidak ditemukan.
                </td>
              </tr>
            {:else}
              {#each detailItems as item}
                <tr class="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30">
                  <td class="px-4 py-2.5 font-medium text-neutral-900 dark:text-neutral-100">
                    {item.nama_barang}
                  </td>
                  <td class="px-4 py-2.5 text-center font-medium text-neutral-700 dark:text-neutral-300 tabular-nums">
                    {formatNumber(item.jumlah)}
                  </td>
                  <td class="px-4 py-2.5 text-right text-neutral-600 dark:text-neutral-400 tabular-nums">
                    {formatRupiah(item.harga_jual)}
                  </td>
                  <td class="px-4 py-2.5 text-right font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
                    {formatRupiah(item.total_harga_jual)}
                  </td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>

      <!-- Financial Recap Box -->
      <div class="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-[var(--bg-subtle)]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div class="space-y-1">
          <div class="text-neutral-500">Estimasi Laba Kotor:</div>
          <div class="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            +{formatRupiah(itemLaba)}
          </div>
        </div>

        <div class="text-right space-y-0.5">
          <div class="text-neutral-500">Grand Total Belanja:</div>
          <div class="text-2xl font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
            {formatRupiah(selectedPenjualan.total_harga_jual)}
          </div>
        </div>
      </div>
    </div>
  {/if}

  {#snippet footer()}
    <Button
      variant="secondary"
      size="sm"
      onclick={() => (isDetailModalOpen = false)}
    >
      Tutup
    </Button>
    <Button
      variant="primary"
      size="sm"
      onclick={() => handlePrint()}
    >
      <Printer class="w-4 h-4" />
      <span>Cetak Struk (Thermal)</span>
    </Button>
  {/snippet}
</Modal>

<ReceiptModal
  bind:open={receiptModalOpen}
  data={receiptModalData}
  closeLabel="Tutup (Esc)"
/>
