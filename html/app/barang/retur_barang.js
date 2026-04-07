global.element = {
    modal_retur_barang_title: document.getElementById("modal_retur_barang_title"),
    modal_retur_barang_button: document.getElementById("modal_retur_barang_button"),
    nama_barcode_barang: document.getElementById("nama_barcode_barang"),
    deskripsi: document.getElementById("deskripsi"),
    jumlah_barang: document.getElementById("jumlah_barang"),
    cari_barang_button: document.getElementById("cari_barang_button"),
    tanggal_retur_barang: document.getElementById("tanggal_retur_barang"),
    tanggal_retur_barang_picker: new Datepicker(document.getElementById("tanggal_retur_barang"), {
        autohide: true,
        format: "yyyy/mm/dd"
    }),

    modal_cari_barang: $("#modal_cari_barang"),
    modal_retur_barang: $("#modal_retur_barang"),
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
    retur_barang_table: $("#retur_barang_table").DataTable({
        rowId: "id",
        columns: [
            {
                data: "nama_barang",
                render: $.fn.dataTable.render.text()
            },
            {
                data: "deskripsi",
                render: $.fn.dataTable.render.text()
            },
            {
                data: "jumlah_barang",
                render: $.fn.dataTable.render.text()
            },
            {
                data: "action"
            }
        ],
    })
}

global.deinit = function() {
    global.remove_sse_handler(sse_handler);
    document.removeEventListener("keydown", document_keydown);
}

global.element.tanggal_retur_barang_picker.setDate(Date.now());
global.element.tanggal_retur_barang.addEventListener("changeDate", fetch_retur_barang);

global.refresh_handler = async function() {
    await fetch_retur_barang();
}

global.add_sse_handler(sse_handler);
document.addEventListener("keydown", document_keydown);

global.element.modal_retur_barang.on("shown.bs.modal", function() {
    if (global.element.modal_retur_barang_title.innerText === "Tambah Retur Barang") global.element.nama_barcode_barang.focus();
    else {
        global.element.deskripsi.focus();
    }
})

global.element.retur_barang_table.on('click.action_edit', '.action_edit', async function () {
    const data = this.value;

    let res = await fetch(`/api/retur_barang?id=${data}`, {
        method: "GET",
        headers: {
            token: localStorage.getItem("token")
        }
    });

    if (res.status === 200) {
        const res_json = await res.json();

        global.element.deskripsi.value = res_json.deskripsi;
        global.element.deskripsi.disabled = false;
        global.element.nama_barcode_barang.disabled = true;
        global.element.nama_barcode_barang.value = `${res_json.nama_barang} (${res_json.barcode_barang ?? "Tidak Ada"})`;
        global.element.cari_barang_button.disabled = true;

        global.element.jumlah_barang.value = format_thousand_separator.format(res_json.jumlah_barang);
        global.element.jumlah_barang.disabled = false;

        global.element.modal_retur_barang_title.innerText = "Edit Retur Barang";
        global.element.modal_retur_barang_button.innerText = "Edit Retur Barang (Enter)";
        global.element.modal_retur_barang_button.disabled = false;
        global.element.modal_retur_barang_button.onclick = function() {edit_retur_barang(data)};

        global.element.modal_retur_barang.modal("show");
        document.activeElement.blur();
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
});

global.element.retur_barang_table.on('click.action_delete', '.action_delete', async function () {
    Swal.fire({
        title: "Hapus Barang",
        text: "Apakah anda yakin untuk menghapus Retur Barang ini?",
        icon: "error",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Yes (Enter)",
        cancelButtonText: "No (Esc)"
    }).then(async ress => {
        if (ress.isConfirmed) {
            let res = await fetch("/retur_barang", {
                method: "DELETE",
                headers: {
                    token: localStorage.getItem("token")
                },
                body: new URLSearchParams({
                    id: this.value
                })
            })

            if (res.status === 200) {
                swal2_mixin.fire({
                    icon: "success",
                    title: "Barang berhasil dihapus!"
                });
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
    })
});

async function sse_handler(e) {
    if (e.type === 2) {
        switch(e.code) {
            case "DELETE_BARANG": {
                fetch_retur_barang();
                break;
            }
        }
    }
    else if (e.type === 3) {
        switch(e.code) {
            case "DELETE_KATEGORI": {
                fetch_retur_barang();
                break;
            }
        }
    }
    else if (e.type === 7) {
        switch(e.code) {
            case "TAMBAH_RETUR_BARANG": {
                global.element.retur_barang_table.row.add({
                    nama_barang: e.data.nama_barang,
                    deskripsi: e.data.deskripsi,
                    jumlah_barang: format_thousand_separator.format(e.data.jumlah_barang),
                    action: `<center>
                    <button type="button" class="text-right btn btn-info action_edit" value="${e.data.id}"><i class="fa fa-eye"></i> Lihat/Edit</button>
                    <button type="button" class="text-right btn btn-danger action_delete" value="${e.data.id}"><i class="fa fa-trash"></i> Hapus</button>
                    </center>`,
                    id: e.data.id,
                }).draw();
                console.log(e.data);
                break;
            }
            case "UPDATE_RETUR_BARANG": {
                const row = global.element.retur_barang_table.row("#" + e.data.id)
                const data = e.data;

                if (data.jumlah_barang) data.jumlah_barang = format_thousand_separator.format(data.jumlah_barang);
                if (!data.deskripsi) data.deskripsi = "Tidak Ada";
                data.action = `<center>
                    <button type="button" class="text-right btn btn-info action_edit" value="${data.id}"><i class="fa fa-eye"></i> Lihat/Edit</button>
                    <button type="button" class="text-right btn btn-danger action_delete" value="${data.id}"><i class="fa fa-trash"></i> Hapus</button>
                </center>`;

                row.data({
                    ...row.data(),
                    ...data
                }).draw();
                break;
            }
            case "DELETE_RETUR_BARANG": {
                global.element.retur_barang_table.row("#" + e.data.id).remove().draw();
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

        if (global.element.modal_retur_barang.hasClass("show")) {
            if (document.activeElement.id === "nama_barcode_barang") {
                global.element.cari_barang_button.click();
                return;
            }
            global.element.modal_retur_barang_button.click();
        }
    }
    else if (e.key === "Escape") {
        if (global.element.modal_retur_barang.hasClass("show")) global.element.modal_retur_barang.modal("hide");
        else if (global.element.modal_cari_barang.hasClass("show")) global.element.modal_cari_barang.modal("hide");
    }
}

async function fetch_retur_barang() {
    global.element.retur_barang_table.clear();

    let res = await fetch(`/api/retur_barang?tanggal_key=${global.element.tanggal_retur_barang.value.replaceAll("/", "")}`, {
        method: "GET",
        headers: {
            token: localStorage.getItem("token")
        }
    })

    if (res.status === 200) {
        const res_json = await res.json();

        for (const data of res_json) {
            global.element.retur_barang_table.row.add({
                nama_barang: data.nama_barang,
                deskripsi: data.deskripsi,
                jumlah_barang: format_thousand_separator.format(data.jumlah_barang),
                action: `<center>
                <button type="button" class="text-right btn btn-info action_edit" value="${data.id}"><i class="fa fa-eye"></i> Lihat/Edit</button>
                <button type="button" class="text-right btn btn-danger action_delete" value="${data.id}"><i class="fa fa-trash"></i> Hapus</button>
                </center>`,
                id: data.id,
            });
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

    global.element.retur_barang_table.draw();
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
    global.element.modal_retur_barang_button.innerText = "Tambah Retur Barang (Enter)"
    global.element.modal_retur_barang_button.disabled = false;
    global.element.modal_retur_barang_button.onclick = function() {tambah_retur_barang()};
    global.element.deskripsi.disabled = false;
    global.element.jumlah_barang.disabled = false;
    global.element.nama_barcode_barang.dataset.id = data.id;
    global.element.deskripsi.focus();
}

function tambah_retur_modal() {
    global.element.modal_retur_barang_title.innerText = "Tambah Retur Barang";
    global.element.modal_retur_barang_button.innerText = "Tambah Retur Barang (Enter)";
    global.element.nama_barcode_barang.value = "";
    global.element.nama_barcode_barang.disabled = false;
    global.element.cari_barang_button.disabled = false;
    global.element.modal_retur_barang_button.disabled = true;
    global.element.jumlah_barang.disabled = true;
    global.element.deskripsi.disabled = true;
    global.element.deskripsi.value = "";
    global.element.jumlah_barang.value = "";
    global.element.nama_barcode_barang.dataset.id = "";

    global.element.modal_retur_barang.modal("show");
    document.activeElement.blur();
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

async function tambah_retur_barang() {
    let res = await fetch("/retur_barang", {
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
            title: "Retur barang berhasil di tambahkan!"
        })

        global.element.modal_retur_barang.modal("hide");
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

async function edit_retur_barang(id) {
    let res = await fetch("/retur_barang", {
        method: "PATCH",
        headers: {
            "token": localStorage.getItem("token")
        },
        body: new URLSearchParams({
            "id": id,
            "tanggal_key": global.element.tanggal_retur_barang.value.replaceAll("/", ""),
            "deskripsi": global.element.deskripsi.value,
            "jumlah_barang": global.element.jumlah_barang.value.replaceAll(".", ""),
        })
    })

    if (res.status === 200) {
        global.element.modal_retur_barang.modal("hide");

        swal2_mixin.fire({
            icon: "success",
            title: "Barang berhasil diedit!"
        });
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