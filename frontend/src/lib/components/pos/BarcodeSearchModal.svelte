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
  import { Search, Plus, Package, X, Loader2 } from 'lucide-svelte';

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
  }

  let {
    open = $bindable(false),
    results = [],
    searchQuery = '',
    onselect,
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

  function handleSelect(product: Product) {
    const res = cart.addItem(product);
    if (!res.success) {
      toast.error(res.message || 'Gagal menambahkan produk');
      return;
    }
    toast.success(`"${product.nama_barang}" ditambahkan ke kasir.`);
    onselect?.(product);
    open = false;
  }
</script>

<Modal
  bind:open
  title="Pilih Barang dari Hasil Pencarian"
  description={filterQuery.trim()
    ? `${displayedProducts.length} hasil untuk "${filterQuery.trim()}".`
    : `Ditemukan ${displayedProducts.length} produk yang cocok.`}
  size="lg"
>
  <!-- Search / Filter Bar Inside Modal -->
  <div class="relative flex items-center mt-1 mb-4">
    <div class="absolute left-3 flex items-center pointer-events-none text-neutral-400">
      {#if isSearchingRemote}
        <Loader2 class="w-4 h-4 animate-spin text-neutral-500" />
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
        }
      }}
      class="w-full h-10 pl-9 pr-24 rounded-md border text-xs bg-[var(--bg-surface)] border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-[var(--brand)]/50 transition-colors"
    />
    <div class="absolute right-2 flex items-center gap-1">
      {#if filterQuery}
        <button
          type="button"
          onclick={() => { filterQuery = ''; localResults = [...results]; searchInputEl?.focus(); }}
          class="p-1.5 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-[var(--bg-hover)] transition-colors"
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
    <div class="text-center py-10 px-4 rounded-lg border border-dashed border-neutral-200 dark:border-neutral-800">
      <Package class="w-8 h-8 text-neutral-300 dark:text-neutral-700 mx-auto mb-2" />
      <p class="text-xs font-semibold text-neutral-800 dark:text-neutral-200">Tidak Ada Produk Cocok</p>
      <p class="text-[11px] text-neutral-500 mt-1">Coba gunakan kata kunci nama barang atau barcode lain.</p>
    </div>
  {:else}
    <div class="overflow-x-auto -mx-6 mt-0 mb-1 max-h-[380px] overflow-y-auto">
      <table class="w-full text-xs border-collapse">
        <thead class="sticky top-0 bg-[var(--bg-surface)] z-10">
          <tr class="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/50 text-neutral-500 text-[10px] font-mono font-semibold uppercase tracking-wider text-center">
            <th class="px-5 py-2.5 font-medium">NAMA PRODUK</th>
            <th class="px-5 py-2.5 font-medium">BARCODE</th>
            <th class="px-5 py-2.5 font-medium text-center">STOK</th>
            <th class="px-5 py-2.5 font-medium text-right">HARGA JUAL</th>
            <th class="px-5 py-2.5 font-medium text-center">AKSI</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-neutral-200/70 dark:divide-neutral-800/80">
          {#each paginatedProducts as product}
            {@const isOutOfStock = product.stok_barang <= 0}
            <tr class="hover:bg-neutral-50/70 dark:hover:bg-neutral-900/40 transition-colors">
              <td class="px-5 py-2.5 text-center font-medium text-neutral-900 dark:text-neutral-100">
                {product.nama_barang}
              </td>
              <td class="px-5 py-2.5 text-center font-mono text-neutral-500 text-[11px]">
                {product.barcode_barang || '-'}
              </td>
              <td class="px-5 py-2.5 text-center">
                {#if isOutOfStock}
                  <Badge variant="danger" size="sm">Habis</Badge>
                {:else if product.stok_barang <= 5}
                  <Badge variant="warning" size="sm">{product.stok_barang} tersisa</Badge>
                {:else}
                  <span class="tabular-nums text-neutral-700 dark:text-neutral-300 font-medium">
                    {formatNumber(product.stok_barang)}
                  </span>
                {/if}
              </td>
              <td class="px-5 py-2.5 text-right font-semibold text-neutral-900 dark:text-neutral-100">
                <Rupiah value={product.harga_jual} />
              </td>
              <td class="px-5 py-2.5 text-center">
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
    </div>
  {/if}

  {#snippet footer()}
    <div class="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-neutral-500">
      <div class="flex items-center gap-3">
        <div>
          Menampilkan <strong class="text-neutral-900 dark:text-neutral-100 tabular-nums">{paginatedProducts.length}</strong> dari <span class="tabular-nums font-medium text-neutral-900 dark:text-neutral-100">{displayedProducts.length}</span> produk
        </div>
        {#if displayedProducts.length > 5}
          <div class="flex items-center gap-1.5 border-l border-neutral-200 dark:border-neutral-800 pl-3">
            <span class="text-neutral-500 font-medium">Limit:</span>
            <div class="inline-flex rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 p-0.5" role="group" aria-label="Batas per halaman">
              {#each LIMIT_OPTIONS as limitOpt}
                <button
                  type="button"
                  onclick={() => { pageSize = limitOpt; currentPage = 1; }}
                  class="px-2 py-0.5 rounded text-[11px] font-mono font-medium transition-colors {pageSize === limitOpt
                    ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-2xs font-bold'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'}"
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
          <span class="font-mono text-xs text-neutral-700 dark:text-neutral-300 tabular-nums px-1">
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
