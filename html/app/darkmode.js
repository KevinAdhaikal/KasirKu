let elem_check = [0, 0];

const vanillajs_dark = document.createElement("link");
vanillajs_dark.rel = "stylesheet";

const observer = new MutationObserver(() => {
  let dark_mode_checkbox = document.getElementById("dark_mode_checkbox");
  let nav = document.querySelector('nav');

  if (!elem_check[0] && dark_mode_checkbox) {
    document.getElementById("dark_mode_checkbox").addEventListener("change", function() {
      if (this.checked) {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.add("dark-mode");
        nav.classList.remove("navbar-light")
        nav.classList.add("navbar-dark")
        
        localStorage.setItem("dark_mode", "1");
        vanillajs_dark.href = "/plugins/vanillajs-datepicker/css/dark.css"
      }
      else {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("dark-mode");
        nav.classList.add("navbar-light")
        nav.classList.remove("navbar-dark")

        localStorage.removeItem("dark_mode")
        vanillajs_dark.href = "";
      }
    })

    dark_mode_checkbox.checked = localStorage.getItem("dark_mode") ? true : false;
    elem_check[0] = 1;
  }
  if (!elem_check[1] && nav) {
    if (localStorage.getItem("dark_mode")) {
      nav.classList.remove("navbar-light")
      nav.classList.add("navbar-dark")
    } else {
      nav.classList.add("navbar-light")
      nav.classList.remove("navbar-dark")
    }
    elem_check[1] = 1;
  }

  if (elem_check[0] && elem_check[1]) observer.disconnect();
});

if (localStorage.getItem("dark_mode")) {
  document.documentElement.classList.add("dark");
  document.documentElement.classList.add("dark-mode");
  vanillajs_dark.href = "/plugins/vanillajs-datepicker/css/dark.css";
} else {
  document.documentElement.classList.remove("dark");
  document.documentElement.classList.remove("dark-mode");
  vanillajs_dark.href = "";
}

document.head.appendChild(vanillajs_dark);

observer.observe(document.documentElement, {
  childList: true,
  subtree: true
});