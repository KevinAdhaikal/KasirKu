global.element = {
    tanggal_pengeluaran: document.getElementById("tanggal_pengeluaran"),
    tanggal_pengeluaran_picker: new Datepicker(document.getElementById("tanggal_pengeluaran"), {
        autohide: true,
        format: "yyyy/mm/dd"
    }),
    modal_pengeluaran_title: document.getElementById("modal_pengeluaran_title"),
    deskripsi: document.getElementById("deskripsi"),
    nominal: document.getElementById("nominal"),
    modal_pengeluaran_button: document.getElementById("modal_pengeluaran_button"),

    modal_pengeluaran: $("#modal_pengeluaran"),
    pengeluaran_table: $("#pengeluaran_table").DataTable({
        rowId: 4,
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
                width: "50px"
            },
            {
                targets: 1,
                width: "300px"
            },
            {
                targets: 2,
                width: "100px"
            },
            {
                targets: 3,
                width: "150px"
            },
        ],
        autoWidth: false
    }),
    date: new Date()
}

global.deinit = () => {
    global.element.tanggal_pengeluaran.removeEventListener("changeDate", fetch_pengeluaran)
    global.remove_sse_handler(sse_handler);
}

global.add_sse_handler(sse_handler);

async function sse_handler(e) {
    if (e.type === 5) {
        switch(e.code) {
            case "TAMBAH_PENGELUARAN": {
                const data = await fetch_pengeluaran_id(e.data.id);
                if (String(data.tanggal_key) === global.element.tanggal_pengeluaran.value.replaceAll("/", "")) {
                    global.element.date.setTime(data.created_ms);
                    global.element.pengeluaran_table.row.add([
                        global.element.date.toTimeString().slice(0,8),
                        data.deskripsi,
                        "Rp" + money_format_bigint(BigInt(data.jumlah_uang)),
                        `<center>
                        <button type="button" class="text-right btn btn-primary action_edit" value="${data.id}"><i class="fa fa-eye"></i> Lihat/Edit</button>
                        <button type="button" class="text-right btn btn-danger action_delete" value="${data.id}"><i class="fa fa-trash"></i> Hapus</button>
                        </center>`,
                        data.id
                    ]);
                    global.element.pengeluaran_table.draw();
                }
                break;
            }
            case "UPDATE_PENGELUARAN": {
                const data = await fetch_pengeluaran_id(e.data.id);
                if (String(data.tanggal_key) === global.element.tanggal_pengeluaran.value.replaceAll("/", "")) {
                    global.element.date.setTime(data.created_ms);
                    global.element.pengeluaran_table.row("#" + e.data.id).data([
                        global.element.date.toTimeString().slice(0,8),
                        data.deskripsi,
                        "Rp" + money_format_bigint(BigInt(data.jumlah_uang)),
                        `<center>
                        <button type="button" class="text-right btn btn-primary action_edit" value="${data.id}"><i class="fa fa-eye"></i> Lihat/Edit</button>
                        <button type="button" class="text-right btn btn-danger action_delete" value="${data.id}"><i class="fa fa-trash"></i> Hapus</button>
                        </center>`,
                        data.id
                    ]);
                    global.element.pengeluaran_table.draw();
                }
                break;
            }
            case "DELETE_PENGELUARAN": {
                if (String(e.data.tanggal_key) === global.element.tanggal_pengeluaran.value.replaceAll("/", "")) global.element.pengeluaran_table.row("#" + e.data.id).remove().draw();
                break;
            }
            default: {
                console.log("Unknown code:", e.code);
                break;
            }
        }
    }
}

global.element.pengeluaran_table.on('click.action_edit', '.action_edit', async function () {
    const data = this.value;

    let res = await fetch(`/api/pengeluaran?id=${data}`, {
        method: "GET",
        headers: {
            token: localStorage.getItem("token")
        }
    });

    if (res.status === 200) {
        const res_json = await res.json();

        global.element.deskripsi.value = res_json.deskripsi;
        global.element.nominal.value = money_format_bigint(BigInt(res_json.jumlah_uang));

        global.element.modal_pengeluaran.innerText = "Edit Pengeluaran";
        global.element.modal_pengeluaran_button.innerText = "Edit Pengeluaran";
        global.element.modal_pengeluaran_button.onclick = function() {edit_pengeluaran(data)};

        global.element.modal_pengeluaran.modal("show");
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

global.element.pengeluaran_table.on('click.action_delete', '.action_delete', async function () {
    Swal.fire({
        title: "Hapus Pengeluaran",
        text: "Apakah anda yakin untuk menghapus pengeluaran ini?",
        icon: "error",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Yes",
        cancelButtonText: "No"
    }).then(async ress => {
        if (ress.isConfirmed) {
            let res = await fetch("/pengeluaran", {
                method: "DELETE",
                headers: {
                    token: localStorage.getItem("token")
                },
                body: new URLSearchParams({
                    id: this.value,
                    tanggal_key: global.element.tanggal_pengeluaran.value.replaceAll("/", "")
                })
            })

            if (res.status === 200) {
                swal2_mixin.fire({
                    icon: "success",
                    title: "Pengeluaran berhasil dihapus!"
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

function tambah_pengeluaran_modal() {
    global.element.modal_pengeluaran_title.innerText = "Tambah Pengeluaran";
    global.element.modal_pengeluaran_button.innerText = "Tambah Pengeluaran";
    global.element.deskripsi.value = "";
    global.element.nominal.value = "";

    global.element.modal_pengeluaran_button.onclick = tambah_pengeluaran;

    global.element.modal_pengeluaran.modal("show");
}

async function fetch_pengeluaran_id(id) {
    let res = await fetch(`/api/pengeluaran?id=${id}`, {
        method: "GET",
        headers: {
            token: localStorage.getItem("token")
        }
    });

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

async function fetch_pengeluaran_id(id) {
    let res = await fetch(`/api/pengeluaran?id=${id}`, {
        method: "GET",
        headers: {
            token: localStorage.getItem("token")
        }
    });

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

async function fetch_pengeluaran() {
    global.element.pengeluaran_table.clear();
    let res = await fetch(`/api/pengeluaran?tanggal_key=${global.element.tanggal_pengeluaran.value.replaceAll("/", "")}`, {
        method: "GET",
        headers: {
            token: localStorage.getItem("token")
        }
    })

    if (res.status === 200) {
        const res_json = await res.json();

        res_json.forEach(data => {
            global.element.date.setTime(data.created_ms);

            global.element.pengeluaran_table.row.add([
                global.element.date.toTimeString().slice(0,8),
                data.deskripsi,
                "Rp" + money_format_bigint(BigInt(data.jumlah_uang)),
                `<center>
                <button type="button" class="text-right btn btn-primary action_edit" value="${data.id}"><i class="fa fa-eye"></i> Lihat/Edit</button>
                <button type="button" class="text-right btn btn-danger action_delete" value="${data.id}"><i class="fa fa-trash"></i> Hapus</button>
                </center>`,
                data.id
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
                })
                break;
            }
        }
    }
    
    global.element.pengeluaran_table.draw();
}

async function tambah_pengeluaran() {
    let res = await fetch("/pengeluaran", {
        method: "POST",
        headers: {
            token: localStorage.getItem("token")
        },
        body: new URLSearchParams({
            "deskripsi": global.element.deskripsi.value,
            "nominal": global.element.nominal.value.replaceAll(".", "").replaceAll(",", "")
        })
    })

    if (res.status === 200) {
        swal2_mixin.fire({
            icon: "success",
            title: "Pengeluaran berhasil ditambahkan!"
        })
        global.element.modal_pengeluaran.modal("hide");
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

async function edit_pengeluaran(id) {
    let res = await fetch("/pengeluaran", {
        method: "PATCH",
        headers: {
            token: localStorage.getItem("token")
        },
        body: new URLSearchParams({
            id: id,
            tanggal_key: global.element.tanggal_pengeluaran.value.replaceAll("/", ""),
            "deskripsi": global.element.deskripsi.value,
            "nominal": global.element.nominal.value.replaceAll(".", "").replaceAll(",", "")
        })
    })

    if (res.status === 200) {
        swal2_mixin.fire({
            icon: "success",
            title: "Pengeluaran berhasil diedit!"
        })
        global.element.modal_pengeluaran.modal("hide");
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

(async function() {
    global.element.tanggal_pengeluaran_picker.setDate(Date.now());
    global.element.tanggal_pengeluaran.addEventListener("changeDate", fetch_pengeluaran);
    fetch_pengeluaran();
})()