if (!global.current_items) global.current_items = new Set();
if (!global.current_total) global.current_total = {
    barang: 0,
    harga_barang: 0n
}
global.element = {
    input_barang: document.getElementById("input_barang"),
    nama_barang: document.getElementById("nama_barang"),
    harga_jual: document.getElementById("harga_jual"),
    harga_barang: document.getElementById("harga_barang"),
    jumlah_barang: document.getElementById("jumlah_barang"),
    modal_edit_barang_button: document.getElementById("modal_edit_barang_button"),
    total_barang: document.getElementById("total_barang"),
    total_harga_barang: document.getElementById("total_harga_barang"),
    tunai_input: document.getElementById("tunai_input"),
    total_harga_text: document.getElementById("total_harga_text"),
    kembalian_uang_text: document.getElementById("kembalian_uang_text"),

    modal_edit_barang: $("#modal_edit_barang"),
    modal_cari_barang: $("#modal_cari_barang"),
    modal_pembayaran_barang: $("#modal_pembayaran_barang"),
    cari_barang_table: $("#cari_barang_table").DataTable({
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
            },
            {data: 3}
        ],
        columnDefs: [
            {
                targets: 0,
                width: "300px"
            }
        ],
        autoWidth: false
    }),
    kasir_table: $("#kasir_table").DataTable({
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
            },
            {data: 3}
        ],
        columnDefs: [
            {
                targets: 0,
                width: "400px"
            }
        ],
        autoWidth: false
    }),
}

global.deinit = function() {
    global.element.input_barang.removeEventListener("input", input_barang);
    global.element.tunai_input.removeEventListener("input", tunai_input_event);
    global.element.jumlah_barang.removeEventListener("input", jumlah_barang_input);
    document.removeEventListener("keydown", esc_handler);
}

global.init = function() {
    global.element.input_barang.addEventListener("keydown", input_barang);
    global.element.tunai_input.addEventListener("input", tunai_input_event);
    global.element.jumlah_barang.addEventListener("input", jumlah_barang_input);
    history_kasir();
}

global.element.modal_pembayaran_barang.on('shown.bs.modal', function () {
    global.element.tunai_input.focus();
});

global.element.modal_pembayaran_barang.on('hidden.bs.modal', function () {
    global.element.input_barang.focus();
});

global.element.modal_cari_barang.on('shown.bs.modal', function () {
    document.addEventListener("keydown", esc_handler);
});

function input_barang(e) {
    switch(e.keyCode) {
        case 13: { // Enter
            cari_barang();
            break;
        }
        case 119: { // F8
            pembayaran_barang_modal();
            break;
        }
        case 46: { // DEL
            hapus_semua_barang();
            break;
        }
    }
}

function esc_handler(e) {
    if (e.keyCode === 27) {
        global.element.modal_cari_barang.modal("hide");
        global.element.input_barang.focus();
    }
    document.removeEventListener("keydown", esc_handler);
}

function tunai_input_event(e) {
    const res = BigInt(e.target.value.replaceAll(".", "").replaceAll(",", "")) - global.current_total.harga_barang;
    global.element.kembalian_uang_text.innerText = res > 0 ? "Rp" + money_format_bigint(res) : "Rp0"
}

function jumlah_barang_input(e) {
    const harga_jual = BigInt(global.element.harga_jual.value.slice(2).replaceAll(".", "").replaceAll(",", ""));
    global.element.harga_barang.value = "Rp" + money_format_bigint(harga_jual * BigInt(e.target.value.replaceAll(".", "")));
}

function pembayaran_barang_modal() {
    if (!global.current_items.size) return swal2_mixin.fire({
        icon: "error",
        title: "Mohon masukkan barang ke dalam kasir terlebih dahulu."
    })

    global.element.total_harga_text.innerText = "Rp" + money_format_bigint(global.current_total.harga_barang);
    global.element.kembalian_uang_text.innerText = "Rp0";
    global.element.tunai_input.value = "";

    global.element.modal_pembayaran_barang.modal("show");
}

async function masuk_ke_pembukuan() {
    const kembalian_check = BigInt(global.element.tunai_input.value.replaceAll(".", "").replaceAll(",", "")) - global.current_total.harga_barang;
    if (kembalian_check < 0) return swal2_mixin.fire({
        icon: "error",
        title: "Tunai tidak mencukupi."
    });
    let res = await fetch("/masuk_ke_pembukuan", {
        method: "POST",
        headers: {
            token: localStorage.getItem("token"),
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            items: [...global.current_items]
        }, (_, v) =>  typeof v === "bigint" ? v.toString() : v)
    });

    if (res.status === 200) {
        global.element.modal_pembayaran_barang.modal("hide");
        
        global.current_items.clear();
        global.element.kasir_table.clear().draw();

        global.current_total.barang = 0;
        global.current_total.harga_barang = 0n;
                    
        global.element.total_barang.innerText = `Total Barang: 0`;
        global.element.total_harga_barang.innerText = `Total Harga Barang: Rp0,00`;

        swal2_mixin.fire({
            icon: "success",
            title: "Barang Kasir berhasil di masukkan ke Pembukuan!"
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
}

async function history_kasir() {
    if (!global.current_items.size) return;

    global.current_items.forEach(data => {
        global.element.kasir_table.row.add([
            data.nama_barang,
            1,
            "Rp" + money_format_bigint(BigInt(data.harga_jual)),
            `<center>
            <button type="button" class="text-right btn btn-info" onclick="edit_barang_modal(${data.id})">Edit</button>
            <button type="button" class="text-right btn btn-danger" onclick="hapus_barang(${data.id})">Hapus</button>
            </center>`
        ]);
    })
    
    global.element.total_barang.innerText = `Total Barang: ${format_thousand_separator.format(global.current_total.barang)}`;
    global.element.total_harga_barang.innerText = `Total Harga Barang: Rp${money_format_bigint(global.current_total.harga_barang)}`;
    
    global.element.kasir_table.draw();
}

async function tambah_barang(id, data) {
    if (id !== 0) {
        global.element.modal_cari_barang.modal("hide");
        let res = await fetch(`/api/barang?id=${id}`, {
            method: "GET",
            headers: {
                token: localStorage.getItem("token"),
            }
        });

        if (res.status === 200) data = await res.json();
        else {
            const status = await res.text();

            switch(status) {
                default: {
                    swal2_mixin.fire({
                        icon: "error",
                        title: "Kesalahan Terjadi! Silahkan coba lagi nanti."
                    });
                    break;
                }
            }
            return;
        }
    }
    let is_found = 0;
    let idx = 0;

    for (const e of global.current_items) {
        if (e.id === data.id) {
            if (data.stok_barang <= e.jumlah_barang) {
                return swal2_mixin.fire({
                    icon: "error",
                    title: "Gagal menambahkan barang tersebut! Karena stok barang tersebut telah habis."
                });
            }
            e.jumlah_barang++;
            e.harga_barang += BigInt(data.harga_jual);
            global.element.kasir_table.cell(idx, 1).data(format_thousand_separator.format(e.jumlah_barang));
            global.element.kasir_table.cell(idx, 2).data("Rp" + money_format_bigint(e.harga_barang));
            
            global.current_total.barang++;
            global.current_total.harga_barang += BigInt(data.harga_jual);

            global.element.total_barang.innerText = `Total Barang: ${format_thousand_separator.format(global.current_total.barang)}`;
            global.element.total_harga_barang.innerText = `Total Harga Barang: Rp${money_format_bigint(global.current_total.harga_barang)}`;
            
            is_found = 1;
            global.element.input_barang.focus();
            return;
        }
        idx++;
    }

    if (is_found) return;
    global.current_items.add({
        id: data.id,
        nama_barang: data.nama_barang,
        jumlah_barang: 1,
        limit_barang: data.stok_barang,
        harga_barang: BigInt(data.harga_jual),
        harga_jual: BigInt(data.harga_jual)
    });

    global.element.kasir_table.row.add([
        data.nama_barang,
        1,
        "Rp" + money_format_bigint(BigInt(data.harga_jual)),
        `<center>
        <button type="button" class="text-right btn btn-info" onclick="edit_barang_modal(${data.id})">Edit</button>
        <button type="button" class="text-right btn btn-danger" onclick="hapus_barang(${data.id})">Hapus</button>
        </center>`
    ]);

    global.current_total.barang++;
    global.current_total.harga_barang += BigInt(data.harga_jual);
    
    global.element.total_barang.innerText = `Total Barang: ${format_thousand_separator.format(global.current_total.barang)}`;
    global.element.total_harga_barang.innerText = `Total Harga Barang: Rp${money_format_bigint(global.current_total.harga_barang)}`;
    
    global.element.kasir_table.draw();
    global.element.input_barang.focus();
}

function edit_barang_modal(id) {
    let idx = 0;
    let is_found = 0;
    global.current_items.forEach(e => {
        if (e.id === id) {
            global.element.nama_barang.value = e.nama_barang;
            global.element.harga_jual.value = "Rp" + money_format_bigint(e.harga_jual);
            global.element.harga_barang.value = "Rp" + money_format_bigint(e.harga_barang);
            global.element.jumlah_barang.value = format_thousand_separator.format(e.jumlah_barang);
            is_found = 1;
        }
        idx++;
    });

    if (!is_found) {
        return swal2_mixin.fire({
            icon: "error",
            title: "Barang tidak ditemukan di table kasir!"
        })
    }

    global.element.modal_edit_barang_button.onclick = function() {edit_barang_button(id)};
    global.element.modal_edit_barang.modal("show");
}

function edit_barang_button(id) {
    let idx = 0;
    for (const e of global.current_items) {
        if (e.id === id) {
            const jumlah_barang = Number(global.element.jumlah_barang.value.replaceAll(".", ""));
            const harga_barang = BigInt(global.element.harga_barang.value.slice(2).replaceAll(".", "").replaceAll(",", ""));

            if (e.limit_barang < jumlah_barang) {
                return swal2_mixin.fire({
                    icon: "error",
                    title: "Gagal menambahkan barang tersebut! Karena stok barang tersebut telah habis."
                });
            }

            global.element.modal_edit_barang.modal("hide");

            global.element.kasir_table.cell(idx, 1).data(global.element.jumlah_barang.value);
            global.element.kasir_table.cell(idx, 2).data(global.element.harga_barang.value);

            global.current_total.barang += jumlah_barang - e.jumlah_barang;
            global.current_total.harga_barang += harga_barang - e.harga_barang;
            e.harga_barang = harga_barang;
            e.jumlah_barang = jumlah_barang;

            global.element.total_barang.innerText = `Total Barang: ${format_thousand_separator.format(global.current_total.barang)}`;
            global.element.total_harga_barang.innerText = `Total Harga Barang: Rp${money_format_bigint(global.current_total.harga_barang)}`;

            return;
        }
        idx++;
    }
}

function hapus_barang(id) {
    Swal.fire({
        title: "Hapus Barang",
        text: "Apakah anda yakin untuk menghapus barang ini di kasir?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Yes (Enter)",
        cancelButtonText: "No (Esc)"
    }).then(res => {
        if (res.isConfirmed) {
            let idx = 0;
            global.current_items.forEach(e => {
                if (e.id === id) {
                    global.current_total.barang -= e.jumlah_barang;
                    global.current_total.harga_barang -= e.harga_barang;
                    
                    global.element.total_barang.innerText = `Total Barang: ${format_thousand_separator.format(global.current_total.barang)}`;
                    global.element.total_harga_barang.innerText = `Total Harga Barang: Rp${money_format_bigint(global.current_total.harga_barang)}`;

                    global.element.kasir_table.row(idx).remove().draw();
                    global.current_items.delete(e);
                    return;
                }
                idx++;
            });
        }
    })
}

function hapus_semua_barang() {
    if (!global.current_items.size) {
        return swal2_mixin.fire({
            icon: "error",
            title: "Tidak ada barang yang ditambahkan!"
        });
    }

    document.addEventListener("keydown", esc_handler);
    Swal.fire({
        title: "Hapus Semua Barang",
        text: "Apakah anda yakin untuk menghapus semua barang yang ada di kasir?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Yes",
        cancelButtonText: "No"
    }).then(res => {
        if (res.isConfirmed) {
            global.current_items.clear();
            global.element.kasir_table.clear().draw();

            global.current_total.barang = 0;
            global.current_total.harga_barang = 0n;
                    
            global.element.total_barang.innerText = `Total Barang: 0`;
            global.element.total_harga_barang.innerText = `Total Harga Barang: Rp0,00`;
            
            swal2_mixin.fire({
                icon: "success",
                title: "Semua Barang yang ada di Kasir telah dihapus!"
            })

            global.element.input_barang.focus();
        }
    })
}
async function cari_barang() {
    if (!global.element.input_barang.value.trim()) {
        global.element.input_barang.focus();
        return swal2_mixin.fire({
            icon: "error",
            title: "Silahkan input barang terlebih dahulu!"
        });
    }

    let res = await fetch(`/api/cari_barang?${new URLSearchParams({
        barang: global.element.input_barang.value
    })}`, {
        method: "GET",
        headers: {
            token: localStorage.getItem("token")
        }
    })
    global.element.input_barang.value = "";

    if (res.status === 200) {
        const res_json = await res.json();

        if (res_json.length === 1) tambah_barang(0, res_json[0]);
        else if (res_json.length > 1) {
            global.element.cari_barang_table.clear();
            for (const data of res_json) {
                global.element.cari_barang_table.row.add([
                    data.nama_barang,
                    format_thousand_separator.format(data.stok_barang),
                    "Rp" + money_format_bigint(BigInt(data.harga_jual)),
                    `<center>
                    <button type="button" class="text-right btn btn-success" onclick="tambah_barang(${data.id})"><i class="fa fa-plus"></i> Tambah Barang</button>
                    </center>`
                ]);
            }
            global.element.cari_barang_table.draw();
            global.element.modal_cari_barang.modal("show");
        }
        else {
            swal2_mixin.fire({
                icon: "error",
                title: "Nama/Barcode Barang tidak ditemukan!"
            })
            global.element.input_barang.focus();
        }
    }
    else {
        const status = await res.text();

        switch(status) {
            default: {
                swal2_mixin.fire({
                    icon: "error",
                    title: "Terjadi Kesalahan! Silahkan coba lagi nanti."
                })
                global.element.input_barang.focus();
                break;
            }
        }
    }
}

(async function() {
    global.init();
    global.element.input_barang.focus();
})();