document.getElementById("dark_mode_checkbox").addEventListener("change", function() {
  if (this.checked) {
    document.body.classList.add("dark-mode");
    localStorage.setItem("dark_mode", "1");
  }
  else {
    document.body.classList.remove("dark-mode");
    localStorage.removeItem("dark_mode")
  }
})

if (localStorage.getItem("dark_mode")) {
  document.body.classList.add("dark-mode");
  document.getElementById("dark_mode_checkbox").checked = true;
} else {
  document.body.classList.remove("dark-mode");
  document.getElementById("dark_mode_checkbox").checked = false;
}