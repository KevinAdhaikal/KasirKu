global.element = {
    modal_barang_masuk_title: document.getElementById("modal_barang_masuk_title"),
    modal_barang_masuk_button: document.getElementById("modal_barang_masuk_button"),
    nama_barcode_barang: document.getElementById("nama_barcode_barang"),
    deskripsi: document.getElementById("deskripsi"),
    jumlah_barang: document.getElementById("jumlah_barang"),
    cari_barang_button: document.getElementById("cari_barang_button"),
    tanggal_barang_masuk: document.getElementById("tanggal_barang_masuk"),
    tanggal_barang_masuk_picker: new Datepicker(document.getElementById("tanggal_barang_masuk"), {
        autohide: true,
        format: "yyyy/mm/dd"
    }),

    modal_cari_barang: $("#modal_cari_barang"),
    modal_barang_masuk: $("#modal_barang_masuk"),
    cari_barang_table: $("#cari_barang_table").DataTable({
        rowid: 3,
        columns: [
            {
                data: 0,
                render: $.fn.dataTable.render.text()
            },
            {
                data: 1,
                render: $.fn.dataTable.render.text()
            },
            {data: 2}
        ],
    }),
    barang_masuk_table: $("#barang_masuk_table").DataTable({
        rowid: 3,
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
        ],
    })
};

global.deinit = function() {
    global.remove_sse_handler(sse_handler);
    document.removeEventListener("keydown", document_keydown);
}

global.element.tanggal_barang_masuk_picker.setDate(Date.now());
global.element.tanggal_barang_masuk.addEventListener("changeDate", fetch_barang_masuk);

global.refresh_handler = async function() {
    await fetch_barang_masuk();
}

global.add_sse_handler(sse_handler);
document.addEventListener("keydown", document_keydown);

async function sse_handler(e) {
    if (e.type === 2) {
        switch(e.code) {
            case "DELETE_BARANG": {
                fetch_barang_masuk();
                break;
            }
        }
    }
    else if (e.type === 3) {
        switch(e.code) {
            case "DELETE_KATEGORI": {
                fetch_barang_masuk();
                break;
            }
        }
    }
    else if (e.type === 6) {
        switch(e.code) {
            case "TAMBAH_BARANG_MASUK": {
                if (String(e.data.tanggal_key) === global.element.tanggal_barang_masuk.value.replaceAll("/", "")) {
                    global.element.barang_masuk_table.row.add([
                        e.data.nama_barang,
                        e.data.deskripsi,
                        format_thousand_separator.format(e.data.jumlah_barang),
                        e.data.id
                    ]).draw();
                }
                break;
            }
            case "UPDATE_BARANG_MASUK": {
                fetch_barang_masuk();
                break;
            }
            case "DELETE_BARANG_MASUK": {
                fetch_barang_masuk();
                break;
            }
            default: {
                break;
            }
        }
    }
}

function document_keydown(e) {
    if (e.key === "Enter") {
        if (e.target.tagName === 'BUTTON') return;

        if (global.element.modal_barang_masuk.hasClass("show")) {
            if (document.activeElement.id === "nama_barcode_barang") {
                global.element.cari_barang_button.click();
                return;
            }
            global.element.modal_barang_masuk_button.click();
        }
    }
    else if (e.key === "Escape") {
        if (global.element.modal_barang_masuk.hasClass("show")) global.element.modal_barang_masuk.modal("hide");
        else if (global.element.modal_cari_barang.hasClass("show")) global.element.modal_cari_barang.modal("hide");
    }
}

global.element.modal_barang_masuk.on("shown.bs.modal", function() {
    global.element.nama_barcode_barang.focus();
})

function tambah_barang_modal() {
    global.element.nama_barcode_barang.value = "";
    global.element.nama_barcode_barang.disabled = false;
    global.element.cari_barang_button.disabled = false;
    global.element.modal_barang_masuk_button.disabled = true;
    global.element.jumlah_barang.disabled = true;
    global.element.deskripsi.disabled = true;
    global.element.deskripsi.value = "";
    global.element.jumlah_barang.value = "";
    global.element.nama_barcode_barang.dataset.id = "";

    global.element.modal_barang_masuk.modal("show");
    document.activeElement.blur();
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

    global.element.nama_barcode_barang.value = `${data.nama_barang} (${data.barcode_barang ?? "Tidak Ada"})`;
    global.element.nama_barcode_barang.disabled = true;
    global.element.cari_barang_button.disabled = true;
    global.element.modal_barang_masuk_button.disabled = false;
    global.element.deskripsi.disabled = false;
    global.element.jumlah_barang.disabled = false;
    global.element.nama_barcode_barang.dataset.id = data.id;
    global.element.deskripsi.focus();
}

async function fetch_barang_masuk() {
    global.element.barang_masuk_table.clear();

    let res = await fetch(`/api/barang_masuk?tanggal_key=${global.element.tanggal_barang_masuk.value.replaceAll("/", "")}`, {
        method: "GET",
        headers: {
            token: localStorage.getItem("token")
        }
    })

    if (res.status === 200) {
        const res_json = await res.json();

        for (const data of res_json) {
            global.element.barang_masuk_table.row.add([
                data.nama_barang,
                data.deskripsi,
                format_thousand_separator.format(data.jumlah_barang),
                data.id
            ]);
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
                break;
            }
        }
    }

    global.element.barang_masuk_table.draw();
}

async function cari_barang() {
    if (!global.element.nama_barcode_barang.value.trim()) {
        global.element.nama_barcode_barang.focus();
        return swal2_mixin.fire({
            icon: "error",
            title: "Silahkan input barang terlebih dahulu!"
        });
    }

    let res = await fetch(`/api/cari_barang?${new URLSearchParams({
        barang: global.element.nama_barcode_barang.value
    })}`, {
        method: "GET",
        headers: {
            token: localStorage.getItem("token")
        }
    })
    global.element.nama_barcode_barang.value = "";

    if (res.status === 200) {
        const res_json = await res.json();
        if (res_json.length === 1) tambah_barang(0, res_json[0])
        else if (res_json.length > 1) {
            global.element.cari_barang_table.clear();
            for (const data of res_json) {
                global.element.cari_barang_table.row.add([
                    data.nama_barang,
                    format_thousand_separator.format(data.stok_barang),
                    `<center>
                    <button type="button" class="text-right btn btn-success" onclick="tambah_barang(${data.id})"><i class="fa fa-plus"></i> Tambah Barang</button>
                    </center>`
                ]);
            }
            global.element.cari_barang_table.draw();
            global.element.modal_cari_barang.modal("show");
            document.activeElement.blur();
        }
        else {
            swal2_mixin.fire({
                icon: "error",
                title: "Nama/Barcode Barang tidak ditemukan!"
            })
            global.element.nama_barcode_barang.focus();
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
                global.element.nama_barcode_barang.focus();
                break;
            }
        }
    }
}

async function tambah_barang_masuk() {
    let res = await fetch("/barang_masuk", {
        method: "POST",
        headers: {
            token: localStorage.getItem("token")
        },
        body: new URLSearchParams({
            barang_id: global.element.nama_barcode_barang.dataset.id,
            deskripsi: global.element.deskripsi.value,
            jumlah_barang: global.element.jumlah_barang.value.replaceAll(".", "")
        })
    })

    if (res.status === 200) {
        swal2_mixin.fire({
            icon: "success",
            title: "Barang masuk berhasil di tambahkan!"
        })

        global.element.modal_barang_masuk.modal("hide");
    }
    else {
        const status = await res.text();

        switch(status) {
            default: {
                swal2_mixin.fire({
                    icon: "error",
                    title: "Terjadi Kesalahan! Silahkan coba lagi nanti."
                })
                break;
            }
        }
    }
}