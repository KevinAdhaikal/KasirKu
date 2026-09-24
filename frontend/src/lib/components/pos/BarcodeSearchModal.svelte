<script lang="ts">
  import { tick } from 'svelte';
  import Modal from '../ui/Modal.svelte';
  import Button from '../ui/Button.svelte';
  import Badge from '../ui/Badge.svelte';
  import Rupiah from '../ui/Rupiah.svelte';
  import { cart } from '../../stores/cart.svelte';
  import { toast } from '../../stores/toast.svelte';
  import { api } from '../../api/api';
  import { formatRupiah, formatNumber } from '../../utils/format';
  import { Search, Plus, Package, X, Loader2, Barcode } from 'lucide-svelte';

  interface Product {
    id: number;
    nama_barang: string;
    barcode_barang?: string | null;
    stok_barang: number;
    harga_modal: number;
    harga_jual: number;
  }

  interface Props {
    open?: boolean;
    results?: Product[];
    searchQuery?: string;
    onselect?: (product: Product) => void;
    onclose?: () => void;
  }

  let {
    open = $bindable(false),
    results = [],
    searchQuery = '',
    onselect,
    onclose,
  }: Props = $props();

  let filterQuery = $state('');
  let localResults = $state<Product[]>([]);
  let isSearchingRemote = $state(false);
  let searchInputEl = $state<HTMLInputElement | null>(null);

  // Pagination & Limit
  const LIMIT_OPTIONS = [5, 10, 100];
  let pageSize = $state(5);
  let currentPage = $state(1);

  $effect(() => {
    if (open) {
      localResults = [...results];
      filterQuery = searchQuery || '';
      currentPage = 1;
      tick().then(() => {
        searchInputEl?.focus();
        searchInputEl?.select();
      });
    }
  });

  let displayedProducts = $derived.by(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return localResults;
    return localResults.filter(p =>
      p.nama_barang.toLowerCase().includes(q) ||
      (p.barcode_barang && p.barcode_barang.toLowerCase().includes(q))
    );
  });

  const totalPages = $derived(Math.ceil(displayedProducts.length / pageSize) || 1);

  $effect(() => {
    void filterQuery;
    currentPage = 1;
  });

  const paginatedProducts = $derived(
    displayedProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  );

  async function handleRemoteSearch() {
    const q = filterQuery.trim();
    if (!q) {
      localResults = [...results];
      return;
    }

    isSearchingRemote = true;
    try {
      const res = await api.get<Product[]>(`/api/cari_barang?barang=${encodeURIComponent(q)}`);
      if (Array.isArray(res)) {
        localResults = res;
        if (res.length === 1) {
          handleSelect(res[0]);
        }
      }
    } catch (err: any) {
      toast.error(err?.message || 'Gagal mencari produk');
    } finally {
      isSearchingRemote = false;
    }
  }

  function handleModalClose() {
    open = false;
    onclose?.();
  }

  function handleSelect(product: Product) {
    const res = cart.addItem(product);
    if (!res.success) {
      toast.error(res.message || 'Gagal menambahkan produk');
      return;
    }
    onselect?.(product);
    handleModalClose();
  }
</script>

<Modal
  bind:open
  title="Pilih Barang dari Hasil Pencarian"
  description={filterQuery.trim()
    ? `${displayedProducts.length} hasil untuk "${filterQuery.trim()}".`
    : `Ditemukan ${displayedProducts.length} produk yang cocok.`}
  size="lg"
  onclose={handleModalClose}
>
  <!-- Search / Filter Bar Inside Modal -->
  <div class="relative flex items-center mt-1 mb-4">
    <div class="absolute left-3 flex items-center pointer-events-none text-[var(--text-muted)]">
      {#if isSearchingRemote}
        <Loader2 class="w-4 h-4 animate-spin text-[var(--brand)]" />
      {:else}
        <Search class="w-4 h-4" />
      {/if}
    </div>
    <input
      bind:this={searchInputEl}
      type="text"
      placeholder="Cari atau filter nama barang / barcode di sini... (Tekan Enter)"
      bind:value={filterQuery}
      onkeydown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (displayedProducts.length === 1) {
            handleSelect(displayedProducts[0]);
          } else {
            handleRemoteSearch();
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          handleModalClose();
        }
      }}
      class="w-full h-10 pl-9 pr-24 rounded-md border text-xs bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)]/50 focus:border-[var(--brand)] transition-colors"
    />
    <div class="absolute right-2 flex items-center gap-1">
      {#if filterQuery}
        <button
          type="button"
          onclick={() => { filterQuery = ''; localResults = [...results]; searchInputEl?.focus(); }}
          class="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          title="Bersihkan pencarian"
          aria-label="Bersihkan pencarian"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      {/if}
      <Button
        variant="primary"
        size="sm"
        loading={isSearchingRemote}
        onclick={handleRemoteSearch}
      >
        <Search class="w-3.5 h-3.5" />
        <span>Cari</span>
      </Button>
    </div>
  </div>

  {#if displayedProducts.length === 0}
    <div class="text-center py-10 px-4 rounded-md border border-dashed border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40">
      <Package class="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2 opacity-40" />
      <p class="text-xs font-semibold text-[var(--text-primary)]">Tidak Ada Produk Cocok</p>
      <p class="text-[11px] text-[var(--text-muted)] mt-1">Coba gunakan kata kunci nama barang atau barcode lain.</p>
    </div>
  {:else}
    <div class="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden">
      <div class="max-h-[380px] overflow-y-auto">
        <!-- Desktop Table View (sm and up) -->
        <table class="hidden sm:table w-full text-xs border-collapse">
          <thead class="sticky top-0 z-20 bg-[var(--bg-subtle)]">
            <tr class="text-[var(--text-muted)] font-medium text-[11px]">
              <th class="sticky top-0 z-20 bg-[var(--bg-subtle)] border-b border-[var(--border-subtle)] shadow-[inset_0_-1px_0_var(--border-subtle)] py-2.5 px-4 text-left">Nama Produk</th>
              <th class="sticky top-0 z-20 bg-[var(--bg-subtle)] border-b border-[var(--border-subtle)] shadow-[inset_0_-1px_0_var(--border-subtle)] py-2.5 px-4 text-left">Barcode</th>
              <th class="sticky top-0 z-20 bg-[var(--bg-subtle)] border-b border-[var(--border-subtle)] shadow-[inset_0_-1px_0_var(--border-subtle)] py-2.5 px-4 text-center">Stok</th>
              <th class="sticky top-0 z-20 bg-[var(--bg-subtle)] border-b border-[var(--border-subtle)] shadow-[inset_0_-1px_0_var(--border-subtle)] py-2.5 px-4 text-right">Harga Jual</th>
              <th class="sticky top-0 z-20 bg-[var(--bg-subtle)] border-b border-[var(--border-subtle)] shadow-[inset_0_-1px_0_var(--border-subtle)] py-2.5 px-4 text-center w-24">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--border-subtle)]">
            {#each paginatedProducts as product}
              {@const isOutOfStock = product.stok_barang <= 0}
              <tr class="hover:bg-[var(--bg-hover)] transition-colors">
                <td class="py-2.5 px-4 text-left font-medium text-[var(--text-primary)]">
                  {product.nama_barang}
                </td>
                <td class="py-2.5 px-4 text-left tabular-nums text-[var(--text-secondary)]">
                  {#if product.barcode_barang}
                    <span class="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-medium">
                      <Barcode class="w-3 h-3 opacity-60" />
                      {product.barcode_barang}
                    </span>
                  {:else}
                    <span class="text-[var(--text-muted)] text-[11px]">-</span>
                  {/if}
                </td>
                <td class="py-2.5 px-4 text-center">
                  {#if isOutOfStock}
                    <Badge variant="danger" size="sm">Habis</Badge>
                  {:else if product.stok_barang <= 5}
                    <Badge variant="warning" size="sm">{product.stok_barang} tersisa</Badge>
                  {:else}
                    <span class="tabular-nums text-[var(--text-primary)] font-medium">
                      {formatNumber(product.stok_barang)}
                    </span>
                  {/if}
                </td>
                <td class="py-2.5 px-4 text-right tabular-nums font-semibold text-[var(--text-primary)]">
                  <Rupiah value={product.harga_jual} />
                </td>
                <td class="py-2.5 px-4 text-center">
                  <div class="flex items-center justify-center">
                    <Button
                      variant={isOutOfStock ? 'secondary' : 'primary'}
                      size="sm"
                      disabled={isOutOfStock}
                      onclick={() => handleSelect(product)}
                    >
                      <Plus class="w-3.5 h-3.5" />
                      <span>Tambah</span>
                    </Button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>

        <!-- Mobile Card List View (< sm) -->
        <div class="sm:hidden divide-y divide-[var(--border-subtle)]">
          {#each paginatedProducts as product}
            {@const isOutOfStock = product.stok_barang <= 0}
            <div class="p-3.5 space-y-2.5 bg-[var(--bg-surface)]">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0 flex-1">
                  <p class="font-semibold text-xs text-[var(--text-primary)] leading-tight">
                    {product.nama_barang}
                  </p>
                  <div class="flex items-center gap-2 mt-1 flex-wrap">
                    {#if product.barcode_barang}
                      <span class="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
                        <Barcode class="w-3 h-3 opacity-60" />
                        {product.barcode_barang}
                      </span>
                    {/if}
                    {#if isOutOfStock}
                      <Badge variant="danger" size="sm">Habis</Badge>
                    {:else if product.stok_barang <= 5}
                      <Badge variant="warning" size="sm">{product.stok_barang} sisa</Badge>
                    {:else}
                      <span class="text-[10px] text-[var(--text-muted)] font-medium">
                        Stok: {formatNumber(product.stok_barang)}
                      </span>
                    {/if}
                  </div>
                </div>

                <div class="text-right shrink-0">
                  <span class="text-xs font-bold text-[var(--brand)] tabular-nums block">
                    <Rupiah value={product.harga_jual} />
                  </span>
                </div>
              </div>

              <div class="pt-1">
                <Button
                  variant={isOutOfStock ? 'secondary' : 'primary'}
                  size="sm"
                  class="w-full h-8 text-xs font-medium"
                  disabled={isOutOfStock}
                  onclick={() => handleSelect(product)}
                >
                  <Plus class="w-3.5 h-3.5" />
                  <span>Tambah ke Keranjang</span>
                </Button>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {/if}

  {#snippet footer()}
    <div class="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
      <div class="flex items-center gap-3">
        <div>
          Menampilkan <strong class="text-[var(--text-primary)] tabular-nums">{paginatedProducts.length}</strong> dari <span class="tabular-nums font-medium text-[var(--text-primary)]">{displayedProducts.length}</span> produk
        </div>
        {#if displayedProducts.length > 5}
          <div class="flex items-center gap-1.5 border-l border-[var(--border-subtle)] pl-3">
            <span class="text-[var(--text-muted)] font-medium">Limit:</span>
            <div class="inline-flex rounded-md border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-0.5" role="group" aria-label="Batas per halaman">
              {#each LIMIT_OPTIONS as limitOpt}
                <button
                  type="button"
                  onclick={() => { pageSize = limitOpt; currentPage = 1; }}
                  class="px-2 py-0.5 rounded text-[11px] font-medium transition-colors {pageSize === limitOpt
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xs font-bold border border-[var(--border-contrast)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}"
                  aria-pressed={pageSize === limitOpt}
                  aria-label={`Tampilkan ${limitOpt} produk`}
                >
                  {limitOpt}
                </button>
              {/each}
            </div>
          </div>
        {/if}
      </div>

      <div class="flex items-center gap-2">
        {#if totalPages > 1}
          <Button
            variant="secondary"
            size="sm"
            disabled={currentPage <= 1}
            onclick={() => (currentPage -= 1)}
            aria-label="Halaman sebelumnya"
          >
            Sebelumnya
          </Button>
          <span class="text-xs text-[var(--text-secondary)] tabular-nums px-1 font-medium">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={currentPage >= totalPages}
            onclick={() => (currentPage += 1)}
            aria-label="Halaman berikutnya"
          >
            Berikutnya
          </Button>
        {/if}
        <Button variant="secondary" size="sm" onclick={() => (open = false)}>
          Tutup (Esc)
        </Button>
      </div>
    </div>
  {/snippet}
</Modal>
