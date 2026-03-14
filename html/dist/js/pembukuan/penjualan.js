global.element = {
    tanggal_penjualan: document.getElementById("tanggal_penjualan"),
    tanggal_penjualan_picker: new Datepicker(document.getElementById("tanggal_penjualan"), {
        autohide: true,
        format: "yyyy/mm/dd"
    }),
    penjualan_table: $("#penjualan_table").DataTable({
        rowId: 'id',
        columns: [
            {
                className: 'dt-control',
                orderable: false,
                data: null,
                defaultContent: ''
            },
            { data: 'jam' },
            { data: 'total_barang' },
            { data: 'total_harga' }
        ],
        columnDefs: [
            {
                targets: 0,
                width: "50px"
            },
        ],
        autoWidth: false,
        order: [[1, 'asc']]
    }),
    date: new Date()
}

global.deinit = () => {
    global.element.tanggal_penjualan.removeEventListener("changeDate", fetch_penjualan);
    global.remove_sse_handler(sse_handler);
}

$('#penjualan_table tbody').on('click', 'td.dt-control', async function () {
    const tr = $(this).closest('tr');
    const row = global.element.penjualan_table.row(tr);
    const data = row.data();

    if (row.child.isShown()) {
        row.child.hide();
        tr.removeClass('shown');
    } else {
        let res = await fetch(`/api/penjualan_item?penjualan_id=${data.id}`, {
            method: "GET",
            headers: {
                "token": localStorage.getItem("token")
            }
        })

        if (res.status !== 200) {
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

            return;
        }

        const res_json = await res.json();
        row.child(format(res_json)).show();
        tr.addClass('shown');
    }
});

global.add_sse_handler(sse_handler);

async function sse_handler(e) {
    if (e.type === 4) {
        switch(e.code) {
            case "TAMBAH_PENJUALAN": {
                const data = await fetch_penjualan_id(e.data.id);
                if (String(data.tanggal_key) === global.element.tanggal_penjualan.value.replaceAll("/", "")) {
                    global.element.date.setTime(data.created_ms);
                    global.element.penjualan_table.row.add({
                        id: data.id,
                        jam: global.element.date.toTimeString().slice(0,8),
                        total_barang: data.total_barang,
                        total_harga: "Rp" + money_format_bigint(BigInt(data.total_harga_jual))
                    });
                    global.element.penjualan_table.draw();
                }
                break;
            }
            default: {
                console.log("Unknown code:", e.code);
                break;
            }
        }
    }
}

function format(data) {
    const res = data.map(item => `
        <tr>
            <td style="width:400px; white-space:normal; word-break:break-word;">
                ${item.nama_barang}
            </td>
            <td>${format_thousand_separator.format(item.jumlah)}</td>
            <td>Rp${money_format_bigint(BigInt(item.harga_jual))}</td>
        </tr>
    `).join("");

    return `<table class="table table-bordered table-hover" style="table-layout: fixed;">
        <thead>
            <tr>
                <th style="width:400px;">Nama Barang</th>
                <th>Jumlah Barang</th>
                <th>Harga Barang</th>
            </tr>
        </thead>
        <tbody>
        ${res}
        </tbody>
    </table>`;
}

async function fetch_penjualan_id(id) {
    let res = await fetch(`/api/penjualan?id=${id}`, {
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

async function fetch_penjualan() {
    global.element.penjualan_table.clear();
    let res = await fetch(`/api/penjualan?tanggal_key=${global.element.tanggal_penjualan.value.replaceAll("/", "")}`, {
        method: "GET",
        headers: {
            "token": localStorage.getItem("token"),
        }
    })

    if (res.status === 200) {
        const res_json = await res.json();

        res_json.forEach(data => {
            global.element.date.setTime(data.created_ms);
            global.element.penjualan_table.row.add({
                id: data.id,
                jam: global.element.date.toTimeString().slice(0,8),
                total_barang: data.total_barang,
                total_harga: "Rp" + money_format_bigint(BigInt(data.total_harga_jual))
            })
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

    global.element.penjualan_table.draw();
}

(async function() {
    global.element.tanggal_penjualan_picker.setDate(Date.now());
    global.element.tanggal_penjualan.addEventListener("changeDate", fetch_penjualan);
    fetch_penjualan();
})();