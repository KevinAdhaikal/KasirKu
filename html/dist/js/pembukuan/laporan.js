global.total = new Map(); // --> {barang: number, harga_barang: bigint, pengeluaran: bigint}
global.element = {
    tanggal_laporan_start: document.getElementById("tanggal_laporan_start"),
    tanggal_laporan_end: document.getElementById("tanggal_laporan_end"),
    tanggal_laporan_start_picker: new Datepicker(document.getElementById("tanggal_laporan_start"), {
        autohide: true,
        format: "yyyy/mm/dd"
    }),
    tanggal_laporan_end_picker: new Datepicker(document.getElementById("tanggal_laporan_end"), {
        autohide: true,
        format: "yyyy/mm/dd"
    }),
    total_penjualan_barang: document.getElementById("total_penjualan_barang"),
    total_uang_penjualan: document.getElementById("total_uang_penjualan"),
    total_uang_pengeluaran: document.getElementById("total_uang_pengeluaran"),
    total_pendapatan: document.getElementById("total_pendapatan"),

    penjualan_table: $("#penjualan_table").DataTable({
        columns: [
            {
                data: 0,
                render: $.fn.dataTable.render.text()
            },
            {
                data: 1,
                render: $.fn.dataTable.render.text()
            },
            {
                data: 2,
                render: $.fn.dataTable.render.text()
            }
        ],
    }),
    pengeluaran_table: $("#pengeluaran_table").DataTable({
        columns: [
            {
                data: 0,
                render: $.fn.dataTable.render.text()
            },
            {
                data: 1,
                render: $.fn.dataTable.render.text()
            }
        ],
    })
}

global.deinit = () => {
    global.element.tanggal_laporan_start.removeEventListener("changeDate", tanggal_laporan_start_event);
    global.element.tanggal_laporan_end.removeEventListener("changeDate", tanggal_laporan_end_event);
    global.remove_sse_handler(sse_handler);
}

global.add_sse_handler(sse_handler);

async function sse_handler(e) {
    if (e.type === 4 || e.type === 5) {
        const tanggal_start = Number(global.element.tanggal_laporan_start.value.replaceAll("/", ""));
        const tanggal_end = Number(global.element.tanggal_laporan_end.value.replaceAll("/", ""));
        const t = e.data.tanggal_key;

        if (t >= tanggal_start && t <= tanggal_end) fetch_laporan();
    }
}

async function tanggal_laporan_start_event(e) {
    const selectedDate = e.detail.date;
    
    global.element.tanggal_laporan_end_picker.setOptions({
        minDate: selectedDate
    });

    if (global.element.tanggal_laporan_end_picker.getDate() < selectedDate || global.element.tanggal_laporan_end_picker.getDate("yyyy") !== global.element.tanggal_laporan_start.value.slice(0, 4)) global.element.tanggal_laporan_end_picker.setDate(selectedDate);
    await fetch_laporan();
}

async function tanggal_laporan_end_event() {
    await fetch_laporan();
}

async function fetch_laporan() {
    if (!global.element.tanggal_laporan_start.value || !global.element.tanggal_laporan_end.value) return;

    global.total.clear();
    global.element.pengeluaran_table.clear();
    global.element.penjualan_table.clear();

    let res = await fetch(`/api/laporan?tanggal_start=${global.element.tanggal_laporan_start.value.replaceAll("/", "")}&tanggal_end=${global.element.tanggal_laporan_end.value.replaceAll("/", "")}`, {
        method: "GET",
        headers: {
            token: localStorage.getItem("token")
        }
    });

    if (res.status === 200) {
        const res_json = await res.json();

        // penjualan
        res_json.penjualan.forEach(data => {
            data.tanggal_key = String(data.tanggal_key);
            
            let t = global.total.get(data.tanggal_key);

            if (!t) {
                t = {
                    barang: 0,
                    penjualan: 0n,
                    pengeluaran: 0n
                };
                global.total.set(data.tanggal_key, t);
            }

            t.penjualan += BigInt(data.total_harga_jual);
            t.barang += data.total_barang;
        });
        
        // pengeluaran
        res_json.pengeluaran.forEach(data => {
            data.tanggal_key = String(data.tanggal_key);
            let t = global.total.get(data.tanggal_key);

            if (!t) {
                t = {
                    barang: 0,
                    penjualan: 0n,
                    pengeluaran: 0n
                };
                global.total.set(data.tanggal_key, t);
            }

            t.pengeluaran += BigInt(data.jumlah_uang);
        });

        const res_total = {
            barang: 0,
            penjualan: 0n,
            pengeluaran: 0n
        };

        for (const [tanggal, data] of global.total) {
            const tanggal_text = tanggal.slice(0,4) + "/" + tanggal.slice(4,6) + "/" + tanggal.slice(6,8);
            global.element.penjualan_table.row.add([
                tanggal_text, format_thousand_separator.format(data.barang), "Rp" + money_format_bigint(data.penjualan)
            ])
            global.element.pengeluaran_table.row.add([
                tanggal_text, "Rp" + money_format_bigint(data.pengeluaran)
            ]);

            res_total.barang += data.barang;
            res_total.penjualan += data.penjualan;
            res_total.pengeluaran += data.pengeluaran;
        }

        global.element.total_penjualan_barang.innerText = format_thousand_separator.format(res_total.barang);
        global.element.total_uang_penjualan.innerText = "Rp" + money_format_bigint(res_total.penjualan);
        global.element.total_uang_pengeluaran.innerText = "Rp" + money_format_bigint(res_total.pengeluaran);
        global.element.total_pendapatan.innerText = "Rp" + money_format_bigint(res_total.penjualan - res_total.pengeluaran);
    }
    else {
        const status = await res.text();

        switch(status) {
            default: {
                swal2_mixin.fire({
                    icon: "error",
                    title: "Terjadi Kesalahan! Silahkan coba lagi nanti."
                });
                break;
            }
        }
    }

    global.element.pengeluaran_table.draw();
    global.element.penjualan_table.draw();
}

async function hitung_total() {

}

(async function() {
    global.element.tanggal_laporan_start_picker.setDate(Date.now());
    global.element.tanggal_laporan_end_picker.setDate(Date.now());
    global.element.tanggal_laporan_start.addEventListener("changeDate", tanggal_laporan_start_event);
    global.element.tanggal_laporan_end.addEventListener("changeDate", tanggal_laporan_end_event);
    fetch_laporan();
})();