import { formatRupiah, formatNumber, formatDateTime } from './format';
import type { ReceiptData } from '../components/pos/PaymentModal.svelte';

export interface StoreInfo {
  name?: string | null;
  desc?: string | null;
  address?: string | null;
  phone_num?: string | null;
}

export interface TemplateVariable {
  key: string;
  label: string;
  example: string;
  category: 'toko' | 'transaksi' | 'produk' | 'pembayaran';
}

export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  // Toko
  { key: '{{nama_toko}}', label: 'Nama Toko / Usaha', example: 'EXMAPLE MART', category: 'toko' },
  { key: '{{deskripsi_toko}}', label: 'Deskripsi / Slogan', example: 'Sahabat Belanja Hemat', category: 'toko' },
  { key: '{{alamat_toko}}', label: 'Alamat Lengkap Toko', example: 'Jl. Example No. 1, Jakarta', category: 'toko' },
  { key: '{{telepon_toko}}', label: 'Nomor Telepon / WA', example: '0812-3456-7890', category: 'toko' },

  // Transaksi
  { key: '{{no_struk}}', label: 'Nomor Struk / Nota', example: `TRX-${Date.now()}`, category: 'transaksi' },
  { key: '{{tanggal}}', label: 'Tanggal & Jam Transaksi', example: '19-07-2026 14:32:08', category: 'transaksi' },
  { key: '{{kasir}}', label: 'Nama Kasir yang Bertugas', example: 'John Doe', category: 'transaksi' },

  // Produk
  { key: '{{daftar_barang}}', label: 'Daftar Item / Produk (HTML Table)', example: 'Tabel daftar item belanjaan', category: 'produk' },
  { key: '{{total_barang}}', label: 'Total Jumlah Barang', example: '7 item', category: 'produk' },

  // Pembayaran
  { key: '{{total_belanja}}', label: 'Total Pembayaran', example: 'Rp172.000,00', category: 'pembayaran' },
  { key: '{{tunai}}', label: 'Jumlah Uang Tunai', example: 'Rp200.000,00', category: 'pembayaran' },
  { key: '{{kembalian}}', label: 'Jumlah Uang Kembalian', example: 'Rp28.000,00', category: 'pembayaran' },
];

export const RECEIPT_PRESETS = [
  {
    id: 'common_struk',
    name: 'Struk Rinci & Lengkap',
    description: 'Format struk ritel lengkap dengan pembagian baris, tabel item dinamis, dan header rapi.',
    template: `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Struk Belanja</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            background: #ffffff;
            color: #000000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            display: flex;
            justify-content: center;
            padding: 8px;
        }

        .receipt {
            background: white;
            color: black;
            width: 100%;
            max-width: 330px;
            font-size: 12px;
            line-height: 1.4;
            word-break: break-word;
            overflow-wrap: anywhere;
        }

        @media print {
            @page {
                margin: 0;
                size: auto;
            }
            body {
                padding: 0;
                background: white;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .receipt {
                width: 100% !important;
                max-width: 100% !important;
                padding: 0;
                margin: 0;
            }
        }

        .store-name {
            text-align: center;
            font-size: 16px;
            font-weight: bold;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
            text-transform: uppercase;
        }
        .store-tagline {
            text-align: center;
            font-size: 10px;
            margin-bottom: 4px;
            color: #333;
        }
        .store-info {
            text-align: center;
            font-size: 10px;
            line-height: 1.3;
            margin-bottom: 4px;
        }

        .divider {
            border: none;
            border-top: 1px dashed black;
            margin: 6px 0;
        }
        .divider-dot {
            border: none;
            border-top: 1px dotted black;
            margin: 6px 0;
        }

        .row {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            margin: 2px 0;
        }
        .label {
            white-space: nowrap;
        }
        .value {
            text-align: right;
            font-weight: 500;
        }

        .item-list {
            width: 100%;
            margin: 4px 0;
        }
        .item-header {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            font-weight: bold;
            border-bottom: 1px solid black;
            padding-bottom: 2px;
            margin-bottom: 4px;
            gap: 4px;
        }
        .item-header .item-name {
            flex: 1;
            min-width: 0;
        }
        .item-header .item-qty {
            width: 24px;
            text-align: center;
            flex-shrink: 0;
        }
        .item-header .item-price {
            width: 66px;
            text-align: right;
            flex-shrink: 0;
        }
        .item-header .item-total {
            width: 72px;
            text-align: right;
            flex-shrink: 0;
        }
        .item {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            font-size: 11px;
            line-height: 1.35;
            margin-bottom: 4px;
            gap: 4px;
        }
        .item-name {
            flex: 1;
            min-width: 0;
            word-break: break-word;
            overflow-wrap: anywhere;
            white-space: normal;
        }
        .item-qty {
            width: 24px;
            text-align: center;
            white-space: nowrap;
            flex-shrink: 0;
        }
        .item-price {
            width: 66px;
            text-align: right;
            white-space: nowrap;
            flex-shrink: 0;
        }
        .item-total {
            width: 72px;
            text-align: right;
            font-weight: bold;
            white-space: nowrap;
            flex-shrink: 0;
        }

        .summary, .payment {
            font-size: 11px;
        }
        .total-row {
            font-weight: bold;
            font-size: 13px;
            border-top: 1.5px solid black;
            padding-top: 4px;
            margin-top: 4px;
        }
        .change {
            font-weight: bold;
            font-size: 12px;
        }

        .footer {
            text-align: center;
            font-size: 10px;
            line-height: 1.4;
            margin-top: 8px;
        }
        .thank-you {
            font-weight: bold;
            font-size: 11px;
            margin-bottom: 3px;
        }
    </style>
</head>
<body>

    <div class="receipt">

        <!-- TOKO -->
        <div class="store-name">{{nama_toko}}</div>
        <div class="store-tagline">{{deskripsi_toko}}</div>
        <div class="store-info">
            {{alamat_toko}}<br>
            Telp: {{telepon_toko}}
        </div>

        <hr class="divider-dot">

        <!-- META TRANSAKSI -->
        <div class="row"><span class="label">No. Struk</span><span class="value">{{no_struk}}</span></div>
        <div class="row"><span class="label">Tgl / Jam</span><span class="value">{{tanggal}}</span></div>
        <div class="row"><span class="label">Kasir</span><span class="value">{{kasir}}</span></div>

        <hr class="divider">

        <!-- DAFTAR ITEM -->
        <div class="item-list">
            <div class="item-header">
                <span class="item-name">Nama Barang</span>
                <span class="item-qty">Qty</span>
                <span class="item-price">Harga</span>
                <span class="item-total">Total</span>
            </div>
            {{daftar_barang}}
        </div>

        <hr class="divider">

        <!-- RINGKASAN -->
        <div class="summary">
            <div class="row"><span class="label">Total Item</span><span class="value">{{total_barang}}</span></div>
            <div class="row total-row"><span class="label">TOTAL</span><span class="value">{{total_belanja}}</span></div>
        </div>

        <hr class="divider-dot">

        <!-- PEMBAYARAN -->
        <div class="payment">
            <div class="row"><span class="label">Tunai</span><span class="value">{{tunai}}</span></div>
            <div class="row change"><span class="label">Kembali</span><span class="value">{{kembalian}}</span></div>
        </div>

        <hr class="divider-dot">

        <!-- FOOTER -->
        <div class="footer">
            <div class="thank-you">*** TERIMA KASIH ***</div>
            <div>
                Barang yang sudah dibeli tidak dapat ditukar / dikembalikan.<br>
                Simpan struk ini sebagai bukti pembayaran sah.
            </div>
        </div>

    </div>

</body>
</html>`
  },
  {
    id: 'modern',
    name: 'Modern & Bersih 80mm',
    description: 'Format lebar 80mm yang rapi dengan typography jelas dan tabel tegas.',
    template: `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Struk 80mm</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #fff;
        color: #111;
        display: flex;
        justify-content: center;
        padding: 12px;
      }
      .receipt {
        width: 100%;
        max-width: 380px;
        font-size: 12px;
        line-height: 1.5;
        word-break: break-word;
        overflow-wrap: anywhere;
      }
      .header { text-align: center; padding-bottom: 10px; border-bottom: 2px solid #222; }
      .header h2 { font-size: 18px; font-weight: 800; text-transform: uppercase; }
      .meta { display: flex; justify-content: space-between; font-size: 11px; margin: 8px 0; color: #333; }
      .items-table { width: 100%; margin: 8px 0; border-top: 1px solid #ddd; border-bottom: 1px solid #ddd; padding: 6px 0; }
      .totals { font-size: 12px; line-height: 1.6; }
      .totals .grand-total { font-size: 15px; font-weight: 800; border-top: 2px solid #222; padding-top: 4px; margin-top: 4px; }
      .footer { text-align: center; margin-top: 12px; padding-top: 8px; border-top: 1px dashed #ccc; font-size: 10px; color: #555; }
    </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <h2>{{nama_toko}}</h2>
      <p style="font-size: 11px; color: #555;">{{deskripsi_toko}}</p>
      <p style="font-size: 10px; color: #777;">{{alamat_toko}} • {{telepon_toko}}</p>
    </div>

    <div class="meta">
      <div>
        <div>Nota: <b>{{no_struk}}</b></div>
        <div>Kasir: {{kasir}}</div>
      </div>
      <div style="text-align: right;">
        <div>{{tanggal}}</div>
      </div>
    </div>

    <div class="items-table">
      {{daftar_barang}}
    </div>

    <div class="totals">
      <div style="display: flex; justify-content: space-between; color: #555;">
        <span>Jumlah Item</span>
        <span>{{total_barang}}</span>
      </div>
      <div class="grand-total" style="display: flex; justify-content: space-between;">
        <span>TOTAL</span>
        <span>{{total_belanja}}</span>
      </div>
      <div style="display: flex; justify-content: space-between; color: #333;">
        <span>Tunai</span>
        <span>{{tunai}}</span>
      </div>
      <div style="display: flex; justify-content: space-between; color: #333;">
        <span>Kembalian</span>
        <span>{{kembalian}}</span>
      </div>
    </div>

    <div class="footer">
      <p style="font-weight: 700; color: #222;">Terima Kasih Atas Kunjungan Anda!</p>
      <p style="margin-top: 2px;">Simpan struk ini sebagai bukti transaksi sah.</p>
    </div>
  </div>
</body>
</html>`
  },
  {
    id: 'minimal',
    name: 'Minimalis Ringkas',
    description: 'Format hemat kertas thermal untuk operasional kasir cepat.',
    template: `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #fff; color: #000; font-size: 11px; line-height: 1.3; display: flex; justify-content: center; padding: 4px; }
      .receipt { width: 100%; max-width: 280px; word-break: break-word; overflow-wrap: anywhere; }
    </style>
</head>
<body>
  <div class="receipt">
    <div style="text-align: center; margin-bottom: 4px;">
      <b style="font-size: 13px;">{{nama_toko}}</b>
      <div style="font-size: 10px;">{{telepon_toko}}</div>
    </div>
    <div style="border-bottom: 1px dashed #000; margin-bottom: 4px;"></div>
    <div style="display: flex; justify-content: space-between; font-size: 10px;">
      <span>{{no_struk}}</span>
      <span>{{tanggal}}</span>
    </div>
    <div style="border-bottom: 1px dashed #000; margin: 4px 0;"></div>
    {{daftar_barang}}
    <div style="border-bottom: 1px dashed #000; margin: 4px 0;"></div>
    <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 12px;">
      <span>TOTAL:</span>
      <span>{{total_belanja}}</span>
    </div>
    <div style="display: flex; justify-content: space-between; font-size: 10px; margin-top: 2px;">
      <span>TUNAI / KEMBALI:</span>
      <span>{{tunai}} / {{kembalian}}</span>
    </div>
    <div style="text-align: center; margin-top: 6px; font-size: 10px;">
      -- TERIMA KASIH --
    </div>
  </div>
</body>
</html>`
  }
];

export function generateItemsHtml(items: Array<{ nama_barang: string; harga_jual: number; jumlah_barang: number }>): string {
  if (!items || items.length === 0) {
    return `<div style="color: #888; text-align: center; padding: 4px 0; font-size: 11px;">(Tidak ada item)</div>`;
  }

  return items
    .map((item) => {
      const subtotal = item.harga_jual * item.jumlah_barang;
      return `<div class="item" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; font-size: 11px; line-height: 1.35; gap: 4px;">
        <span class="item-name" style="flex: 1; min-width: 0; word-break: break-word; overflow-wrap: anywhere; white-space: normal;">${item.nama_barang}</span>
        <span class="item-qty" style="width: 24px; text-align: center; white-space: nowrap; flex-shrink: 0;">${formatNumber(item.jumlah_barang)}</span>
        <span class="item-price" style="width: 66px; text-align: right; white-space: nowrap; flex-shrink: 0;">${formatRupiah(item.harga_jual)}</span>
        <span class="item-total" style="width: 72px; text-align: right; font-weight: bold; white-space: nowrap; flex-shrink: 0;">${formatRupiah(subtotal)}</span>
      </div>`;
    })
    .join('');
}

export function renderReceiptHtml(
  template: string | null | undefined,
  data?: Partial<ReceiptData> | null,
  storeInfo?: StoreInfo | null
): string {
  let content = template && template.trim() ? template : RECEIPT_PRESETS[0].template;

  const namaToko = storeInfo?.name?.trim() || 'KASIRKU POS';
  const descToko = storeInfo?.desc?.trim() || '';
  const alamatToko = storeInfo?.address?.trim() || '';
  const telpToko = storeInfo?.phone_num?.trim() || '';

  const noStruk = data?.receiptNo || 'TRX-20260719-004281';
  const tanggal = data?.timestamp ? formatDateTime(data.timestamp) : formatDateTime(Date.now());
  const kasir = data?.cashierName || 'Kasir Utama';
  const totalBarang = data?.totalItems !== undefined ? `${formatNumber(data.totalItems)} item` : '7 item';
  const totalBelanja = data?.totalAmount !== undefined ? formatRupiah(data.totalAmount) : 'Rp 172.000';
  const tunai = data?.cashPaid !== undefined ? formatRupiah(data.cashPaid) : 'Rp 200.000';
  const kembalian = data?.changeAmount !== undefined ? formatRupiah(data.changeAmount) : 'Rp 28.000';

  const dummyItems = [
    { nama_barang: 'Indomie Goreng Rasa Ayam Geprek Sambal Korek Pedas Nampol Limited Edition', harga_jual: 3500, jumlah_barang: 2 },
    { nama_barang: 'Telur Ayam 1kg', harga_jual: 28000, jumlah_barang: 1 },
    { nama_barang: 'Beras Ramos 5kg', harga_jual: 67500, jumlah_barang: 1 },
    { nama_barang: 'Minyak Goreng Bimoli 2L', harga_jual: 36000, jumlah_barang: 1 },
    { nama_barang: 'Kopi Kapal Api Special', harga_jual: 16500, jumlah_barang: 1 },
    { nama_barang: 'Roti Tawar Sari', harga_jual: 14000, jumlah_barang: 1 },
    { nama_barang: 'Sabun Lifebuoy Merah', harga_jual: 4200, jumlah_barang: 2 },
  ];

  const itemsList = data?.items && data.items.length > 0 ? data.items : dummyItems;
  const daftarBarangHtml = generateItemsHtml(itemsList);

  const rendered = content
    .replaceAll('{{nama_toko}}', namaToko)
    .replaceAll('{{deskripsi_toko}}', descToko)
    .replaceAll('{{alamat_toko}}', alamatToko)
    .replaceAll('{{telepon_toko}}', telpToko)
    .replaceAll('{{no_struk}}', noStruk)
    .replaceAll('{{tanggal}}', tanggal)
    .replaceAll('{{kasir}}', kasir)
    .replaceAll('{{daftar_barang}}', daftarBarangHtml)
    .replaceAll('{{total_barang}}', totalBarang)
    .replaceAll('{{total_belanja}}', totalBelanja)
    .replaceAll('{{tunai}}', tunai)
    .replaceAll('{{kembalian}}', kembalian);

  // If content is a snippet without full <html> wrapper, wrap it cleanly for iframe rendering
  if (!rendered.includes('<html') && !rendered.includes('<!DOCTYPE')) {
    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #ffffff;
      color: #000000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      justify-content: center;
      padding: 8px;
    }
  </style>
</head>
<body>
  ${rendered}
</body>
</html>`;
  }

  return rendered;
}
