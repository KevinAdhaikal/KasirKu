<script lang="ts">
  import { sse } from '../../stores/sse.svelte';
  import { RefreshCw } from 'lucide-svelte';

  const isReconnecting = $derived(sse.isTokenReconnecting);
  const isOnline = $derived(sse.status === 'online' || isReconnecting);
</script>

<div
  class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-medium tracking-tight select-none cursor-default transition-colors {isReconnecting ? 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/50' : (isOnline ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/50' : 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/50')}"
  title={isReconnecting ? 'Status Server: Online (Menghubungkan ke sesi token baru...)' : (isOnline ? 'Status Server: Online (Realtime aktif)' : 'Status Server: Offline (Otomatis mencoba menghubungkan kembali...)')}
>
  {#if isReconnecting}
    <RefreshCw class="w-2.5 h-2.5 animate-spin text-blue-500 shrink-0" />
    <span>Online (Menyinkronkan...)</span>
  {:else}
    <span class="w-1.5 h-1.5 rounded-full shrink-0 {isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-red-500'}"></span>
    <span>{isOnline ? 'Online' : 'Offline'}</span>
  {/if}
</div>
