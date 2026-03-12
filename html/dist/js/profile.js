global.element = {
    name_profile1: document.getElementById("name_profile1"),
    name_profile2: document.getElementById("name_profile2"),
    role_profile1: document.getElementById("role_profile1"),
    role_profile2: document.getElementById("role_profile2"),
    profile_img1: document.getElementById("profile_img1"),
    profile_img2: document.getElementById("profile_img2"),
    profile_img3: document.getElementById("profile_img3"),
    full_name_text: document.getElementById("full_name_text"),
    username_text: document.getElementById("username_text"),
    modified_at: document.getElementById("modified_at"),
    created_at: document.getElementById("created_at"),
    full_name: document.getElementById("full_name"),
    username: document.getElementById("username"),
    change_profile_button: document.getElementById("change_profile_button"),
    change_photo_button: document.getElementById("change_photo_button"),
    current_password: document.getElementById("current_password"),
    new_password: document.getElementById("new_password"),
    confirm_new_password: document.getElementById("confirm_new_password"),
    input: document.createElement('input'),

    controller_deinit: new AbortController(),
    is_change_photo: false,
    temp_date: new Date()
};

global.element.input.type = 'file';
global.element.input.accept = "image/*";
global.element.input.style.display = 'none';

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
    global.element.input.onchange = null;
    global.remove_sse_handler(sse_handler);
}

global.add_sse_handler(sse_handler);

async function sse_handler(data) {
    if (data.type === 1 && data.code === "CHANGE_PROFILE") await fetch_current_profile();
}

function change_photo_button() {
    global.element.input.onchange = function (ev) {
        const freader = new FileReader();
        freader.readAsDataURL(ev.target.files[0]);

        freader.onloadend = function(e) {
            global.element.profile_img3.src = e.target.result;
            global.element.is_change_photo = true;
            check_change();
        }
    };

    global.element.input.click();
}

function check_change() {
    global.element.change_profile_button.disabled = false;
}

async function fetch_current_profile() {
    if (!global.element.change_profile_button.disabled) return;

    let res = await fetch("/api/profile", {
        method: "GET",
        headers: {
            "token": localStorage.getItem("token")
        }
    });

    if (res.status === 200) {
        const res_json = await res.json();
        
        global.element.full_name_text.innerText = res_json.full_name;
        global.element.username_text.innerText = res_json.username;

        global.element.temp_date.setTime(res_json.modified_ms);
        global.element.modified_at.innerText = "Modified: " + global.element.temp_date.toLocaleString("en-EN", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
        global.element.temp_date.setTime(res_json.created_ms);
        global.element.created_at.innerText = "Created: " + global.element.temp_date.toLocaleString("en-EN", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });

        global.element.full_name.value = res_json.full_name;
        global.element.username.value = res_json.username;
        global.element.role_profile2.innerText = res_json.role_name;
        
        if (res_json.profile_img) global.element.profile_img3.src = res_json.profile_img;
    }
    else if (res.status !== 404) {
        swal2_mixin.fire({
            icon: "error",
            title: "Something went wrong! Please try again or contact admin."
        });
    }
}

async function change_profile() {
    if (global.element.change_profile_button.disabled) return;
    global.element.change_profile_button.disabled = true;

    let res = await fetch("/profile", {
        method: "PATCH",
        headers: {
            "token": localStorage.getItem("token")
        },
        body: new URLSearchParams({
            "new_full_name": global.element.full_name.value,
            "new_username": global.element.username.value,
            ...(global.element.is_change_photo ? {
                "new_profile_img": global.element.profile_img3.src.split(",")[1]
            } : {})
        })
    })

    if (res.status === 200) {
        const res_body = await res.text();

        global.element.is_change_photo = false;

        if (res_body) localStorage.setItem("token", res_body);
        
        swal2_mixin.fire({
            icon: "success",
            title: "Profile has been chnaged!"
        });
    }
    else if (res.status !== 404) {
        global.element.change_profile_button.disabled = false;
        const code = await res.text();
        if (code === "1") {
            swal2_mixin.fire({
                icon: "error",
                title: "Username is exists! Please try another username."
            });
        } else {
            swal2_mixin.fire({
                icon: "error",
                title: "Something went wrong! Please try again or contact admin."
            });
        }
    }
}

async function change_password() {
    if (global.element.new_password.value.length < 8 ||  global.element.confirm_new_password.value.length < 8) return swal2_mixin.fire({
        icon: "error",
        title: "New Password & Confirm New Password length at least 8 characters"
    });
    if (global.element.new_password.value !== global.element.confirm_new_password.value) return swal2_mixin.fire({
        icon: "error",
        title: "Confirm password must match the new password."
    })

    try {
        let res = await fetch("/change_password", {
            method: "PATCH",
            headers: {
                "token": localStorage.getItem("token")
            },
            body: new URLSearchParams({
                "old_pass": global.element.current_password.value,
                "new_pass": global.element.new_password.value
            })
        })

        if (res.status === 200) {
            const res_body = await res.text();
            global.change_password = true;
            
            swal2_mixin.fire({
                icon: "success",
                title: "Password has been changed!"
            })

            new_password.value = "";
            confirm_new_password.value = "";

            if (res_body) localStorage.setItem("token", res_body);

            $("#modal_change_password").modal("hide");
        } else {
            swal2_mixin.fire({
                icon: "error",
                title: "Incorrect current passowrd! Please enter the correct current password."
            })
        }
    } finally {
    }
}

(async function() {
    global.init();
    await fetch_current_profile();
})()