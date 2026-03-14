global.element = {
    barang_terjual: document.getElementById("barang_terjual"),
    total_harga_jual: document.getElementById("total_harga_jual"),
    total_pengeluaran: document.getElementById("total_pengeluaran"),
    total_keuntungan: document.getElementById("total_keuntungan"),
    total_pendapatan: document.getElementById("total_pendapatan"),
    t_barang_total_terjual_start: document.getElementById("t_barang_total_terjual_start"),
    t_barang_total_terjual_end: document.getElementById("t_barang_total_terjual_end"),
    t_barang_total_terjual_start_picker: new Datepicker(document.getElementById("t_barang_total_terjual_start"), {
        autohide: true,
        format: "yyyy/mm/dd"
    }),
    t_barang_total_terjual_end_picker: new Datepicker(document.getElementById("t_barang_total_terjual_end"), {
        autohide: true,
        format: "yyyy/mm/dd"
    }),

    barang_kosong_table: $("#barang_kosong_table").DataTable({
        columns: [
            {
                data: 0,
                render: $.fn.dataTable.render.text()
            }
        ],
        columnDefs: [
            {
                targets: 0,
                width: "300px"
            }
        ],
        autoWidth: false
    }),
    barang_total_terjual_table: $("#barang_total_terjual_table").DataTable({
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
        columnDefs: [
            {
                targets: 0,
                width: "700px"
            }
        ],
        autoWidth: false
    }),

    date: new Date()
}

global.deinit = () => {
    global.element.t_barang_total_terjual_start.removeEventListener("changeDate", tanggal_total_terjual_start_event);
    global.element.t_barang_total_terjual_end.removeEventListener("changeDate", tanggal_total_terjual_end_event);
}

async function tanggal_total_terjual_start_event(e) {
    const selectedDate = e.detail.date;
    
    global.element.t_barang_total_terjual_end_picker.setOptions({
        minDate: selectedDate
    });

    if (global.element.t_barang_total_terjual_end_picker.getDate() < selectedDate || global.element.t_barang_total_terjual_end_picker.getDate("yyyy") !== global.element.t_barang_total_terjual_start.value.slice(0, 4)) global.element.t_barang_total_terjual_end_picker.setDate(selectedDate);
    await fetch_barang_terjual_tanggal();
}

async function tanggal_total_terjual_end_event() {
    await fetch_barang_terjual_tanggal();
}

async function fetch_info_total_hari_ini() {
    const y = global.element.date.getFullYear();
    const m = String(global.element.date.getMonth() + 1).padStart(2, "0");
    const day = String(global.element.date.getDate()).padStart(2, "0");

    let res = await fetch(`/api/info_total?tanggal_key=${y}${m}${day}`, {
        method: "GET",
        headers: {
            token: localStorage.getItem("token")
        }
    });

    if (res.status === 200) {
        const res_json = await res.json();
        global.element.barang_terjual.innerText = format_thousand_separator.format(res_json.total_barang);
        global.element.total_harga_jual.innerText = "Rp" + money_format_bigint(BigInt((res_json.total_harga_jual ?? 0)));
        global.element.total_pengeluaran.innerText = "Rp" + money_format_bigint(BigInt((res_json.jumlah_uang ?? 0)));
        global.element.total_keuntungan.innerText = "Rp" + money_format_bigint(BigInt(res_json.total_harga_jual - res_json.total_harga_modal ?? 0));
        global.element.total_pendapatan.innerText = "Rp" + money_format_bigint(BigInt(res_json.total_harga_jual - res_json.jumlah_uang ?? 0));
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
}

async function fetch_barang_kosong() {
    global.element.barang_kosong_table.clear();

    let res = await fetch(`/api/barang_kosong`, {
        method: "GET",
        headers: {
            token: localStorage.getItem("token")
        }
    });

    if (res.status === 200) {
        const res_json = await res.json();

        res_json.forEach(data => {
            global.element.barang_kosong_table.row.add([
                data.nama_barang
            ]);
        })
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

    global.element.barang_kosong_table.draw();
}

async function fetch_barang_terjual_tanggal() {
    global.element.barang_total_terjual_table.clear();
    let res = await fetch(`/api/penjualan_item_tanggal?tanggal_start=${global.element.t_barang_total_terjual_start.value.replaceAll("/", "")}&tanggal_end=${global.element.t_barang_total_terjual_end.value.replaceAll("/", "")}`, {
        method: "GET",
        headers: {
            token: localStorage.getItem("token")
        }
    });

    if (res.status === 200) {
        const res_json = await res.json();

        res_json.forEach(data => {
            
            global.element.barang_total_terjual_table.row.add([
                data.nama_barang,
                format_thousand_separator.format(data.jumlah)
            ]);
        })
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
    global.element.barang_total_terjual_table.draw();
}

(async function() {
    global.element.t_barang_total_terjual_start_picker.setDate(Date.now());
    global.element.t_barang_total_terjual_end_picker.setDate(Date.now());
    global.element.t_barang_total_terjual_start.addEventListener("changeDate", tanggal_total_terjual_start_event);
    global.element.t_barang_total_terjual_end.addEventListener("changeDate", tanggal_total_terjual_end_event);
    
    fetch_barang_terjual_tanggal();
    fetch_info_total_hari_ini();
    fetch_barang_kosong();
}());