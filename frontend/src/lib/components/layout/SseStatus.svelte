<script lang="ts">
  import { sse } from '../../stores/sse.svelte';

  const isOnline = $derived(sse.status === 'online');
</script>

<div
  class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-medium tracking-tight select-none cursor-default transition-colors {isOnline ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/50' : 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/50'}"
  title={isOnline ? 'Status Server: Online (Realtime aktif)' : 'Status Server: Offline (Otomatis mencoba menghubungkan kembali...)'}
>
  <span class="w-1.5 h-1.5 rounded-full shrink-0 {isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-red-500'}"></span>
  <span>{isOnline ? 'Online' : 'Offline'}</span>
</div>
