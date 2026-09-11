<svelte:head>
    <title>KasirKu | Dashboard</title>
</svelte:head>

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { api } from '../api/api';
  import { sse } from '../stores/sse.svelte';
  import { auth, Permissions } from '../stores/auth.svelte';
  import { router } from '../stores/router.svelte';
  import Card from '../components/ui/Card.svelte';
  import Button from '../components/ui/Button.svelte';
  import Badge from '../components/ui/Badge.svelte';
  import Skeleton from '../components/ui/Skeleton.svelte';
  import QuickExpenseModal from '../components/pos/QuickExpenseModal.svelte';
  import Rupiah from '../components/ui/Rupiah.svelte';
  import DatePicker from '../components/ui/DatePicker.svelte';
  import TablePagination from '../components/ui/TablePagination.svelte';
  import { formatRupiah, formatNumber, formatDate } from '../utils/format';
  import {
    LayoutDashboard,
    ShoppingBag,
    TrendingUp,
    TrendingDown,
    DollarSign,
    PackageX,
    Calendar,
    ArrowUpRight,
    RefreshCw,
    Plus,
    Search,
    Wallet,
    Percent,
    Layers,
    ArrowRight,
    ChevronDown,
  } from 'lucide-svelte';

  interface TotalInfo {
    total_barang: number | null;
    total_harga_modal: number | null;
    total_harga_jual: number | null;
    jumlah_uang: number | null; // Pengeluaran
  }

  interface BarangKosong {
    id?: number;
    nama_barang: string;
    stok_barang?: number;
  }

  interface BarangTerjualItem {
    nama_barang: string;
    jumlah: number;
  }

  let loading = $state(true);
  let refreshing = $state(false);
  let lastSyncedTime = $state<string>('');

  let totalInfo = $state<TotalInfo>({
    total_barang: 0,
    total_harga_modal: 0,
    total_harga_jual: 0,
    jumlah_uang: 0,
  });

  let barangKosong = $state<BarangKosong[]>([]);
  let barangTerjualList = $state<BarangTerjualItem[]>([]);
  let filterBarangKosongQuery = $state('');
  let filterTerjualQuery = $state('');

  // Date range filter for sales breakdown
  const todayDate = new Date();
  const todayStr = formatDate(todayDate);
  let startDate = $state(todayStr);
  let endDate = $state(todayStr);
  let activePreset = $state<'today' | 'week' | 'month' | 'custom'>('today');
  let loadingSalesDate = $state(false);

  // Quick Expense Modal
  let expenseModalOpen = $state(false);

  // Financial Overview toggle state (persisted)
  let showFinancialOverview = $state(true);

  function toggleFinancialOverview() {
    showFinancialOverview = !showFinancialOverview;
    try {
      localStorage.setItem('kasirku_dashboard_overview_visible', String(showFinancialOverview));
    } catch {}
  }

  // Derived financial computations
  let omzet = $derived(totalInfo.total_harga_jual ?? 0);
  let totalModal = $derived(totalInfo.total_harga_modal ?? 0);
  let pengeluaran = $derived(totalInfo.jumlah_uang ?? 0);
  let labaKotor = $derived(omzet - totalModal);
  let labaBersih = $derived(labaKotor - pengeluaran);
  let marginPersen = $derived(omzet > 0 ? ((labaKotor / omzet) * 100).toFixed(1) : '0.0');


  // Filtered lists
  let filteredBarangKosong = $derived(
    barangKosong.filter((item) =>
      item.nama_barang.toLowerCase().includes(filterBarangKosongQuery.toLowerCase())
    )
  );

  let filteredBarangTerjual = $derived(
    barangTerjualList.filter((item) =>
      item.nama_barang.toLowerCase().includes(filterTerjualQuery.toLowerCase())
    )
  );

  let totalBarangTerjualPeriode = $derived(
    barangTerjualList.reduce((acc, curr) => acc + (Number(curr.jumlah) || 0), 0)
  );

  let terjualPage = $state(1);
  let terjualPageSize = $state(5);
  let paginatedBarangTerjual = $derived(
    filteredBarangTerjual.slice((terjualPage - 1) * terjualPageSize, terjualPage * terjualPageSize)
  );

  $effect(() => {
    void filterTerjualQuery;
    void startDate;
    void endDate;
    terjualPage = 1;
  });

  function getTodayKey(): number {
    const d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  }

  function dateToKey(dateStr: string): number {
    const cleaned = dateStr.replaceAll('-', '');
    return Number(cleaned) || getTodayKey();
  }

  async function fetchTotalInfo() {
    try {
      const key = getTodayKey();
      const res = await api.get<TotalInfo>(`/api/info_total?tanggal_key=${key}`);
      totalInfo = res;
    } catch (err) {
      console.error('Error fetching total info:', err);
    }
  }

  async function fetchBarangKosong() {
    try {
      const res = await api.get<BarangKosong[]>('/api/barang_kosong');
      barangKosong = Array.isArray(res) ? res : [];
    } catch (err) {
      console.error('Error fetching barang kosong:', err);
    }
  }

  async function fetchBarangTerjualTanggal() {
    loadingSalesDate = true;
    try {
      const startKey = dateToKey(startDate);
      const endKey = dateToKey(endDate);
      const res = await api.get<BarangTerjualItem[]>(
        `/api/penjualan_item_tanggal?tanggal_start=${startKey}&tanggal_end=${endKey}`
      );
      barangTerjualList = Array.isArray(res) ? res : [];
    } catch (err) {
      console.error('Error fetching barang terjual tanggal:', err);
    } finally {
      loadingSalesDate = false;
    }
  }

  function setDatePreset(preset: 'today' | 'week' | 'month') {
    activePreset = preset;
    const now = new Date();
    const end = formatDate(now);
    endDate = end;

    if (preset === 'today') {
      startDate = end;
    } else if (preset === 'week') {
      const past = new Date();
      past.setDate(past.getDate() - 6);
      startDate = formatDate(past);
    } else if (preset === 'month') {
      const past = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate = formatDate(past);
    }
    fetchBarangTerjualTanggal();
  }

  async function loadAll() {
    refreshing = true;
    await Promise.all([
      fetchTotalInfo(),
      fetchBarangKosong(),
      fetchBarangTerjualTanggal(),
    ]);
    const now = new Date();
    lastSyncedTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    loading = false;
    refreshing = false;
  }

  let unsubscribeSse: (() => void) | null = null;

  onMount(() => {
    try {
      const saved = localStorage.getItem('kasirku_dashboard_overview_visible');
      if (saved !== null) {
        showFinancialOverview = saved === 'true';
      }
    } catch {}

    loadAll();

    // Listen to real-time events from SSE
    unsubscribeSse = sse.subscribe((event) => {
      // type 4 = TAMBAH_PENJUALAN (kasir), type 5 = TAMBAH_PENGELUARAN
      if (event.type === 4 || event.type === 5) {
        fetchTotalInfo();
        fetchBarangTerjualTanggal();
        const now = new Date();
        lastSyncedTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      } else if (event.type === 2) {
        // type 2 = TAMBAH/UPDATE/DELETE_BARANG
        fetchBarangKosong();
      }
    });
  });

  onDestroy(() => {
    unsubscribeSse?.();
  });
</script>

<div class="space-y-6">
  <!-- Top Bar / Page Header -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200/80 dark:border-neutral-800 pb-4">
    <div>
      <div class="flex items-center gap-2">
        <h1 class="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <LayoutDashboard class="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
          <span>Dashboard</span>
        </h1>
      </div>
      {#if lastSyncedTime}
        <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Terakhir disinkron: <strong class="font-mono text-neutral-600 dark:text-neutral-300">{lastSyncedTime}</strong>
        </p>
      {/if}
    </div>

    <!-- Quick Action Controls -->
    <div class="flex flex-wrap items-center gap-2">
      <Button
        variant="secondary"
        size="sm"
        onclick={loadAll}
        loading={refreshing}
      >
        <RefreshCw class="w-3.5 h-3.5" />
        <span class="hidden sm:inline">Refresh</span>
      </Button>
    </div>
  </div>

  <!-- Financial Overview Panel (50% Left / 50% Right Split & Collapsible) -->
  <div class="rounded-xl border border-neutral-200/90 dark:border-neutral-800 bg-[var(--bg-surface)] shadow-xs overflow-hidden">
    <!-- Header with Action -->
    <div class="px-5 py-3 border-b border-neutral-200/90 dark:border-neutral-800 flex items-center justify-between gap-3 bg-neutral-50/60 dark:bg-neutral-900/40">
      <div class="flex items-center gap-2">
        <h2 class="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">Overview Finansial</h2>
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Sinkron aktif"></span>
      </div>

      <div class="flex items-center gap-3">
        {#if !showFinancialOverview && !loading}
          <div class="hidden sm:flex items-center gap-3 text-xs font-medium tabular-nums text-neutral-600 dark:text-neutral-400">
            <span>Omzet <strong class="text-neutral-900 dark:text-neutral-100"><Rupiah value={omzet} /></strong></span>
            <span class="text-neutral-300 dark:text-neutral-700">/</span>
            <span>Bersih <strong class={labaBersih >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}><Rupiah value={labaBersih} /></strong></span>
          </div>
        {/if}

        <button
          type="button"
          onclick={toggleFinancialOverview}
          class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/80 hover:bg-neutral-100 dark:hover:bg-neutral-700/60 shadow-2xs transition-colors cursor-pointer"
          aria-expanded={showFinancialOverview}
        >
          <span>{showFinancialOverview ? 'Sembunyikan' : 'Tampilkan'}</span>
          <ChevronDown class="w-3.5 h-3.5 transition-transform duration-150 {showFinancialOverview ? 'rotate-180' : ''}" />
        </button>
      </div>
    </div>

    <!-- 50% / 50% Ledger Grid -->
    {#if showFinancialOverview}
      <div class="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-neutral-200/90 dark:divide-neutral-800">
        <!-- Kolom Kiri (50%): Laba Kotor & Beban Pengeluaran -->
        <div class="divide-y divide-neutral-200/80 dark:divide-neutral-800/80">
          <!-- Kiri 1: Laba Kotor -->
          <div class="px-5 py-4 flex items-center justify-between gap-4 hover:bg-neutral-50/60 dark:hover:bg-neutral-800/25 transition-colors">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <TrendingUp class="w-4 h-4" />
              </div>
              <div class="min-w-0">
                <span class="text-sm font-semibold text-neutral-900 dark:text-neutral-100 block tracking-tight">Laba Kotor</span>
                <span class="text-[11px] text-neutral-500 dark:text-neutral-400 tabular-nums">Margin {marginPersen}% · Omzet dikurangi HPP</span>
              </div>
            </div>
            <div class="text-right shrink-0">
              {#if loading}
                <Skeleton class="h-6 w-28 ml-auto" />
              {:else}
                <div class="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap tracking-tight">
                  <Rupiah value={labaKotor} prefixClass="text-[0.72em] font-semibold text-emerald-600/70 dark:text-emerald-400/70 mr-0.5" />
                </div>
              {/if}
            </div>
          </div>

          <!-- Kiri 2: Beban Pengeluaran -->
          <div class="px-5 py-4 flex items-center justify-between gap-4 hover:bg-neutral-50/60 dark:hover:bg-neutral-800/25 transition-colors">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-8 h-8 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 flex items-center justify-center shrink-0">
                <TrendingDown class="w-4 h-4" />
              </div>
              <div class="min-w-0">
                <span class="text-sm font-semibold text-neutral-900 dark:text-neutral-100 block tracking-tight">Beban Pengeluaran</span>
                <span class="text-[11px] text-neutral-500 dark:text-neutral-400">Operasional kas & beban toko</span>
              </div>
            </div>
            <div class="text-right shrink-0">
              {#if loading}
                <Skeleton class="h-6 w-28 ml-auto" />
              {:else}
                <div class="text-lg sm:text-xl font-bold text-red-600 dark:text-red-400 tabular-nums whitespace-nowrap tracking-tight">
                  <Rupiah value={pengeluaran} prefixClass="text-[0.72em] font-semibold text-red-600/70 dark:text-red-400/70 mr-0.5" />
                </div>
              {/if}
            </div>
          </div>
        </div>

        <!-- Kolom Kanan (50%): Total Omzet & Laba Bersih -->
        <div class="divide-y divide-neutral-200/80 dark:divide-neutral-800/80">
          <!-- Kanan 1: Total Omzet -->
          <div class="px-5 py-4 flex items-center justify-between gap-4 hover:bg-neutral-50/60 dark:hover:bg-neutral-800/25 transition-colors">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700/80 flex items-center justify-center shrink-0">
                <DollarSign class="w-4 h-4" />
              </div>
              <div class="min-w-0">
                <span class="text-sm font-semibold text-neutral-900 dark:text-neutral-100 block tracking-tight">Total Omzet</span>
                <span class="text-[11px] text-neutral-500 dark:text-neutral-400">Penerimaan kotor transaksi</span>
              </div>
            </div>
            <div class="text-right shrink-0">
              {#if loading}
                <Skeleton class="h-6 w-32 ml-auto" />
              {:else}
                <div class="text-lg sm:text-xl font-bold text-neutral-900 dark:text-neutral-100 tabular-nums whitespace-nowrap tracking-tight">
                  <Rupiah value={omzet} />
                </div>
              {/if}
            </div>
          </div>

          <!-- Kanan 2: Laba Bersih -->
          <div class="px-5 py-4 flex items-center justify-between gap-4 hover:bg-neutral-50/60 dark:hover:bg-neutral-800/25 transition-colors">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-8 h-8 rounded-lg {labaBersih >= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'} border flex items-center justify-center shrink-0">
                <Wallet class="w-4 h-4" />
              </div>
              <div class="min-w-0">
                <span class="text-sm font-semibold text-neutral-900 dark:text-neutral-100 block tracking-tight">Laba Bersih</span>
                <span class="text-[11px] text-neutral-500 dark:text-neutral-400">Setelah seluruh beban operasional</span>
              </div>
            </div>
            <div class="text-right shrink-0">
              {#if loading}
                <Skeleton class="h-6 w-32 ml-auto" />
              {:else}
                <div class="text-lg sm:text-xl font-bold tabular-nums whitespace-nowrap tracking-tight {labaBersih >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}">
                  <Rupiah value={labaBersih} />
                </div>
              {/if}
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Row: Volume Terjual -->
      <div class="px-5 py-3.5 border-t border-neutral-200/80 dark:border-neutral-800/80 flex items-center justify-between bg-neutral-50/30 dark:bg-neutral-900/20 hover:bg-neutral-50/60 dark:hover:bg-neutral-900/40 transition-colors">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700/80 flex items-center justify-center shrink-0">
            <ShoppingBag class="w-4 h-4" />
          </div>
          <div class="min-w-0">
            <span class="text-sm font-semibold text-neutral-900 dark:text-neutral-100 block tracking-tight">Volume Terjual</span>
            <span class="text-[11px] text-neutral-500 dark:text-neutral-400">Total unit barang yang laku terjual hari ini</span>
          </div>
        </div>
        <div class="text-right shrink-0">
          {#if loading}
            <Skeleton class="h-6 w-20 ml-auto" />
          {:else}
            <div class="text-lg sm:text-xl font-bold text-neutral-900 dark:text-neutral-100 tabular-nums whitespace-nowrap tracking-tight">
              {formatNumber(totalInfo.total_barang ?? 0)} <span class="text-xs font-normal text-neutral-400 dark:text-neutral-500">unit</span>
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>

  <!-- Content Split: Stock Alert & Date Range Explorer -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Left 1 Col: Peringatan Stok Habis / Kritis -->
    <div class="lg:col-span-1">
      <Card
        title="Stok Habis / Kritis"
      >
        {#snippet actions()}
          <Badge variant={barangKosong.length > 0 ? 'danger' : 'success'} class="whitespace-nowrap shrink-0">
            {barangKosong.length} Produk
          </Badge>
        {/snippet}

        <!-- Search input if items exist -->
        {#if barangKosong.length > 4}
          <div class="mb-3">
            <input
              type="text"
              bind:value={filterBarangKosongQuery}
              placeholder="Cari barang kosong…"
              class="w-full px-2.5 py-1.5 rounded-md border text-xs bg-transparent focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/25 focus:border-[var(--brand)] dark:focus:ring-[var(--brand)]/25 dark:focus:border-[var(--brand)]"
            />
          </div>
        {/if}

        {#if loading}
          <div class="space-y-2 py-2">
            <Skeleton class="h-10 w-full" />
            <Skeleton class="h-10 w-full" />
            <Skeleton class="h-10 w-full" />
          </div>
        {:else if barangKosong.length === 0}
          <div class="text-center py-10 px-4">
            <div class="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center font-bold text-sm mb-2.5">
              ✓
            </div>
            <p class="text-xs font-semibold text-neutral-800 dark:text-neutral-200">Inventaris Prima</p>
            <p class="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 max-w-[200px] mx-auto leading-relaxed">
              Seluruh produk saat ini memiliki kuantitas stok yang aman.
            </p>
          </div>
        {:else}
          <div class="divide-y divide-neutral-200/70 dark:divide-neutral-800/80 -mx-5 -my-2 max-h-[360px] overflow-y-auto">
            {#each filteredBarangKosong as item}
              <div class="px-5 py-3 flex items-center justify-between gap-3 text-xs hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30 transition-colors">
                <div class="min-w-0 flex-1">
                  <p class="font-medium text-neutral-900 dark:text-neutral-100 truncate">
                    {item.nama_barang}
                  </p>
                  <span class="inline-block mt-0.5 text-[10px] text-red-600 dark:text-red-400 font-mono font-medium">
                    Stok: 0
                  </span>
                </div>
                {#if auth.can(Permissions.MANAGE_BARANG)}
                  <button
                    type="button"
                    onclick={() => router.navigate('/barang/barang_masuk')}
                    class="px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 text-[11px] font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-1 shrink-0"
                  >
                    <span>Restock</span>
                    <ArrowUpRight class="w-3 h-3" />
                  </button>
                {/if}
              </div>
            {/each}
          </div>
        {/if}

        {#snippet footer()}
          <span class="text-[11px] text-neutral-500">
            {barangKosong.length} barang butuh restock
          </span>
          {#if auth.can(Permissions.MANAGE_BARANG)}
            <button
              type="button"
              onclick={() => router.navigate('/barang/daftar_barang')}
              class="text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1"
            >
              <span>Katalog Barang</span>
              <ArrowRight class="w-3 h-3" />
            </button>
          {/if}
        {/snippet}
      </Card>
    </div>

    <!-- Right 2 Cols: Analitik Penjualan Produk (Date Range) -->
    <div class="lg:col-span-2">
      <Card
        title="Analitik Penjualan Produk"
      >
        {#snippet actions()}
          <!-- Date Presets -->
          <div class="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onclick={() => setDatePreset('today')}
              class="px-2 py-1 rounded text-[11px] font-medium transition-colors border
                {activePreset === 'today'
                  ? 'bg-[var(--brand)] text-[var(--accent-fg)] border-transparent'
                  : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-[var(--bg-hover)]'}"
            >
              Hari Ini
            </button>
            <button
              type="button"
              onclick={() => setDatePreset('week')}
              class="px-2 py-1 rounded text-[11px] font-medium transition-colors border
                {activePreset === 'week'
                  ? 'bg-[var(--brand)] text-[var(--accent-fg)] border-transparent'
                  : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-[var(--bg-hover)]'}"
            >
              7 Hari
            </button>
            <button
              type="button"
              onclick={() => setDatePreset('month')}
              class="px-2 py-1 rounded text-[11px] font-medium transition-colors border
                {activePreset === 'month'
                  ? 'bg-[var(--brand)] text-[var(--accent-fg)] border-transparent'
                  : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-[var(--bg-hover)]'}"
            >
              Bulan Ini
            </button>
          </div>
        {/snippet}

        <!-- Custom Date Range Pickers & Filter -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-neutral-200/60 dark:border-neutral-800/60">
          <div class="flex items-center gap-2 text-xs">
            <div class="flex items-center gap-1.5">
              <DatePicker
                bind:value={startDate}
                onchange={() => { activePreset = 'custom'; fetchBarangTerjualTanggal(); }}
              />
              <span class="text-neutral-400 text-xs">s/d</span>
              <DatePicker
                bind:value={endDate}
                align="left"
                onchange={() => { activePreset = 'custom'; fetchBarangTerjualTanggal(); }}
              />
            </div>
          </div>

          <div class="relative w-full sm:w-56">
            <Search class="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              bind:value={filterTerjualQuery}
              placeholder="Cari produk…"
              class="w-full pl-8 pr-2.5 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 text-xs bg-transparent focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/25 focus:border-[var(--brand)] dark:focus:ring-[var(--brand)]/25 dark:focus:border-[var(--brand)]"
            />
          </div>
        </div>

        {#if loadingSalesDate}
          <div class="space-y-2 py-4">
            <Skeleton class="h-9 w-full" />
            <Skeleton class="h-9 w-full" />
            <Skeleton class="h-9 w-full" />
            <Skeleton class="h-9 w-full" />
          </div>
        {:else if filteredBarangTerjual.length === 0}
          <div class="text-center py-12 px-4">
            <Calendar class="w-8 h-8 text-neutral-300 dark:text-neutral-700 mx-auto mb-2" />
            <p class="text-xs font-semibold text-neutral-800 dark:text-neutral-200">Tidak Ada Transaksi Produk</p>
            <p class="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
              {#if filterTerjualQuery}
                Tidak ditemukan produk yang cocok dengan kata kunci "{filterTerjualQuery}".
              {:else}
                Tidak ada riwayat penjualan produk pada rentang tanggal {startDate} s/d {endDate}.
              {/if}
            </p>
          </div>
        {:else}
          <div class="overflow-x-auto -mx-5 -my-2 max-h-[340px] overflow-y-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead class="sticky top-0 bg-[var(--bg-surface)] z-10">
                <tr class="border-b border-neutral-200/80 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 text-[11px] font-medium uppercase tracking-wider">
                  <th class="px-5 py-2.5 font-medium w-12">#</th>
                  <th class="px-5 py-2.5 font-medium">NAMA PRODUK</th>
                  <th class="px-5 py-2.5 font-medium text-right">VOLUME TERJUAL</th>
                  <th class="px-5 py-2.5 font-medium text-right w-28">KONTRIBUSI</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-neutral-200/70 dark:divide-neutral-800/80">
                {#each paginatedBarangTerjual as row, idx}
                  {@const rowJumlah = Number(row.jumlah) || 0}
                  {@const sharePct = totalBarangTerjualPeriode > 0 ? ((rowJumlah / totalBarangTerjualPeriode) * 100).toFixed(1) : '0.0'}
                  <tr class="hover:bg-neutral-50/60 dark:hover:bg-neutral-900/30 transition-colors">
                    <td class="px-5 py-2.5 tabular-nums text-neutral-400 text-[11px]">
                      {(terjualPage - 1) * terjualPageSize + idx + 1}
                    </td>
                    <td class="px-5 py-2.5 font-medium text-neutral-900 dark:text-neutral-100">
                      {row.nama_barang}
                    </td>
                    <td class="px-5 py-2.5 text-right tabular-nums font-semibold text-neutral-800 dark:text-neutral-200">
                      {formatNumber(rowJumlah)} <span class="text-[11px] font-normal text-neutral-500">item</span>
                    </td>
                    <td class="px-5 py-2.5 text-right tabular-nums text-neutral-500 text-[11px]">
                      <div class="flex items-center justify-end gap-1.5">
                        <span>{sharePct}%</span>
                        <div class="w-12 h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden shrink-0">
                          <div class="h-full bg-neutral-900 dark:bg-neutral-100" style:width={`${sharePct}%`}></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>

          <!-- Pagination with Limit -->
          <div class="-mx-5 -mb-5 mt-2">
            <TablePagination
              bind:currentPage={terjualPage}
              bind:pageSize={terjualPageSize}
              totalItems={filteredBarangTerjual.length}
              currentItemsCount={paginatedBarangTerjual.length}
              itemLabel="produk"
              storageKey="dashboard_terjual_limit"
            />
          </div>
        {/if}

        {#snippet footer()}
          <span class="text-[11px] text-neutral-500 tabular-nums">
            Total Produk Terjual: <strong>{formatNumber(totalBarangTerjualPeriode)} item</strong>
          </span>
          {#if auth.can(Permissions.MANAGE_PEMBUKUAN)}
            <button
              type="button"
              onclick={() => router.navigate('/pembukuan/penjualan')}
              class="text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1"
            >
              <span>Riwayat Penjualan Lengkap</span>
              <ArrowRight class="w-3 h-3" />
            </button>
          {/if}
        {/snippet}
      </Card>
    </div>
  </div>
</div>

<!-- Quick Expense Modal -->
<QuickExpenseModal
  bind:open={expenseModalOpen}
  onsuccess={() => {
    fetchTotalInfo();
  }}
/>
