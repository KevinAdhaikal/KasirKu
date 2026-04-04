const vanillajs_dark = document.createElement("link");
vanillajs_dark.rel = "stylesheet";

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