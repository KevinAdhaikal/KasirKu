global.element = {
    modal_user_title: document.getElementById("modal_user_title"),
    modal_user_button: document.getElementById("modal_user_button"),
    username: document.getElementById("username"),
    full_name: document.getElementById("full_name"),
    password_display: document.getElementById("password_display"),
    password: document.getElementById("password"),
    confirm_password: document.getElementById("confirm_password"),
    role: $('#role').select2({
        theme: 'bootstrap4',
        dropdownParent: $('#modal_user')
    }),
    modal_user: $("#modal_user"),
    users_table: $("#users_table").DataTable({
        columns: [
            {
                data: 0,
                render: $.fn.dataTable.render.text()
            },
            {
                data: 1,
                render: $.fn.dataTable.render.text()
            },
            { data: 2 },
            { data: 3 },
            { data: 4 }
        ],
    }),
    controller_deinit: new AbortController(),
    temp_date: new Date()
};

global.init = () => {
    document.querySelectorAll(".toggle-password").forEach(btn => {
        btn.addEventListener("click", function () {
            const input = document.getElementById(this.dataset.target);
            const icon = this.querySelector("i");
            if (input.type === "password") {
                input.type = "text";
                icon.classList.remove("fa-eye");
                icon.classList.add("fa-eye-slash");
            } else {
                input.type = "password";
                icon.classList.remove("fa-eye-slash");
                icon.classList.add("fa-eye");
            }
        }, {
            signal: global.element.controller_deinit.signal
        });
    });
}

global.deinit = () => {
    global.element.controller_deinit.abort();
    global.element.controller_deinit = null;
    global.element.users_table.off("click.edit_user");
    global.element.users_table.off("click.delete_user");
    global.element.users_table.destroy();
    global.element.modal_user_button.onclick = null;
    global.remove_sse_handler(sse_handler);
}

global.element.users_table.on('click.edit_user', '.action_edit', async function () {
    global.element.role.prop("disabled", false);
    global.element.username.disabled = false;
    global.element.full_name.disabled = false;
    global.element.password_display.style = "";
    global.element.password.value = "";
    global.element.confirm_password.value = "";
    global.element.modal_user_button.disabled = false;

    let data = this.value;

    let res = await fetch(`/api/user?id=${data}`, {
        method: "GET",
        headers: {
            "token": localStorage.getItem("token")
        }
    })

    if (res.status === 200) {
        const res_json = await res.json();
        data = Number(data);

        if (data === global.profile.id || data === 1) {
            global.element.role.prop("disabled", true);
            global.element.username.disabled = true;
            global.element.full_name.disabled = true;
            global.element.password_display.style = "display: none;";
            global.element.modal_user_button.disabled = true;
        }
        
        global.element.role.val(res_json.role_id).trigger("change");
        global.element.username.value = res_json.username;
        global.element.full_name.value = res_json.full_name;
    } else if (res.status === 404) {
        return swal2_mixin.fire({
            icon: "error",
            title: "The user is not exists! Please refresh the page."
        })
    } else {
        const res_code = await res.text();

        if (res_code === "0") {
            return swal2_mixin.fire({
                icon: "error",
                title: "You are not authorized to perform this action."
            });
        }
        else {
            return swal2_mixin.fire({
                icon: "error",
                title: "Something went wrong! Please try again later or contact admin."
            })
        }
    }

    global.element.modal_user_title.innerText = "View/Edit User";
    global.element.modal_user_button.innerText = "Edit User";

    global.element.password.type = "password";
    global.element.confirm_password.type = "password";

    document.getElementById("change_password_label").style = "";

    document.querySelectorAll(".toggle-password i").forEach(e => {
        e.classList.remove("fa-eye-slash")
        e.classList.add("fa-eye");
    });
    
    global.element.modal_user_button.onclick = function() {edit_user(data)};

    global.element.modal_user.modal("show");
});

global.element.users_table.on('click.delete_user', '.action_delete', async function () {
    Swal.fire({
        title: "Delete User Account",
        text: "Are you sure to delete this user account?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Yes",
        cancelButtonText: "No"
    }).then(async res => {
        if (res.isConfirmed) {
            let res = await fetch("/user", {
                method: "DELETE",
                headers: {
                    "token": localStorage.getItem("token")
                },
                body: new URLSearchParams({
                    "id": this.value
                })
            })

            if (res.status === 200) {
                swal2_mixin.fire({
                    icon: "success",
                    title: "User account has been deleted!"
                });
            } else {
                const res_code = await res.text();

                if (res_code === "0") {
                    return swal2_mixin.fire({
                        icon: "error",
                        title: "You are not authorized to perform this action."
                    });
                }
                else if (res_code === "1") {
                    swal2_mixin.fire({
                        icon: "error",
                        title: "You can't change your own user account."
                    });
                }
                else if (res_code === "2") {
                    swal2_mixin.fire({
                        icon: "error",
                        title: "You can't change default user account."
                    });
                }
                else {
                    swal2_mixin.fire({
                        icon: "error",
                        title: "Something went wrong! Please try again later or contact admin."
                    })
                }
            }
        }
    });
});

global.add_sse_handler(sse_handler);

async function sse_handler(data) {
    if (data.type === 1) {
        switch(data.code) {
            case "REFRESH_USERS": {
                await fetch_users();
                break;
            }
            case "REFRESH_RP": {
                await fetch_roles();
                break;
            }
        }
    }
}

function tambah_user_modal() {
    global.element.modal_user_title.innerText = "Tambah User";
    global.element.modal_user_button.innerText = "Tambah User";
    global.element.password_display.style = "";
    global.element.modal_user_button.onclick = function() {tambah_user()};

    global.element.role.prop("disabled", false);
    global.element.username.disabled = false;
    global.element.full_name.disabled = false;
    global.element.password_display.style = "";
    global.element.modal_user_button.disabled = false;

    global.element.username.value = "";
    global.element.full_name.value = "";
    global.element.password.value = "";
    global.element.confirm_password.value = "";

    document.getElementById("change_password_label").style = "display: none;";

    global.element.password.type = "password";
    global.element.confirm_password.type = "password";

    document.querySelectorAll(".toggle-password i").forEach(e => {
        e.classList.remove("fa-eye-slash")
        e.classList.add("fa-eye");
    })

    global.element.modal_user.modal("show");
}

async function tambah_user() {
    if (global.element.password.value.length < 8 ||  global.element.confirm_password.value.length < 8) return swal2_mixin.fire({
        icon: "error",
        title: "Password & Confirm Password length at least 8 characters"
    });
    if (global.element.password.value !== global.element.confirm_password.value) return swal2_mixin.fire({
        icon: "error",
        title: "Confirm password must match the new password."
    });

    if (!/^[a-z0-9_]+$/.test(global.element.username.value)) {
        return swal2_mixin.fire({
            icon: "error",
            title: "Invalid username! Use lowercase letters, numbers, or underscore"
        })
    }

    let res = await fetch("/user", {
        method: "POST",
        headers: {
            "token": localStorage.getItem("token")
        },
        body: new URLSearchParams({
            "username": global.element.username.value,
            "full_name": global.element.full_name.value,
            "password": global.element.password.value,
            "role_id": global.element.role.val()
        })
    })

    if (res.status === 200) {
        swal2_mixin.fire({
            icon: "success",
            title: "User account has been created!"
        });
        global.element.modal_user.modal("hide");
    } else {
        const res_text = await res.text();

        if (res_text === "0") {
            return swal2_mixin.fire({
                icon: "error",
                title: "You are not authorized to perform this action."
            });
        }
        else if (res_text === "1") {
            swal2_mixin.fire({
                icon: "error",
                title: "Username is exists! Please try another username."
            });
        } else {
            swal2_mixin.fire({
                icon: "error",
                title: "Something went wrong! Please try again later or contact admin."
            });
        }
    }
}

async function edit_user(id) {
    if (global.element.password.value) {
        if (global.element.password.value.length < 8 ||  global.element.confirm_password.value.length < 8) return swal2_mixin.fire({
            icon: "error",
            title: "Password & Confirm Password length at least 8 characters"
        });
        if (global.element.password.value !== global.element.confirm_password.value) return swal2_mixin.fire({
            icon: "error",
            title: "Confirm password must match the new password"
        });
    }

    if (!/^[a-z0-9_]+$/.test(global.element.username.value)) {
        return swal2_mixin.fire({
            icon: "error",
            title: "Invalid username! Use lowercase letters, numbers, or underscore"
        })
    }

    let res = await fetch("/user", {
        method: "PATCH",
        headers: {
            "token": localStorage.getItem("token")
        },
        body: new URLSearchParams({
            id,
            "new_full_name": global.element.full_name.value,
            "new_username": global.element.username.value,
            "new_role_id": global.element.role.val(),
            ...(global.element.password.value ? {"new_password": global.element.password.value} : {})
        })
    })

    if (res.status === 200) {
        swal2_mixin.fire({
            icon: "success",
            title: "User account has been edited!"
        });
        global.element.modal_user.modal("hide");
    } else if (res.status !== 404) {
        const res_text = await res.text();

        if (res_text === "0") {
            return swal2_mixin.fire({
                icon: "error",
                title: "You are not authorized to perform this action."
            });
        }
        else if (res_text === "1") {
            swal2_mixin.fire({
                icon: "error",
                title: "You can't edit your own user account!"
            });
        }
        else if (res_text === "2") {
            swal2_mixin.fire({
                icon: "error",
                title: "You can't edit default user account!"
            });
        }
        else if (res_text === "3") {
            swal2_mixin.fire({
                icon: "error",
                title: "Username is exists! Please try another username."
            });
        }
        else {
            swal2_mixin.fire({
                icon: "error",
                title: "Something went wrong! Please try again later or contact admin."
            });
        }
    }
}

async function fetch_users() {
    global.element.users_table.clear();

    let res = await fetch("/api/users", {
        method: "GET",
        headers: {
            "token": localStorage.getItem("token")
        }
    })

    if (res.status === 200) {
        const res_json = await res.json();

        for (let a = 0; a < res_json.length; a++) {
            global.element.temp_date.setTime(res_json[a].created_ms);
            const created_at = format_date(global.element.temp_date);

            global.element.temp_date.setTime(res_json[a].modified_ms);
            const modified_at = format_date(global.element.temp_date);

            global.element.users_table.row.add([
                res_json[a].username,
                res_json[a].full_name,
                created_at,
                modified_at,
                `<center>
                <button type="button" class="text-right btn btn-primary action_edit" value="${res_json[a].id}"><i class="fa fa-eye"></i> View/Edit</button>
                <button type="button" class="text-right btn btn-danger action_delete" value="${res_json[a].id}" ${res_json[a].id === 1 ? "disabled" : ""}><i class="fa fa-trash"></i> Delete</button>
                </center>`
            ])
        }
    } else {
        const text_res = await res.text();

        if (text_res === "0") {
            swal2_mixin.fire({
                icon: "error",
                title: "You are not authorized to perform this action."
            });
            return 0;
        }
        else {
            swal2_mixin.fire({
                icon: "error",
                title: "Something went wrong! Please try again later or contact admin."
            });
            return 0;
        }
    }

    global.element.users_table.draw();
}

async function fetch_roles() {
    let res = await fetch("/api/roles", {
        method: "GET",
        headers: {
            "token": localStorage.getItem("token")
        }
    })

    if (res.status === 200) {
        const res_json = await res.json();
        const select = global.element.role[0];
        select.innerHTML = "";

        for (const item of res_json) {
            const option = document.createElement("option");
            option.value = String(item.id);
            option.textContent = item.name;
            select.appendChild(option);
        }

        global.element.role.trigger("change");
    } else {
        const text_res = await res.text();

        if (text_res === "0") {
            swal2_mixin.fire({
                icon: "warning",
                title: "Editing user information is allowed. Changing the user’s role is restricted because you do not have the necessary authorization."
            });
            return 0;
        }
        else {
            swal2_mixin.fire({
                icon: "error",
                title: "Something went wrong! Please try again later or contact admin."
            });
            return 0;
        }
    }
}

(async function() {
    global.init();
    global.init = null;
    await fetch_roles();
    if ((await fetch_users()) === 0) return;
})();