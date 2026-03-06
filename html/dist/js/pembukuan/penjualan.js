global.element = {
    tanggal_penjualan: document.getElementById("tanggal_penjualan"),
    tanggal_penjualan_picker: new Datepicker(document.getElementById("tanggal_penjualan"), {
        autohide: true,
        format: "yyyy/mm/dd"
    }),
    penjualan_table: $("#penjualan_table").DataTable({
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
        order: [[1, 'asc']]
    }),
    date: new Date()
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
        console.log(res_json)
        row.child(format(res_json)).show();
        tr.addClass('shown');
    }
});

function format(data) {
    const res = data.map(item => `
        <tr>
            <td>${item.nama_barang}</td>
            <td>${format_thousand_separator.format(item.jumlah)}</td>
            <td>Rp${money_format_bigint(ao_to_bigint(item.harga_barang))}</td>
        </tr>
    `).join("");

    return `<table class="table table-bordered table-hover">
        <thead>
            <tr>
                <th>Nama Barang</th>
                <th>Jumlah Barang</th>
                <th>Harga Barang</th>
            </tr>
        </thead>
        <tbody>
        ${res}
        </tbody>
    </table>`;
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
                total_harga: "Rp" + money_format_bigint(ao_to_bigint(data.total_harga))
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
    fetch_penjualan();
})();