<svelte:head>
    <title>KasirKu | Kategori Barang</title>
</svelte:head>

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { api } from '../../api/api';
  import { toast } from '../../stores/toast.svelte';
  import { confirmDialog } from '../../stores/dialog.svelte';
  import { router } from '../../stores/router.svelte';
  import { sse } from '../../stores/sse.svelte';
  import Button from '../../components/ui/Button.svelte';
  import Input from '../../components/ui/Input.svelte';
  import Select from '../../components/ui/Select.svelte';
  import Modal from '../../components/ui/Modal.svelte';
  import Badge from '../../components/ui/Badge.svelte';
  import Skeleton from '../../components/ui/Skeleton.svelte';
  import TablePagination from '../../components/ui/TablePagination.svelte';
  import { formatNumber, formatDateTime } from '../../utils/format';
  import {
    Tag,
    Plus,
    Search,
    RefreshCw,
    Pencil,
    Trash2,
    Package,
    Shield,
    FolderKanban,
    AlertCircle,
    CheckCircle2,
    ArrowUpDown,
    ArrowUp,
    ArrowDown
  } from 'lucide-svelte';

  export interface KategoriItem {
    id: number;
    nama_kategori: string;
    created_ms?: number;
    modified_ms?: number;
  }

  export interface BarangItem {
    id: number;
    kategori_barang_id: number;
  }

  // State
  let kategoriList = $state<KategoriItem[]>([]);
  let barangList = $state<BarangItem[]>([]);
  let loading = $state(true);
  let isSubmitting = $state(false);

  // Search & Filter
  let searchQuery = $state('');
  type SortCol = 'id' | 'nama' | 'count' | 'recent';
  let sortCol = $state<SortCol>('nama');
  let sortDir = $state<'asc' | 'desc'>('asc');

  function toggleColSort(col: SortCol) {
    if (sortCol === col) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortCol = col;
      sortDir = 'asc';
    }
  }

  // Modal State
  let isModalOpen = $state(false);
  let isEditing = $state(false);
  let editingId = $state<number | null>(null);
  let formNamaKategori = $state('');
  let formErrorMessage = $state<string | null>(null);
  let nameError = $state<string | null>(null);

  async function loadData() {
    loading = true;
    try {
      const [kategoriData, barangData] = await Promise.all([
        api.get<KategoriItem[]>('/api/kategori_barang'),
        api.get<BarangItem[]>('/api/barang'),
      ]);
      kategoriList = Array.isArray(kategoriData) ? kategoriData : [];
      barangList = Array.isArray(barangData) ? barangData : [];
    } catch (err: any) {
      toast.error('Gagal memuat kategori: ' + (err.message || ''));
    } finally {
      loading = false;
    }
  }

  // Count products per category
  const productCountMap = $derived.by(() => {
    const map = new Map<number, number>();
    for (const b of barangList) {
      const c = map.get(b.kategori_barang_id) || 0;
      map.set(b.kategori_barang_id, c + 1);
    }
    return map;
  });

  function openAddModal() {
    isEditing = false;
    editingId = null;
    formNamaKategori = '';
    formErrorMessage = null;
    nameError = null;
    isModalOpen = true;
  }

  function openEditModal(kat: KategoriItem) {
    isEditing = true;
    editingId = kat.id;
    formNamaKategori = kat.nama_kategori;
    formErrorMessage = null;
    nameError = null;
    isModalOpen = true;
  }

  async function handleSaveKategori() {
    formErrorMessage = null;
    nameError = null;

    if (!formNamaKategori.trim()) {
      nameError = 'Nama kategori wajib diisi.';
      return;
    }

    isSubmitting = true;
    try {
      if (isEditing && editingId) {
        const body = new URLSearchParams({
          id: String(editingId),
          nama_kategori: formNamaKategori.trim(),
        });
        await api.patch('/kategori_barang', body);
        toast.success(`Kategori "${formNamaKategori}" berhasil diperbarui!`);
      } else {
        const body = new URLSearchParams({
          nama_kategori: formNamaKategori.trim(),
        });
        await api.post('/kategori_barang', body);
        toast.success(`Kategori "${formNamaKategori}" berhasil ditambahkan!`);
      }

      isModalOpen = false;
      await loadData();
    } catch (err: any) {
      if (err.status === 403 && err.message === '1') {
        nameError = 'Nama kategori tersebut sudah ada. Gunakan nama lain.';
      } else {
        formErrorMessage = err.message || 'Gagal menyimpan kategori.';
      }
    } finally {
      isSubmitting = false;
    }
  }

  async function handleDeleteKategori(kat: KategoriItem) {
    if (kat.id === 1) {
      toast.error('Kategori default sistem (ID #1) dilindungi dan tidak dapat dihapus.');
      return;
    }

    const count = productCountMap.get(kat.id) || 0;
    if (count > 0) {
      const confirmed = await confirmDialog.show({
        title: `Kategori Berisi ${count} Produk`,
        message: `Kategori "${kat.nama_kategori}" masih memiliki ${count} produk terdaftar. Menghapus kategori ini secara paksa akan menghapus seluruh data barang di dalamnya. Apakah Anda yakin?`,
        confirmLabel: 'Hapus Beserta Produk',
        cancelLabel: 'Batal',
        variant: 'danger',
      });

      if (!confirmed) return;

      try {
        const body = new URLSearchParams({ id: String(kat.id), recursive: 'true' });
        await api.delete('/kategori_barang', body);
        toast.success(`Kategori "${kat.nama_kategori}" dan produknya berhasil dihapus.`);
        await loadData();
      } catch (err: any) {
        toast.error('Gagal menghapus kategori: ' + (err.message || ''));
      }
    } else {
      const confirmed = await confirmDialog.show({
        title: 'Hapus Kategori?',
        message: `Apakah Anda yakin ingin menghapus kategori "${kat.nama_kategori}"?`,
        confirmLabel: 'Hapus Kategori',
        cancelLabel: 'Batal',
        variant: 'danger',
      });

      if (!confirmed) return;

      try {
        const body = new URLSearchParams({ id: String(kat.id) });
        await api.delete('/kategori_barang', body);
        toast.success(`Kategori "${kat.nama_kategori}" berhasil dihapus.`);
        await loadData();
      } catch (err: any) {
        toast.error('Gagal menghapus kategori: ' + (err.message || ''));
      }
    }
  }

  // SSE subscription
  let unsubscribeSse: (() => void) | null = null;
  onMount(() => {
    loadData();

    unsubscribeSse = sse.subscribe((msg) => {
      if (!msg) return;
      if (msg.type === 3 || msg.type === 2) {
        loadData();
      }
    });
  });

  onDestroy(() => {
    if (unsubscribeSse) unsubscribeSse();
  });

  // Filtered & Sorted Categories
  const filteredKategori = $derived.by(() => {
    const q = searchQuery.toLowerCase().trim();
    let res = kategoriList.filter((k) => !q || k.nama_kategori.toLowerCase().includes(q));

    res.sort((a, b) => {
      let cmp = 0;
      if (sortCol === 'id') {
        cmp = a.id - b.id;
      } else if (sortCol === 'nama') {
        cmp = a.nama_kategori.localeCompare(b.nama_kategori);
      } else if (sortCol === 'count') {
        const countA = productCountMap.get(a.id) || 0;
        const countB = productCountMap.get(b.id) || 0;
        cmp = countA - countB;
      } else if (sortCol === 'recent') {
        cmp = (a.modified_ms || a.created_ms || 0) - (b.modified_ms || b.created_ms || 0);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return res;
  });

  const totalFilteredProducts = $derived.by(() => {
    return filteredKategori.reduce((sum, kat) => sum + (productCountMap.get(kat.id) || 0), 0);
  });

  // Pagination
  let currentPage = $state(1);
  let pageSize = $state(10);
  const paginatedKategori = $derived(
    filteredKategori.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  );
  const totalPages = $derived(Math.ceil(filteredKategori.length / pageSize) || 1);

  $effect(() => {
    void searchQuery;
    void sortCol;
    void sortDir;
    currentPage = 1;
  });
</script>

<div class="space-y-6">
  <!-- Page Header -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800 pb-3">
    <div class="flex items-baseline gap-2.5">
      <h1 class="text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-100">Kategori Barang</h1>
      <span class="text-xs text-neutral-400 font-mono tabular-nums">{kategoriList.length} kategori</span>
    </div>

    <div class="flex items-center gap-2">
      <Button
        variant="secondary"
        size="sm"
        onclick={loadData}
        loading={loading}
        title="Refresh data kategori"
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
        <span>Tambah Kategori</span>
      </Button>
    </div>
  </div>

  <!-- Stat Overview Strip -->
  <!--
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
    <div class="p-3.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-[var(--bg-surface)]">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-medium text-neutral-500 uppercase font-mono">Total Kategori</span>
        <Tag class="w-4 h-4 text-neutral-400" />
      </div>
      <div class="mt-2 flex items-baseline gap-1.5">
        <span class="text-xl font-bold font-mono tracking-tight text-neutral-900 dark:text-neutral-100 tabular-nums">
          {formatNumber(kategoriList.length)}
        </span>
        <span class="text-xs text-neutral-500">kelompok</span>
      </div>
    </div>

    <div class="p-3.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-[var(--bg-surface)]">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-medium text-neutral-500 uppercase font-mono">Total Produk Terdaftar</span>
        <Package class="w-4 h-4 text-neutral-400" />
      </div>
      <div class="mt-2 flex items-baseline gap-1.5">
        <span class="text-xl font-bold font-mono tracking-tight text-neutral-900 dark:text-neutral-100 tabular-nums">
          {formatNumber(barangList.length)}
        </span>
        <span class="text-xs text-neutral-500">item</span>
      </div>
    </div>

    <div class="p-3.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-[var(--bg-surface)]">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-medium text-neutral-500 uppercase font-mono">Rata-Rata per Kategori</span>
        <FolderKanban class="w-4 h-4 text-neutral-400" />
      </div>
      <div class="mt-2 flex items-baseline gap-1.5">
        <span class="text-xl font-bold font-mono tracking-tight text-neutral-900 dark:text-neutral-100 tabular-nums">
          {kategoriList.length > 0 ? (barangList.length / kategoriList.length).toFixed(1) : '0'}
        </span>
        <span class="text-xs text-neutral-500">produk</span>
      </div>
    </div>
  </div>
  -->

  <!-- Search & Sort Bar -->
  <div class="flex sm:flex-row justify-between">
    <div class="flex-1 max-w-md">
      <Input
        id="search-kategori"
        bind:value={searchQuery}
        placeholder="Cari nama kategori…"
        clearable
        class="h-9 text-xs"
      >
        {#snippet prefix()}
          <Search class="w-3.5 h-3.5" />
        {/snippet}
      </Input>
    </div>

    <div class="flex items-center gap-2">
      <Select
        value={`${sortCol}_${sortDir}`}
        onchange={(e: any) => {
          const val = e.target.value;
          if (val === 'nama_asc') { sortCol = 'nama'; sortDir = 'asc'; }
          else if (val === 'nama_desc') { sortCol = 'nama'; sortDir = 'desc'; }
          else if (val === 'count_desc') { sortCol = 'count'; sortDir = 'desc'; }
          else if (val === 'recent_desc') { sortCol = 'recent'; sortDir = 'desc'; }
        }}
        class="w-auto min-w-[140px]"
        selectClass="h-9 text-xs"
      >
        <option value="nama_asc">Nama (A-Z)</option>
        <option value="nama_desc">Nama (Z-A)</option>
        <option value="count_desc">Produk Terbanyak</option>
        <option value="recent_desc">Terakhir Diubah</option>
      </Select>
    </div>
  </div>

  <!-- Categories Table -->
  <div class="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-[var(--bg-surface)] overflow-hidden shadow-2xs">
    <table class="w-full text-left text-xs border-collapse">
      <thead>
        <tr class="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/50 text-neutral-500 uppercase font-mono text-[10px] tracking-wider">
          <th class="py-2.5 px-4 w-20">
            <button
              type="button"
              onclick={() => toggleColSort('id')}
              class="flex items-center gap-1 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors uppercase font-mono text-[10px] tracking-wider"
            >
              <span>ID</span>
              {#if sortCol === 'id'}
                {#if sortDir === 'asc'}
                  <ArrowUp class="w-3 h-3 text-neutral-900 dark:text-neutral-100" />
                {:else}
                  <ArrowDown class="w-3 h-3 text-neutral-900 dark:text-neutral-100" />
                {/if}
              {:else}
                <ArrowUpDown class="w-3 h-3 opacity-40" />
              {/if}
            </button>
          </th>
          <th class="py-2.5 px-4">
            <button
              type="button"
              onclick={() => toggleColSort('nama')}
              class="flex items-center gap-1 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors uppercase font-mono text-[10px] tracking-wider"
            >
              <span>Nama Kategori</span>
              {#if sortCol === 'nama'}
                {#if sortDir === 'asc'}
                  <ArrowUp class="w-3 h-3 text-neutral-900 dark:text-neutral-100" />
                {:else}
                  <ArrowDown class="w-3 h-3 text-neutral-900 dark:text-neutral-100" />
                {/if}
              {:else}
                <ArrowUpDown class="w-3 h-3 opacity-40" />
              {/if}
            </button>
          </th>
          <th class="py-2.5 px-4 text-center">
            <button
              type="button"
              onclick={() => toggleColSort('count')}
              class="inline-flex items-center gap-1 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors uppercase font-mono text-[10px] tracking-wider mx-auto"
            >
              <span>Jumlah Produk</span>
              {#if sortCol === 'count'}
                {#if sortDir === 'asc'}
                  <ArrowUp class="w-3 h-3 text-neutral-900 dark:text-neutral-100" />
                {:else}
                  <ArrowDown class="w-3 h-3 text-neutral-900 dark:text-neutral-100" />
                {/if}
              {:else}
                <ArrowUpDown class="w-3 h-3 opacity-40" />
              {/if}
            </button>
          </th>
          <th class="py-2.5 px-4 text-center w-28">Aksi</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-neutral-200/70 dark:divide-neutral-800/80">
        {#if loading}
          {#each Array(4) as _}
            <tr>
              <td class="p-4"><Skeleton class="h-4 w-8" /></td>
              <td class="p-4"><Skeleton class="h-4 w-40" /></td>
              <td class="p-4 text-center"><Skeleton class="h-4 w-16 mx-auto" /></td>
              <td class="p-4 text-right"><Skeleton class="h-4 w-20 ml-auto" /></td>
              <td class="p-4 text-center"><Skeleton class="h-6 w-14 mx-auto" /></td>
            </tr>
          {/each}
        {:else if paginatedKategori.length === 0}
          <tr>
            <td colspan="4" class="py-12 text-center text-neutral-400 dark:text-neutral-500">
              <Tag class="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p class="font-medium text-xs">Tidak ada kategori yang sesuai.</p>
            </td>
          </tr>
        {:else}
          {#each paginatedKategori as kat (kat.id)}
            {@const count = productCountMap.get(kat.id) || 0}
            <tr class="hover:bg-neutral-50/70 dark:hover:bg-neutral-900/40 transition-colors">
              <td class="py-3 px-4 tabular-nums text-neutral-400 text-xs font-medium">
                #{kat.id}
              </td>

              <td class="py-3 px-4">
                <div class="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
                  {kat.nama_kategori}
                </div>
              </td>

              <td class="py-3 px-4 text-center">
                <button
                  type="button"
                  onclick={() => router.navigate('/barang/daftar_barang')}
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium tabular-nums border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 hover:bg-[var(--bg-hover)] transition-colors"
                  title="Lihat barang dalam kategori ini"
                >
                  <Package class="w-3 h-3 text-neutral-400" />
                  <span>{formatNumber(count)} produk</span>
                </button>
              </td>

              <td class="py-3 px-4 text-center">
                <div class="flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    onclick={() => openEditModal(kat)}
                    title="Ubah Nama Kategori"
                    class="p-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 shadow-2xs transition-all flex items-center justify-center"
                  >
                    <Pencil class="w-3.5 h-3.5" />
                  </button>

                  {#if kat.id !== 1}
                    <button
                      type="button"
                      onclick={() => handleDeleteKategori(kat)}
                      title="Hapus Kategori"
                      class="p-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/40 shadow-2xs transition-all flex items-center justify-center"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                    </button>
                  {/if}
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
      totalItems={filteredKategori.length}
      currentItemsCount={paginatedKategori.length}
      itemLabel="kategori"
      storageKey="kategori_barang_limit"
    />
  </div>
</div>

<!-- Modal Tambah/Edit Kategori -->
<Modal
  open={isModalOpen}
  title={isEditing ? 'Ubah Nama Kategori' : 'Tambah Kategori Baru'}
  size="lg"
  onclose={() => (isModalOpen = false)}
>
  <form novalidate onsubmit={(e) => { e.preventDefault(); handleSaveKategori(); }} class="space-y-4">
    {#if formErrorMessage}
      <div class="p-3 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-500/30 text-red-700 dark:text-red-400 text-xs flex items-center gap-2">
        <AlertCircle class="w-4 h-4 shrink-0" />
        <span>{formErrorMessage}</span>
      </div>
    {/if}

    <div>
      <Input
        id="input-kategori-name"
        label="Nama Kategori"
        bind:value={formNamaKategori}
        placeholder="Contoh: Minuman Dingin, Snack, Sembako"
        required
        autofocus
        error={nameError}
        oninput={() => {
          if (formNamaKategori.trim()) nameError = null;
        }}
        onblur={() => {
          if (!formNamaKategori.trim()) nameError = 'Nama kategori wajib diisi.';
        }}
      >
        {#snippet prefix()}
          <Tag class="w-4 h-4" />
        {/snippet}
      </Input>
    </div>

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
        <span>{isEditing ? 'Simpan Perubahan' : 'Buat Kategori'}</span>
      </Button>
    </div>
  </form>
</Modal>
