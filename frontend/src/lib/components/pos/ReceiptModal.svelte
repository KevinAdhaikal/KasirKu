<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Modal from '../ui/Modal.svelte';
  import Button from '../ui/Button.svelte';
  import { auth } from '../../stores/auth.svelte';
  import { api } from '../../api/api';
  import { sse } from '../../stores/sse.svelte';
  import { renderReceiptHtml, type StoreInfo } from '../../utils/receipt';
  import { Printer, Check, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-svelte';
  import type { ReceiptData } from './PaymentModal.svelte';

  interface Props {
    open?: boolean;
    data?: ReceiptData | null;
    closeLabel?: string;
    isReceiptEnabled?: boolean;
    onclose?: () => void;
  }

  let {
    open = $bindable(false),
    data = null,
    closeLabel = 'Transaksi Baru (Esc)',
    isReceiptEnabled: propReceiptEnabled,
    onclose
  }: Props = $props();

  let strukTemplate = $state<string | null>(null);
  let receiptEnabledState = $state(true);

  let isReceiptEnabled = $derived(propReceiptEnabled !== undefined ? propReceiptEnabled : receiptEnabledState);

  let sseUnsub: (() => void) | null = null;

  function handlePrint() {
    if (!isReceiptEnabled) return;

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
        handleClose();
        try {
          iframe.contentWindow?.print();
        } catch (err) {
          console.error('Print error:', err);
        }
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 1000);
      }, 100);
    } else {
      handleClose();
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
      if (isReceiptEnabled) {
        handlePrint();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleClose();
    }
  }

  const storeInfo = $derived<StoreInfo>({
    name: auth.publicInfo?.name?.trim() || auth.publicInfo?.store_name?.trim() || 'KASIRKU POS',
    desc: auth.publicInfo?.desc?.trim() || auth.publicInfo?.description?.trim() || auth.publicInfo?.store_desc?.trim() || '',
    address: auth.publicInfo?.address?.trim() || auth.publicInfo?.store_address?.trim() || '',
    phone_num: auth.publicInfo?.phone_num?.trim() || auth.publicInfo?.no_phone?.trim() || auth.publicInfo?.store_phone_num?.trim() || '',
  });

  const receiptHtml = $derived(
    renderReceiptHtml(strukTemplate, data, storeInfo)
  );

  async function loadStrukTemplate() {
    try {
      const res = await api.get<{ store_struk?: string | null; content?: string | null; enabled?: boolean | string | null }>('/api/settings/struk');
      if (res && res.enabled !== undefined && res.enabled !== null) {
        receiptEnabledState = String(res.enabled).toLowerCase() === 'true' || res.enabled === true;
      }
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
    auth.fetchPublicInfo();

    sseUnsub = sse.subscribe((event) => {
      if (event?.code === 'UPDATE_STRUK_SETTING') {
        if (event?.data?.enabled !== undefined) {
          receiptEnabledState = String(event.data.enabled).toLowerCase() === 'true' || event.data.enabled === true;
        }
        if (event?.data?.content) {
          strukTemplate = event.data.content;
        }
      }
    });
  });

  onDestroy(() => {
    if (sseUnsub) sseUnsub();
  });

  $effect(() => {
    if (open) {
      loadStrukTemplate();
      auth.fetchPublicInfo();
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
    {#if !isReceiptEnabled}
      <div class="flex items-center gap-2 p-3 text-xs rounded-lg border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300">
        <AlertCircle class="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <span>Fitur cetak struk dinonaktifkan di Pengaturan. Tombol cetak struk dinonaktifkan.</span>
      </div>
    {/if}

    <!-- Receipt Thermal Paper Container via Isolated Iframe -->
    <div class="bg-[var(--bg-subtle)] p-3 sm:p-5 rounded-lg border border-neutral-200 dark:border-neutral-800 flex justify-center overflow-x-auto min-h-[440px]">
      <div class="bg-white rounded shadow-sm border border-neutral-300 dark:border-neutral-700 overflow-hidden w-[330px] max-w-full">
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
      {#if closeLabel.includes('Transaksi')}
        <RefreshCw class="w-3.5 h-3.5" />
      {:else}
        <ArrowLeft class="w-3.5 h-3.5" />
      {/if}
      <span>{closeLabel}</span>
    </Button>
    <Button
      variant="primary"
      size="sm"
      disabled={!isReceiptEnabled}
      onclick={handlePrint}
      title={isReceiptEnabled ? 'Cetak Struk (Enter)' : 'Fitur cetak struk dinonaktifkan di Pengaturan'}
    >
      <Printer class="w-3.5 h-3.5" />
      <span>Cetak Struk (Enter)</span>
    </Button>
  {/snippet}
</Modal>
