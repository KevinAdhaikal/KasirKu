<script lang="ts">
  import Modal from '../ui/Modal.svelte';
  import Button from '../ui/Button.svelte';
  import { auth } from '../../stores/auth.svelte';
  import { formatRupiah, formatNumber, formatDate } from '../../utils/format';
  import { Printer, Check, ArrowLeft, RefreshCw } from 'lucide-svelte';
  import type { ReceiptData } from './PaymentModal.svelte';

  interface Props {
    open?: boolean;
    data?: ReceiptData | null;
    onclose?: () => void;
  }

  let { open = $bindable(false), data = null, onclose }: Props = $props();

  let receiptWidth = $state<'58mm' | '80mm'>('58mm');

  function handlePrint() {
    window.print();
  }

  function handleClose() {
    open = false;
    onclose?.();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!open) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      handlePrint();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleClose();
    }
  }

  const storeName = $derived(auth.publicInfo?.store_name?.trim() || 'KASIRKU POS');
  const storeAddress = $derived(auth.publicInfo?.store_address?.trim() || '');
  const storePhone = $derived(auth.publicInfo?.store_phone_num?.trim() || '');
</script>

<svelte:window onkeydown={handleKeydown} />

<Modal
  bind:open
  title="Struk Penjualan"
  size="md"
>
  <div class="space-y-4">
    <!-- Format Selector & Action Header -->
    <div class="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
      <div class="flex items-center gap-1.5">
        <span class="text-xs text-neutral-500 font-medium">Format Kertas:</span>
        <div class="inline-flex rounded-md border border-neutral-200 dark:border-neutral-800 p-0.5 bg-neutral-100 dark:bg-neutral-900">
          <button
            type="button"
            class={`px-2 py-0.5 text-xs rounded font-mono transition-colors ${
              receiptWidth === '58mm'
                ? 'bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 shadow-2xs font-semibold'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
            onclick={() => (receiptWidth = '58mm')}
          >
            58mm
          </button>
          <button
            type="button"
            class={`px-2 py-0.5 text-xs rounded font-mono transition-colors ${
              receiptWidth === '80mm'
                ? 'bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 shadow-2xs font-semibold'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
            onclick={() => (receiptWidth = '80mm')}
          >
            80mm
          </button>
        </div>
      </div>

      <Button variant="primary" size="sm" onclick={handlePrint}>
        <Printer class="w-3.5 h-3.5" />
        <span>Cetak Struk (Enter)</span>
      </Button>
    </div>

    <!-- Receipt Thermal Paper Container -->
    <div class="bg-[var(--bg-subtle)] p-3 sm:p-5 rounded-lg border border-neutral-200 dark:border-neutral-800 flex justify-center overflow-x-auto">
      <div
        id="thermal-receipt"
        class={`bg-white text-black p-4 sm:p-6 shadow-sm border border-neutral-200 font-mono text-xs transition-all duration-150 ${
          receiptWidth === '58mm' ? 'w-[280px] sm:w-[310px]' : 'w-[360px] sm:w-[400px]'
        }`}
        style="line-height: 1.4;"
      >
        <!-- Store Header -->
        <div class="text-center pb-2">
          <p class="font-bold text-sm uppercase tracking-wide">{storeName}</p>
          {#if storeAddress}
            <p class="text-[11px] text-neutral-700 mt-0.5">{storeAddress}</p>
          {/if}
          {#if storePhone}
            <p class="text-[11px] text-neutral-700">Telp: {storePhone}</p>
          {/if}
        </div>

        <div class="border-b border-dashed border-neutral-400 my-2"></div>

        <!-- Metadata -->
        {#if data}
          <div class="text-[11px] space-y-0.5 text-neutral-800">
            <div class="flex justify-between">
              <span>No. Struk</span>
              <span class="font-semibold">{data.receiptNo}</span>
            </div>
            <div class="flex justify-between">
              <span>Tanggal</span>
              <span>{formatDate(data.timestamp)}</span>
            </div>
            <div class="flex justify-between">
              <span>Kasir</span>
              <span>{data.cashierName}</span>
            </div>
          </div>

          <div class="border-b border-dashed border-neutral-400 my-2"></div>

          <!-- Items Table -->
          <div class="space-y-2 text-[11px]">
            {#each data.items as item}
              {@const subtotal = item.harga_jual * item.jumlah_barang}
              <div>
                <p class="font-medium text-neutral-900 truncate">{item.nama_barang}</p>
                <div class="flex justify-between text-neutral-700 pl-1">
                  <span>{formatNumber(item.jumlah_barang)} x {formatRupiah(item.harga_jual)}</span>
                  <span class="font-semibold text-neutral-900">{formatRupiah(subtotal)}</span>
                </div>
              </div>
            {/each}
          </div>

          <div class="border-b border-dashed border-neutral-400 my-2"></div>

          <!-- Financial Summary -->
          <div class="space-y-1 text-[11px]">
            <div class="flex justify-between text-neutral-700">
              <span>Total Item</span>
              <span class="font-medium">{formatNumber(data.totalItems)} pcs</span>
            </div>
            <div class="flex justify-between text-xs font-bold pt-0.5 text-neutral-950">
              <span>TOTAL BELANJA</span>
              <span>{formatRupiah(data.totalAmount)}</span>
            </div>
            <div class="flex justify-between text-neutral-800 pt-0.5">
              <span>TUNAI</span>
              <span class="font-semibold">{formatRupiah(data.cashPaid)}</span>
            </div>
            <div class="flex justify-between text-neutral-800">
              <span>KEMBALIAN</span>
              <span class="font-semibold">{formatRupiah(data.changeAmount)}</span>
            </div>
          </div>

          <div class="border-b border-dashed border-neutral-400 my-3"></div>

          <!-- Receipt Footer Note -->
          <div class="text-center text-[10px] text-neutral-600 space-y-1">
            <p class="font-semibold uppercase tracking-wider">*** TERIMA KASIH ***</p>
            <p>Barang yang sudah dibeli tidak dapat ditukar atau dikembalikan.</p>
            <p class="text-[9px] text-neutral-400 pt-1">KasirKu POS System</p>
          </div>
        {/if}
      </div>
    </div>
  </div>

  {#snippet footer()}
    <Button variant="secondary" size="sm" onclick={handleClose}>
      <RefreshCw class="w-3.5 h-3.5" />
      <span>Transaksi Baru (Esc)</span>
    </Button>
    <Button variant="primary" size="sm" onclick={handlePrint}>
      <Printer class="w-3.5 h-3.5" />
      <span>Cetak Struk (Enter)</span>
    </Button>
  {/snippet}
</Modal>
