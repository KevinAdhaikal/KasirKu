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
  import {
    formatNumber,
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
    CheckCircle2
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
  let formJumlah = $state<number>(1);
  let formDeskripsi = $state('');
  let formErrorMessage = $state<string | null>(null);

  // Modal State for Edit Entry
  let isEditModalOpen = $state(false);
  let editId = $state<number | null>(null);
  let editNamaBarang = $state('');
  let editJumlah = $state<number>(1);
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

    if (!formJumlah || Number(formJumlah) <= 0) {
      jumlahError = 'Jumlah barang retur harus lebih dari 0.';
      hasError = true;
    } else if (selectedProduct && Number(formJumlah) > selectedProduct.stok_barang) {
      jumlahError = `Jumlah retur (${formJumlah} unit) tidak boleh melebihi stok yang tersedia (${selectedProduct.stok_barang} unit).`;
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
        jumlah_barang: String(formJumlah),
      });

      await api.post('/retur_barang', body);
      toast.success(`Berhasil mencatat retur ${formJumlah} unit untuk "${selectedProduct.nama_barang}"!`);
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
    editJumlah = item.jumlah_barang;
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

    if (!editJumlah || Number(editJumlah) <= 0) {
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
        jumlah_barang: String(editJumlah),
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

  // Filtered List
  const filteredList = $derived.by(() => {
    const q = filterTableQuery.toLowerCase().trim();
    if (!q) return returList;
    return returList.filter(
      (m) =>
        m.nama_barang.toLowerCase().includes(q) ||
        (m.deskripsi && m.deskripsi.toLowerCase().includes(q))
    );
  });

  // Total Summary
  const totalUnitsRetur = $derived(
    returList.reduce((acc, item) => acc + (item.jumlah_barang || 0), 0)
  );
</script>

<div class="space-y-6">
  <!-- Page Header -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-5">
    <div>
      <div class="flex items-center gap-2">
        <h1 class="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <Undo2 class="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
          Retur Barang
        </h1>
      </div>
      <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
        Pencatatan barang cacat, expired, atau dikembalikan dengan pengurangan stok inventaris otomatis.
      </p>
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
  <div class="p-3.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-[var(--bg-surface)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

    <!-- Summary Badges -->
    <div class="flex items-center gap-3 self-end sm:self-auto text-xs font-mono">
      <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
        <span class="text-neutral-500">Total Transaksi:</span>
        <strong class="text-neutral-900 dark:text-neutral-100">{returList.length}</strong>
      </div>

      <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 bg-red-50/50 dark:bg-red-950/20 text-red-700 dark:text-red-400">
        <span>Unit Retur:</span>
        <strong class="tabular-nums">-{formatNumber(totalUnitsRetur)} unit</strong>
      </div>
    </div>
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

  <!-- Return Records Table -->
  <div class="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-[var(--bg-surface)] overflow-hidden shadow-2xs">
    <table class="w-full text-left text-xs border-collapse">
      <thead>
        <tr class="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/50 text-neutral-500 uppercase font-mono text-[10px] tracking-wider">
          <th class="py-2.5 px-4 w-16">ID</th>
          <th class="py-2.5 px-4">Nama Produk</th>
          <th class="py-2.5 px-4 text-right">Jumlah Retur</th>
          <th class="py-2.5 px-4">Alasan Retur / Kerusakan</th>
          <th class="py-2.5 px-4 text-center w-28">Aksi</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-neutral-200/70 dark:divide-neutral-800/80">
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
        {:else if filteredList.length === 0}
          <tr>
            <td colspan="5" class="py-12 text-center text-neutral-400 dark:text-neutral-500">
              <Undo2 class="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p class="font-medium text-xs">Tidak ada catatan retur barang pada tanggal ini.</p>
              <p class="text-[11px] mt-0.5">Inventaris berjalan normal tanpa produk rusak atau cacat tercatat.</p>
            </td>
          </tr>
        {:else}
          {#each filteredList as item (item.id)}
            <tr class="hover:bg-neutral-50/70 dark:hover:bg-neutral-900/40 transition-colors">
              <td class="py-3 px-4 font-mono text-neutral-400 text-[11px]">
                #{item.id}
              </td>

              <td class="py-3 px-4">
                <div class="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
                  {item.nama_barang}
                </div>
              </td>

              <td class="py-3 px-4 text-right font-mono tabular-nums">
                <span class="inline-flex items-center gap-1 font-bold text-red-600 dark:text-red-400">
                  <Undo2 class="w-3.5 h-3.5" />
                  -{formatNumber(item.jumlah_barang)} unit
                </span>
              </td>

              <td class="py-3 px-4 text-neutral-600 dark:text-neutral-400">
                {item.deskripsi}
              </td>

              <td class="py-3 px-4 text-center">
                <div class="flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    onclick={() => openEditModal(item)}
                    title="Ubah Rincian"
                    class="p-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 shadow-2xs transition-all flex items-center justify-center"
                  >
                    <Pencil class="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onclick={() => handleDelete(item)}
                    title="Hapus & Kembalikan Stok"
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
</div>

<!-- Modal Catat Retur Barang -->
<Modal
  open={isAddModalOpen}
  title="Catat Retur Barang / Kerusakan"
  description="Pilih produk yang rusak atau expired. Stok inventaris akan berkurang secara otomatis."
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
    <div>
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
        <div class="p-3 text-xs text-neutral-400 text-center">
          Mencari produk di database…
        </div>
      {:else if searchedProducts.length > 0 && !selectedProduct}
        <div class="mt-2 max-h-48 overflow-y-auto rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-800 shadow-sm">
          {#each searchedProducts as p}
            <button
              type="button"
              onclick={() => selectProduct(p)}
              class="w-full text-left p-2.5 hover:bg-[var(--bg-hover)] transition-colors flex items-center justify-between"
            >
              <div>
                <div class="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                  {p.nama_barang}
                </div>
                <div class="text-[11px] text-neutral-400 font-mono">
                  {p.barcode_barang ? `Barcode: ${p.barcode_barang}` : 'Tanpa Barcode'}
                </div>
              </div>
              <div class="text-right">
                <span class="text-xs font-mono font-medium text-neutral-700 dark:text-neutral-300">
                  Stok saat ini: {p.stok_barang} unit
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
              Stok Gudang: <strong>{selectedProduct.stok_barang} unit</strong>
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
          bind:value={formJumlah}
          placeholder="0"
          required
          error={jumlahError}
          oninput={() => {
            if (formJumlah && Number(formJumlah) > 0) jumlahError = null;
          }}
          onblur={() => {
            if (!formJumlah || Number(formJumlah) <= 0) {
              jumlahError = 'Jumlah barang retur harus lebih dari 0.';
            } else if (selectedProduct && Number(formJumlah) > selectedProduct.stok_barang) {
              jumlahError = `Jumlah retur (${formJumlah} unit) tidak boleh melebihi stok yang tersedia (${selectedProduct.stok_barang} unit).`;
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
        <div class="flex flex-col justify-center">
          <span class="text-[11px] text-neutral-500">Sisa Stok Akhir:</span>
          <div class="text-sm font-bold font-mono text-neutral-900 dark:text-neutral-100 tabular-nums">
            {selectedProduct.stok_barang} - {formJumlah || 0} = <span class="text-red-600 dark:text-red-400">{Math.max(0, selectedProduct.stok_barang - (Number(formJumlah) || 0))} unit</span>
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
  description="Perbarui jumlah kuantitas retur atau alasan kerusakan. Selisih stok akan otomatis disinkronkan ke inventaris."
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
        bind:value={editJumlah}
        placeholder="0"
        required
        error={editJumlahError}
        oninput={() => {
          if (editJumlah && Number(editJumlah) > 0) editJumlahError = null;
        }}
        onblur={() => {
          if (!editJumlah || Number(editJumlah) <= 0) editJumlahError = 'Jumlah barang retur harus lebih dari 0.';
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
