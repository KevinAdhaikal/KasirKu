global.element = {
    setting_footer: document.getElementById("setting_footer"),
    apply_setting: document.getElementById("apply_setting"),

    // ini buat Toko Setting
    nama_toko: document.getElementById("nama_toko"),
    deskripsi_toko: document.getElementById("deskripsi_toko"),
    alamat_toko: document.getElementById("alamat_toko"),
    telepon_toko: document.getElementById("telepon_toko"),
    email_toko: document.getElementById("email_toko"),
    is_toko_edited: false,

    // ini buat Struk Setting
    struk_html_code: document.getElementById("struk_html_code"),
    receipt_preview: document.getElementById("receipt_preview"),
    struk_save_button: document.getElementById("struk_save_button"),
    struk_editor: null,
    struk_html_change_timer: null,
    is_struk_edited: false,
}

global.deinit = () => {
    global.remove_sse_handler(sse_handler);
    if (global.element.struk_html_change_timer) clearTimeout(global.element.struk_html_change_timer);
}

global.refresh_handler = async function() {
    await fetch_toko_setting();
    await fetch_struk_setting();
    global.element.apply_setting.disabled = true;
    global.element.struk_save_button.disabled = true;
}

global.add_sse_handler(sse_handler);

$('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
    const currentTab = $(e.target).attr('href');
    const previousTab = $(e.relatedTarget).attr('href');

    // current tab (ini harus di init)
    if (currentTab === "#toko") {
        global.element.setting_footer.style.display = "";
        global.element.apply_setting.onclick = apply_toko_setting;
    }
    if (currentTab === '#struk') {
        global.element.setting_footer.style.display = "none";
        global.element.apply_setting.onclick = null;

        if (!global.element.struk_editor) {
            global.element.struk_editor = CodeMirror.fromTextArea(global.element.struk_html_code, {
                mode: "htmlmixed",
                theme: "monokai"
            });
            global.element.struk_editor.on("change", function(cm) {
                check_change('#struk');
                clearTimeout(global.element.struk_html_change_timer);
                global.element.struk_html_change_timer = setTimeout(async () => {
                    const now = new Date()
                    global.element.receipt_preview.srcdoc = render_template_html(cm.getValue(), {
                        store: global.public_info.store,
                        struk: {
                            no: "TRX-157193130418394",
                            time: format_date(now, "HH:mm:ss"),
                            date: format_date(now, "YYYY-MM-DD"),
                            cashier_name: "Alexander"
                        },
                        items: [
                            {
                                name: "Test barang 1",
                                qty: 1,
                                price: "10.000",
                                total: "10.000"
                            },
                            {
                                name: "Test barang 2 dengan Nama yang lumayan panjang",
                                qty: 2,
                                price: "15.000",
                                total: "30.000"
                            },
                            {
                                name: "Test barang 3",
                                qty: 2,
                                price: "10.000",
                                total: "20.000"
                            }
                        ],
                        summary: {
                            total: "60.000",
                            item_count: 5
                        },
                        payment: {
                            amount: "70.000",
                            change: "10.000",
                        }
                    });
                }, 1000);
            });
        } else global.element.struk_editor.refresh();
    }

    // previous tab (ini harus di clear)
    if (previousTab === "#struk") {
        if (global.element.struk_html_change_timer !== null) clearTimeout(global.element.struk_html_change_timer);
        global.element.struk_html_change_timer = null;
    }
});

function check_change(state) {
    switch(state) {
        case "#toko": {
            global.element.is_toko_edited = true;
            global.element.apply_setting.disabled = false;
            break;
        }
        case "#struk": {
            global.element.is_struk_edited = true;
            global.element.struk_save_button.disabled = false;
            break;
        }
    }
}

function sse_handler(data) {
    if (data.type === 8) {
        switch(data.code) {
            case "UPDATE_STRUK_SETTING": {
                if (global.element.is_struk_edited) return;
                const now = new Date()

                global.element.struk_html_code.value = data.data
                global.element.receipt_preview.srcdoc = render_template_html(data.data, {
                    store: global.public_info.store,
                    struk: {
                        no: "TRX-157193130418394",
                        time: format_date(now, "HH:mm:ss"),
                        date: format_date(now, "YYYY-MM-DD"),
                        cashier_name: "Alexander"
                    },
                    items: [
                        {
                            name: "Test barang 1",
                            qty: 1,
                            price: "10.000",
                            total: "10.000"
                        },
                        {
                            name: "Test barang 2 dengan Nama yang lumayan panjang",
                            qty: 2,
                            price: "15.000",
                            total: "30.000"
                        },
                        {
                            name: "Test barang 3",
                            qty: 2,
                            price: "10.000",
                            total: "20.000"
                        }
                    ],
                    summary: {
                        total: "60.000",
                        item_count: 5
                    },
                    payment: {
                        amount: "70.000",
                        change: "10.000",
                    }
                });
                break;
            }
            case "UPDATE_TOKO_SETTING": {
                if (!global.element.is_toko_edited) {
                    global.element.nama_toko = global.public_info.store.name
                    global.element.deskripsi_toko = global.public_info.store.description
                    global.element.alamat_toko = global.public_info.store.address
                    global.element.telepon_toko = global.public_info.store.no_phone
                    global.element.email_toko = global.public_info.store.email
                }

                const now = new Date()
                global.element.receipt_preview.srcdoc = render_template_html(global.element.struk_html_code.value, {
                    store: global.public_info.store,
                    struk: {
                        no: "TRX-157193130418394",
                        time: format_date(now, "HH:mm:ss"),
                        date: format_date(now, "YYYY-MM-DD"),
                        cashier_name: "Alexander"
                    },
                    items: [
                        {
                            name: "Test barang 1",
                            qty: 1,
                            price: "10.000",
                            total: "10.000"
                        },
                        {
                            name: "Test barang 2 dengan Nama yang lumayan panjang",
                            qty: 2,
                            price: "15.000",
                            total: "30.000"
                        },
                        {
                            name: "Test barang 3",
                            qty: 2,
                            price: "10.000",
                            total: "20.000"
                        }
                    ],
                    summary: {
                        total: "60.000",
                        item_count: 5
                    },
                    payment: {
                        amount: "70.000",
                        change: "10.000",
                    }
                });
                break;
            }
        }
    }
}

function print_test() {
    global.element.receipt_preview.contentWindow.print();
}

async function fetch_toko_setting() {
    const res = await fetch("/api/settings/toko", {
        method: "GET",
        headers: {
            "token": localStorage.getItem("token")
        }
    });

    if (res.status === 200) {
        const res_json = await res.json();

        global.element.nama_toko.value = res_json.name ?? ""
        global.element.deskripsi_toko.value = res_json.description ?? ""
        global.element.alamat_toko.value = res_json.address ?? ""
        global.element.telepon_toko.value = res_json.no_phone ?? ""
        global.element.email_toko.value = res_json.email ?? ""
    } else {
        swal2_mixin.fire({
            icon: "error",
            title: "Something went wrong! Please try again or contact admin."
        });
    }
}

async function fetch_struk_setting() {
    const res = await fetch("/api/settings/struk", {
        method: "GET",
        headers: {
            "token": localStorage.getItem("token")
        }
    });

    if (res.status === 200) {
        const res_json = await res.json();
        const now = new Date();

        global.element.struk_html_code.value = res_json.content ?? "";
        global.element.receipt_preview.srcdoc = render_template_html(global.element.struk_html_code.value, {
            store: global.public_info.store,
            struk: {
                no: "TRX-157193130418394",
                time: format_date(now, "HH:mm:ss"),
                date: format_date(now, "YYYY-MM-DD"),
                cashier_name: "Alexander"
            },
            items: [
                {
                    name: "Test barang 1",
                    qty: 1,
                    price: "10.000",
                    total: "10.000"
                },
                {
                    name: "Test barang 2 dengan Nama yang lumayan panjang",
                    qty: 2,
                    price: "15.000",
                    total: "30.000"
                },
                {
                    name: "Test barang 3",
                    qty: 2,
                    price: "10.000",
                    total: "20.000"
                }
            ],
            summary: {
                total: "60.000",
                item_count: 5
            },
            payment: {
                amount: "70.000",
                change: "10.000",
            }
        });
    } else {
        swal2_mixin.fire({
            icon: "error",
            title: "Something went wrong! Please try again or contact admin."
        });
    }
}

async function apply_toko_setting() {
    const showError = (msg, el) => {
        swal2_mixin.fire({ icon: "error", title: msg });
        el?.focus();
        return false;
    };

    const phoneRegex = /^[0-9+\-\s()]+$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (global.element.telepon_toko.value) {
        if (!phoneRegex.test(telepon_toko.value.trim())) {
            return showError("Nomor telepon harus berupa angka!", telepon_toko);
        }
    }
    if (global.element.email_toko.value) {
        if (!emailRegex.test(email_toko.value.trim())) {
            return showError("Format email tidak valid!", email_toko);
        }
    }

    const res = await fetch("/settings/toko", {
        method: "PATCH",
        headers: {
            "token": localStorage.getItem("token")
        },
        body: new URLSearchParams({
            nama_toko: global.element.nama_toko.value,
            deskripsi_toko: global.element.deskripsi_toko.value,
            alamat_toko: global.element.alamat_toko.value,
            telepon_toko: global.element.telepon_toko.value,
            email_toko: global.element.email_toko.value
        })
    });

    if (res.status === 200) {
        swal2_mixin.fire({
            icon: "success",
            title: "Setting berhasil disimpan!"
        });

        global.element.is_toko_edited = false;
        global.element.apply_setting.disabled = true;
    } else {
        swal2_mixin.fire({
            icon: "error",
            title: "Something went wrong! Please try again or contact admin."
        })
    }
}

async function struk_save() {
    const res = await fetch("/settings/struk", {
        method: "PATCH",
        headers: {
            "token": localStorage.getItem("token")
        },
        body: global.element.struk_editor.getValue()
    });

    if (res.status === 200) {
        swal2_mixin.fire({
            icon: "success",
            title: "Setting berhasil disimpan!"
        });

        global.element.is_struk_edited = false;
        global.element.struk_save_button.disabled = true;
    } else {
        swal2_mixin.fire({
            icon: "error",
            title: "Something went wrong! Please try again or contact admin."
        })
    }
}