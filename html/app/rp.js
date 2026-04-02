global.element = {
    role_name: document.getElementById("role_name"),
    perm_cb: document.querySelectorAll(".perm_cb"),
    modal_role_title: document.getElementById("modal_role_title"),
    modal_role_button: document.getElementById("modal_role_button"),
    user_assigned_role: document.getElementById("user_assigned_role"), 
    modal_role: $("#modal_role"),
    roles_table: $("#roles_table").DataTable({
        columns: [
            {
                data: 0,
                render: $.fn.dataTable.render.text()
            },
            { data: 1 },
            { data: 2 },
            { data: 3 }
        ],
    }),
    user_assigned_role_table: $("#user_assigned_role_table").DataTable({
        columns: [
            {
                data: 0,
                render: $.fn.dataTable.render.text()
            },
        ],
    }),
    temp_date: new Date(),
    abort_controllers: [null, null]
};

global.deinit = () => {
    global.element.roles_table.off(".button_edit");
    global.element.roles_table.off(".button_delete");
    global.element.roles_table.destroy();
    global.element.user_assigned_role_table.destroy();
    global.element.modal_role_button.onclick = null;
    global.remove_sse_handler(sse_handler);
    global.element.abort_controllers.forEach(e => {
        if (e) e.abort();
    })
}

global.element.roles_table.on('click.button_edit', '.action_edit', async function () {
    if (global.element.abort_controllers[1]) global.element.abort_controllers[1].abort();

    global.element.abort_controllers[1] = new AbortController();

    global.element.perm_cb.forEach(cb => {cb.checked = false; cb.disabled = false;});
    global.element.user_assigned_role_table.clear();

    const data = this.value;

    try {
        let res = await fetch(`/api/role?id=${data}`, {
            method: "GET",
            headers: {
                "token": localStorage.getItem("token")
            },
            signal: global.element.abort_controllers[1].signal
        });

        if (res.status === 200) {
            const res_json = await res.json();
            global.element.role_name.value = res_json.name;

            if (res_json.id === 1) {
                global.element.perm_cb.forEach(cb => {
                    cb.disabled = true;
                })
            } else {
                global.element.perm_cb.forEach(cb => {
                    if ((BigInt(res_json.permission_level) & (1n << BigInt(cb.value))) !== 0n) cb.checked = true;
                })
            }
            global.element.user_assigned_role.style = "";

            res = await fetch(`/api/uar_list?id=${res_json.id}`, {
                method: "GET",
                headers: {
                    "token": localStorage.getItem("token")
                },
                signal: global.element.abort_controllers[1].signal
            });
            if (res.status === 200) {
                const res_json = await res.json();

                res_json.forEach(e => {
                    global.element.user_assigned_role_table.row.add([
                        `${e.full_name} (${e.username})`
                    ])
                })

                global.element.user_assigned_role_table.draw();
            }
            else {
                return swal2_mixin.fire({
                    icon: "error",
                    title: "Something went wrong! Please try again later or contact admin."
                })
            }
        } else if (res.status === 404) {
            return swal2_mixin.fire({
                icon: "error",
                title: "The role is not exists! Please refresh the page."
            })
        } else {
            const res_code = await res.text();

            if (res_code === "0") {
                swal2_mixin.fire({
                    icon: "error",
                    title: "You are not authorized to perform this action."
                });
            } else {
                return swal2_mixin.fire({
                    icon: "error",
                    title: "Something went wrong! Please try again later or contact admin."
                })
            }
        }

        global.element.modal_role_title.innerText = "Edit Role";
        global.element.modal_role_button.innerText = "Edit Role";

        global.element.modal_role_button.onclick = function() {edit_role(data)};
        global.element.modal_role.modal("show");
    } catch(e) {
        if (e.name === "AbortError") return;
        console.error(e);
    }
});

global.element.roles_table.on('click.button_delete', '.action_delete', async function () {
    Swal.fire({
        title: "Delete Role",
        text: "Are you sure to delete this role?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Yes",
        cancelButtonText: "No"
    }).then(async res => {
        if (res.isConfirmed) {
            let res = await fetch("/role", {
                method: "DELETE",
                headers: {
                    "token": localStorage.getItem("token")
                },
                body: new URLSearchParams({
                    "id": this.value,
                })
            })

            if (res.status === 200) {
                swal2_mixin.fire({
                    icon: "success",
                    title: "Role has been deleted!"
                })
            }
            else {
                const res_code = await res.text();

                if (res_code === "0") {
                    swal2_mixin.fire({
                        icon: "error",
                        title: "You are not authorized to perform this action."
                    });
                }
                else if (res_code === "1") {
                    swal2_mixin.fire({
                        icon: "error",
                        title: "You can't delete the Default role!"
                    })
                }
                else if (res_code === "2") {
                    Swal.fire({
                        title: "Delete Role and Associated Users",
                        text: "This role is currently assigned to one or more users. Deleting it will permanently remove those user accounts. Do you want to continue?",
                        icon: "error",
                        showCancelButton: true,
                        confirmButtonColor: "#d33",
                        cancelButtonColor: "#3085d6",
                        confirmButtonText: "Yes",
                        cancelButtonText: "No"
                    }).then(async res2 => {
                        if (res2.isConfirmed) {
                            let res = await fetch("/role", {
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
                                    title: "Role has been deleted!"
                                })
                            }
                            else {
                                const res_code = await res.text();

                                if (res_code === "0") {
                                    swal2_mixin.fire({
                                        icon: "error",
                                        title: "You are not authorized to perform this action."
                                    });
                                }
                                else if (res_code === "1") {
                                    swal2_mixin.fire({
                                        icon: "error",
                                        title: "You can't delete the Default role!"
                                    })
                                }
                            }
                        }
                    })
                }
                else {
                    swal2_mixin.fire({
                        icon: "success",
                        title: "Something went wrong! Please try again later or contact admin."
                    })
                }
            }
        }
    })
});

global.add_sse_handler(sse_handler);

async function sse_handler(data) {
    if (data.type === 1 && data.code === "REFRESH_RP") await fetch_roles();
}

function full_permission_cb() {
    if (global.element.perm_cb[0].checked) {
        global.element.perm_cb.forEach(cb => {
            cb.disabled = true;
        })
        global.element.perm_cb[0].disabled = false;
    }
    else {
        global.element.perm_cb.forEach(cb => {
            cb.disabled = false;
        })
    }
}

async function tambah_role_modal() {
    global.element.modal_role_title.innerText = "Add Role";
    global.element.modal_role_button.innerText = "Add Role";
    global.element.role_name.value = "";
    global.element.perm_cb.forEach(cb => {
        cb.checked = false;
        cb.disabled = false;
    });
    global.element.user_assigned_role.style = "display: none;";

    global.element.modal_role_button.onclick = function() {tambah_role()};
    global.element.modal_role.modal("show");
}

async function fetch_roles() {
    if (global.element.abort_controllers[0]) global.element.abort_controllers[0].abort();
    global.element.abort_controllers[0] = new AbortController();

    try {
        global.element.roles_table.clear();
        let res = await fetch("/api/roles", {
            method: "GET",
            headers: {
                "token": localStorage.getItem("token")
            },
            signal: global.element.abort_controllers[0].signal
        })

        if (res.status === 200) {
            const res_json = await res.json();

            for (let a = 0; a < res_json.length; a++) {
                global.element.temp_date.setTime(res_json[a].created_ms);
                const created_at = format_date(global.element.temp_date);
                global.element.temp_date.setTime(res_json[a].modified_ms);
                const modified_at = format_date(global.element.temp_date);

                global.element.roles_table.row.add([
                    res_json[a].name,
                    created_at,
                    modified_at,
                    ...[res_json[a].id !== 1 ? [
                        `<center>
                        <button type="button" class="text-right btn btn-primary action_edit" value="${res_json[a].id}"><i class="fa fa-eye"></i> View/Edit</button>
                        <button type="button" class="text-right btn btn-danger action_delete" value="${res_json[a].id}"><i class="fa fa-trash"></i> Delete</button>
                        </center>`
                    ] : [
                        `<center>
                        <button type="button" class="text-right btn btn-primary action_edit" value="${res_json[a].id}"><i class="fa fa-eye"></i> View/Edit</button>
                        <button type="button" class="text-right btn btn-danger action_delete" value="${res_json[a].id}" disabled><i class="fa fa-trash"></i> Delete</button>
                        </center>`
                    ]]
                ])
            }
        } else {
            const res_code = await res.text();

            if (res_code === "0") {
                swal2_mixin.fire({
                    icon: "error",
                    title: "You are not authorized to perform this action."
                });
            }
            else {
                swal2_mixin.fire({
                    icon: "error",
                    title: "Something went wrong! Please try again later or contact admin."
                });
            }
        }
        
        global.element.roles_table.draw();
    } catch(e) {
        if (e.name === "AbortError") return;
        console.error(e);
    }
}

async function tambah_role() {
    let permission_level = 0n;
    global.element.perm_cb.forEach(cb => {
        if (cb.checked) permission_level |= (1n << BigInt(cb.value));
    })

    let res = await fetch("/role", {
        method: "POST",
        headers: {
            "token": localStorage.getItem("token")
        },
        body: new URLSearchParams({
            "role_name": global.element.role_name.value,
            "permission_level": permission_level
        })
    })

    if (res.status === 200) {
        swal2_mixin.fire({
            icon: "success",
            title: "Role has been added!"
        })

        global.element.modal_role.modal("hide");
    } else {
        const res_code = await res.text();

        if (res_code === "0") { 
            swal2_mixin.fire({
                icon: "error",
                title: "You are not authorized to perform this action."
            });
        }
        else if (res_code === "1") {
            swal2_mixin.fire({
                icon: "error",
                title: "Role name is already exists! Please use another role name."
            })
        }
        else {
            swal2_mixin.fire({
                icon: "error",
                title: "Something went wrong! Please try again later or contact admin."
            })
        }
    }
}

async function edit_role(id) {
    let permission_level = 0n;
    global.element.perm_cb.forEach(cb => {
        if (cb.checked) permission_level |= (1n << BigInt(cb.value));
    })

    let res = await fetch("/role", {
        method: "PATCH",
        headers: {
            "token": localStorage.getItem("token")
        },
        body: new URLSearchParams({
            "id": id,
            "new_role_name": global.element.role_name.value,
            "new_permission_level": permission_level
        })
    })

    if (res.status === 200) {
        swal2_mixin.fire({
            icon: "success",
            title: "Role has been edited!"
        })
        global.element.modal_role.modal("hide");
    }
    else {
        const res_code = await res.text();

        if (res_code === "0") { 
            swal2_mixin.fire({
                icon: "error",
                title: "You are not authorized to perform this action."
            });
        }
        else if (res_code === "1") {
            swal2_mixin.fire({
                icon: "error",
                title: "Role name is already exists! Please use another role name."
            })
        }
        else {
            swal2_mixin.fire({
                icon: "error",
                title: "Something went wrong! Please try again later or contact admin."
            })
        }
    }
}

(async function() {
    await fetch_roles();
})();