global.element = {
    // ini buat Toko Setting
    nama_toko: document.getElementById("nama_toko"),
    deskripsi_toko: document.getElementById("deskripsi_toko"),
    alamat_toko: document.getElementById("alamat_toko"),
    telepon_toko: document.getElementById("telepon_toko"),
    email_toko: document.getElementById("email_toko"),

    // ini buat Struk Setting
    struk_html_code: document.getElementById("struk_html_code"),
    receipt_preview: document.getElementById("receipt_preview"),
    struk_editor: null,
    struk_html_change_timer: null
}

global.deinit = () => {
    global.remove_sse_handler(sse_handler);
}

global.refresh_handler = async function() {
    await fetch_toko_setting();
    await fetch_struk_setting();
}

global.add_sse_handler(sse_handler);

$('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
    const currentTab = $(e.target).attr('href');
    const previousTab = $(e.relatedTarget).attr('href');

    // current tab (ini harus di init)
    if (currentTab === '#struk') {
        if (!global.element.struk_editor) {
            global.element.struk_editor = CodeMirror.fromTextArea(global.element.struk_html_code, {
                mode: "htmlmixed",
                theme: "monokai"
            });
            global.element.struk_editor.on("change", function(cm) {
                clearTimeout(global.element.struk_html_change_timer);
                global.element.struk_html_change_timer = setTimeout(async () => {
                    const res = await fetch("/render_struk_html", {
                        method: "POST",
                        headers: {
                            "token": localStorage.getItem("token")
                        },
                        body: cm.getValue()
                    });

                    if (res.status === 200) {
                        global.element.receipt_preview.srcdoc = await res.text();
                    }
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

function print_test() {
    global.element.receipt_preview.contentWindow.print();
}

async function sse_handler(data) {
    if (data.type === 8) {
        switch(data.code) {
            case "UPDATE_TOKO_SETTING": {
                global.element.nama_toko.value = data.data.nama_toko ?? ""
                global.element.deskripsi_toko.value = data.data.deskripsi_toko ?? ""
                global.element.alamat_toko.value = data.data.alamat_toko ?? ""
                global.element.telepon_toko.value = data.data.telepon_toko ?? ""
                global.element.email_toko.value = data.data.email_toko ?? ""
                break;
            }
            case "UPDATE_STRUK_SETTING": {
                break;
            }
            case "UPDATE_TELEGRAM_SETTING": {
                break;
            }
            default: {
                break;
            }
        }
    }
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
        global.element.struk_html_code.value = res_json.content ?? "";
        global.element.receipt_preview.srcdoc = res_json.view ?? "";
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
        })
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
        })
    } else {
        swal2_mixin.fire({
            icon: "error",
            title: "Something went wrong! Please try again or contact admin."
        })
    }
}