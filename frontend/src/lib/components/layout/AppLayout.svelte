<script lang="ts">
  import type { Snippet } from 'svelte';
  import Sidebar from './Sidebar.svelte';
  import Topbar from './Topbar.svelte';
  import { ui } from '../../stores/ui.svelte';
  import { sse } from '../../stores/sse.svelte';
  import { WifiOff, RefreshCw } from 'lucide-svelte';

  interface Props {
    children?: Snippet;
  }

  let { children }: Props = $props();

  const isSseDown = $derived(sse.status !== 'online');
</script>

<div class="min-h-screen flex bg-[var(--bg-canvas)] text-neutral-900 dark:text-neutral-100">
  <!-- Left Sidebar (fixed on desktop, off-canvas on mobile) -->
  <Sidebar />

  <!-- Main Content Wrapper with dynamic responsive padding -->
  <div class="flex-1 flex flex-col min-w-0 transition-all duration-200 ease-out {ui.sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'}">
    <Topbar ontogglemobile={() => ui.toggleMobileSidebar()} />

    {#if isSseDown}
      <div class="bg-red-500/10 dark:bg-red-950/40 border-b border-red-500/20 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 text-red-700 dark:text-red-400 text-xs transition-all select-none">
        <div class="flex items-center gap-2 min-w-0">
          <WifiOff class="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
          <p class="truncate sm:whitespace-normal font-medium">
            Koneksi ke server terputus. Seluruh input, tombol aksi, dan konten dinonaktifkan sementara hingga tersambung kembali.
          </p>
        </div>
      </div>
    {/if}

    <main
      inert={isSseDown ? true : undefined}
      class="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto transition-all duration-200 {isSseDown ? 'opacity-40 pointer-events-none select-none cursor-not-allowed [&_*]:pointer-events-none' : ''}"
    >
      {@render children?.()}
    </main>

    <footer class="border-t border-neutral-200/80 dark:border-neutral-800/80 bg-[var(--bg-surface)]/80 dark:bg-[var(--bg-surface)]/80 dark:border-[var(--border-subtle)] backdrop-blur-md text-xs text-neutral-500 dark:text-neutral-400 py-3 px-4 sm:px-6 lg:px-8 mt-auto">
      <div class="max-w-7xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
        
        <!-- Kiri: Copyright & Link Profil -->
        <div class="flex items-center gap-1.5">
          <span>&copy; {new Date().getFullYear()}</span>
          <a 
            href="https://github.com/kevinadhaikal" 
            target="_blank" 
            rel="noopener noreferrer"
            class="font-medium text-neutral-700 dark:text-neutral-200 hover:text-neutral-950 dark:hover:text-white underline decoration-neutral-300 dark:decoration-neutral-700 underline-offset-4 transition-colors"
          >
            Kevin Adhaikal
          </a>
        </div>

        <!-- Kanan: Link Repo KasirKu -->
        <a
          href="https://github.com/kevinadhaikal/kasirku"
          target="_blank"
          rel="noopener noreferrer"
          class="group inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 transition-colors"
        >
          <span>KasirKu v2.5</span>
          <svg class="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>

      </div>
    </footer>
  </div>
</div>
