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
        dropdownParent: $('#modal_daftar_barang')
    }),
    modal_daftar_barang: $("#modal_daftar_barang"),
    daftar_barang_table: $("#daftar_barang_table").DataTable({
        rowId: 6,
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
            {
                data: 3,
                render: $.fn.dataTable.render.text()
            },
            {
                data: 4,
                render: $.fn.dataTable.render.text()
            },
            {data: 5},
        ]
    })
};

global.init = function() {
    global.element.harga_modal.addEventListener("input", harga_modal_event);
    global.element.harga_jual.addEventListener("input", harga_jual_event);
    global.element.persen_jual.addEventListener("input", persen_jual_event);
}

global.deinit = function() {
    global.element.harga_modal.removeEventListener("input", harga_modal_event);
    global.element.harga_jual.removeEventListener("input", harga_jual_event);
    global.element.persen_jual.removeEventListener("input", persen_jual_event);
    global.remove_sse_handler(sse_handler);
}


global.add_sse_handler(sse_handler);

async function sse_handler(e) {
    if (e.type === 2) {
        switch(e.code) {    
            case "TAMBAH_BARANG": {
                const data = await fetch_barang_id(e.data.id);
                global.element.daftar_barang_table.row.add([
                    data.nama_barang,
                    format_thousand_separator.format(data.stok_barang),
                    data.nama_kategori,
                    "Rp" + money_format_bigint(ao_to_bigint(data.harga_jual)),
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
                    "Rp" + money_format_bigint(ao_to_bigint(data.harga_jual)),
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
        global.element.kategori_barang.val(res_json.kategori_barang_id);
        global.element.stok_barang.value = format_thousand_separator.format(res_json.stok_barang);
        global.element.harga_modal.value = money_format_bigint(ao_to_bigint(res_json.harga_modal));
        global.element.harga_jual.value = money_format_bigint(ao_to_bigint(res_json.harga_jual));
        global.element.persen_jual.value = (((Number((global.element.harga_jual.value).replaceAll(".", "").replaceAll(",", "")) - Number(global.element.harga_modal.value.replaceAll(".", "").replaceAll(",", ""))) / Number(global.element.harga_modal.value.replaceAll(".", "").replaceAll(",", ""))) * 100).toFixed(2);
        global.element.barcode_barang.value = res_json.barcode_barang ?? "";

        global.element.modal_daftar_barang_title.innerText = "Edit Barang";
        global.element.modal_daftar_barang_button.innerText = "Edit Barang";
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
        confirmButtonText: "Yes",
        cancelButtonText: "No"
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
    global.element.kategori_barang.val("1");
    global.element.harga_modal.value = "";
    global.element.harga_jual.value = "";
    global.element.persen_jual.value = "0.00";
    global.element.stok_barang.value = "";

    global.element.modal_daftar_barang_title.innerText = "Tambah Barang";
    global.element.modal_daftar_barang_button.innerText = "Tambah Barang";
    global.element.modal_daftar_barang_button.onclick = tambah_barang;

    global.element.modal_daftar_barang.modal("show");
}

async function tambah_barang() {
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
                "Rp" + money_format_bigint(ao_to_bigint(data.harga_jual)),
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
    global.element.daftar_barang_table.clear();
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

    global.element.daftar_barang_table.draw();
}

(async function() {
    global.init();
    await fetch_kategori_barang();
    await fetch_daftar_barang();
})();