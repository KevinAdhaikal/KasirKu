<svelte:head>
    <title>KasirKu | Retur Barang</title>
</svelte:head>

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { api } from '../../api/api';
  import { toast } from '../../stores/toast.svelte';
  import { confirmDialog } from '../../stores/dialog.svelte';
  import { sse } from '../../stores/sse.svelte';
  import Button from '../../components/ui/Button.svelte';
  import Input from '../../components/ui/Input.svelte';
  import Modal from '../../components/ui/Modal.svelte';
  import Badge from '../../components/ui/Badge.svelte';
  import Skeleton from '../../components/ui/Skeleton.svelte';
  import DatePicker from '../../components/ui/DatePicker.svelte';
  import TablePagination from '../../components/ui/TablePagination.svelte';
  import {
    formatNumber,
    formatThousandSeparator,
    formatDate,
    getTanggalKey,
    formatTanggalIndo
  } from '../../utils/format';
  import {
    Undo2,
    Plus,
    Search,
    RefreshCw,
    Pencil,
    Trash2,
    Package,
    Boxes,
    FileText,
    AlertTriangle,
    CheckCircle2,
    ArrowUpDown,
    ArrowUp,
    ArrowDown
  } from 'lucide-svelte';

  export interface ReturBarangItem {
    id: number;
    nama_barang: string;
    deskripsi: string;
    jumlah_barang: number;
  }

  export interface SearchedBarang {
    id: number;
    nama_barang: string;
    stok_barang: number;
    barcode_barang: string | null;
    harga_modal: number;
    harga_jual: number;
  }

  // Date State
  let selectedDate = $state(formatDate(new Date()));
  const currentTanggalKey = $derived(getTanggalKey(selectedDate));

  // Records & Loading
  let returList = $state<ReturBarangItem[]>([]);
  let loading = $state(true);
  let isSubmitting = $state(false);

  // Modal State for New Entry
  let isAddModalOpen = $state(false);
  let productSearchQuery = $state('');
  let searchedProducts = $state<SearchedBarang[]>([]);
  let isSearchingProduct = $state(false);
  let selectedProduct = $state<SearchedBarang | null>(null);
  let formJumlah = $state<string | number>('');
  let formDeskripsi = $state('');
  let formErrorMessage = $state<string | null>(null);

  // Modal State for Edit Entry
  let isEditModalOpen = $state(false);
  let editId = $state<number | null>(null);
  let editNamaBarang = $state('');
  let editJumlah = $state<string | number>('');
  let editDeskripsi = $state('');
  let editErrorMessage = $state<string | null>(null);

  // Filter Table Search
  let filterTableQuery = $state('');

  async function loadReturList() {
    loading = true;
    try {
      const data = await api.get<ReturBarangItem[]>(`/api/retur_barang?tanggal_key=${currentTanggalKey}`);
      returList = Array.isArray(data) ? data : [];
    } catch (err: any) {
      toast.error('Gagal memuat histori retur barang: ' + (err.message || ''));
      returList = [];
    } finally {
      loading = false;
    }
  }

  // Product Search for Return Modal
  let searchTimeout: any = null;
  function handleSearchInput(query: string) {
    productSearchQuery = query;
    clearTimeout(searchTimeout);
    if (!query.trim()) {
      searchedProducts = [];
      return;
    }
    searchTimeout = setTimeout(async () => {
      isSearchingProduct = true;
      try {
        const res = await api.get<SearchedBarang[]>(
          `/api/cari_barang?barang=${encodeURIComponent(query.trim())}`
        );
        searchedProducts = Array.isArray(res) ? res : [];
      } catch {
        searchedProducts = [];
      } finally {
        isSearchingProduct = false;
      }
    }, 250);
  }

  // Form Error states
  let productError = $state<string | null>(null);
  let jumlahError = $state<string | null>(null);
  let deskripsiError = $state<string | null>(null);
  let editJumlahError = $state<string | null>(null);
  let editDeskripsiError = $state<string | null>(null);

  function openAddModal() {
    selectedProduct = null;
    productSearchQuery = '';
    searchedProducts = [];
    formJumlah = '';
    formDeskripsi = '';
    formErrorMessage = null;
    productError = null;
    jumlahError = null;
    deskripsiError = null;
    isAddModalOpen = true;
  }

  function selectProduct(p: SearchedBarang) {
    selectedProduct = p;
    productError = null;
    formErrorMessage = null;
  }

  async function handleSubmitAdd() {
    formErrorMessage = null;
    productError = null;
    jumlahError = null;
    deskripsiError = null;

    let hasError = false;

    if (!selectedProduct) {
      productError = 'Silakan pilih produk yang akan di-retur terlebih dahulu.';
      hasError = true;
    }

    const cleanJumlah = String(formJumlah).replace(/\./g, '').trim();
    if (!cleanJumlah || Number(cleanJumlah) <= 0) {
      jumlahError = 'Jumlah barang retur harus lebih dari 0.';
      hasError = true;
    } else if (selectedProduct && Number(cleanJumlah) > selectedProduct.stok_barang) {
      jumlahError = `Jumlah retur (${formatNumber(cleanJumlah)} unit) tidak boleh melebihi stok yang tersedia (${formatNumber(selectedProduct.stok_barang)} unit).`;
      hasError = true;
    }

    if (!formDeskripsi.trim()) {
      deskripsiError = 'Alasan retur / keterangan kerusakan produk wajib diisi.';
      hasError = true;
    }

    if (hasError) return;

    isSubmitting = true;
    try {
      const body = new URLSearchParams({
        barang_id: String(selectedProduct.id),
        deskripsi: formDeskripsi.trim(),
        jumlah_barang: cleanJumlah,
      });

      await api.post('/retur_barang', body);
      toast.success(`Berhasil mencatat retur ${formatThousandSeparator(cleanJumlah)} unit untuk "${selectedProduct.nama_barang}"!`);
      isAddModalOpen = false;
      await loadReturList();
    } catch (err: any) {
      formErrorMessage = err.message || 'Gagal mencatat retur barang.';
    } finally {
      isSubmitting = false;
    }
  }

  function openEditModal(item: ReturBarangItem) {
    editId = item.id;
    editNamaBarang = item.nama_barang;
    editJumlah = formatThousandSeparator(item.jumlah_barang);
    editDeskripsi = item.deskripsi;
    editErrorMessage = null;
    editJumlahError = null;
    editDeskripsiError = null;
    isEditModalOpen = true;
  }

  async function handleSubmitEdit() {
    editErrorMessage = null;
    editJumlahError = null;
    editDeskripsiError = null;

    if (!editId) return;

    let hasError = false;

    const cleanEditJumlah = String(editJumlah).replace(/\./g, '').trim();
    if (!cleanEditJumlah || Number(cleanEditJumlah) <= 0) {
      editJumlahError = 'Jumlah barang retur harus lebih dari 0.';
      hasError = true;
    }

    if (!editDeskripsi.trim()) {
      editDeskripsiError = 'Alasan / keterangan retur wajib diisi.';
      hasError = true;
    }

    if (hasError) return;

    isSubmitting = true;
    try {
      const body = new URLSearchParams({
        id: String(editId),
        tanggal_key: String(currentTanggalKey),
        deskripsi: editDeskripsi.trim(),
        jumlah_barang: cleanEditJumlah,
      });

      await api.patch('/retur_barang', body);
      toast.success(`Data retur barang berhasil diperbarui!`);
      isEditModalOpen = false;
      await loadReturList();
    } catch (err: any) {
      editErrorMessage = err.message || 'Gagal mengubah data retur.';
    } finally {
      isSubmitting = false;
    }
  }

  async function handleDelete(item: ReturBarangItem) {
    const confirmed = await confirmDialog.show({
      title: 'Hapus Catatan Retur Barang?',
      message: `Menghapus catatan retur "${item.nama_barang}" (${item.jumlah_barang} unit) akan secara otomatis mengembalikan (menambahkan kembali) stok barang sejumlah ${item.jumlah_barang} unit ke inventaris. Apakah Anda yakin?`,
      confirmLabel: 'Hapus & Kembalikan Stok',
      cancelLabel: 'Batal',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      const body = new URLSearchParams({
        id: String(item.id),
        tanggal_key: String(currentTanggalKey),
      });

      await api.delete('/retur_barang', body);
      toast.success(`Catatan retur berhasil dihapus dan stok telah dikembalikan ke inventaris.`);
      await loadReturList();
    } catch (err: any) {
      toast.error('Gagal menghapus retur: ' + (err.message || ''));
    }
  }

  // Date Presets
  function setToday() {
    selectedDate = formatDate(new Date());
    loadReturList();
  }

  function setYesterday() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    selectedDate = formatDate(d);
    loadReturList();
  }

  // SSE subscription
  let unsubscribeSse: (() => void) | null = null;
  onMount(() => {
    loadReturList();

    unsubscribeSse = sse.subscribe((msg) => {
      if (!msg) return;
      if (msg.type === 7) {
        // Retur Barang events
        loadReturList();
      }
    });
  });

  onDestroy(() => {
    if (unsubscribeSse) unsubscribeSse();
  });

  // Watch selectedDate change
  $effect(() => {
    if (selectedDate) {
      loadReturList();
    }
  });

  // Sorting State
  type SortKey = 'id' | 'nama_barang' | 'jumlah_barang' | 'deskripsi';
  let sortKey = $state<SortKey>('id');
  let sortDirection = $state<'asc' | 'desc'>('desc');

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortKey = key;
      sortDirection = 'asc';
    }
  }

  // Filtered & Sorted List
  const filteredList = $derived.by(() => {
    const q = filterTableQuery.toLowerCase().trim();
    let list = returList;
    if (q) {
      list = list.filter(
        (m) =>
          m.nama_barang.toLowerCase().includes(q) ||
          (m.deskripsi && m.deskripsi.toLowerCase().includes(q))
      );
    }
    return [...list].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (typeof valA === 'string' && typeof valB === 'string') {
        const cmp = valA.localeCompare(valB, 'id', { sensitivity: 'base' });
        return sortDirection === 'asc' ? cmp : -cmp;
      }
      return sortDirection === 'asc'
        ? (Number(valA) > Number(valB) ? 1 : -1)
        : (Number(valA) < Number(valB) ? 1 : -1);
    });
  });

  // Total Summary
  const totalFilteredUnits = $derived(
    filteredList.reduce((acc, item) => acc + (item.jumlah_barang || 0), 0)
  );

  // Pagination
  let currentPage = $state(1);
  let pageSize = $state(10);
  const paginatedList = $derived(
    filteredList.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  );
  const totalPages = $derived(Math.ceil(filteredList.length / pageSize) || 1);

  $effect(() => {
    void filterTableQuery;
    void selectedDate;
    currentPage = 1;
  });
</script>

<div class="space-y-4">
  <!-- Page Header -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800 pb-3">
    <div class="flex items-center gap-2.5">
      <h1 class="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
        <Undo2 class="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
        <span>Retur Barang</span>
      </h1>
    </div>

    <div class="flex items-center gap-2">
      <Button
        variant="secondary"
        size="sm"
        onclick={loadReturList}
        loading={loading}
        title="Refresh data retur"
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
        <span>Catat Retur Barang</span>
      </Button>
    </div>
  </div>

  <!-- Date Navigation Toolbar & Summary -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div class="flex items-center gap-2 flex-wrap">
        <DatePicker
          bind:value={selectedDate}
          placeholder="Pilih tanggal"
          align="left"
        />

      <div class="flex items-center gap-1">
        <Button variant="secondary" size="sm" onclick={setToday}>
          Hari Ini
        </Button>
        <Button variant="secondary" size="sm" onclick={setYesterday}>
          Kemarin
        </Button>
      </div>

      <span class="text-xs text-neutral-500 hidden md:inline ml-2">
        {formatTanggalIndo(selectedDate)}
      </span>
    </div>

  <!-- Search Filter on Records -->
  <div class="max-w-sm">
    <Input
      id="search-table-retur"
      bind:value={filterTableQuery}
      placeholder="Cari nama produk atau alasan retur…"
      clearable
      class="h-9 text-xs"
    >
      {#snippet prefix()}
        <Search class="w-3.5 h-3.5" />
      {/snippet}
    </Input>
  </div>
</div>

  <!-- Return Records Table -->
  <div class="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden">
    <table class="w-full text-left text-xs border-collapse">
      <thead>
        <tr class="border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-muted)] font-medium text-[11px]">
          <th class="py-2.5 px-4 w-20">
            <button
              type="button"
              class="flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors cursor-pointer select-none text-[11px] font-medium"
              onclick={() => toggleSort('id')}
            >
              <span>ID</span>
              {#if sortKey === 'id'}
                {#if sortDirection === 'asc'}
                  <ArrowUp class="w-3 h-3 text-[var(--brand)]" />
                {:else}
                  <ArrowDown class="w-3 h-3 text-[var(--brand)]" />
                {/if}
              {:else}
                <ArrowUpDown class="w-3 h-3 opacity-40" />
              {/if}
            </button>
          </th>
          <th class="py-2.5 px-4">
            <button
              type="button"
              class="flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors cursor-pointer select-none text-[11px] font-medium"
              onclick={() => toggleSort('nama_barang')}
            >
              <span>Nama Produk</span>
              {#if sortKey === 'nama_barang'}
                {#if sortDirection === 'asc'}
                  <ArrowUp class="w-3 h-3 text-[var(--brand)]" />
                {:else}
                  <ArrowDown class="w-3 h-3 text-[var(--brand)]" />
                {/if}
              {:else}
                <ArrowUpDown class="w-3 h-3 opacity-40" />
              {/if}
            </button>
          </th>
          <th class="py-2.5 px-4 text-right">
            <button
              type="button"
              class="inline-flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors cursor-pointer select-none ml-auto text-[11px] font-medium"
              onclick={() => toggleSort('jumlah_barang')}
            >
              <span>Jumlah Retur</span>
              {#if sortKey === 'jumlah_barang'}
                {#if sortDirection === 'asc'}
                  <ArrowUp class="w-3 h-3 text-[var(--brand)]" />
                {:else}
                  <ArrowDown class="w-3 h-3 text-[var(--brand)]" />
                {/if}
              {:else}
                <ArrowUpDown class="w-3 h-3 opacity-40" />
              {/if}
            </button>
          </th>
          <th class="py-2.5 px-4">
            <button
              type="button"
              class="flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors cursor-pointer select-none text-[11px] font-medium"
              onclick={() => toggleSort('deskripsi')}
            >
              <span>Alasan Retur / Kerusakan</span>
              {#if sortKey === 'deskripsi'}
                {#if sortDirection === 'asc'}
                  <ArrowUp class="w-3 h-3 text-[var(--brand)]" />
                {:else}
                  <ArrowDown class="w-3 h-3 text-[var(--brand)]" />
                {/if}
              {:else}
                <ArrowUpDown class="w-3 h-3 opacity-40" />
              {/if}
            </button>
          </th>
          <th class="py-2.5 px-4 text-center w-28">Aksi</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-[var(--border-subtle)]">
        {#if loading}
          {#each Array(4) as _}
            <tr>
              <td class="p-4"><Skeleton class="h-4 w-8" /></td>
              <td class="p-4"><Skeleton class="h-4 w-44" /></td>
              <td class="p-4 text-right"><Skeleton class="h-4 w-16 ml-auto" /></td>
              <td class="p-4"><Skeleton class="h-4 w-48" /></td>
              <td class="p-4 text-center"><Skeleton class="h-6 w-14 mx-auto" /></td>
            </tr>
          {/each}
        {:else if paginatedList.length === 0}
          <tr>
            <td colspan="5" class="py-12 text-center text-[var(--text-muted)]">
              <Undo2 class="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p class="font-medium text-xs">Tidak ada catatan retur barang pada tanggal ini.</p>
              <p class="text-[11px] mt-0.5 text-[var(--text-muted)]">Inventaris berjalan normal tanpa produk rusak atau cacat tercatat.</p>
            </td>
          </tr>
        {:else}
          {#each paginatedList as item (item.id)}
            <tr class="hover:bg-[var(--bg-hover)] transition-colors">
              <td class="py-3 px-4 text-[var(--text-muted)] text-xs tabular-nums">
                {item.id}
              </td>

              <td class="py-3 px-4">
                <div class="font-semibold text-[var(--text-primary)] text-xs sm:text-sm">
                  {item.nama_barang}
                </div>
              </td>

              <td class="py-3 px-4 text-right tabular-nums text-xs sm:text-sm">
                <span class="inline-flex items-center gap-1 font-semibold text-red-600 dark:text-red-400">
                  <Undo2 class="w-3.5 h-3.5" />
                  -{formatNumber(item.jumlah_barang)} unit
                </span>
              </td>

              <td class="py-3 px-4 text-[var(--text-secondary)] text-xs">
                {item.deskripsi}
              </td>

              <td class="py-3 px-4 text-center">
                <div class="flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    onclick={() => openEditModal(item)}
                    title="Ubah Rincian"
                    class="p-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-contrast)] hover:bg-[var(--bg-hover)] transition-colors flex items-center justify-center"
                  >
                    <Pencil class="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onclick={() => handleDelete(item)}
                    title="Hapus & Kembalikan Stok"
                    class="p-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex items-center justify-center"
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

    <!-- Pagination & Total Indicator with Limit -->
    <TablePagination
      bind:currentPage
      bind:pageSize
      totalItems={filteredList.length}
      currentItemsCount={paginatedList.length}
      itemLabel="data retur"
      storageKey="retur_barang_limit"
    />
  </div>
</div>

<!-- Modal Catat Retur Barang -->
<Modal
  open={isAddModalOpen}
  title="Catat Retur Barang / Kerusakan"
  size="xl"
  onclose={() => (isAddModalOpen = false)}
>
  <form novalidate onsubmit={(e) => { e.preventDefault(); handleSubmitAdd(); }} class="space-y-4">
    {#if formErrorMessage}
      <div class="p-3 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-500/30 text-red-700 dark:text-red-400 text-xs flex items-center gap-2">
        <AlertCircle class="w-4 h-4 shrink-0" />
        <span>{formErrorMessage}</span>
      </div>
    {/if}

    <!-- Product Search Box -->
    <div class="relative">
      <label for="retur-search-product" class="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5 select-none">
        Pilih Produk yang Di-retur <span class="text-red-500 dark:text-red-400 font-semibold ml-1">*</span>
      </label>
      <Input
        id="retur-search-product"
        value={productSearchQuery}
        oninput={(e) => {
          productError = null;
          handleSearchInput((e.target as HTMLInputElement).value);
        }}
        placeholder="Ketik nama produk atau scan barcode…"
        clearable
        autofocus={!selectedProduct}
        error={productError}
      >
        {#snippet prefix()}
          <Search class="w-4 h-4" />
        {/snippet}
      </Input>

      <!-- Autocomplete Dropdown List -->
      {#if isSearchingProduct}
        <div class="absolute left-0 right-0 top-full mt-1.5 z-40 p-3 text-xs text-neutral-400 text-center rounded-xl border border-neutral-200 dark:border-neutral-800 bg-[var(--bg-surface)] dark:bg-neutral-900 shadow-xl">
          Mencari produk di database…
        </div>
      {:else if searchedProducts.length > 0 && !selectedProduct}
        <div class="absolute left-0 right-0 top-full mt-1.5 z-40 max-h-56 overflow-y-auto rounded-xl border border-neutral-200/90 dark:border-neutral-800/90 bg-[var(--bg-surface)] dark:bg-neutral-900 shadow-xl divide-y divide-neutral-100 dark:divide-neutral-800/60">
          {#each searchedProducts as p}
            <button
              type="button"
              onclick={() => selectProduct(p)}
              class="w-full text-left px-3.5 py-2.5 hover:bg-[var(--bg-hover)] transition-colors flex items-center justify-between gap-3 cursor-pointer"
            >
              <div class="min-w-0 flex-1">
                <div class="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                  {p.nama_barang}
                </div>
                <div class="text-[11px] text-neutral-400 font-mono truncate">
                  {p.barcode_barang ? `Barcode: ${p.barcode_barang}` : 'Tanpa Barcode'}
                </div>
              </div>
              <div class="text-right shrink-0">
                <span class="text-xs font-mono font-medium text-neutral-700 dark:text-neutral-300 tabular-nums">
                  Stok: {formatNumber(p.stok_barang)} unit
                </span>
              </div>
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Selected Product Card -->
    {#if selectedProduct}
      <div class="p-3.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/60 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-md bg-[var(--brand)] text-[var(--accent-fg)] flex items-center justify-center font-bold text-sm">
            <Package class="w-4 h-4" />
          </div>
          <div>
            <div class="font-semibold text-neutral-900 dark:text-neutral-100 text-xs">
              {selectedProduct.nama_barang}
            </div>
            <div class="text-[11px] text-neutral-500 font-mono">
              Stok Gudang: <strong>{formatNumber(selectedProduct.stok_barang)} unit</strong>
            </div>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onclick={() => { selectedProduct = null; searchedProducts = []; }}
        >
          Ganti Produk
        </Button>
      </div>
    {/if}

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <!-- Jumlah Retur -->
      <div>
        <Input
          id="retur-jumlah"
          label="Jumlah Kuantitas Retur"
          type="text"
          numericOnly
          thousandSeparator
          bind:value={formJumlah}
          placeholder="0"
          required
          error={jumlahError}
          oninput={() => {
            const clean = String(formJumlah).replace(/\./g, '').trim();
            if (clean && Number(clean) > 0) {
              if (selectedProduct && Number(clean) > selectedProduct.stok_barang) {
                jumlahError = `Jumlah retur (${formatNumber(clean)} unit) tidak boleh melebihi stok yang tersedia (${formatNumber(selectedProduct.stok_barang)} unit).`;
              } else {
                jumlahError = null;
              }
            }
          }}
          onblur={() => {
            const clean = String(formJumlah).replace(/\./g, '').trim();
            if (!clean || Number(clean) <= 0) {
              jumlahError = 'Jumlah barang retur harus lebih dari 0.';
            } else if (selectedProduct && Number(clean) > selectedProduct.stok_barang) {
              jumlahError = `Jumlah retur (${formatNumber(clean)} unit) tidak boleh melebihi stok yang tersedia (${formatNumber(selectedProduct.stok_barang)} unit).`;
            }
          }}
        >
          {#snippet prefix()}
            <Boxes class="w-4 h-4" />
          {/snippet}
        </Input>
      </div>

      <!-- Live Stock Preview -->
      {#if selectedProduct}
        {@const parsedRetur = Number(String(formJumlah).replace(/\./g, '')) || 0}
        <div class="flex flex-col justify-center">
          <span class="text-[11px] text-neutral-500">Sisa Stok Akhir:</span>
          <div class="text-sm font-bold font-mono text-neutral-900 dark:text-neutral-100 tabular-nums">
            {formatNumber(selectedProduct.stok_barang)} - {formatNumber(parsedRetur)} = 
            <span class="{selectedProduct.stok_barang - parsedRetur < 0 ? 'text-red-500 dark:text-red-400 font-bold' : 'text-amber-600 dark:text-amber-400'}">
              {formatNumber(selectedProduct.stok_barang - parsedRetur)} unit
            </span>
          </div>
        </div>
      {/if}
    </div>

    <!-- Deskripsi / Alasan Retur -->
    <div>
      <Input
        id="retur-deskripsi"
        label="Alasan Retur / Kerusakan"
        bind:value={formDeskripsi}
        placeholder="Contoh: Kemasan sobek saat pengiriman, Produk bocor, Kadaluwarsa"
        required
        error={deskripsiError}
        oninput={() => {
          if (formDeskripsi.trim()) deskripsiError = null;
        }}
        onblur={() => {
          if (!formDeskripsi.trim()) deskripsiError = 'Alasan retur / keterangan kerusakan produk wajib diisi.';
        }}
      >
        {#snippet prefix()}
          <FileText class="w-4 h-4" />
        {/snippet}
      </Input>
    </div>

    <div class="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
      <Button
        type="button"
        variant="secondary"
        onclick={() => (isAddModalOpen = false)}
      >
        Batal
      </Button>

      <Button
        type="submit"
        variant="primary"
        loading={isSubmitting}
      >
        <CheckCircle2 class="w-4 h-4" />
        <span>Konfirmasi Retur Barang</span>
      </Button>
    </div>
  </form>
</Modal>

<!-- Modal Edit Retur Barang -->
<Modal
  open={isEditModalOpen}
  title="Ubah Data Retur Barang"
  size="lg"
  onclose={() => (isEditModalOpen = false)}
>
  <form novalidate onsubmit={(e) => { e.preventDefault(); handleSubmitEdit(); }} class="space-y-4">
    {#if editErrorMessage}
      <div class="p-3 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-500/30 text-red-700 dark:text-red-400 text-xs flex items-center gap-2">
        <AlertCircle class="w-4 h-4 shrink-0" />
        <span>{editErrorMessage}</span>
      </div>
    {/if}

    <div class="p-3 rounded-md bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs">
      <span class="text-neutral-500">Nama Produk:</span>
      <div class="font-semibold text-neutral-900 dark:text-neutral-100 text-sm mt-0.5">
        {editNamaBarang}
      </div>
    </div>

    <div>
      <Input
        id="edit-retur-jumlah"
        label="Jumlah Kuantitas Retur"
        type="text"
        numericOnly
        thousandSeparator
        bind:value={editJumlah}
        placeholder="0"
        required
        autofocus
        error={editJumlahError}
        oninput={() => {
          const clean = String(editJumlah).replace(/\./g, '').trim();
          if (clean && Number(clean) > 0) editJumlahError = null;
        }}
        onblur={() => {
          const clean = String(editJumlah).replace(/\./g, '').trim();
          if (!clean || Number(clean) <= 0) editJumlahError = 'Jumlah barang retur harus lebih dari 0.';
        }}
      >
        {#snippet prefix()}
          <Boxes class="w-4 h-4" />
        {/snippet}
      </Input>
    </div>

    <div>
      <Input
        id="edit-retur-deskripsi"
        label="Alasan Retur / Kerusakan"
        bind:value={editDeskripsi}
        placeholder="Alasan retur barang"
        required
        error={editDeskripsiError}
        oninput={() => {
          if (editDeskripsi.trim()) editDeskripsiError = null;
        }}
        onblur={() => {
          if (!editDeskripsi.trim()) editDeskripsiError = 'Alasan retur / keterangan kerusakan produk wajib diisi.';
        }}
      >
        {#snippet prefix()}
          <FileText class="w-4 h-4" />
        {/snippet}
      </Input>
    </div>

    <div class="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
      <Button
        type="button"
        variant="secondary"
        onclick={() => (isEditModalOpen = false)}
      >
        Batal
      </Button>

      <Button
        type="submit"
        variant="primary"
        loading={isSubmitting}
      >
        <CheckCircle2 class="w-4 h-4" />
        <span>Simpan Perubahan</span>
      </Button>
    </div>
  </form>
</Modal>
