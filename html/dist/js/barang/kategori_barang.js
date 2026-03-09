global.element = {
    modal_kategori_barang_title: document.getElementById("modal_kategori_barang_title"),
    nama_kategori: document.getElementById("nama_kategori"),
    tambah_kategori_barang_button: document.getElementById("tambah_kategori_barang_button"),

    modal_kategori_barang: $("#modal_kategori_barang"),
    kategori_barang_table: $("#kategori_barang_table").DataTable({
        rowId: 2,
        columns: [
            {
                data: 0,
                render: $.fn.dataTable.render.text()
            },
            {data: 1}
        ]
    }),
    barang_assigned_kategori: $("#barang_assigned_kategori").DataTable({
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
        ]
    })
};

global.element.kategori_barang_table.on('click.button_edit', '.action_edit', async function () {
    const data = this.value;
    const row_data = global.element.kategori_barang_table.row($(this).closest('tr')).data();

    global.element.barang_assigned_kategori.clear();
    global.element.modal_kategori_barang_title.innerText = "Edit Kategori";
    global.element.tambah_kategori_barang_button.innerText = "Edit Kategori";

    let res = await fetch(`/api/bak_list?id=${data}`, {
        method: "GET",
        headers: {
            token: localStorage.getItem("token")
        }
    });

    if (res.status === 200) {
        const res_json = await res.json();

        for (const data of res_json) {
            global.element.barang_assigned_kategori.row.add([
                data.nama_barang,
                format_thousand_separator.format(data.stok_barang),
                "Rp" + money_format_bigint(ao_to_bigint(data.harga_jual))
            ])
        }
    }

    global.element.nama_kategori.value = row_data[0];
    global.element.tambah_kategori_barang_button.onclick = function() {edit_kategori_barang(data)};

    global.element.barang_assigned_kategori.draw();
    global.element.modal_kategori_barang.modal("show");
});

global.element.kategori_barang_table.on('click.action_delete', '.action_delete', async function () {
    const data = this.value;

    Swal.fire({
        title: "Hapus Kategori",
        text: "Apakah kamu yakin untuk menghapus kategori ini?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Ya",
        cancelButtonText: "Tidak"
    }).then(async ress => {
        if (ress.isConfirmed) {
            let res = await fetch("/kategori_barang", {
                method: "DELETE",
                headers: {
                    "token": localStorage.getItem("token")
                },
                body: new URLSearchParams({
                    id: data
                })
            })

            if (res.status === 200) {
                swal2_mixin.fire({
                    icon: "success",
                    title: "Kategori Barang berhasil dihapus!"
                })
            }
            else {
                const status = await res.text();

                switch(status) {
                    case "1": {
                        swal2_mixin.fire({
                            icon: "error",
                            title: "Anda tidak bisa menghapus kategori itu!"
                        });
                        break;
                    }
                    case "2": {
                        Swal.fire({
                            title: "Hapus Kategori dan Asosiasi Barang",
                            text: "Kategori ini saat ini digunakan oleh satu atau lebih barang. Menghapusnya akan menghapus barang-barang tersebut secara permanen. Apakah Anda ingin melanjutkan?",
                            icon: "warning",
                            showCancelButton: true,
                            confirmButtonColor: "#d33",
                            cancelButtonColor: "#3085d6",
                            confirmButtonText: "Ya",
                            cancelButtonText: "Tidak"
                        }).then(async ress => {
                            if (ress.isConfirmed) {
                                let res = await fetch("/kategori_barang", {
                                    method: "DELETE",
                                    headers: {
                                        "token": localStorage.getItem("token")
                                    },
                                    body: new URLSearchParams({
                                        "id": this.value,
                                        "recursive": "1"
                                    })
                                })
                                if (res.status === 200) {
                                    swal2_mixin.fire({
                                        icon: "success",
                                        title: "Kategori Barang berhasil dihapus!"
                                    })
                                }
                                else {
                                    const status = await res.text();

                                    switch(status) {
                                        case "1": {
                                            swal2_mixin.fire({
                                                icon: "error",
                                                title: "Anda tidak bisa menghapus kategori itu!"
                                            });
                                            break;
                                        }
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
                        break;
                    }
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

global.deinit = function() {
    global.remove_sse_handler(sse_handler);
}

global.add_sse_handler(sse_handler);

async function sse_handler(e) {
    if (e.type === 3) {
        console.log(e);
        switch(e.code) {
            case "TAMBAH_KATEGORI": {
                const data = await fetch_kategori_id(e.data.id);
                global.element.kategori_barang_table.row.add([
                    data.nama_kategori,
                    `<center>
                    <button type="button" class="text-right btn btn-primary action_edit" value="${data.id}"><i class="fa fa-eye"></i> Lihat/Edit</button>
                    <button type="button" class="text-right btn btn-danger action_delete" value="${data.id}" ${data.id === 1 ? "disabled" : ""}><i class="fa fa-trash"></i> Hapus</button>
                    </center>`,
                    data.id
                ])
                global.element.kategori_barang_table.draw();
                break;
            }
            case "UPDATE_KATEGORI": {
                const data = await fetch_kategori_id(e.data.id);
                global.element.kategori_barang_table.row("#" + e.data.id).data([
                    data.nama_kategori,
                    `<center>
                    <button type="button" class="text-right btn btn-primary action_edit" value="${data.id}"><i class="fa fa-eye"></i> Lihat/Edit</button>
                    <button type="button" class="text-right btn btn-danger action_delete" value="${data.id}" ${data.id === 1 ? "disabled" : ""}><i class="fa fa-trash"></i> Hapus</button>
                    </center>`,
                    data.id
                ]);
                global.element.kategori_barang_table.draw();
                break;
            }
            case "DELETE_KATEGORI": {
                global.element.kategori_barang_table.row("#" + e.data.id).remove().draw();
                break;
            }
            default: {
                console.log("Unknown code:", e.code);
                break;
            }
        }
    }
}
async function tambah_kategori_barang_modal() {
    global.element.modal_kategori_barang_title.innerText = "Tambah Kategori";
    global.element.nama_kategori.value = "";
    global.element.tambah_kategori_barang_button.innerText = "Tambah Kategori";
    global.element.tambah_kategori_barang_button.onclick = tambah_kategori_barang;

    global.element.modal_kategori_barang.modal("show");
}

async function fetch_kategori_id(id) {
    let res = await fetch(`/api/kategori_barang?id=${id}`, {
        method: "GET",
        headers: {
            "token": localStorage.getItem("token")
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

async function fetch_kategori() {
    global.element.kategori_barang_table.clear();
    let res = await fetch("/api/kategori_barang", {
        method: "GET",
        headers: {
            "token": localStorage.getItem("token")
        }
    })

    if (res.status === 200) {
        const res_json = await res.json();
        for (const data of res_json) {
            global.element.kategori_barang_table.row.add([
                data.nama_kategori,
                `<center>
                <button type="button" class="text-right btn btn-primary action_edit" value="${data.id}"><i class="fa fa-eye"></i> Lihat/Edit</button>
                <button type="button" class="text-right btn btn-danger action_delete" value="${data.id}" ${data.id === 1 ? "disabled" : ""}><i class="fa fa-trash"></i> Hapus</button>
                </center>`,
                data.id
            ])
        }
    }

    global.element.kategori_barang_table.draw();
}

async function tambah_kategori_barang() {
    let res = await fetch("/kategori_barang", {
        method: "POST",
        headers: {
            "token": localStorage.getItem("token")
        },
        body: new URLSearchParams({
            "nama_kategori": global.element.nama_kategori.value
        })
    })

    if (res.status === 200) {
        global.element.modal_kategori_barang.modal("hide");

        swal2_mixin.fire({
            icon: "success",
            title: "Kategori Barang berhasil ditambahkan!"
        })
    }
    else {
        const status = await res.text();

        switch(status) {
            case "1": {
                swal2_mixin.fire({
                    icon: "error",
                    title: "Nama Kategori sudah ada! mohon ganti dengan Nama Kategori yang lain."
                });
                break;
            }
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

async function edit_kategori_barang(id) {
    let res = await fetch("/kategori_barang", {
        method: "PATCH",
        headers: {
            "token": localStorage.getItem("token")
        },
        body: new URLSearchParams({
            "id": id,
            "nama_kategori": global.element.nama_kategori.value
        })
    })

    if (res.status === 200) {
        global.element.modal_kategori_barang.modal("hide");

        swal2_mixin.fire({
            icon: "success",
            title: "Kategori Barang berhasil ditambahkan!"
        });
    }
    else {
        const status = await res.text();

        switch(status) {
            case "1": {
                break;
            }
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

(async function() {
    await fetch_kategori();
})();