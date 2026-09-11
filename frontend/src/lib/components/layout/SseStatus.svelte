<script lang="ts">
  import { sse } from '../../stores/sse.svelte';

  const labels = {
    online: 'Online',
    connecting: 'Connecting…',
    offline: 'Offline',
  };

  const dotStyles = {
    online: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]',
    connecting: 'bg-amber-500 animate-pulse',
    offline: 'bg-red-500',
  };

  const textStyles = {
    online: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/50',
    connecting: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/50',
    offline: 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/50',
  };
</script>

<div
  class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-medium tracking-tight select-none transition-colors {textStyles[sse.status]}"
  title={`Status Server: ${labels[sse.status]}`}
>
  <span class="w-1.5 h-1.5 rounded-full shrink-0 {dotStyles[sse.status]}"></span>
  <span class="hidden sm:inline">{labels[sse.status]}</span>
</div>
