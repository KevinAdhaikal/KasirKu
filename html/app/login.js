const remember_me = document.getElementById("remember_me");

const swal2_mixin = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000
});

async function login() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    if (!username || !password) {
        document.getElementById("username").focus();
        return swal2_mixin.fire({icon: "error", title: "Please input the correct username and password."});
    }

    let res = await fetch("/login", {
        method: "POST",
        body: new URLSearchParams({
            username, password
        })
    })

    if (res.status === 200) {
        if (remember_me.checked) {
            localStorage.setItem("username", username);
            localStorage.setItem("password", password);
        }
        sessionStorage.setItem("username", username);
        sessionStorage.setItem("password", password);
        
        localStorage.setItem("token", await res.text())
        window.location.href = "/"
    }
    else if (res.status === 403) {
        document.getElementById("username").focus();
        return swal2_mixin.fire({icon: "error", title: "Incorrect username or password. Please input the correct username and password."});
    }
    else {
        document.getElementById("username").focus();
        return swal2_mixin.fire({icon: "error", title: "Unexpected Server error. Please try again later."});
    }
}

async function logout() {
    Swal.fire({
        title: "Log out?",
        text: "Are you sure to log out from this account?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Yes",
        cancelButtonText: "No"
    }).then(async res => {
        if (res.isConfirmed) {
            await fetch("/logout", {
                method: "POST",
                headers: {
                    "token": localStorage.getItem("token")
                }
            });
            localStorage.removeItem("token");
            localStorage.removeItem("username");
            localStorage.removeItem("password");
            window.location.href = "/login";
        }
    });
}