<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-svelte';

  let open = $state(false);
  let triggerRef = $state<HTMLDivElement | null>(null);

  // Live real-time clock
  let currentTime = $state(new Date());
  let timer: any = null;

  onMount(() => {
    timer = setInterval(() => {
      currentTime = new Date();
    }, 1000);
  });

  onDestroy(() => {
    if (timer) clearInterval(timer);
  });

  // Calendar View State
  let viewDate = $state(new Date());

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const shortMonthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
  ];

  const dayNamesShort = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const dayNamesFull = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  // Matrix calculation
  let daysInMonth = $derived(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate());
  let firstDayOfMonth = $derived(new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay()); // 0 is Sunday

  // Monday-first offset (0 = Mon, 6 = Sun)
  let mondayOffset = $derived((firstDayOfMonth + 6) % 7);

  function prevMonth() {
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
  }

  function nextMonth() {
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
  }

  function resetToday() {
    viewDate = new Date();
  }

  function isToday(day: number): boolean {
    const today = new Date();
    return (
      day === today.getDate() &&
      viewDate.getMonth() === today.getMonth() &&
      viewDate.getFullYear() === today.getFullYear()
    );
  }

  // Formatters
  let formattedFullDate = $derived(
    `${dayNamesFull[currentTime.getDay()]}, ${String(currentTime.getDate()).padStart(2, '0')} ${shortMonthNames[currentTime.getMonth()]} ${currentTime.getFullYear()}`
  );

  let formattedTimeWithSecs = $derived(
    currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  );

  let formattedTimeShort = $derived(
    currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })
  );

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) {
      open = false;
    }
  }

  function handleWindowClick(e: MouseEvent) {
    if (open && triggerRef && !triggerRef.contains(e.target as Node)) {
      open = false;
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} onclick={handleWindowClick} />

<div class="relative inline-block" bind:this={triggerRef}>
  <!-- Modern Desk-Calendar Pill Trigger -->
  <button
    type="button"
    class="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg border text-left transition-all duration-150 select-none
      border-neutral-200/80 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60
      hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/80
      focus:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400
      {open ? 'ring-1 ring-neutral-900 dark:ring-white border-neutral-900 dark:border-white shadow-xs' : ''}"
    onclick={() => (open = !open)}
    aria-label="Buka kalender operasional toko"
    aria-expanded={open}
  >
    <!-- Desk Calendar Icon Badge -->
    <div class="w-8 h-8 rounded-md border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col items-center justify-between bg-white dark:bg-neutral-900 shadow-2xs shrink-0">
      <div class="w-full bg-rose-500 dark:bg-rose-600 text-white text-[8px] font-bold uppercase tracking-wider text-center py-0.5 leading-none">
        {shortMonthNames[currentTime.getMonth()]}
      </div>
      <div class="text-[13px] font-bold text-neutral-900 dark:text-neutral-100 leading-none pb-1 tabular-nums">
        {currentTime.getDate()}
      </div>
    </div>

    <!-- Date & Clock Text (shown on sm and up) -->
    <div class="hidden sm:flex flex-col text-left">
      <div class="flex items-center gap-1.5">
        <span class="text-xs font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
          {formattedFullDate}
        </span>
      </div>
      <div class="flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400 tabular-nums font-medium">
        <Clock class="w-3 h-3 text-neutral-400 shrink-0" />
        <span>{formattedTimeShort}</span>
      </div>
    </div>
  </button>

  <!-- Calendar Interactive Popover Dropdown -->
  {#if open}
    <div
      class="absolute right-0 top-full mt-2 z-50 w-72 max-w-[calc(100vw-2rem)] p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800
        bg-[var(--bg-surface)] shadow-xl animate-in fade-in zoom-in-95 duration-150"
    >
      <!-- Popover Header: Month & Year Navigator -->
      <div class="flex items-center justify-between pb-2.5 border-b border-neutral-100 dark:border-neutral-800/80">
        <div>
          <h4 class="text-xs font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
            {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
          </h4>
        </div>
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="p-1 rounded-md text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-[var(--bg-hover)] transition-colors"
            onclick={prevMonth}
            aria-label="Bulan sebelumnya"
          >
            <ChevronLeft class="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            class="px-1.5 py-0.5 rounded text-[10px] font-medium text-neutral-600 dark:text-neutral-300 hover:bg-[var(--bg-hover)] transition-colors"
            onclick={resetToday}
          >
            Hari Ini
          </button>
          <button
            type="button"
            class="p-1 rounded-md text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-[var(--bg-hover)] transition-colors"
            onclick={nextMonth}
            aria-label="Bulan berikutnya"
          >
            <ChevronRight class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- Days of Week Header (Sen - Min) -->
      <div class="grid grid-cols-7 gap-1 text-center py-2 text-[10px] font-semibold text-neutral-400 dark:text-neutral-500">
        <div>Sen</div>
        <div>Sel</div>
        <div>Rab</div>
        <div>Kam</div>
        <div>Jum</div>
        <div class="text-rose-400 dark:text-rose-500">Sab</div>
        <div class="text-rose-500 dark:text-rose-400">Min</div>
      </div>

      <!-- Days Matrix -->
      <div class="grid grid-cols-7 gap-1 text-center text-xs">
        {#each Array(mondayOffset) as _}
          <div class="h-7 w-7"></div>
        {/each}

        {#each Array(daysInMonth) as _, i}
          {@const day = i + 1}
          {@const active = isToday(day)}
          <div class="flex items-center justify-center">
            <span
              class="h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-medium transition-colors tabular-nums
                {active
                  ? 'bg-[var(--brand)] text-[var(--accent-fg)] font-bold shadow-xs'
                  : 'text-neutral-700 dark:text-neutral-300 hover:bg-[var(--bg-hover)]'}"
            >
              {day}
            </span>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
