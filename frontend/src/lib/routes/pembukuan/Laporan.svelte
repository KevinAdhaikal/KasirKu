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
    ArrowDown
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

  // Date filters
  const todayDateStr = formatDate(new Date());
  let filterPreset = $state<'today' | 'week' | 'month' | 'custom'>('month');
  let startDate = $state(() => {
    const d = new Date();
    return formatDate(new Date(d.getFullYear(), d.getMonth(), 1));
  });
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

  function handlePrint() {
    window.print();
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
      <h1 class="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
        Laporan
      </h1>
      <span class="text-xs font-mono px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400">
        Pembukuan & Laba Rugi
      </span>
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
        onclick={handlePrint}
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
  <div class="p-5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-[var(--bg-surface)] shadow-xs space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Tren Pendapatan vs Beban Harian</h2>
        <p class="text-[11px] text-neutral-500">Perbandingan transaksi omzet penjualan kasir dan pengeluaran per hari.</p>
      </div>

      <div class="flex items-center gap-4 text-xs font-mono">
        <div class="flex items-center gap-1.5">
          <div class="w-3 h-3 rounded-xs bg-neutral-900 dark:bg-neutral-100"></div>
          <span class="text-neutral-600 dark:text-neutral-400 text-[11px]">Omzet</span>
        </div>
        <div class="flex items-center gap-1.5">
          <div class="w-3 h-3 rounded-xs bg-red-500"></div>
          <span class="text-neutral-600 dark:text-neutral-400 text-[11px]">Beban</span>
        </div>
      </div>
    </div>

    {#if loading}
      <div class="h-48 flex items-center justify-center">
        <Skeleton class="h-40 w-full" />
      </div>
    {:else if dailyStats.length === 0}
      <div class="h-36 flex flex-col items-center justify-center text-neutral-400 text-xs">
        <BarChart3 class="w-6 h-6 mb-1.5 text-neutral-300 dark:text-neutral-700" />
        <span>Tidak ada aktivitas keuangan pada periode tanggal terpilih</span>
      </div>
    {:else}
      <!-- SVG Bar Chart -->
      <div class="pt-2">
        <div class="h-48 w-full flex items-end gap-2 pb-6 border-b border-neutral-200 dark:border-neutral-800 relative">
          <!-- Horizontal Guideline 50% -->
          <div class="absolute left-0 right-0 top-1/2 border-b border-dashed border-neutral-200 dark:border-neutral-800 pointer-events-none"></div>

          {#each dailyStats as day}
            {@const omzetHeight = Math.max(4, Math.round((day.omzet / chartMaxVal) * 160))}
            {@const bebanHeight = Math.max(4, Math.round((day.pengeluaran / chartMaxVal) * 160))}
            <div class="flex-1 flex flex-col items-center justify-end h-full gap-1 group relative">
              <!-- Bars pair -->
              <div class="flex items-end gap-0.5 sm:gap-1 w-full max-w-[24px]">
                <!-- Omzet Bar -->
                <div
                  class="flex-1 bg-neutral-900 dark:bg-neutral-100 rounded-t-xs hover:opacity-80 transition-all cursor-pointer"
                  style="height: {omzetHeight}px;"
                  title={`Omzet: ${formatRupiah(day.omzet)}`}
                ></div>

                <!-- Beban Bar -->
                {#if day.pengeluaran > 0}
                  <div
                    class="flex-1 bg-red-500 rounded-t-xs hover:opacity-80 transition-all cursor-pointer"
                    style="height: {bebanHeight}px;"
                    title={`Beban: ${formatRupiah(day.pengeluaran)}`}
                  ></div>
                {/if}
              </div>

              <!-- Date Label Below -->
              <span class="absolute -bottom-5 text-[9px] font-mono text-neutral-400 whitespace-nowrap">
                {String(day.dateKey).slice(6, 8)}/{String(day.dateKey).slice(4, 6)}
              </span>

              <!-- Hover Tooltip -->
              <div class="absolute bottom-full mb-2 hidden group-hover:flex flex-col p-2 rounded bg-[var(--brand)] text-[var(--accent-fg)] text-[10px] font-mono shadow-xl z-20 pointer-events-none whitespace-nowrap">
                <span class="font-bold">{formatTanggalKey(day.dateKey)}</span>
                <span>Omzet: {formatRupiah(day.omzet)}</span>
                <span>Beban: {formatRupiah(day.pengeluaran)}</span>
                <span class="font-bold border-t border-white/20 dark:border-black/20 mt-1 pt-0.5">
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
  <div class="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-[var(--bg-surface)] shadow-xs overflow-hidden">
    <!-- Tabs Header -->
    <div class="flex border-b border-neutral-200 dark:border-neutral-800 px-4 gap-4 text-xs font-medium">
      <button
        type="button"
        class="py-3 border-b-2 transition-colors {activeTab === 'summary' ? 'border-neutral-900 dark:border-white text-neutral-900 dark:text-white font-semibold' : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'}"
        onclick={() => (activeTab = 'summary')}
      >
        Ringkasan Laba Rugi
      </button>
      <button
        type="button"
        class="py-3 border-b-2 transition-colors {activeTab === 'penjualan' ? 'border-neutral-900 dark:border-white text-neutral-900 dark:text-white font-semibold' : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'}"
        onclick={() => (activeTab = 'penjualan')}
      >
        Rincian Penjualan ({formatNumber(data.penjualan.length)})
      </button>
      <button
        type="button"
        class="py-3 border-b-2 transition-colors {activeTab === 'pengeluaran' ? 'border-neutral-900 dark:border-white text-neutral-900 dark:text-white font-semibold' : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'}"
        onclick={() => (activeTab = 'pengeluaran')}
      >
        Rincian Pengeluaran ({formatNumber(data.pengeluaran.length)})
      </button>
    </div>

    <!-- Tab 1: Ringkasan Laba Rugi (Balance Table) -->
    {#if activeTab === 'summary'}
      <div class="p-6">
        <div class="max-w-2xl mx-auto space-y-4">
          <div class="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden divide-y divide-neutral-200 dark:divide-neutral-800 text-xs">
            <!-- Arus Pendapatan -->
            <div class="p-3.5 bg-[var(--bg-subtle)]/60 flex items-center justify-between font-semibold">
              <span>A. PENDAPATAN OPERASIONAL</span>
              <span></span>
            </div>
            <div class="p-3.5 flex items-center justify-between">
              <span class="text-neutral-600 dark:text-neutral-400 pl-4">Penjualan Kasir ({formatNumber(totalTransaksi)} transaksi)</span>
              <span class="font-mono font-medium text-neutral-900 dark:text-neutral-100">{formatRupiah(totalOmzet)}</span>
            </div>

            <!-- HPP -->
            <div class="p-3.5 bg-[var(--bg-subtle)]/60 flex items-center justify-between font-semibold">
              <span>B. HARGA POKOK PENJUALAN (HPP)</span>
              <span></span>
            </div>
            <div class="p-3.5 flex items-center justify-between">
              <span class="text-neutral-600 dark:text-neutral-400 pl-4">Modal Dasar Barang Terjual</span>
              <span class="font-mono font-medium text-neutral-900 dark:text-neutral-100">({formatRupiah(totalHpp)})</span>
            </div>

            <!-- Laba Kotor Highlight -->
            <div class="p-3.5 bg-emerald-50/40 dark:bg-emerald-950/20 flex items-center justify-between font-bold text-emerald-800 dark:text-emerald-400">
              <span>LABA KOTOR (GROSS PROFIT)</span>
              <span class="font-mono text-sm">+{formatRupiah(labaKotor)}</span>
            </div>

            <!-- Beban Operasional -->
            <div class="p-3.5 bg-[var(--bg-subtle)]/60 flex items-center justify-between font-semibold">
              <span>C. BEBAN OPERASIONAL TOKO</span>
              <span></span>
            </div>
            <div class="p-3.5 flex items-center justify-between">
              <span class="text-neutral-600 dark:text-neutral-400 pl-4">Biaya Listrik, Perlengkapan, Operasional</span>
              <span class="font-mono font-medium text-red-600 dark:text-red-400">({formatRupiah(totalPengeluaran)})</span>
            </div>

            <!-- Laba Bersih Final -->
            <div class="p-4 bg-neutral-100 dark:bg-neutral-900 flex items-center justify-between font-bold text-sm">
              <div class="space-y-0.5">
                <span>LABA BERSIH (NET PROFIT)</span>
                <span class="block text-[11px] font-normal text-neutral-500">Margin Bersih: {netMarginPct}%</span>
              </div>
              <span class="font-mono text-lg {labaBersih >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}">
                {labaBersih >= 0 ? '+' : ''}{formatRupiah(labaBersih)}
              </span>
            </div>
          </div>
        </div>
      </div>

    <!-- Tab 2: Rincian Penjualan Table -->
    {:else if activeTab === 'penjualan'}
      <div class="overflow-x-auto max-h-[420px] overflow-y-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-500 uppercase font-mono text-[10px] tracking-wider sticky top-0 z-10">
              <th class="px-4 py-2.5">
                <button
                  type="button"
                  class="flex items-center gap-1 font-mono uppercase tracking-wider hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer select-none"
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
              <th class="px-4 py-2.5">
                <button
                  type="button"
                  class="flex items-center gap-1 font-mono uppercase tracking-wider hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer select-none"
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
              <th class="px-4 py-2.5 text-center">
                <button
                  type="button"
                  class="inline-flex items-center gap-1 font-mono uppercase tracking-wider hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer select-none mx-auto"
                  onclick={() => togglePenjualanSort('total_barang')}
                >
                  <span>Qty</span>
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
              <th class="px-4 py-2.5 text-right">
                <button
                  type="button"
                  class="inline-flex items-center gap-1 font-mono uppercase tracking-wider hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer select-none ml-auto"
                  onclick={() => togglePenjualanSort('total_harga_modal')}
                >
                  <span>Modal</span>
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
              <th class="px-4 py-2.5 text-right">
                <button
                  type="button"
                  class="inline-flex items-center gap-1 font-mono uppercase tracking-wider hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer select-none ml-auto"
                  onclick={() => togglePenjualanSort('total_harga_jual')}
                >
                  <span>Total Jual</span>
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
              <th class="px-4 py-2.5 text-right">
                <button
                  type="button"
                  class="inline-flex items-center gap-1 font-mono uppercase tracking-wider hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer select-none ml-auto"
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
          <tbody class="divide-y divide-neutral-200/70 dark:divide-neutral-800/80">
            {#each paginatedPenjualan as p}
              <tr class="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30">
                <td class="px-4 py-2.5 font-medium text-neutral-900 dark:text-neutral-100 text-xs">{p.no_struk}</td>
                <td class="px-4 py-2.5 text-neutral-500 text-xs whitespace-nowrap">{formatDateTime(p.created_ms)}</td>
                <td class="px-4 py-2.5 text-center text-xs tabular-nums font-medium text-neutral-700 dark:text-neutral-300">{formatNumber(p.total_barang)}</td>
                <td class="px-4 py-2.5 text-right text-xs tabular-nums text-neutral-500">{formatRupiah(p.total_harga_modal)}</td>
                <td class="px-4 py-2.5 text-right text-xs tabular-nums font-semibold text-neutral-900 dark:text-neutral-100">{formatRupiah(p.total_harga_jual)}</td>
                <td class="px-4 py-2.5 text-right text-xs tabular-nums font-medium text-emerald-600 dark:text-emerald-400">+{formatRupiah(p.total_harga_jual - p.total_harga_modal)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <!-- Summary Info Strip (Plain text, not badges) -->
      {#if sortedPenjualan.length > 0}
        <div class="px-4 py-2.5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 flex flex-wrap items-center justify-between gap-x-6 gap-y-1.5 text-xs text-neutral-600 dark:text-neutral-400">
          <div class="flex flex-wrap items-center gap-x-6 gap-y-1">
            <span>Total Item: <strong class="text-neutral-900 dark:text-neutral-100 tabular-nums">{formatNumber(totalQty)} unit</strong></span>
            <span>Total Omzet: <strong class="text-neutral-900 dark:text-neutral-100 tabular-nums">{formatRupiah(totalOmzet)}</strong></span>
            <span>Total Laba Kotor: <strong class="text-emerald-600 dark:text-emerald-400 tabular-nums">+{formatRupiah(labaKotor)}</strong></span>
          </div>
        </div>
      {/if}

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
      <div class="overflow-x-auto max-h-[420px] overflow-y-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-500 uppercase font-mono text-[10px] tracking-wider sticky top-0 z-10">
              <th class="px-4 py-2.5">
                <button
                  type="button"
                  class="flex items-center gap-1 font-mono uppercase tracking-wider hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer select-none"
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
              <th class="px-4 py-2.5">
                <button
                  type="button"
                  class="flex items-center gap-1 font-mono uppercase tracking-wider hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer select-none"
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
              <th class="px-4 py-2.5 text-right">
                <button
                  type="button"
                  class="inline-flex items-center gap-1 font-mono uppercase tracking-wider hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer select-none ml-auto"
                  onclick={() => togglePengeluaranSort('jumlah_uang')}
                >
                  <span>Nominal Beban</span>
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
          <tbody class="divide-y divide-neutral-200/70 dark:divide-neutral-800/80">
            {#each paginatedPengeluaran as exp}
              <tr class="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30">
                <td class="px-4 py-2.5 text-neutral-500 text-xs whitespace-nowrap">{formatDateTime(exp.created_ms)}</td>
                <td class="px-4 py-2.5 font-medium text-neutral-900 dark:text-neutral-100 text-xs">{exp.deskripsi}</td>
                <td class="px-4 py-2.5 text-right text-xs tabular-nums font-semibold text-red-600 dark:text-red-400">-{formatRupiah(exp.jumlah_uang)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <!-- Summary Info Strip (Plain text, not badges) -->
      {#if sortedPengeluaran.length > 0}
        <div class="px-4 py-2.5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 flex flex-wrap items-center justify-between gap-x-6 gap-y-1.5 text-xs text-neutral-600 dark:text-neutral-400">
          <div class="flex flex-wrap items-center gap-x-6 gap-y-1">
            <span>Total Pengeluaran: <strong class="text-red-600 dark:text-red-400 tabular-nums">-{formatRupiah(totalPengeluaran)}</strong> ({sortedPengeluaran.length} beban)</span>
          </div>
        </div>
      {/if}

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
    <p class="text-sm font-semibold mt-0.5">LAPORAN KEUANGAN & LABA RUGI</p>
    <p class="text-xs mt-1">Periode: {formatTanggalIndo(startDate)} s/d {formatTanggalIndo(endDate)}</p>
    {#if auth.publicInfo.store_address}
      <p class="text-[10px] text-neutral-600">{auth.publicInfo.store_address}</p>
    {/if}
  </div>

  <div class="py-6 space-y-4">
    <table class="w-full text-xs border-collapse border border-black">
      <thead>
        <tr class="bg-neutral-100 border-b border-black">
          <th class="p-2 text-left font-bold">KOMPONEN KEUANGAN</th>
          <th class="p-2 text-right font-bold">NOMINAL (RP)</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-neutral-300">
        <tr>
          <td class="p-2 font-medium">Total Pendapatan Penjualan (Omzet)</td>
          <td class="p-2 text-right font-mono font-bold">{formatRupiah(totalOmzet)}</td>
        </tr>
        <tr>
          <td class="p-2 font-medium">Harga Pokok Penjualan (HPP)</td>
          <td class="p-2 text-right font-mono">({formatRupiah(totalHpp)})</td>
        </tr>
        <tr class="bg-neutral-50 font-bold">
          <td class="p-2">LABA KOTOR (GROSS PROFIT)</td>
          <td class="p-2 text-right font-mono">+{formatRupiah(labaKotor)}</td>
        </tr>
        <tr>
          <td class="p-2 font-medium">Total Beban & Pengeluaran Toko</td>
          <td class="p-2 text-right font-mono text-red-600">({formatRupiah(totalPengeluaran)})</td>
        </tr>
        <tr class="bg-neutral-100 font-bold text-sm border-t-2 border-black">
          <td class="p-2.5">LABA / RUGI BERSIH (NET PROFIT)</td>
          <td class="p-2.5 text-right font-mono">{formatRupiah(labaBersih)}</td>
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
