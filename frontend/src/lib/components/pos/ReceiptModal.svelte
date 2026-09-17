<script lang="ts">
  import { onMount } from 'svelte';
  import Modal from '../ui/Modal.svelte';
  import Button from '../ui/Button.svelte';
  import { auth } from '../../stores/auth.svelte';
  import { api } from '../../api/api';
  import { renderReceiptHtml, type StoreInfo } from '../../utils/receipt';
  import { Printer, Check, ArrowLeft, RefreshCw } from 'lucide-svelte';
  import type { ReceiptData } from './PaymentModal.svelte';

  interface Props {
    open?: boolean;
    data?: ReceiptData | null;
    onclose?: () => void;
  }

  let { open = $bindable(false), data = null, onclose }: Props = $props();

  let receiptWidth = $state<'58mm' | '80mm'>('58mm');
  let strukTemplate = $state<string | null>(null);

  function handlePrint() {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(receiptHtml);
      doc.close();
      iframe.contentWindow?.focus();
      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 1000);
      }, 250);
    } else {
      window.print();
    }
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

  const storeInfo = $derived<StoreInfo>({
    name: auth.publicInfo?.store_name?.trim() || 'KASIRKU POS',
    desc: auth.publicInfo?.store_desc?.trim() || '',
    address: auth.publicInfo?.store_address?.trim() || '',
    phone_num: auth.publicInfo?.store_phone_num?.trim() || '',
  });

  const receiptHtml = $derived(
    renderReceiptHtml(strukTemplate, data, storeInfo)
  );

  async function loadStrukTemplate() {
    try {
      const res = await api.get<{ store_struk?: string | null; content?: string | null }>('/api/settings/struk');
      const val = res?.store_struk ?? res?.content;
      if (val && val.trim()) {
        strukTemplate = val;
      }
    } catch {
      // use default template
    }
  }

  onMount(() => {
    loadStrukTemplate();
  });

  $effect(() => {
    if (open) {
      loadStrukTemplate();
    }
  });
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

    <!-- Receipt Thermal Paper Container via Isolated Iframe -->
    <div class="bg-[var(--bg-subtle)] p-3 sm:p-5 rounded-lg border border-neutral-200 dark:border-neutral-800 flex justify-center overflow-x-auto min-h-[440px]">
      <div
        class="bg-white rounded shadow-sm border border-neutral-300 dark:border-neutral-700 overflow-hidden transition-all duration-150 {
          receiptWidth === '58mm' ? 'w-[300px]' : 'w-[380px]'
        }"
      >
        <!-- Render Dynamic HTML Receipt Content in Isolated Iframe -->
        <iframe
          title="Struk Penjualan"
          srcdoc={receiptHtml}
          class="w-full h-[480px] border-0 bg-white block"
          sandbox="allow-same-origin"
        ></iframe>
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
