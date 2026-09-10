// Formatters & helpers conforming to Vercel/Cloudflare tabular-nums and Indonesian Rupiah standards

export function formatRupiah(amount: number | bigint | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return 'Rp0,00';

  let num: bigint;
  let fractionStr = '00';

  if (typeof amount === 'bigint') {
    num = amount;
  } else if (typeof amount === 'number') {
    if (!Number.isFinite(amount)) return 'Rp0,00';
    const isNeg = amount < 0;
    const absVal = Math.abs(amount);
    const intPart = Math.floor(absVal);
    const fracPart = Math.round((absVal - intPart) * 100);
    num = BigInt(intPart) * (isNeg ? -1n : 1n);
    fractionStr = fracPart > 0 ? String(fracPart).padStart(2, '0') : '00';
  } else {
    let strVal = String(amount).trim();
    if (strVal.includes(',')) {
      const parts = strVal.split(',');
      const cleanedInt = parts[0].replace(/[^0-9-]/g, '');
      num = cleanedInt ? BigInt(cleanedInt) : 0n;
      const cleanedFrac = parts[1].replace(/[^0-9]/g, '').slice(0, 2);
      fractionStr = cleanedFrac.padEnd(2, '0');
    } else if (/\.\d{2}$/.test(strVal)) {
      const parts = strVal.split('.');
      const cleanedInt = parts[0].replace(/[^0-9-]/g, '');
      num = cleanedInt ? BigInt(cleanedInt) : 0n;
      fractionStr = parts[1].replace(/[^0-9]/g, '').slice(0, 2).padEnd(2, '0');
    } else {
      const cleaned = strVal.replace(/[^0-9-]/g, '');
      num = cleaned ? BigInt(cleaned) : 0n;
      fractionStr = '00';
    }
  }

  const isNegative = num < 0n;
  const absNum = isNegative ? -num : num;
  const str = absNum.toString();

  // Add thousand separators
  const parts: string[] = [];
  let remaining = str;
  while (remaining.length > 3) {
    parts.unshift(remaining.slice(-3));
    remaining = remaining.slice(0, -3);
  }
  if (remaining.length > 0) {
    parts.unshift(remaining);
  }

  const formattedInt = parts.length > 0 ? parts.join('.') : '0';
  return `${isNegative ? '-Rp' : 'Rp'}${formattedInt},${fractionStr}`;
}

export function splitRupiah(amount: number | bigint | string | null | undefined): { prefix: string; value: string } {
  const formatted = formatRupiah(amount);
  if (formatted.startsWith('-Rp')) {
    return { prefix: '-Rp', value: formatted.slice(3) };
  }
  if (formatted.startsWith('Rp')) {
    return { prefix: 'Rp', value: formatted.slice(2) };
  }
  return { prefix: 'Rp', value: formatted };
}

export function formatRupiahInput(val: number | bigint | string | null | undefined): string {
  if (val === null || val === undefined || val === '') return '';
  const num = parseNumber(val);
  if (num === 0) return '';
  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const str = absNum.toString();

  const parts: string[] = [];
  let remaining = str;
  while (remaining.length > 3) {
    parts.unshift(remaining.slice(-3));
    remaining = remaining.slice(0, -3);
  }
  if (remaining.length > 0) {
    parts.unshift(remaining);
  }

  const formattedInt = parts.length > 0 ? parts.join('.') : '0';
  return `${isNegative ? '-' : ''}${formattedInt}`;
}

/**
 * Format currency input dengan sen (digit-as-cents), identik dengan formatIDR di kasirku lama.
 * Input: integer dalam sen. Contoh: 1000000 → "10.000,00"
 * Digit yang diketik langsung geser ke kiri; 2 digit terakhir selalu jadi sen.
 */
export function formatIDR(rawCents: number): string {
  if (rawCents === 0) return '';
  const isNegative = rawCents < 0;
  const abs = Math.abs(rawCents);
  const intPart = Math.floor(abs / 100);
  const decPart = (abs % 100).toString().padStart(2, '0');
  const intStr = intPart.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${isNegative ? '-' : ''}${intStr},${decPart}`;
}

/**
 * Parse string input IDR (format "10.000,00") ke nilai integer dalam sen.
 * Identik dengan: str.replaceAll(".", "").replaceAll(",", "") di kasirku lama.
 * Contoh: "10.000,00" → 1000000
 */
export function parseIDR(val: string | number | null | undefined): number {
  if (val === null || val === undefined || val === '') return 0;
  const digits = String(val).replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

export function formatNumber(val: number | bigint | string | null | undefined): string {
  if (val === null || val === undefined || val === '') return '0';
  const num = typeof val === 'number' ? Math.round(val) : parseNumber(val);
  return new Intl.NumberFormat('id-ID').format(Number(num));
}

export function parseNumber(val: number | bigint | string | null | undefined): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return Math.round(val);
  if (typeof val === 'bigint') return Number(val);

  let s = String(val).trim();
  // Strip sen/fractional part if present e.g. "10.000,00" -> "10.000"
  if (s.includes(',')) {
    s = s.split(',')[0];
  } else if (/\.\d{2}$/.test(s)) {
    s = s.slice(0, -3);
  }
  const cleaned = s.replace(/[^0-9-]/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
}

export function formatDate(date: number | string | Date): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDateTime(date: number | string | Date): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}`;
}

export function getTanggalKey(d: Date | string | number = new Date()): number {
  const date = typeof d === 'string' && d.length === 10 && d.includes('-')
    ? new Date(`${d}T12:00:00`)
    : new Date(d);
  if (isNaN(date.getTime())) return 20260101;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return Number(`${y}${m}${day}`);
}

export function formatTanggalKey(key: number | string): string {
  const s = String(key);
  if (s.length !== 8) return s;
  const y = s.slice(0, 4);
  const m = s.slice(4, 6);
  const d = s.slice(6, 8);
  return `${y}-${m}-${d}`;
}

export function formatTanggalIndo(date: number | string | Date): string {
  const d = typeof date === 'string' && date.length === 8 && !date.includes('-')
    ? new Date(`${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T12:00:00`)
    : new Date(date);
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}
