<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-svelte';

  interface Props {
    value?: string; // "YYYY-MM-DD"
    placeholder?: string;
    disabled?: boolean;
    class?: string;
    align?: 'left' | 'right';
    min?: string;
    max?: string;
    clearable?: boolean;
    onchange?: (val: string) => void;
  }

  let {
    value = $bindable(''),
    placeholder = 'Pilih tanggal...',
    disabled = false,
    class: className = '',
    align = 'left',
    min,
    max,
    clearable = false,
    onchange
  }: Props = $props();

  let open = $state(false);
  let containerRef = $state<HTMLDivElement | null>(null);

  // Parse YYYY-MM-DD to Date object safely without timezone skew
  function parseDateStr(str: string): Date {
    if (!str || !/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return new Date();
    }
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function formatDateToStr(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const shortMonthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
  ];

  const dayNamesShort = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

  // Calendar view state (year and month currently displayed in popover)
  let viewYear = $state(new Date().getFullYear());
  let viewMonth = $state(new Date().getMonth()); // 0-11

  $effect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const d = parseDateStr(value);
      viewYear = d.getFullYear();
      viewMonth = d.getMonth();
    }
  });

  // Calculate calendar days
  let daysInMonth = $derived(new Date(viewYear, viewMonth + 1, 0).getDate());
  let firstDayOfMonth = $derived(new Date(viewYear, viewMonth, 1).getDay()); // 0 is Sunday
  let mondayOffset = $derived((firstDayOfMonth + 6) % 7); // Monday = 0, Sunday = 6

  // Formatted display in button
  let displayDate = $derived.by(() => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
    const d = parseDateStr(value);
    const day = String(d.getDate()).padStart(2, '0');
    const mName = shortMonthNames[d.getMonth()];
    const yr = d.getFullYear();
    return `${day} ${mName} ${yr}`;
  });

  function prevMonth() {
    if (viewMonth === 0) {
      viewMonth = 11;
      viewYear -= 1;
    } else {
      viewMonth -= 1;
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      viewMonth = 0;
      viewYear += 1;
    } else {
      viewMonth += 1;
    }
  }

  function isSelected(day: number): boolean {
    if (!value) return false;
    const current = parseDateStr(value);
    return (
      day === current.getDate() &&
      viewMonth === current.getMonth() &&
      viewYear === current.getFullYear()
    );
  }

  function isToday(day: number): boolean {
    const today = new Date();
    return (
      day === today.getDate() &&
      viewMonth === today.getMonth() &&
      viewYear === today.getFullYear()
    );
  }

  function isDayDisabled(day: number): boolean {
    const dStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (min && dStr < min) return true;
    if (max && dStr > max) return true;
    return false;
  }

  function selectDay(day: number) {
    if (isDayDisabled(day)) return;
    const newStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    value = newStr;
    onchange?.(newStr);
    open = false;
  }

  function selectToday() {
    const today = new Date();
    const str = formatDateToStr(today);
    value = str;
    viewYear = today.getFullYear();
    viewMonth = today.getMonth();
    onchange?.(str);
    open = false;
  }

  function selectYesterday() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const str = formatDateToStr(d);
    value = str;
    viewYear = d.getFullYear();
    viewMonth = d.getMonth();
    onchange?.(str);
    open = false;
  }

  function clearDate(e: MouseEvent) {
    e.stopPropagation();
    value = '';
    onchange?.('');
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) {
      open = false;
    }
  }

  function handleWindowClick(e: MouseEvent) {
    if (open && containerRef && !containerRef.contains(e.target as Node)) {
      open = false;
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} onclick={handleWindowClick} />

<div class="relative inline-block" bind:this={containerRef}>
  <!-- Modern Trigger Button -->
  <div class="inline-flex items-center h-8 rounded-md border transition-all duration-150
    border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900
    hover:border-neutral-400 dark:hover:border-neutral-600
    {open ? 'ring-1 ring-neutral-900 dark:ring-white border-neutral-900 dark:border-white shadow-2xs' : ''}
    {className}"
  >
    <button
      type="button"
      {disabled}
      onclick={() => (open = !open)}
      class="h-full min-w-0 px-2.5 rounded-md text-xs font-medium select-none flex items-center gap-2
        text-neutral-900 dark:text-neutral-100 focus:outline-none
        disabled:opacity-50 disabled:cursor-not-allowed"
      aria-haspopup="dialog"
      aria-expanded={open}
    >
      <CalendarIcon class="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 shrink-0" />
      <span class="tabular-nums {displayDate ? 'text-neutral-900 dark:text-neutral-100 font-medium' : 'text-neutral-400 dark:text-neutral-500'}">
        {displayDate || placeholder}
      </span>
    </button>
    {#if clearable && value}
      <button
        type="button"
        onclick={clearDate}
        class="mr-1.5 p-1 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-[var(--bg-hover)] transition-colors"
        title="Bersihkan tanggal"
        aria-label="Bersihkan tanggal"
      >
        <X class="w-3 h-3" />
      </button>
    {/if}
  </div>

  <!-- Interactive Calendar Popover -->
  {#if open}
    <div
      class="absolute top-full mt-1.5 z-50 w-72 p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800
        bg-[var(--bg-surface)] shadow-xl animate-in fade-in zoom-in-95 duration-150
        {align === 'right' ? 'right-0' : 'left-0'}"
    >
      <!-- Month & Year Controls -->
      <div class="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800/80">
        <span class="text-xs font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
          {monthNames[viewMonth]} {viewYear}
        </span>
        <div class="flex items-center gap-0.5">
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
            class="p-1 rounded-md text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-[var(--bg-hover)] transition-colors"
            onclick={nextMonth}
            aria-label="Bulan berikutnya"
          >
            <ChevronRight class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- Quick Shortcuts Bar -->
      <div class="flex items-center gap-1 py-1.5 border-b border-neutral-100 dark:border-neutral-800/60">
        <button
          type="button"
          class="px-2 py-0.5 rounded text-[10px] font-medium text-neutral-600 dark:text-neutral-300 hover:bg-[var(--bg-hover)] transition-colors"
          onclick={selectToday}
        >
          Hari Ini
        </button>
        <button
          type="button"
          class="px-2 py-0.5 rounded text-[10px] font-medium text-neutral-600 dark:text-neutral-300 hover:bg-[var(--bg-hover)] transition-colors"
          onclick={selectYesterday}
        >
          Kemarin
        </button>
      </div>

      <!-- Days of Week Header (Sen - Min) -->
      <div class="grid grid-cols-7 gap-1 text-center pt-2 pb-1 text-[10px] font-semibold text-neutral-400 dark:text-neutral-500">
        {#each dayNamesShort as dayName}
          <div>{dayName}</div>
        {/each}
      </div>

      <!-- Month Matrix -->
      <div class="grid grid-cols-7 gap-1 text-center text-xs">
        {#each Array(mondayOffset) as _}
          <div class="h-7 w-7"></div>
        {/each}

        {#each Array(daysInMonth) as _, i}
          {@const day = i + 1}
          {@const selected = isSelected(day)}
          {@const today = isToday(day)}
          {@const dayDisabled = isDayDisabled(day)}
          <button
            type="button"
            disabled={dayDisabled}
            onclick={() => selectDay(day)}
            class="h-7 w-7 rounded-md flex items-center justify-center text-[11px] font-medium transition-colors tabular-nums mx-auto
              {selected
                ? 'bg-[var(--brand)] text-[var(--accent-fg)] font-bold shadow-2xs'
                : today
                  ? 'border border-neutral-400 dark:border-neutral-500 text-neutral-900 dark:text-neutral-100 font-semibold hover:bg-[var(--bg-hover)]'
                  : 'text-neutral-700 dark:text-neutral-300 hover:bg-[var(--bg-hover)]'}
              {dayDisabled ? 'opacity-30 cursor-not-allowed hover:bg-transparent' : ''}"
          >
            {day}
          </button>
        {/each}
      </div>

      {#if clearable && value}
        <div class="mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800/80 flex justify-end">
          <button
            type="button"
            onclick={clearDate}
            class="text-[10px] font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            Hapus tanggal
          </button>
        </div>
      {/if}
    </div>
  {/if}
</div>
