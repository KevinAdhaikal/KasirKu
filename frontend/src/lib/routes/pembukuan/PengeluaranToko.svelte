<svelte:head>
    <title>KasirKu | Pengeluaran (Pembukuan)</title>
</svelte:head>

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { api } from '../../api/api';
  import { auth, Permissions } from '../../stores/auth.svelte';
  import { toast } from '../../stores/toast.svelte';
  import { confirmDialog } from '../../stores/dialog.svelte';
  import { sse } from '../../stores/sse.svelte';
  import Button from '../../components/ui/Button.svelte';
  import Input from '../../components/ui/Input.svelte';
  import Modal from '../../components/ui/Modal.svelte';
  import Skeleton from '../../components/ui/Skeleton.svelte';
  import DatePicker from '../../components/ui/DatePicker.svelte';
  import {
    formatRupiah,
    formatRupiahInput,
    formatNumber,
    parseNumber,
    formatDate,
    formatDateTime,
    formatTanggalKey,
    getTanggalKey
  } from '../../utils/format';
  import {
    TrendingDown,
    Plus,
    Search,
    RefreshCw,
    Pencil,
    Trash2,
    Calendar,
    DollarSign,
    Receipt,
    AlertCircle,
    CheckCircle2,
    Clock,
    FileText,
    ArrowUpDown
  } from 'lucide-svelte';

  export interface PengeluaranItem {
    id: number;
    tipe: number;
    deskripsi: string;
    jumlah_uang: number;
    referensi_id: number | null;
    tanggal_key: number;
    created_ms: number;
    modified_ms: number;
  }

  let pengeluaranList = $state<PengeluaranItem[]>([]);
  let loading = $state(true);
  let searchQuery = $state('');

  // Date range filter
  const todayDateStr = formatDate(new Date());
  let filterPreset = $state<'today' | 'week' | 'month' | 'custom'>('today');
  let startDate = $state(todayDateStr);
  let endDate = $state(todayDateStr);

  // Sorting
  let sortField = $state<'created_ms' | 'jumlah_uang' | 'deskripsi'>('created_ms');
  let sortAsc = $state(false);

  // Modal State
  let isModalOpen = $state(false);
  let isEditing = $state(false);
  let editingId = $state<number | null>(null);
  let editingTanggalKey = $state<number | null>(null);
  let formDeskripsi = $state('');
  let formNominal = $state('');
  let isSubmitting = $state(false);
  let formErrorMessage = $state<string | null>(null);

  const presets = [10000, 20000, 50000, 100000, 200000, 500000];

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
      if (startKey === endKey) {
        res = await api.get(`/api/pengeluaran?tanggal_key=${startKey}`);
      } else {
        res = await api.get(`/api/pengeluaran?tanggal_start=${startKey}&tanggal_end=${endKey}`);
      }

      const list = typeof res === 'string' ? JSON.parse(res) : (Array.isArray(res) ? res : []);
      pengeluaranList = list;
    } catch (err: any) {
      toast.error('Gagal memuat daftar pengeluaran: ' + (err.message || ''));
      pengeluaranList = [];
    } finally {
      loading = false;
    }
  }

  function openAddModal() {
    isEditing = false;
    editingId = null;
    editingTanggalKey = null;
    formDeskripsi = '';
    formNominal = '';
    formErrorMessage = null;
    deskripsiError = null;
    nominalError = null;
    isModalOpen = true;
  }

  function openEditModal(item: PengeluaranItem) {
    isEditing = true;
    editingId = item.id;
    editingTanggalKey = item.tanggal_key;
    formDeskripsi = item.deskripsi || '';
    formNominal = formatRupiahInput(item.jumlah_uang);
    formErrorMessage = null;
    deskripsiError = null;
    nominalError = null;
    isModalOpen = true;
  }

  function setPreset(val: number) {
    formNominal = formatRupiahInput(val);
    nominalError = null;
  }

  async function handleSave() {
    formErrorMessage = null;
    deskripsiError = null;
    nominalError = null;

    const nominalNum = parseNumber(formNominal);
    let hasError = false;

    if (!formDeskripsi.trim()) {
      deskripsiError = 'Keterangan pengeluaran wajib diisi.';
      hasError = true;
    }

    if (nominalNum <= 0) {
      nominalError = 'Nominal pengeluaran harus lebih besar dari Rp0,00.';
      hasError = true;
    }

    if (hasError) return;

    isSubmitting = true;
    try {
      if (isEditing && editingId && editingTanggalKey) {
        const params = new URLSearchParams({
          id: String(editingId),
          tanggal_key: String(editingTanggalKey),
          deskripsi: formDeskripsi.trim(),
          nominal: String(nominalNum),
        });
        await api.patch('/pengeluaran', params);
        toast.success('Data pengeluaran berhasil diperbarui.');
      } else {
        const params = new URLSearchParams({
          deskripsi: formDeskripsi.trim(),
          nominal: String(nominalNum),
        });
        await api.post('/pengeluaran', params);
        toast.success(`Pengeluaran sebesar ${formatRupiah(nominalNum)} berhasil dicatat.`);
      }

      isModalOpen = false;
      fetchData();
    } catch (err: any) {
      formErrorMessage = err.message || 'Gagal menyimpan pengeluaran.';
    } finally {
      isSubmitting = false;
    }
  }

  async function handleDelete(item: PengeluaranItem) {
    const confirmed = await confirmDialog({
      title: 'Hapus Catatan Pengeluaran?',
      message: `Apakah Anda yakin ingin menghapus pengeluaran "${item.deskripsi}" senilai ${formatRupiah(item.jumlah_uang)}? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Ya, Hapus Pengeluaran',
      cancelText: 'Batal',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      const params = new URLSearchParams({
        id: String(item.id),
        tanggal_key: String(item.tanggal_key),
      });
      await api.delete('/pengeluaran', params);
      toast.success('Pengeluaran berhasil dihapus.');
      fetchData();
    } catch (err: any) {
      toast.error('Gagal menghapus pengeluaran: ' + (err.message || ''));
    }
  }

  function toggleSort(field: typeof sortField) {
    if (sortField === field) {
      sortAsc = !sortAsc;
    } else {
      sortField = field;
      sortAsc = false;
    }
  }

  // Filtered & Sorted
  let filteredList = $derived.by(() => {
    let list = [...pengeluaranList];
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(item => item.deskripsi && item.deskripsi.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      let va = a[sortField] ?? 0;
      let vb = b[sortField] ?? 0;
      if (typeof va === 'string') va = (va as string).toLowerCase();
      if (typeof vb === 'string') vb = (vb as string).toLowerCase();
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });

    return list;
  });

  // KPI Metrics
  let totalCatatan = $derived(filteredList.length);
  let totalNominal = $derived(filteredList.reduce((sum, item) => sum + (Number(item.jumlah_uang) || 0), 0));
  let avgNominal = $derived(totalCatatan > 0 ? Math.round(totalNominal / totalCatatan) : 0);
  let maxNominal = $derived(filteredList.reduce((max, item) => Math.max(max, Number(item.jumlah_uang) || 0), 0));

  // SSE real-time sync
  let unsubscribeSSE: (() => void) | null = null;

  onMount(() => {
    fetchData();

    unsubscribeSSE = sse.subscribe((event) => {
      // type 5 is PENGELUARAN event (TAMBAH_PENGELUARAN, UPDATE_PENGELUARAN, DELETE_PENGELUARAN)
      if (event.type === 5) {
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
    <div>
      <h1 class="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
        <TrendingDown class="w-5 h-5 text-red-500" />
        <span>Pengeluaran</span>
      </h1>
      <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
        Pencatatan beban operasional toko, belanja perlengkapan, dan pelaporan kas keluar.
      </p>
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
        onclick={openAddModal}
      >
        <Plus class="w-4 h-4" />
        <span>Catat Pengeluaran</span>
      </Button>
    </div>
  </div>

  <!-- Summary Metric Cards (4 KPI Cards) -->
  <!--
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
    <div class="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-[var(--bg-surface)] shadow-xs flex items-center justify-between">
      <div>
        <span class="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Total Catatan</span>
        <div class="text-xl font-bold font-mono text-neutral-900 dark:text-neutral-100 tabular-nums mt-1">
          {formatNumber(totalCatatan)} <span class="text-xs font-normal text-neutral-400">transaksi</span>
        </div>
      </div>
      <div class="w-9 h-9 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300">
        <Receipt class="w-4 h-4" />
      </div>
    </div>

    <div class="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-[var(--bg-surface)] shadow-xs flex items-center justify-between">
      <div>
        <span class="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Total Beban Keluar</span>
        <div class="text-xl font-bold font-mono text-red-600 dark:text-red-400 tabular-nums mt-1">
          -{formatRupiah(totalNominal)}
        </div>
      </div>
      <div class="w-9 h-9 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-500/20 flex items-center justify-center text-red-600 dark:text-red-400">
        <TrendingDown class="w-4 h-4" />
      </div>
    </div>

    <div class="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-[var(--bg-surface)] shadow-xs flex items-center justify-between">
      <div>
        <span class="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Rata-rata Pengeluaran</span>
        <div class="text-xl font-bold font-mono text-neutral-900 dark:text-neutral-100 tabular-nums mt-1">
          {formatRupiah(avgNominal)}
        </div>
      </div>
      <div class="w-9 h-9 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300">
        <DollarSign class="w-4 h-4" />
      </div>
    </div>

    <div class="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-[var(--bg-surface)] shadow-xs flex items-center justify-between">
      <div>
        <span class="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Nominal Terbesar</span>
        <div class="text-xl font-bold font-mono text-neutral-900 dark:text-neutral-100 tabular-nums mt-1">
          {formatRupiah(maxNominal)}
        </div>
      </div>
      <div class="w-9 h-9 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300">
        <AlertCircle class="w-4 h-4" />
      </div>
    </div>
  </div>
  -->

  <!-- Filter & Controls Toolbar -->
  <div class="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-[var(--bg-surface)] shadow-xs space-y-3">
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

      <!-- Custom Date Range -->
      <div class="flex items-center gap-2 text-xs">
        <div class="flex items-center gap-1.5">
          <DatePicker
            bind:value={startDate}
            max={endDate}
            placeholder="Mulai tanggal"
            align="left"
            onchange={() => { filterPreset = 'custom'; fetchData(); }}
          />
          <span class="text-neutral-400">s/d</span>
          <DatePicker
            bind:value={endDate}
            min={startDate}
            placeholder="Sampai tanggal"
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
        placeholder="Cari deskripsi atau keperluan pengeluaran..."
        clearable
      >
        {#snippet prefix()}
          <Search class="w-4 h-4 text-neutral-400" />
        {/snippet}
      </Input>
    </div>
  </div>

  <!-- Expenses Table Card -->
  <div class="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-[var(--bg-surface)] shadow-xs overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full text-left text-xs border-collapse">
        <thead>
          <tr class="border-b border-neutral-200 dark:border-neutral-800 bg-[var(--bg-subtle)]/60 text-neutral-500 font-mono text-[11px]">
            <th class="px-4 py-3 font-medium cursor-pointer select-none" onclick={() => toggleSort('created_ms')}>
              <div class="flex items-center gap-1">
                <span>WAKTU / TANGGAL</span>
                <ArrowUpDown class="w-3 h-3 text-neutral-400" />
              </div>
            </th>
            <th class="px-4 py-3 font-medium cursor-pointer select-none" onclick={() => toggleSort('deskripsi')}>
              <div class="flex items-center gap-1">
                <span>KETERANGAN / KEPERLUAN</span>
                <ArrowUpDown class="w-3 h-3 text-neutral-400" />
              </div>
            </th>
            <th class="px-4 py-3 font-medium text-right cursor-pointer select-none" onclick={() => toggleSort('jumlah_uang')}>
              <div class="flex items-center justify-end gap-1">
                <span>NOMINAL BIAYA</span>
                <ArrowUpDown class="w-3 h-3 text-neutral-400" />
              </div>
            </th>
            <th class="px-4 py-3 font-medium text-center">AKSI</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-neutral-200/70 dark:divide-neutral-800/80">
          {#if loading}
            {#each Array(5) as _}
              <tr class="h-12">
                <td class="px-4 py-3"><Skeleton class="h-4 w-32" /></td>
                <td class="px-4 py-3"><Skeleton class="h-4 w-60" /></td>
                <td class="px-4 py-3"><Skeleton class="h-4 w-28 ml-auto" /></td>
                <td class="px-4 py-3"><Skeleton class="h-4 w-16 mx-auto" /></td>
              </tr>
            {/each}
          {:else if filteredList.length === 0}
            <tr>
              <td colspan="4" class="px-4 py-12 text-center text-neutral-400">
                <TrendingDown class="w-8 h-8 text-neutral-300 dark:text-neutral-700 mx-auto mb-2" />
                <p class="font-medium text-neutral-600 dark:text-neutral-400">Tidak ada data pengeluaran operasional</p>
                <p class="text-[11px] text-neutral-400 mt-0.5">
                  {searchQuery ? `Tidak ditemukan pengeluaran dengan kata kunci "${searchQuery}"` : `Tidak ada pengeluaran pada rentang tanggal ${startDate} s/d ${endDate}`}
                </p>
              </td>
            </tr>
          {:else}
            {#each filteredList as item (item.id)}
              <tr class="hover:bg-neutral-50/60 dark:hover:bg-neutral-900/40 transition-colors">
                <!-- Waktu -->
                <td class="px-4 py-3 font-mono text-neutral-500 text-[11px] whitespace-nowrap">
                  {formatDateTime(item.created_ms)}
                </td>

                <!-- Deskripsi -->
                <td class="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">
                  <div class="flex items-center gap-2">
                    <FileText class="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span>{item.deskripsi}</span>
                  </div>
                </td>

                <!-- Nominal -->
                <td class="px-4 py-3 text-right font-mono font-bold text-red-600 dark:text-red-400 tabular-nums">
                  -{formatRupiah(item.jumlah_uang)}
                </td>

                <!-- Aksi -->
                <td class="px-4 py-3 text-center">
                  <div class="flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      onclick={() => openEditModal(item)}
                      title="Edit Pengeluaran"
                      class="p-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 shadow-2xs transition-all flex items-center justify-center"
                    >
                      <Pencil class="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onclick={() => handleDelete(item)}
                      title="Hapus Pengeluaran"
                      class="p-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/40 shadow-2xs transition-all flex items-center justify-center"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>

    <!-- Table Footer Count -->
    <div class="px-4 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-[var(--bg-subtle)]/60 flex items-center justify-between text-xs text-neutral-500">
      <span>Menampilkan {formatNumber(filteredList.length)} dari {formatNumber(pengeluaranList.length)} total pengeluaran</span>
      <span class="font-mono font-bold text-red-600 dark:text-red-400 tabular-nums">
        Total Beban: -{formatRupiah(totalNominal)}
      </span>
    </div>
  </div>
</div>

<!-- Modal Catat / Edit Pengeluaran -->
<Modal
  open={isModalOpen}
  title={isEditing ? 'Ubah Catatan Pengeluaran' : 'Catat Pengeluaran Baru'}
  description="Masukkan rincian biaya operasional yang dikeluarkan kasir / toko."
  size="lg"
  onclose={() => (isModalOpen = false)}
>
  <form novalidate onsubmit={(e) => { e.preventDefault(); handleSave(); }} class="space-y-4">
    {#if formErrorMessage}
      <div class="p-3 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-500/30 text-red-700 dark:text-red-400 text-xs flex items-center gap-2">
        <AlertCircle class="w-4 h-4 shrink-0" />
        <span>{formErrorMessage}</span>
      </div>
    {/if}

    <!-- Deskripsi Pengeluaran -->
    <div>
      <Input
        id="pengeluaran-desc"
        label="Keterangan / Keperluan Pengeluaran"
        bind:value={formDeskripsi}
        placeholder="Contoh: Beli kantong plastik, bayar token listrik, air galon"
        required
        autofocus
        error={deskripsiError}
        oninput={() => {
          if (formDeskripsi.trim()) deskripsiError = null;
        }}
        onblur={() => {
          if (!formDeskripsi.trim()) deskripsiError = 'Keterangan pengeluaran wajib diisi.';
        }}
      >
        {#snippet prefix()}
          <Receipt class="w-4 h-4" />
        {/snippet}
      </Input>
    </div>

    <!-- Nominal Pengeluaran -->
    <div>
      <Input
        id="pengeluaran-nominal"
        label="Nominal Pengeluaran"
        type="currency"
        bind:value={formNominal}
        placeholder="0"
        required
        error={nominalError}
        oninput={() => {
          if (parseNumber(formNominal) > 0) nominalError = null;
        }}
        onblur={() => {
          if (parseNumber(formNominal) <= 0) nominalError = 'Nominal pengeluaran harus lebih besar dari Rp0,00.';
        }}
      />
      {#if parseNumber(formNominal) > 0}
        <p class="text-xs font-mono text-neutral-500 dark:text-neutral-400 mt-1.5">
          Terbilang: <span class="font-semibold text-neutral-900 dark:text-neutral-100">{formatRupiah(parseNumber(formNominal))}</span>
        </p>
      {/if}
    </div>

    <!-- Quick Presets -->
    <div>
      <span class="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">Pilihan Cepat Nominal:</span>
      <div class="flex flex-wrap gap-1.5">
        {#each presets as p}
          <button
            type="button"
            class="px-2.5 py-1 text-xs font-mono rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-[var(--bg-hover)] text-neutral-800 dark:text-neutral-200 transition-colors"
            onclick={() => setPreset(p)}
          >
            {formatRupiah(p)}
          </button>
        {/each}
      </div>
    </div>

    <!-- Modal Footer Actions -->
    <div class="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
      <Button
        type="button"
        variant="secondary"
        onclick={() => (isModalOpen = false)}
      >
        Batal
      </Button>

      <Button
        type="submit"
        variant="primary"
        loading={isSubmitting}
      >
        <CheckCircle2 class="w-4 h-4" />
        <span>{isEditing ? 'Simpan Perubahan' : 'Simpan Pengeluaran'}</span>
      </Button>
    </div>
  </form>
</Modal>
