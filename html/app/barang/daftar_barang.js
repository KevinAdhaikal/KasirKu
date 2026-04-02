global.element = {
    modal_daftar_barang_title: document.getElementById("modal_daftar_barang_title"),
    modal_daftar_barang_button: document.getElementById("modal_daftar_barang_button"),
    nama_barang: document.getElementById("nama_barang"),
    stok_barang: document.getElementById("stok_barang"),
    harga_modal: document.getElementById("harga_modal"),
    harga_jual: document.getElementById("harga_jual"),
    persen_jual: document.getElementById("persen_jual"),
    barcode_barang: document.getElementById("barcode_barang"),

    kategori_barang: $("#kategori_barang").select2({
        theme: 'bootstrap4',
        dropdownParent: $('#modal_daftar_barang'),
        tags: true,
        placeholder: "Pilih kategori",
        language: {
            noResults: function () {
                return '<button class="btn btn-sm btn-primary">+ Tambah Kategori</button>';
            }
        },
        escapeMarkup: function (markup) {
            return markup;
        },
        createTag: function (params) {
            const term = params.term.trim();

            if (term === "") return;
            return {
                id: term,
                text: "+ Tambah Kategori: " + term,
                newTag: true
            }
        }
    }),
    modal_daftar_barang: $("#modal_daftar_barang"),
    daftar_barang_table: $("#daftar_barang_table").DataTable({
        rowId: 6,
        columns: [
            {
                data: 0,
                render: $.fn.dataTable.render.text(),
            },
            {
                data: 1,
                render: $.fn.dataTable.render.text()
            },
            {
                data: 2,
                render: $.fn.dataTable.render.text()
            },
            {
                data: 3,
                render: $.fn.dataTable.render.text()
            },
            {
                data: 4,
                render: $.fn.dataTable.render.text()
            },
            {data: 5},
        ],
        columnDefs: [
            {
                targets: 0,
                width: "300px"
            }
        ],
        responsive: true,
        autoWidth: false
    }),

    is_tambah_kategori: false
};

global.deinit = function() {
    global.element.harga_modal.removeEventListener("input", harga_modal_event);
    global.element.harga_jual.removeEventListener("input", harga_jual_event);
    global.element.persen_jual.removeEventListener("input", persen_jual_event);
    global.remove_sse_handler(sse_handler);
    document.removeEventListener("keydown", document_keydown);
}

global.refresh_handler = function() {
    fetch_kategori_barang();
    fetch_daftar_barang();
}

global.element.modal_daftar_barang.on("shown.bs.modal", function() {
    global.element.nama_barang.focus();
})

global.add_sse_handler(sse_handler);
global.element.harga_modal.addEventListener("input", harga_modal_event);
global.element.harga_jual.addEventListener("input", harga_jual_event);
global.element.persen_jual.addEventListener("input", persen_jual_event);
document.addEventListener("keydown", document_keydown);


global.element.kategori_barang.on('select2:select', async function (e) {
  const data = e.params.data

  if (data.newTag) {
    global.element.is_tambah_kategori = true;
    global.element.kategori_barang.find(`option[value="${data.id}"]`).remove().trigger("change");

    const res = await fetch("/kategori_barang", {
        method: "POST",
        headers: {
            "token": localStorage.getItem("token")
        },
        body: new URLSearchParams({
            nama_kategori: data.id
        })
    })

    if (res.status === 200) {
        const res_json = await res.json();
        swal2_mixin.fire({
            icon: "success",
            title: "Kategori Barang berhasil dibuat!"
        });

        global.element.kategori_barang.append(new Option(res_json.nama_kategori, res_json.id, true, true)).trigger("change");
    }
    else {
        global.element.is_tambah_kategori = false;
        const status = await res.text();

        switch(status) {
            case "1": {
                swal2_mixin.fire({
                    icon: "error",
                    title: "Gagal membuat kategori barang karena kategori tersebut sudah ada!"
                });
                break;
            }
            default: {
                swal2_mixin.fire({
                    icon: "error",
                    title: "Kesalahan terjadi! Mohon coba lagi nanti."
                });
            }
            global.element.kategori_barang.val(null).trigger("change");
        }
    }
  }
})

function document_keydown(e) {
    if (e.key === "Enter") {
        if (e.target.tagName === 'BUTTON') return;
        if ($(e.target).hasClass("select2-search__field")) return;
        if (global.element.modal_daftar_barang.hasClass("show")) {
            global.element.modal_daftar_barang_button.click();
        }
    }
    else if (e.key === "Escape") {
        if (global.element.modal_daftar_barang.hasClass("show")) global.element.modal_daftar_barang.modal("hide");
    }
}

async function sse_handler(e) {
    if (e.type === 2) { // daftar barang
        switch(e.code) {
            case "TAMBAH_BARANG": {
                const data = await fetch_barang_id(e.data.id);
                global.element.daftar_barang_table.row.add([
                    data.nama_barang,
                    format_thousand_separator.format(data.stok_barang),
                    data.nama_kategori,
                    "Rp" + money_format_bigint(BigInt(data.harga_jual)),
                    data.barcode_barang ?? "Tidak Ada",
                    `<center>
                    <button type="button" class="text-right btn btn-primary action_edit" value="${data.id}"><i class="fa fa-eye"></i> Lihat/Edit</button>
                    <button type="button" class="text-right btn btn-danger action_delete" value="${data.id}"><i class="fa fa-trash"></i> Hapus</button>
                    </center>`,
                    data.id
                ]);
                global.element.daftar_barang_table.draw();
                break;
            }
            case "UPDATE_BARANG": {
                const data = await fetch_barang_id(e.data.id);

                global.element.daftar_barang_table.row("#" + e.data.id).data([
                    data.nama_barang,
                    format_thousand_separator.format(data.stok_barang),
                    data.nama_kategori,
                    "Rp" + money_format_bigint(BigInt(data.harga_jual)),
                    data.barcode_barang ?? "Tidak Ada",
                    `<center>
                    <button type="button" class="text-right btn btn-primary action_edit" value="${data.id}"><i class="fa fa-eye"></i> Lihat/Edit</button>
                    <button type="button" class="text-right btn btn-danger action_delete" value="${data.id}"><i class="fa fa-trash"></i> Hapus</button>
                    </center>`,
                    data.id
                ]);
                global.element.daftar_barang_table.draw();
                break;
            }
            case "DELETE_BARANG": {
                global.element.daftar_barang_table.row("#" + e.data.id).remove().draw();
                break;
            }
            default: {
                console.log("Unknown code:", e.code);
                break;
            }
        }
    }
    else if (e.type === 3) { // kategori barang
        switch(e.code) {
            case "TAMBAH_KATEGORI": {
                if (global.element.is_tambah_kategori) global.element.is_tambah_kategori = false;
                else global.element.kategori_barang.append(new Option(e.data.nama_kategori, e.data.id, true, true)).trigger('change');
                break;
            }
            case "UPDATE_KATEGORI": {
                const option = global.element.kategori_barang.find(`option[value="${e.data.id}"]`);
                option.text(e.data.nama_kategori).trigger("change");
                break;
            }
            case "DELETE_KATEGORI": {
                global.element.kategori_barang.find(`option[value="${e.data.id}"]`).remove().trigger("change");
                break;
            }
        }
        global.element.kategori_barang.select2("close");
    }
    else if (e.type === 4) { // kasir tambah penjualan
        switch(e.code) {
            case "TAMBAH_PENJUALAN": {
                for (const items of e.data.items) {
                    const current_data = global.element.daftar_barang_table.row("#" + items.id).data();
                    current_data[1] = Number(current_data[1]) - items.jumlah_barang;
                    global.element.daftar_barang_table.row("#" + items.id).data(current_data, false);
                }
                global.element.daftar_barang_table.draw();
                break;
            }
            default: {
                break;
            }
        }
    }
    else if (e.type === 6) { // barang masuk
        switch(e.code) {
            case "TAMBAH_BARANG_MASUK": {
                global.element.daftar_barang_table.cell("#" + e.data.barang_id, 1).data(format_thousand_separator.format(e.data.stok_barang)).draw();
                break;
            }
            default: {
                break;
            }
        }
    }
}

global.element.daftar_barang_table.on('click.action_edit', '.action_edit', async function () {
    const data = this.value;

    let res = await fetch(`/api/barang?id=${data}`, {
        method: "GET",
        headers: {
            token: localStorage.getItem("token")
        }
    });

    if (res.status === 200) {
        const res_json = await res.json();

        global.element.nama_barang.value = res_json.nama_barang;
        global.element.kategori_barang.val(res_json.kategori_barang_id).trigger("change");
        global.element.stok_barang.value = format_thousand_separator.format(res_json.stok_barang);
        global.element.harga_modal.value = money_format_bigint(BigInt(res_json.harga_modal));
        global.element.harga_jual.value = money_format_bigint(BigInt(res_json.harga_jual));
        global.element.persen_jual.value = (((Number((global.element.harga_jual.value).replaceAll(".", "").replaceAll(",", "")) - Number(global.element.harga_modal.value.replaceAll(".", "").replaceAll(",", ""))) / Number(global.element.harga_modal.value.replaceAll(".", "").replaceAll(",", ""))) * 100).toFixed(2);
        global.element.barcode_barang.value = res_json.barcode_barang ?? "";

        global.element.modal_daftar_barang_title.innerText = "Edit Barang";
        global.element.modal_daftar_barang_button.innerText = "Edit Barang (Enter)";
        global.element.modal_daftar_barang_button.onclick = function() {edit_daftar_barang(data)};

        global.element.modal_daftar_barang.modal("show");
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

global.element.daftar_barang_table.on('click.action_delete', '.action_delete', async function () {
    Swal.fire({
        title: "Hapus Barang",
        text: "Apakah anda yakin untuk menghapus barang ini?",
        icon: "error",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Yes (Enter)",
        cancelButtonText: "No (Esc)"
    }).then(async ress => {
        if (ress.isConfirmed) {
            let res = await fetch("/barang", {
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

function harga_modal_event(e) {
    global.element.harga_jual.value = global.element.harga_modal.value;
    global.element.persen_jual.value = "0.00";
}

function harga_jual_event(e) {
    if (!global.element.harga_modal.value) {
        e.target.value = "";

        return swal2_mixin.fire({
            icon: "error",
            title: "Harga modal harus dimasukkan terlebih dahulu."
        });
    }
    
    global.element.persen_jual.value = (((Number((e.target.value).replaceAll(".", "").replaceAll(",", "")) - Number(global.element.harga_modal.value.replaceAll(".", "").replaceAll(",", ""))) / Number(global.element.harga_modal.value.replaceAll(".", "").replaceAll(",", ""))) * 100).toFixed(2)
}

function persen_jual_event(e) {
    const modal = Number(global.element.harga_modal.value.replaceAll(".", "").replaceAll(",", "."));

    if (!modal) {
        e.target.value = "0.00";
        return swal2_mixin.fire({
            icon: "error",
            title: "Harga modal harus dimasukkan terlebih dahulu."
        });
    }
    let persen = e.target.value.replace(/[^\d.]/g, "");

    const parts = persen.split(".");
    if (parts.length > 2) persen = parts[0] + "." + parts.slice(1).join("");

    e.target.value = persen;

    const persenNumber = Number(persen);

    if (isNaN(persenNumber)) return;

    let hargaJual = modal + (modal * (persenNumber / 100));
    global.element.harga_jual.value = money_idr.format(hargaJual.toFixed(2))
}

function tambah_barang_modal() {
    global.element.nama_barang.value = "";
    global.element.kategori_barang.val("1").trigger("change");
    global.element.harga_modal.value = "";
    global.element.harga_jual.value = "";
    global.element.persen_jual.value = "0.00";
    global.element.stok_barang.value = "";

    global.element.modal_daftar_barang_title.innerText = "Tambah Barang";
    global.element.modal_daftar_barang_button.innerText = "Tambah Barang (Enter)";
    global.element.modal_daftar_barang_button.onclick = tambah_barang;

    global.element.modal_daftar_barang.modal("show");
}

async function tambah_barang() {
    if (!global.element.nama_barang.value || !global.element.stok_barang.value || !global.element.harga_modal.value || !global.element.harga_jual.value) return swal2_mixin.fire({
        icon: "error",
        title: "Mohon lengkapi input yang dibintangi!"
    });
    
    let res = await fetch("/barang", {
        method: "POST",
        headers: {
            "token": localStorage.getItem("token")
        },  
        body: new URLSearchParams({
            "nama_barang": global.element.nama_barang.value,
            "stok_barang": global.element.stok_barang.value.replaceAll(".", ""),
            "kategori_barang_id": global.element.kategori_barang.val(),
            "harga_modal": global.element.harga_modal.value.replaceAll(".", "").replaceAll(",", ""),
            "harga_jual": global.element.harga_jual.value.replaceAll(".", "").replaceAll(",", ""),
            "barcode_barang": global.element.barcode_barang.value
        })
    })

    if (res.status === 200) {
        swal2_mixin.fire({
            icon: "success",
            title: "Barang berhasil ditambahkan!"
        });

        global.element.modal_daftar_barang.modal("hide");
    }
    else {
        const status = await res.text();

        switch(status) {
            default: {
                swal2_mixin.fire({
                    icon: "error",
                    title: "Terjadi kesalahan! Silahkan coba lagi nanti."
                })
                break;
            }
        }
    }
}

async function fetch_kategori_barang() {
    let res = await fetch("/api/kategori_barang", {
        method: "GET",
        headers: {
            token: localStorage.getItem("token")
        }
    });
    
    if (res.status === 200) {
        const res_json = await res.json();
        const select = global.element.kategori_barang[0];
        select.innerHTML = "";

        for (const data of res_json) {
            const option = document.createElement("option");
            option.value = String(data.id);
            option.textContent = data.nama_kategori;
            select.appendChild(option);
        }

        global.element.kategori_barang.trigger("change");
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

async function fetch_barang_id(id) {
    if (!id) return;
    let res = await fetch(`/api/barang?id=${id}`, {
        method: "GET",
        headers: {
            token: localStorage.getItem("token")
        }
    })

    if (res.status === 200) return await res.json();
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
        return null;
    }
}

async function fetch_daftar_barang() {
    global.element.daftar_barang_table.clear();
    let res = await fetch("/api/barang", {
        method: "GET",
        headers: {
            "token": localStorage.getItem("token")
        }
    })

    if (res.status === 200) {
        const res_json = await res.json();
        for (const data of res_json) {
            global.element.daftar_barang_table.row.add([
                data.nama_barang,
                format_thousand_separator.format(data.stok_barang),
                data.nama_kategori,
                "Rp" + money_format_bigint(BigInt(data.harga_jual)),
                data.barcode_barang ?? "Tidak Ada",
                `<center>
                <button type="button" class="text-right btn btn-primary action_edit" value="${data.id}"><i class="fa fa-eye"></i> Lihat/Edit</button>
                <button type="button" class="text-right btn btn-danger action_delete" value="${data.id}"><i class="fa fa-trash"></i> Hapus</button>
                </center>`,
                data.id
            ]);
        }
    }

    global.element.daftar_barang_table.draw();
}

async function edit_daftar_barang(id) {
    let res = await fetch("/barang", {
        method: "PATCH",
        headers: {
            "token": localStorage.getItem("token")
        },
        body: new URLSearchParams({
            "id": id,
            "nama_barang": global.element.nama_barang.value,
            "stok_barang": global.element.stok_barang.value.replaceAll(".", ""),
            "kategori_barang_id": global.element.kategori_barang.val(),
            "harga_modal": global.element.harga_modal.value.replaceAll(".", "").replaceAll(",", ""),
            "harga_jual": global.element.harga_jual.value.replaceAll(".", "").replaceAll(",", ""),
            "barcode_barang": global.element.barcode_barang.value
        })
    })

    if (res.status === 200) {
        global.element.modal_daftar_barang.modal("hide");

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

(async function() {
    global.refresh_handler();
})();