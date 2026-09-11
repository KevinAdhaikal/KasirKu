<script lang="ts">
  import Modal from '../ui/Modal.svelte';
  import Button from '../ui/Button.svelte';
  import Input from '../ui/Input.svelte';
  import { api } from '../../api/api';
  import { toast } from '../../stores/toast.svelte';
  import { formatRupiah, formatIDR, parseIDR } from '../../utils/format';
  import { TrendingDown, Receipt, Banknote, AlertCircle } from 'lucide-svelte';

  interface Props {
    open?: boolean;
    onsuccess?: () => void;
  }

  let {
    open = $bindable(false),
    onsuccess,
  }: Props = $props();

  let deskripsi = $state('');
  let nominalRaw = $state('');
  let loading = $state(false);
  let error = $state<string | null>(null);
  let deskripsiError = $state<string | null>(null);
  let nominalError = $state<string | null>(null);

  let nominalFormatted = $derived.by(() => {
    const num = parseIDR(nominalRaw);
    return num > 0 ? formatRupiah(num) : 'Rp0,00';
  });

  async function handleSubmit() {
    error = null;
    deskripsiError = null;
    nominalError = null;

    const amount = parseIDR(nominalRaw);
    let hasError = false;

    if (!deskripsi.trim()) {
      deskripsiError = 'Keterangan pengeluaran wajib diisi.';
      hasError = true;
    }

    if (amount <= 0) {
      nominalError = 'Nominal pengeluaran harus lebih besar dari Rp0.';
      hasError = true;
    }

    if (hasError) return;

    loading = true;
    try {
      const params = new URLSearchParams({
        deskripsi: deskripsi.trim(),
        nominal: String(amount),
      });

      await api.post('/pengeluaran', params);
      toast.success(`Pengeluaran sebesar ${formatRupiah(amount)} berhasil dicatat.`);
      deskripsi = '';
      nominalRaw = '';
      open = false;
      onsuccess?.();
    } catch (err: any) {
      error = err.message || 'Gagal menyimpan pengeluaran. Periksa hak akses Anda.';
    } finally {
      loading = false;
    }
  }
</script>

<Modal
  bind:open
  title="Catat Pengeluaran Toko"
  description="Tambahkan pengeluaran operasional toko yang akan dicatat pada pembukuan hari ini."
  size="lg"
>
  <form novalidate onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
    {#if error}
      <div class="p-3 rounded-md border border-red-500/30 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-xs flex items-start gap-2">
        <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
        <span>{error}</span>
      </div>
    {/if}

    <Input
      id="expense-desc"
      label="Keterangan Pengeluaran"
      bind:value={deskripsi}
      placeholder="Contoh: Beli kantong plastik, bayar token listrik, air galon"
      required
      autofocus
      error={deskripsiError}
      oninput={() => {
        if (deskripsi.trim()) deskripsiError = null;
      }}
      onblur={() => {
        if (!deskripsi.trim()) deskripsiError = 'Keterangan pengeluaran wajib diisi.';
      }}
    >
      {#snippet prefix()}
        <Receipt class="w-4 h-4" />
      {/snippet}
    </Input>

    <div>
      <Input
        id="expense-nominal"
        label="Nominal Pengeluaran"
        type="currency"
        bind:value={nominalRaw}
        placeholder="0"
        required
        error={nominalError}
        oninput={() => {
          if (parseIDR(nominalRaw) > 0) nominalError = null;
        }}
        onblur={() => {
          if (parseIDR(nominalRaw) <= 0) nominalError = 'Nominal pengeluaran harus lebih besar dari Rp0.';
        }}
      />
      {#if parseIDR(nominalRaw) > 0}
        <p class="text-xs font-mono text-neutral-500 dark:text-neutral-400 mt-1">
          Terbilang: <span class="font-semibold text-neutral-900 dark:text-neutral-100">{nominalFormatted}</span>
        </p>
      {/if}
    </div>

    <!-- Quick Presets -->
    <div>
      <p class="text-[11px] font-medium text-neutral-500 mb-1.5">Nominal Cepat:</p>
      <div class="flex flex-wrap gap-1.5">
        {#each [1000000, 2000000, 5000000, 10000000, 20000000, 50000000] as preset}
          <button
            type="button"
            onclick={() => {
              nominalRaw = formatIDR(preset);
            }}
            class="px-2 py-1 rounded border border-neutral-200 dark:border-neutral-800 text-[11px] font-mono text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-[var(--bg-hover)] transition-colors"
          >
            {formatRupiah(preset)}
          </button>
        {/each}
      </div>
    </div>
  </form>

  {#snippet footer()}
    <Button variant="secondary" size="sm" onclick={() => (open = false)}>
      Batal
    </Button>
    <Button
      variant="danger"
      size="sm"
      onclick={handleSubmit}
      {loading}
    >
      <TrendingDown class="w-3.5 h-3.5" />
      <span>Simpan Pengeluaran (Enter)</span>
    </Button>
  {/snippet}
</Modal>
