<script lang="ts">
  import Modal from '../ui/Modal.svelte';
  import Button from '../ui/Button.svelte';
  import Rupiah from '../ui/Rupiah.svelte';
  import { cart, type CartItem } from '../../stores/cart.svelte';
  import { auth } from '../../stores/auth.svelte';
  import { toast } from '../../stores/toast.svelte';
  import { formatRupiah, formatNumber, formatIDR, parseIDR } from '../../utils/format';
  import { CheckCircle2, AlertCircle } from 'lucide-svelte';

  export interface ReceiptData {
    receiptNo: string;
    timestamp: string;
    cashierName: string;
    items: CartItem[];
    totalItems: number;
    totalAmount: number;
    cashPaid: number;
    changeAmount: number;
  }

  interface Props {
    open?: boolean;
    onsuccess?: (receiptData: ReceiptData) => void;
  }

  let { open = $bindable(false), onsuccess }: Props = $props();

  let tunaiRaw = $state('');
  let isSubmitting = $state(false);
  let errorMsg = $state<string | null>(null);
  let inputElement = $state<HTMLInputElement | null>(null);

  function parseCashDigits(value: string): number {
    return parseIDR(value);
  }

  function formatCashDigits(value: string): string {
    const num = parseIDR(value);
    return num === 0 ? '' : formatIDR(num);
  }

  function formatCashAmount(amount: number): string {
    return formatIDR(amount);
  }

  const tunaiNum = $derived(parseCashDigits(tunaiRaw));

  const totalAmount = $derived(cart.totalAmount);
  const totalItems = $derived(cart.totalItems);
  const kembalian = $derived(tunaiNum - totalAmount);
  const isSufficient = $derived(tunaiNum >= totalAmount && totalAmount > 0);
  const kekurangan = $derived(Math.max(0, totalAmount - tunaiNum));

  const presets = [1000000, 2000000, 5000000, 10000000, 20000000, 50000000];

  function setPreset(amount: number) {
    tunaiRaw = formatCashAmount(amount);
    errorMsg = null;
    focusInput();
  }

  function setUangPas() {
    tunaiRaw = formatCashAmount(totalAmount);
    errorMsg = null;
    focusInput();
  }

  function handleInput(e: Event) {
    const target = e.target as HTMLInputElement;
    const numeric = target.value.replace(/[^0-9]/g, '');
    tunaiRaw = formatCashDigits(numeric);
    errorMsg = null;
  }

  function focusInput() {
    setTimeout(() => {
      inputElement?.focus();
      inputElement?.select();
    }, 50);
  }

  $effect(() => {
    if (open) {
      tunaiRaw = '';
      errorMsg = null;
      isSubmitting = false;
      focusInput();
    }
  });

  async function handlePay() {
    if (cart.items.length === 0) {
      errorMsg = 'Keranjang belanja masih kosong.';
      return;
    }

    if (tunaiNum <= 0) {
      errorMsg = 'Nominal pembayaran tunai wajib diisi.';
      return;
    }

    if (!isSufficient) {
      errorMsg = `Uang tunai kurang ${formatRupiah(kekurangan)}.`;
      return;
    }

    isSubmitting = true;
    errorMsg = null;

    try {
      const payload = {
        items: cart.items.map((item) => ({
          id: item.id,
          jumlah_barang: item.jumlah_barang,
          harga_modal: item.harga_modal,
          harga_jual: item.harga_jual,
          nama_barang: item.nama_barang,
        })),
      };

      const res = await fetch('/masuk_ke_pembukuan', {
        method: 'POST',
        headers: {
          token: localStorage.getItem('token') || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 200) {
        const receiptData: ReceiptData = {
          receiptNo: `TRX-${Date.now()}`,
          timestamp: new Date().toISOString(),
          cashierName: auth.user?.full_name || auth.user?.username || 'Kasir',
          items: cart.items.map((i) => ({ ...i })),
          totalItems,
          totalAmount,
          cashPaid: tunaiNum,
          changeAmount: kembalian,
        };

        cart.clear();
        open = false;
        toast.success('Transaksi berhasil disimpan ke pembukuan.');
        onsuccess?.(receiptData);
      } else {
        const errCode = await res.text();
        if (errCode === '1') {
          errorMsg = 'Stok barang tidak mencukupi untuk menyelesaikan transaksi ini.';
          toast.error(errorMsg);
        } else if (errCode === '0') {
          errorMsg = 'Anda tidak memiliki hak akses kasir untuk memproses transaksi.';
          toast.error(errorMsg);
        } else {
          errorMsg = `Gagal memproses transaksi (Status: ${res.status}).`;
          toast.error(errorMsg);
        }
      }
    } catch (err: any) {
      errorMsg = err?.message || 'Terjadi kesalahan jaringan saat memproses transaksi.';
      toast.error(errorMsg);
    } finally {
      isSubmitting = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!open) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      if (isSufficient && !isSubmitting) {
        handlePay();
      }
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<Modal
  bind:open
  title="Pembayaran Transaksi Kasir"
  description={`Total ${formatNumber(totalItems)} item belanja.`}
  size="lg"
>
  <div class="space-y-4">
    <!-- Grand Total Highlight Card -->
    <div class="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40 text-center">
      <p class="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Total Yang Harus Dibayar</p>
      <div class="mt-1 flex items-baseline justify-center gap-1 text-neutral-900 dark:text-neutral-100 flex-wrap">
        <Rupiah
          value={totalAmount}
          class="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 break-all"
          prefixClass="text-sm sm:text-base font-semibold text-neutral-400 dark:text-neutral-500 tracking-normal mr-1"
        />
      </div>
    </div>

    <!-- Error Alert -->
    {#if errorMsg}
      <div class="p-3 rounded-md border border-red-500/30 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-xs flex items-start gap-2 animate-in fade-in">
        <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
        <span class="font-medium">{errorMsg}</span>
      </div>
    {/if}

    <!-- Cash Input -->
    <div>
      <label for="tunai-input" class="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
        Nominal Tunai Diterima <span class="text-red-500 font-bold">*</span>
      </label>
      <p class="text-[11px] text-neutral-400 dark:text-neutral-500 mb-2">Dua digit terakhir dianggap sebagai sen.</p>
      <div class="relative flex items-center">
        <span class="absolute left-3.5 text-neutral-400 dark:text-neutral-500 font-semibold text-xs pointer-events-none">
          Rp
        </span>
        <input
          id="tunai-input"
          bind:this={inputElement}
          type="text"
          inputmode="numeric"
          placeholder="0,00"
          value={tunaiRaw}
          oninput={handleInput}
          onkeydown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handlePay();
            }
          }}
          class="w-full h-12 pl-10 pr-4 rounded-md border text-lg font-bold tracking-normal tabular-nums transition-colors
            {errorMsg ? 'border-red-500 focus-visible:ring-red-500' : 'border-neutral-300 dark:border-neutral-800'}
            bg-[var(--bg-surface)] text-neutral-900 dark:text-neutral-100
            focus:border-neutral-900 dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-[var(--brand)]/50"
        />
      </div>
      {#if errorMsg}
        <p class="text-xs text-red-500 dark:text-red-400 font-medium mt-1.5">{errorMsg}</p>
      {/if}
    </div>

    <!-- Quick Preset Buttons -->
    <div>
      <p class="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mb-2">Pilihan Cepat Nominal:</p>
      <div class="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
        <button
          type="button"
          class="px-2 py-1.5 rounded border text-xs font-medium tabular-nums transition-colors
            border-neutral-200 dark:border-neutral-800 bg-[var(--bg-subtle)] text-neutral-800 dark:text-neutral-200
            hover:border-neutral-900 dark:hover:border-white hover:bg-[var(--bg-hover)]"
          onclick={setUangPas}
        >
          Uang Pas
        </button>
        {#each presets as amount}
          <button
            type="button"
            class="px-2 py-1.5 rounded border text-xs font-medium tabular-nums transition-colors
              border-neutral-200 dark:border-neutral-800 bg-[var(--bg-subtle)] text-neutral-800 dark:text-neutral-200
              hover:border-neutral-900 dark:hover:border-white hover:bg-[var(--bg-hover)]"
            onclick={() => setPreset(amount)}
          >
            {formatCashAmount(amount)}
          </button>
        {/each}
      </div>
    </div>

    <!-- Change Calculation Result -->
    <div class="p-3.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-[var(--bg-subtle)]/60 flex items-center justify-between">
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
          {#if isSufficient}
            KEMBALIAN
          {:else if tunaiNum > 0}
            KURANG BAYAR
          {:else}
            STATUS PEMBAYARAN
          {/if}
        </p>
        <p class="text-xs text-neutral-400 mt-0.5">
          {#if isSufficient}
            Uang kembalian yang harus diberikan ke pembeli
          {:else if tunaiNum > 0}
            Nominal tunai belum mencukupi total belanja
          {:else}
            Masukkan nominal uang tunai yang diterima
          {/if}
        </p>
      </div>

      <div class="text-right">
        {#if isSufficient}
          <Rupiah
            value={kembalian}
            class="text-xl font-bold text-emerald-600 dark:text-emerald-400 break-all"
            prefixClass="text-xs font-semibold text-emerald-600/70 dark:text-emerald-400/70 mr-0.5"
          />
        {:else if tunaiNum > 0}
          <Rupiah
            value={-kekurangan}
            class="text-lg font-semibold text-rose-600 dark:text-rose-400 break-all"
            prefixClass="text-xs font-semibold text-rose-600/70 dark:text-rose-400/70 mr-0.5"
          />
        {:else}
          <span class="text-sm font-medium text-neutral-400 tabular-nums">
            <span class="text-xs mr-0.5">Rp</span>0,00
          </span>
        {/if}
      </div>
    </div>
  </div>

  {#snippet footer()}
    <Button variant="secondary" size="sm" onclick={() => (open = false)} disabled={isSubmitting}>
      Batal (Esc)
    </Button>
    <Button
      variant="primary"
      size="sm"
      loading={isSubmitting}
      disabled={!isSufficient || isSubmitting || totalAmount <= 0}
      onclick={handlePay}
    >
      <CheckCircle2 class="w-3.5 h-3.5" />
      <span>Selesaikan Transaksi (Enter)</span>
    </Button>
  {/snippet}
</Modal>
