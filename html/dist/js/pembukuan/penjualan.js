global.element = {
    penjualan_table: $("#penjualan_table").DataTable()
}

async function fetch_penjualan() {
    let res = await fetch("/api/penjualan", {
        method: "GET",
        headers: {
            "token": localStorage.getItem("token")
        }
    })

    if (res.status === 200) {
        const res_json = await res.json();

        console.log(res_json);
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
    fetch_penjualan();
})();