const nav = document.querySelector('.navbar');

document.getElementById("dark_mode_checkbox").addEventListener("change", function() {
  if (this.checked) {
    document.documentElement.classList.add("dark-mode");
    nav.classList.remove("navbar-light")
    nav.classList.add("navbar-dark")
    
    localStorage.setItem("dark_mode", "1");
    vanillajs_dark.href = "/plugins/vanillajs-datepicker/css/dark.css"
  }
  else {
    document.documentElement.classList.remove("dark-mode");
    nav.classList.add("navbar-light")
    nav.classList.remove("navbar-dark")

    localStorage.removeItem("dark_mode")
    vanillajs_dark.href = "";
  }
})

if (localStorage.getItem("dark_mode")) {
  nav.classList.remove("navbar-light")
  nav.classList.add("navbar-dark")
  document.getElementById("dark_mode_checkbox").checked = true;
} else {
  nav.classList.add("navbar-light")
  nav.classList.remove("navbar-dark")
  document.getElementById("dark_mode_checkbox").checked = false;
}