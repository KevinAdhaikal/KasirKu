const vanillajs_dark = document.getElementById("vanillajs_dark");

if (localStorage.getItem("dark_mode")) {
  document.documentElement.classList.add("dark");
  document.documentElement.classList.add("dark-mode");
  if (vanillajs_dark) vanillajs_dark.href = "plugins/vanillajs-datepicker/css/dark.css";
} else {
  document.documentElement.classList.remove("dark");
  document.documentElement.classList.remove("dark-mode");
  if (vanillajs_dark) vanillajs_dark.href = "";
}