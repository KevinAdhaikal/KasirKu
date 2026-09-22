<svelte:head>
    <title>KasirKu | Laporan (Pembukuan)</title>
</svelte:head>

<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '../../api/api';
  import { auth } from '../../stores/auth.svelte';
  import { toast } from '../../stores/toast.svelte';
  import Button from '../../components/ui/Button.svelte';
  import Input from '../../components/ui/Input.svelte';
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
    formatTanggalIndo,
    getTanggalKey
  } from '../../utils/format';
  import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    DollarSign,
    RefreshCw,
    Printer,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    ShoppingBag,
    Receipt,
    FileSpreadsheet,
    PieChart,
    ChevronDown,
    Filter,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Package,
    Wallet
  } from 'lucide-svelte';

  interface PenjualanRecord {
    id: number;
    kasir_id: number;
    no_struk: string;
    total_barang: number;
    total_harga_modal: number;
    total_harga_jual: number;
    tanggal_key: number;
    created_ms: number;
  }

  interface PengeluaranRecord {
    id: number;
    deskripsi: string;
    jumlah_uang: number;
    tanggal_key: number;
    created_ms: number;
  }

  interface LaporanData {
    penjualan: PenjualanRecord[];
    pengeluaran: PengeluaranRecord[];
  }

  let data = $state<LaporanData>({ penjualan: [], pengeluaran: [] });
  let loading = $state(true);
  let activeTab = $state<'summary' | 'penjualan' | 'pengeluaran'>('summary');

  function getFirstDayOfMonth(): string {
    const d = new Date();
    return formatDate(new Date(d.getFullYear(), d.getMonth(), 1));
  }

  // Date filters
  const todayDateStr = formatDate(new Date());
  let filterPreset = $state<'today' | 'week' | 'month' | 'custom'>('month');
  let startDate = $state(getFirstDayOfMonth());
  let endDate = $state(todayDateStr);

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
      const res = await api.get(`/api/laporan?tanggal_start=${startKey}&tanggal_end=${endKey}`);
      const parsed = typeof res === 'string' ? JSON.parse(res) : res;
      data = {
        penjualan: Array.isArray(parsed?.penjualan) ? parsed.penjualan : [],
        pengeluaran: Array.isArray(parsed?.pengeluaran) ? parsed.pengeluaran : [],
      };
    } catch (err: any) {
      toast.error('Gagal memuat laporan finansial: ' + (err.message || ''));
      data = { penjualan: [], pengeluaran: [] };
    } finally {
      loading = false;
    }
  }

  // Financial Computations
  let totalTransaksi = $derived(data.penjualan.length);
  let totalOmzet = $derived(data.penjualan.reduce((sum, p) => sum + (Number(p.total_harga_jual) || 0), 0));
  let totalHpp = $derived(data.penjualan.reduce((sum, p) => sum + (Number(p.total_harga_modal) || 0), 0));
  let labaKotor = $derived(totalOmzet - totalHpp);
  let grossMarginPct = $derived(totalOmzet > 0 ? ((labaKotor / totalOmzet) * 100).toFixed(1) : '0.0');

  let totalPengeluaran = $derived(data.pengeluaran.reduce((sum, exp) => sum + (Number(exp.jumlah_uang) || 0), 0));
  let labaBersih = $derived(labaKotor - totalPengeluaran);
  let netMarginPct = $derived(totalOmzet > 0 ? ((labaBersih / totalOmzet) * 100).toFixed(1) : '0.0');
  let avgOrderValue = $derived(totalTransaksi > 0 ? Math.round(totalOmzet / totalTransaksi) : 0);
  let totalQty = $derived(data.penjualan.reduce((sum, p) => sum + (Number(p.total_barang) || 0), 0));

  // Tab 2 Penjualan Sorting
  type PenjualanSortKey = 'no_struk' | 'created_ms' | 'total_barang' | 'total_harga_modal' | 'total_harga_jual' | 'laba_kotor';
  let penjualanSortKey = $state<PenjualanSortKey>('created_ms');
  let penjualanSortAsc = $state(false);

  function togglePenjualanSort(key: PenjualanSortKey) {
    if (penjualanSortKey === key) {
      penjualanSortAsc = !penjualanSortAsc;
    } else {
      penjualanSortKey = key;
      penjualanSortAsc = false;
    }
  }

  let sortedPenjualan = $derived.by(() => {
    let list = [...data.penjualan];
    return list.sort((a, b) => {
      let va: any;
      let vb: any;
      if (penjualanSortKey === 'laba_kotor') {
        va = (Number(a.total_harga_jual) || 0) - (Number(a.total_harga_modal) || 0);
        vb = (Number(b.total_harga_jual) || 0) - (Number(b.total_harga_modal) || 0);
      } else {
        va = a[penjualanSortKey] ?? 0;
        vb = b[penjualanSortKey] ?? 0;
      }
      if (typeof va === 'string' && typeof vb === 'string') {
        const cmp = va.localeCompare(vb, 'id', { sensitivity: 'base' });
        return penjualanSortAsc ? cmp : -cmp;
      }
      return penjualanSortAsc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
  });

  // Tab 3 Pengeluaran Sorting
  type PengeluaranSortKey = 'created_ms' | 'deskripsi' | 'jumlah_uang';
  let pengeluaranSortKey = $state<PengeluaranSortKey>('created_ms');
  let pengeluaranSortAsc = $state(false);

  function togglePengeluaranSort(key: PengeluaranSortKey) {
    if (pengeluaranSortKey === key) {
      pengeluaranSortAsc = !pengeluaranSortAsc;
    } else {
      pengeluaranSortKey = key;
      pengeluaranSortAsc = false;
    }
  }

  let sortedPengeluaran = $derived.by(() => {
    let list = [...data.pengeluaran];
    return list.sort((a, b) => {
      let va = a[pengeluaranSortKey] ?? 0;
      let vb = b[pengeluaranSortKey] ?? 0;
      if (typeof va === 'string' && typeof vb === 'string') {
        const cmp = va.localeCompare(vb, 'id', { sensitivity: 'base' });
        return pengeluaranSortAsc ? cmp : -cmp;
      }
      return pengeluaranSortAsc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
  });

  // Tab 2 Penjualan Pagination
  let penjualanPage = $state(1);
  let penjualanPageSize = $state(10);
  const paginatedPenjualan = $derived(
    sortedPenjualan.slice((penjualanPage - 1) * penjualanPageSize, penjualanPage * penjualanPageSize)
  );
  const totalPenjualanPages = $derived(Math.ceil(sortedPenjualan.length / penjualanPageSize) || 1);

  // Tab 3 Pengeluaran Pagination
  let pengeluaranPage = $state(1);
  let pengeluaranPageSize = $state(10);
  const paginatedPengeluaran = $derived(
    sortedPengeluaran.slice((pengeluaranPage - 1) * pengeluaranPageSize, pengeluaranPage * pengeluaranPageSize)
  );
  const totalPengeluaranPages = $derived(Math.ceil(sortedPengeluaran.length / pengeluaranPageSize) || 1);

  $effect(() => {
    void startDate;
    void endDate;
    penjualanPage = 1;
    pengeluaranPage = 1;
  });

  // Daily Chart Aggregation (SVG Chart)
  let dailyStats = $derived.by(() => {
    const map = new Map<number, { dateKey: number; omzet: number; pengeluaran: number }>();

    for (const p of data.penjualan) {
      const key = p.tanggal_key;
      const current = map.get(key) || { dateKey: key, omzet: 0, pengeluaran: 0 };
      current.omzet += Number(p.total_harga_jual) || 0;
      map.set(key, current);
    }

    for (const exp of data.pengeluaran) {
      const key = exp.tanggal_key;
      const current = map.get(key) || { dateKey: key, omzet: 0, pengeluaran: 0 };
      current.pengeluaran += Number(exp.jumlah_uang) || 0;
      map.set(key, current);
    }

    const arr = Array.from(map.values());
    arr.sort((a, b) => a.dateKey - b.dateKey);
    return arr;
  });

  let chartMaxVal = $derived.by(() => {
    let max = 0;
    for (const d of dailyStats) {
      if (d.omzet > max) max = d.omzet;
      if (d.pengeluaran > max) max = d.pengeluaran;
    }
    return max > 0 ? max : 100000;
  });

  onMount(() => {
    fetchData();
  });
</script>

<div class="space-y-6">
  <!-- Page Header -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200/80 dark:border-neutral-800 pb-4">
    <div class="flex items-center gap-2.5">
      <h1 class="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
        <BarChart3 class="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
        <span>Laporan</span>
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

      <Button
        variant="primary"
        size="sm"
        onclick={() => window.print()}
        title="Cetak Laporan Keuangan"
      >
        <Printer class="w-4 h-4" />
        <span>Cetak Laporan</span>
      </Button>
    </div>
  </div>

  <!-- Filter Period Card -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    <!-- Presets -->
    <div class="flex items-center gap-1.5 overflow-x-auto">
      <span class="text-xs font-medium text-neutral-500 mr-1 hidden sm:inline">Rentang:</span>
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

    <!-- Custom Date Range -->
    <div class="flex items-center gap-1.5 text-xs">
      <DatePicker
        bind:value={startDate}
        onchange={() => { filterPreset = 'custom'; fetchData(); }}
      />
      <span class="text-neutral-400 text-xs">s/d</span>
      <DatePicker
        bind:value={endDate}
        onchange={() => { filterPreset = 'custom'; fetchData(); }}
      />
    </div>
  </div>

  <!-- Visual Trend Chart (SVG Minimalist) -->
  <div class="p-5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-sm font-semibold text-[var(--text-primary)]">Tren Pendapatan vs Pengeluaran Harian</h2>
        <p class="text-[11px] text-[var(--text-muted)]">Perbandingan omzet penjualan kasir dan pengeluaran operasional toko per hari.</p>
      </div>

      <div class="flex items-center gap-4 text-xs">
        <div class="flex items-center gap-1.5">
          <div class="w-3 h-3 rounded-[3px]" style="background-color: #55abe9d4;"></div>
          <span class="text-[var(--text-secondary)] text-[11px] font-medium">Omzet</span>
        </div>
        <div class="flex items-center gap-1.5">
          <div class="w-3 h-3 rounded-[3px]" style="background-color: rgba(246, 107, 113, 0.91);"></div>
          <span class="text-[var(--text-secondary)] text-[11px] font-medium">Pengeluaran</span>
        </div>
      </div>
    </div>

    {#if loading}
      <div class="h-48 flex items-center justify-center">
        <Skeleton class="h-40 w-full" />
      </div>
    {:else if dailyStats.length === 0}
      <div class="h-36 flex flex-col items-center justify-center text-[var(--text-muted)] text-xs">
        <BarChart3 class="w-6 h-6 mb-1.5 opacity-40" />
        <span>Tidak ada aktivitas keuangan pada periode tanggal terpilih</span>
      </div>
    {:else}
      <!-- SVG Bar Chart -->
      <div class="pt-2">
        <div class="h-48 w-full flex items-end gap-2 pb-6 border-b border-[var(--border-subtle)] relative">
          <!-- Horizontal Guideline 50% -->
          <div class="absolute left-0 right-0 top-1/2 border-b border-dashed border-[var(--border-subtle)] pointer-events-none"></div>

          {#each dailyStats as day}
            {@const omzetHeight = Math.max(4, Math.round((day.omzet / chartMaxVal) * 160))}
            {@const pengeluaranHeight = Math.max(4, Math.round((day.pengeluaran / chartMaxVal) * 160))}
            <div class="flex-1 flex flex-col items-center justify-end h-full gap-1 group relative">
              <!-- Bars pair -->
              <div class="flex items-end gap-0.5 sm:gap-1 w-full max-w-[24px]">
                <!-- Omzet Bar -->
                <div
                  class="flex-1 rounded-t-[3px] hover:opacity-85 transition-all cursor-pointer shadow-2xs"
                  style="height: {omzetHeight}px; background-color: #55abe9d4;"
                  title={`Omzet: ${formatRupiah(day.omzet)}`}
                ></div>

                <!-- Pengeluaran Bar -->
                {#if day.pengeluaran > 0}
                  <div
                    class="flex-1 rounded-t-[3px] hover:opacity-85 transition-all cursor-pointer shadow-2xs"
                    style="height: {pengeluaranHeight}px; background-color: rgba(246, 107, 113, 0.91);"
                    title={`Pengeluaran: ${formatRupiah(day.pengeluaran)}`}
                  ></div>
                {/if}
              </div>

              <!-- Date Label Below -->
              <span class="absolute -bottom-5 text-[10px] tabular-nums text-[var(--text-muted)] whitespace-nowrap">
                {String(day.dateKey).slice(6, 8)}/{String(day.dateKey).slice(4, 6)}
              </span>

              <!-- Hover Tooltip -->
              <div class="absolute bottom-full mb-2 hidden group-hover:flex flex-col p-2.5 rounded-md border border-[var(--border-contrast)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-[10px] shadow-lg z-20 pointer-events-none whitespace-nowrap">
                <span class="font-bold text-[var(--text-primary)]">{formatTanggalKey(day.dateKey)}</span>
                <span class="font-medium" style="color: #55abe9;">Omzet: {formatRupiah(day.omzet)}</span>
                <span class="font-medium" style="color: rgb(246, 107, 113);">Pengeluaran: {formatRupiah(day.pengeluaran)}</span>
                <span class="font-bold border-t border-[var(--border-subtle)] mt-1 pt-0.5 text-[var(--text-primary)]">
                  Laba: {formatRupiah(day.omzet - day.pengeluaran)}
                </span>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  <!-- Detail Tabs & Breakdowns -->
  <div class="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden">
    <!-- Tabs Header -->
    <div class="flex border-b border-[var(--border-subtle)] px-4 gap-4 text-xs font-medium">
      <button
        type="button"
        class="py-3 border-b-2 transition-colors {activeTab === 'summary' ? 'border-[var(--brand)] text-[var(--brand)] font-semibold' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}"
        onclick={() => (activeTab = 'summary')}
      >
        Ringkasan Keuangan
      </button>
      <button
        type="button"
        class="py-3 border-b-2 transition-colors {activeTab === 'penjualan' ? 'border-[var(--brand)] text-[var(--brand)] font-semibold' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}"
        onclick={() => (activeTab = 'penjualan')}
      >
        Rincian Penjualan ({formatNumber(data.penjualan.length)})
      </button>
      <button
        type="button"
        class="py-3 border-b-2 transition-colors {activeTab === 'pengeluaran' ? 'border-[var(--brand)] text-[var(--brand)] font-semibold' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}"
        onclick={() => (activeTab = 'pengeluaran')}
      >
        Rincian Pengeluaran ({formatNumber(data.pengeluaran.length)})
      </button>
    </div>

    <!-- Tab 1: Ringkasan Keuangan -->
    {#if activeTab === 'summary'}
      <div class="p-5 sm:p-6 space-y-6">
        <!-- 4 Ringkasan Metrik Utama -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <!-- 1. Penjualan -->
          <div class="p-4 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col justify-between space-y-3">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-medium text-[var(--text-muted)]">Total Penjualan</span>
              <div class="w-7 h-7 rounded bg-[var(--brand)]/10 text-[var(--brand)] border border-[var(--brand)]/20 flex items-center justify-center shrink-0">
                <DollarSign class="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <div class="text-xl font-bold tabular-nums text-[var(--text-primary)]">
                {formatRupiah(totalOmzet)}
              </div>
              <p class="text-[11px] text-[var(--text-secondary)] mt-0.5">
                {formatNumber(totalTransaksi)} transaksi kasir
              </p>
            </div>
          </div>

          <!-- 2. Modal Barang -->
          <div class="p-4 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col justify-between space-y-3">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-medium text-[var(--text-muted)]">Modal Barang</span>
              <div class="w-7 h-7 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                <Package class="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <div class="text-xl font-bold tabular-nums text-[var(--text-primary)]">
                {formatRupiah(totalHpp)}
              </div>
              <p class="text-[11px] text-[var(--text-secondary)] mt-0.5">
                {formatNumber(totalQty)} barang terjual
              </p>
            </div>
          </div>

          <!-- 3. Pengeluaran Toko -->
          <div class="p-4 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col justify-between space-y-3">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-medium text-[var(--text-muted)]">Pengeluaran Toko</span>
              <div class="w-7 h-7 rounded bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 flex items-center justify-center shrink-0">
                <TrendingDown class="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <div class="text-xl font-bold tabular-nums text-red-600 dark:text-red-400">
                {formatRupiah(totalPengeluaran)}
              </div>
              <p class="text-[11px] text-[var(--text-secondary)] mt-0.5">
                {formatNumber(data.pengeluaran.length)} catatan pengeluaran
              </p>
            </div>
          </div>

          <!-- 4. Keuntungan Bersih -->
          <div class="p-4 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col justify-between space-y-3">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-medium text-[var(--text-muted)]">Keuntungan Bersih</span>
              <div class="w-7 h-7 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <TrendingUp class="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <div class="text-xl font-bold tabular-nums {labaBersih >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}">
                {labaBersih >= 0 ? '+' : ''}{formatRupiah(labaBersih)}
              </div>
              <p class="text-[11px] font-medium mt-0.5 {labaBersih >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}">
                Margin {netMarginPct}%
              </p>
            </div>
          </div>
        </div>

        <!-- Rincian Hitungan Laba Rugi yang Sederhana & Jelas -->
        <div class="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden">
          <div class="px-5 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)] flex items-center justify-between">
            <span class="font-semibold text-xs text-[var(--text-primary)]">Rincian Perhitungan Laba Rugi</span>
            <span class="text-[11px] text-[var(--text-muted)]">Periode {formatTanggalIndo(startDate)} &ndash; {formatTanggalIndo(endDate)}</span>
          </div>

          <div class="divide-y divide-[var(--border-subtle)] text-xs">
            <!-- 1. Penjualan -->
            <div class="px-5 py-3.5 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors">
              <div>
                <div class="font-semibold text-[var(--text-primary)] text-xs">Total Penjualan</div>
                <div class="text-[11px] text-[var(--text-secondary)] mt-0.5">Uang masuk dari {formatNumber(totalTransaksi)} struk kasir</div>
              </div>
              <div class="text-right">
                <span class="font-semibold text-xs tabular-nums text-[var(--text-primary)]">{formatRupiah(totalOmzet)}</span>
              </div>
            </div>

            <!-- 2. Modal Barang -->
            <div class="px-5 py-3.5 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors">
              <div>
                <div class="font-semibold text-[var(--text-primary)] text-xs">Modal Barang Terjual</div>
                <div class="text-[11px] text-[var(--text-secondary)] mt-0.5">Modal beli awal untuk {formatNumber(totalQty)} barang yang terjual</div>
              </div>
              <div class="text-right">
                <span class="font-medium text-xs tabular-nums text-[var(--text-secondary)]">- {formatRupiah(totalHpp)}</span>
              </div>
            </div>

            <!-- 3. Keuntungan Kotor -->
            <div class="px-5 py-3 bg-[var(--bg-subtle)]/50 flex items-center justify-between">
              <div>
                <div class="font-semibold text-[var(--text-primary)] text-xs">Keuntungan Kotor</div>
                <div class="text-[11px] text-[var(--text-muted)] mt-0.5">Total penjualan dikurangi modal barang</div>
              </div>
              <div class="text-right">
                <span class="font-bold text-xs tabular-nums text-[var(--text-primary)]">+{formatRupiah(labaKotor)}</span>
              </div>
            </div>

            <!-- 4. Pengeluaran Toko -->
            <div class="px-5 py-3.5 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors">
              <div>
                <div class="font-semibold text-[var(--text-primary)] text-xs">Pengeluaran Toko</div>
                <div class="text-[11px] text-[var(--text-secondary)] mt-0.5">Biaya operasional toko ({formatNumber(data.pengeluaran.length)} catatan)</div>
              </div>
              <div class="text-right">
                <span class="font-medium text-xs tabular-nums text-red-600 dark:text-red-400">- {formatRupiah(totalPengeluaran)}</span>
              </div>
            </div>

            <!-- 5. Keuntungan Bersih -->
            <div class="px-5 py-4 bg-[var(--bg-subtle)] flex items-center justify-between border-t-2 border-[var(--border-contrast)]">
              <div>
                <div class="font-bold text-sm text-[var(--text-primary)]">Keuntungan Bersih Akhir</div>
                <div class="text-[11px] text-[var(--text-secondary)] mt-0.5">Keuntungan kotor dikurangi biaya pengeluaran toko</div>
              </div>
              <div class="text-right">
                <div class="font-bold text-base tabular-nums {labaBersih >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}">
                  {labaBersih >= 0 ? '+' : ''}{formatRupiah(labaBersih)}
                </div>
                <div class="text-[11px] font-medium mt-0.5 {labaBersih >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}">
                  Margin Keuntungan: {netMarginPct}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    <!-- Tab 2: Rincian Penjualan Table -->
    {:else if activeTab === 'penjualan'}
      <div class="overflow-x-auto max-h-[440px] overflow-y-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead class="sticky top-0 z-20 bg-[var(--bg-subtle)]">
            <tr class="text-[var(--text-muted)] font-medium text-[11px]">
              <th class="sticky top-0 z-20 bg-[var(--bg-subtle)] border-b border-[var(--border-subtle)] shadow-[inset_0_-1px_0_var(--border-subtle)] py-2.5 px-4">
                <button
                  type="button"
                  class="flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors text-[11px] font-medium"
                  onclick={() => togglePenjualanSort('no_struk')}
                >
                  <span>No. Struk</span>
                  {#if penjualanSortKey === 'no_struk'}
                    {#if penjualanSortAsc}
                      <ArrowUp class="w-3 h-3 text-[var(--brand)]" />
                    {:else}
                      <ArrowDown class="w-3 h-3 text-[var(--brand)]" />
                    {/if}
                  {:else}
                    <ArrowUpDown class="w-3 h-3 opacity-40" />
                  {/if}
                </button>
              </th>
              <th class="sticky top-0 z-20 bg-[var(--bg-subtle)] border-b border-[var(--border-subtle)] shadow-[inset_0_-1px_0_var(--border-subtle)] py-2.5 px-4">
                <button
                  type="button"
                  class="flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors text-[11px] font-medium"
                  onclick={() => togglePenjualanSort('created_ms')}
                >
                  <span>Waktu</span>
                  {#if penjualanSortKey === 'created_ms'}
                    {#if penjualanSortAsc}
                      <ArrowUp class="w-3 h-3 text-[var(--brand)]" />
                    {:else}
                      <ArrowDown class="w-3 h-3 text-[var(--brand)]" />
                    {/if}
                  {:else}
                    <ArrowUpDown class="w-3 h-3 opacity-40" />
                  {/if}
                </button>
              </th>
              <th class="sticky top-0 z-20 bg-[var(--bg-subtle)] border-b border-[var(--border-subtle)] shadow-[inset_0_-1px_0_var(--border-subtle)] py-2.5 px-4 text-center">
                <button
                  type="button"
                  class="inline-flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors text-[11px] font-medium mx-auto"
                  onclick={() => togglePenjualanSort('total_barang')}
                >
                  <span>Jumlah Barang</span>
                  {#if penjualanSortKey === 'total_barang'}
                    {#if penjualanSortAsc}
                      <ArrowUp class="w-3 h-3 text-[var(--brand)]" />
                    {:else}
                      <ArrowDown class="w-3 h-3 text-[var(--brand)]" />
                    {/if}
                  {:else}
                    <ArrowUpDown class="w-3 h-3 opacity-40" />
                  {/if}
                </button>
              </th>
              <th class="sticky top-0 z-20 bg-[var(--bg-subtle)] border-b border-[var(--border-subtle)] shadow-[inset_0_-1px_0_var(--border-subtle)] py-2.5 px-4 text-right">
                <button
                  type="button"
                  class="inline-flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors text-[11px] font-medium ml-auto"
                  onclick={() => togglePenjualanSort('total_harga_modal')}
                >
                  <span>Total Modal</span>
                  {#if penjualanSortKey === 'total_harga_modal'}
                    {#if penjualanSortAsc}
                      <ArrowUp class="w-3 h-3 text-[var(--brand)]" />
                    {:else}
                      <ArrowDown class="w-3 h-3 text-[var(--brand)]" />
                    {/if}
                  {:else}
                    <ArrowUpDown class="w-3 h-3 opacity-40" />
                  {/if}
                </button>
              </th>
              <th class="sticky top-0 z-20 bg-[var(--bg-subtle)] border-b border-[var(--border-subtle)] shadow-[inset_0_-1px_0_var(--border-subtle)] py-2.5 px-4 text-right">
                <button
                  type="button"
                  class="inline-flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors text-[11px] font-medium ml-auto"
                  onclick={() => togglePenjualanSort('total_harga_jual')}
                >
                  <span>Total Penjualan</span>
                  {#if penjualanSortKey === 'total_harga_jual'}
                    {#if penjualanSortAsc}
                      <ArrowUp class="w-3 h-3 text-[var(--brand)]" />
                    {:else}
                      <ArrowDown class="w-3 h-3 text-[var(--brand)]" />
                    {/if}
                  {:else}
                    <ArrowUpDown class="w-3 h-3 opacity-40" />
                  {/if}
                </button>
              </th>
              <th class="sticky top-0 z-20 bg-[var(--bg-subtle)] border-b border-[var(--border-subtle)] shadow-[inset_0_-1px_0_var(--border-subtle)] py-2.5 px-4 text-right">
                <button
                  type="button"
                  class="inline-flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors text-[11px] font-medium ml-auto"
                  onclick={() => togglePenjualanSort('laba_kotor')}
                >
                  <span>Laba Kotor</span>
                  {#if penjualanSortKey === 'laba_kotor'}
                    {#if penjualanSortAsc}
                      <ArrowUp class="w-3 h-3 text-[var(--brand)]" />
                    {:else}
                      <ArrowDown class="w-3 h-3 text-[var(--brand)]" />
                    {/if}
                  {:else}
                    <ArrowUpDown class="w-3 h-3 opacity-40" />
                  {/if}
                </button>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--border-subtle)]">
            {#if paginatedPenjualan.length === 0}
              <tr>
                <td colspan="6" class="py-12 text-center text-[var(--text-muted)]">
                  <Receipt class="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p class="font-medium text-xs">Tidak ada riwayat transaksi penjualan.</p>
                </td>
              </tr>
            {:else}
              {#each paginatedPenjualan as p}
                <tr class="hover:bg-[var(--bg-hover)] transition-colors">
                  <td class="py-3 px-4 font-semibold text-[var(--text-primary)] text-xs">{p.no_struk}</td>
                  <td class="py-3 px-4 text-[var(--text-secondary)] text-xs whitespace-nowrap">{formatDateTime(p.created_ms)}</td>
                  <td class="py-3 px-4 text-center text-xs tabular-nums font-medium text-[var(--text-secondary)]">{formatNumber(p.total_barang)}</td>
                  <td class="py-3 px-4 text-right text-xs tabular-nums text-[var(--text-secondary)]">{formatRupiah(p.total_harga_modal)}</td>
                  <td class="py-3 px-4 text-right text-xs tabular-nums font-medium text-[var(--text-primary)]">{formatRupiah(p.total_harga_jual)}</td>
                  <td class="py-3 px-4 text-right text-xs tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">+{formatRupiah(p.total_harga_jual - p.total_harga_modal)}</td>
                </tr>
              {/each}
            {/if}
          </tbody>
          {#if sortedPenjualan.length > 0}
            <tfoot class="sticky bottom-0 z-20 bg-[var(--bg-subtle)]">
              <tr class="font-semibold text-xs text-[var(--text-primary)]">
                <td class="sticky bottom-0 z-20 bg-[var(--bg-subtle)] border-t border-[var(--border-subtle)] shadow-[inset_0_1px_0_var(--border-subtle)] py-3 px-4 whitespace-nowrap">
                  <span>Total Item: <strong class="tabular-nums font-bold">{formatNumber(totalQty)} unit</strong></span>
                </td>
                <td class="sticky bottom-0 z-20 bg-[var(--bg-subtle)] border-t border-[var(--border-subtle)] shadow-[inset_0_1px_0_var(--border-subtle)] py-3 px-4"></td>
                <td class="sticky bottom-0 z-20 bg-[var(--bg-subtle)] border-t border-[var(--border-subtle)] shadow-[inset_0_1px_0_var(--border-subtle)] py-3 px-4 text-center tabular-nums font-semibold text-[var(--text-secondary)]">
                  {formatNumber(totalQty)}
                </td>
                <td class="sticky bottom-0 z-20 bg-[var(--bg-subtle)] border-t border-[var(--border-subtle)] shadow-[inset_0_1px_0_var(--border-subtle)] py-3 px-4 text-right tabular-nums text-[var(--text-secondary)] font-medium">
                  {formatRupiah(totalHpp)}
                </td>
                <td class="sticky bottom-0 z-20 bg-[var(--bg-subtle)] border-t border-[var(--border-subtle)] shadow-[inset_0_1px_0_var(--border-subtle)] py-3 px-4 text-right tabular-nums font-semibold text-[var(--text-primary)] whitespace-nowrap">
                  {formatRupiah(totalOmzet)}
                </td>
                <td class="sticky bottom-0 z-20 bg-[var(--bg-subtle)] border-t border-[var(--border-subtle)] shadow-[inset_0_1px_0_var(--border-subtle)] py-3 px-4 text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                  +{formatRupiah(labaKotor)}
                </td>
              </tr>
            </tfoot>
          {/if}
        </table>
      </div>

      <!-- Pagination & Total Indicator with Limit -->
      <TablePagination
        bind:currentPage={penjualanPage}
        bind:pageSize={penjualanPageSize}
        totalItems={sortedPenjualan.length}
        currentItemsCount={paginatedPenjualan.length}
        itemLabel="transaksi"
        storageKey="laporan_penjualan_limit"
      />

    <!-- Tab 3: Rincian Pengeluaran Table -->
    {:else if activeTab === 'pengeluaran'}
      <div class="overflow-x-auto max-h-[440px] overflow-y-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead class="sticky top-0 z-20 bg-[var(--bg-subtle)]">
            <tr class="text-[var(--text-muted)] font-medium text-[11px]">
              <th class="sticky top-0 z-20 bg-[var(--bg-subtle)] border-b border-[var(--border-subtle)] shadow-[inset_0_-1px_0_var(--border-subtle)] py-2.5 px-4 w-48">
                <button
                  type="button"
                  class="flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors text-[11px] font-medium"
                  onclick={() => togglePengeluaranSort('created_ms')}
                >
                  <span>Waktu</span>
                  {#if pengeluaranSortKey === 'created_ms'}
                    {#if pengeluaranSortAsc}
                      <ArrowUp class="w-3 h-3 text-[var(--brand)]" />
                    {:else}
                      <ArrowDown class="w-3 h-3 text-[var(--brand)]" />
                    {/if}
                  {:else}
                    <ArrowUpDown class="w-3 h-3 opacity-40" />
                  {/if}
                </button>
              </th>
              <th class="sticky top-0 z-20 bg-[var(--bg-subtle)] border-b border-[var(--border-subtle)] shadow-[inset_0_-1px_0_var(--border-subtle)] py-2.5 px-4">
                <button
                  type="button"
                  class="flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors text-[11px] font-medium"
                  onclick={() => togglePengeluaranSort('deskripsi')}
                >
                  <span>Keperluan / Deskripsi</span>
                  {#if pengeluaranSortKey === 'deskripsi'}
                    {#if pengeluaranSortAsc}
                      <ArrowUp class="w-3 h-3 text-[var(--brand)]" />
                    {:else}
                      <ArrowDown class="w-3 h-3 text-[var(--brand)]" />
                    {/if}
                  {:else}
                    <ArrowUpDown class="w-3 h-3 opacity-40" />
                  {/if}
                </button>
              </th>
              <th class="sticky top-0 z-20 bg-[var(--bg-subtle)] border-b border-[var(--border-subtle)] shadow-[inset_0_-1px_0_var(--border-subtle)] py-2.5 px-4 text-right w-44">
                <button
                  type="button"
                  class="inline-flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors text-[11px] font-medium ml-auto"
                  onclick={() => togglePengeluaranSort('jumlah_uang')}
                >
                  <span>Nominal Pengeluaran</span>
                  {#if pengeluaranSortKey === 'jumlah_uang'}
                    {#if pengeluaranSortAsc}
                      <ArrowUp class="w-3 h-3 text-[var(--brand)]" />
                    {:else}
                      <ArrowDown class="w-3 h-3 text-[var(--brand)]" />
                    {/if}
                  {:else}
                    <ArrowUpDown class="w-3 h-3 opacity-40" />
                  {/if}
                </button>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--border-subtle)]">
            {#if paginatedPengeluaran.length === 0}
              <tr>
                <td colspan="3" class="py-12 text-center text-[var(--text-muted)]">
                  <TrendingDown class="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p class="font-medium text-xs">Tidak ada data pengeluaran operasional.</p>
                </td>
              </tr>
            {:else}
              {#each paginatedPengeluaran as exp}
                <tr class="hover:bg-[var(--bg-hover)] transition-colors">
                  <td class="py-3 px-4 text-[var(--text-secondary)] text-xs whitespace-nowrap">{formatDateTime(exp.created_ms)}</td>
                  <td class="py-3 px-4 font-semibold text-[var(--text-primary)] text-xs">{exp.deskripsi}</td>
                  <td class="py-3 px-4 text-right text-xs tabular-nums font-semibold text-red-600 dark:text-red-400">-{formatRupiah(exp.jumlah_uang)}</td>
                </tr>
              {/each}
            {/if}
          </tbody>
          {#if sortedPengeluaran.length > 0}
            <tfoot class="sticky bottom-0 z-20 bg-[var(--bg-subtle)]">
              <tr class="font-semibold text-xs text-[var(--text-primary)]">
                <td colspan="2" class="sticky bottom-0 z-20 bg-[var(--bg-subtle)] border-t border-[var(--border-subtle)] shadow-[inset_0_1px_0_var(--border-subtle)] py-3 px-4 font-semibold text-[var(--text-primary)]">
                  Total Pengeluaran: {formatNumber(sortedPengeluaran.length)}
                </td>
                <td class="sticky bottom-0 z-20 bg-[var(--bg-subtle)] border-t border-[var(--border-subtle)] shadow-[inset_0_1px_0_var(--border-subtle)] py-3 px-4 text-right tabular-nums font-bold text-red-600 dark:text-red-400 whitespace-nowrap">
                  -{formatRupiah(totalPengeluaran)}
                </td>
              </tr>
            </tfoot>
          {/if}
        </table>
      </div>

      <!-- Pagination & Total Indicator with Limit -->
      <TablePagination
        bind:currentPage={pengeluaranPage}
        bind:pageSize={pengeluaranPageSize}
        totalItems={sortedPengeluaran.length}
        currentItemsCount={paginatedPengeluaran.length}
        itemLabel="pengeluaran"
        storageKey="laporan_pengeluaran_limit"
      />
    {/if}
  </div>
</div>

<!-- Print Report Layout -->
<div id="financial-print-report" class="hidden print:block font-sans text-black p-8 bg-white max-w-4xl mx-auto text-xs">
  <div class="text-center pb-4 border-b-2 border-black">
    <h1 class="text-xl font-bold uppercase tracking-wide">{auth.publicInfo.store_name || 'KASIRKU POS'}</h1>
    <p class="text-sm font-semibold mt-0.5">LAPORAN RINGKASAN KEUANGAN</p>
    <p class="text-xs mt-1">Periode: {formatTanggalIndo(startDate)} s/d {formatTanggalIndo(endDate)}</p>
    {#if auth.publicInfo.store_address}
      <p class="text-[10px] text-neutral-600">{auth.publicInfo.store_address}</p>
    {/if}
  </div>

  <div class="py-6 space-y-4">
    <table class="w-full text-xs border-collapse border border-black">
      <thead>
        <tr class="bg-neutral-100 border-b border-black">
          <th class="p-2 text-left font-bold">RINCIAN PERHITUNGAN</th>
          <th class="p-2 text-right font-bold">JUMLAH (RP)</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-neutral-300">
        <tr>
          <td class="p-2 font-medium">Total Penjualan (Omzet)</td>
          <td class="p-2 text-right tabular-nums font-bold">{formatRupiah(totalOmzet)}</td>
        </tr>
        <tr>
          <td class="p-2 font-medium">Modal Barang Terjual</td>
          <td class="p-2 text-right tabular-nums">({formatRupiah(totalHpp)})</td>
        </tr>
        <tr class="bg-neutral-50 font-bold">
          <td class="p-2">KEUNTUNGAN KOTOR</td>
          <td class="p-2 text-right tabular-nums">+{formatRupiah(labaKotor)}</td>
        </tr>
        <tr>
          <td class="p-2 font-medium">Pengeluaran Toko</td>
          <td class="p-2 text-right tabular-nums text-red-600">({formatRupiah(totalPengeluaran)})</td>
        </tr>
        <tr class="bg-neutral-100 font-bold text-sm border-t-2 border-black">
          <td class="p-2.5">KEUNTUNGAN BERSIH</td>
          <td class="p-2.5 text-right tabular-nums">{formatRupiah(labaBersih)}</td>
        </tr>
      </tbody>
    </table>

    <div class="grid grid-cols-2 gap-4 pt-8 text-center text-xs">
      <div>
        <p class="text-neutral-500 mb-12">Disiapkan oleh,</p>
        <p class="font-bold border-t border-black pt-1 inline-block min-w-[150px]">Kasir / Staff</p>
      </div>
      <div>
        <p class="text-neutral-500 mb-12">Disetujui oleh,</p>
        <p class="font-bold border-t border-black pt-1 inline-block min-w-[150px]">Pemilik Toko</p>
      </div>
    </div>
  </div>
</div>
