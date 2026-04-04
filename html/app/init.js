const sidebar_data = `<ul class="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu" data-accordion="false">
  <li class="section_check" style="display: none;" data-value="4">
    <ul class="nav nav-pills nav-sidebar flex-column">
      <li class="nav-header">DASHBOARD</li>
      <li class="nav-item">
        <a href="/" class="nav-link nav-redirect" data-url="/">
          <i class="nav-icon fas fa-tachometer-alt"></i>
          <p>
            Dashboard
          </p>
        </a>
      </li>
    </ul>
  </li>
  <li class="section_check" style="display: none;" data-value="1">
    <ul class="nav nav-pills nav-sidebar flex-column">
      <li class="nav-item">
        <hr style="border-color: rgba(255,255,255,0.1); margin: 8px 0;">
      </li>
      <li class="nav-header">BARANG</li>
      <li class="nav-item">
        <a href="/barang/daftar_barang" class="nav-link nav-redirect" data-url="/barang/daftar_barang">
          <i class="nav-icon fas fa-boxes"></i>
          <p>Daftar Barang</p>
        </a>
      </li>
      <li class="nav-item">
        <a href="/barang/kategori_barang" class="nav-link nav-redirect" data-url="/barang/kategori_barang">
          <i class="nav-icon fas fa-tag"></i>
          <p>Kategori Barang</p>
        </a>
      </li>
      <li class="nav-item">
        <a href="/barang/barang_masuk" class="nav-link nav-redirect" data-url="/barang/barang_masuk">
          <i class="nav-icon fas fa-dolly-flatbed"></i>
          <p>Barang Masuk</p>
        </a>
      </li>
    </ul>
  </li>
  <li class="section_check" style="display: none;" data-value="2">
    <ul class="nav nav-pills nav-sidebar flex-column">
      <li class="nav-item">
        <hr style="border-color: rgba(255,255,255,0.1); margin: 8px 0;">
      </li>
      <li class="nav-header">KASIR</li>
      <li class="nav-item">
        <a href="/kasir/kasir" class="nav-link nav-redirect" data-url="/kasir/kasir">
          <i class="nav-icon fas fa-cash-register"></i>
          <p>Kasir</p>
        </a>
      </li>
    </ul>
  </li>
  <li class="section_check" style="display: none;" data-value="3">
    <ul class="nav nav-pills nav-sidebar flex-column">
      <li class="nav-item">
        <hr style="border-color: rgba(255,255,255,0.1); margin: 8px 0;">
      </li>
      <li class="nav-header">PEMBUKUAN</li>
      <li class="nav-item">
        <a href="/pembukuan/penjualan" class="nav-link nav-redirect" data-url="/pembukuan/penjualan">
          <i class="nav-icon fas fa-plus"></i>
          <p>Penjualan</p>
        </a>
      </li>
      <li class="nav-item">
        <a href="/pembukuan/pengeluaran" class="nav-link nav-redirect" data-url="/pembukuan/pengeluaran">
          <i class="nav-icon fas fa-minus"></i>
          <p>Pengeluaran</p>
        </a>
      </li>
      <li class="nav-item">
        <a href="/pembukuan/laporan" class="nav-link nav-redirect" data-url="/pembukuan/laporan">
          <i class="nav-icon fas fa-chart-line"></i>
          <p>Laporan</p>
        </a>
      </li>
    </ul>
  </li>
  <li class="section_check" style="display: none;" data-value="0">
    <ul class="nav nav-pills nav-sidebar flex-column">
      <li class="nav-item">
        <hr style="border-color: rgba(255,255,255,0.1); margin: 8px 0;">
      </li>
      <li class="nav-header">ADMIN</li>
      <li class="nav-item">
        <a href="/users" class="nav-link nav-redirect" data-url="/users">
          <i class="nav-icon fas fa-users"></i>
          <p>Users</p>
        </a>
      </li>
      <li class="nav-item">
        <a href="/rp" class="nav-link nav-redirect" data-url="/rp">
          <i class="nav-icon fas fa-user-tag"></i>
          <p>Roles & Permissions</p>
        </a>
      </li>
    </ul>
  </li>
</ul>`

const global = {}

global.sse_retry_count = 0;
global.sse_retry_timer = null;

let load_page_version = 0;
let load_page_abort_controller = null;

const name_profile1 = document.getElementById("name_profile1");
const name_profile2 = document.getElementById("name_profile2");
const profile_img1 = document.getElementById("profile_img1");
const profile_img2 = document.getElementById("profile_img2");
const role_profile1 = document.getElementById("role_profile1");
const status_server = document.getElementById("status_server");
const sidebar_menu = document.getElementById("sidebar_menu");
let co_wrap = document.getElementById("co_wrap");
document.addEventListener("click", async e => {
  const link = e.target.closest("a.nav-redirect");
  if (!link) return;

  e.preventDefault();

  const url = link.href;
  if (url === location.href) return;
  if (await load_page(url, true) === -1) return;
});

window.addEventListener("popstate", async () => {
  const currentPath = location.pathname;
  if (await load_page(currentPath, false) === -1) return;
});

global.sse_handlers = new Set();

global.add_sse_handler = (fn) => {
  global.sse_handlers.add(fn);
};

global.remove_sse_handler = (fn) => {
  global.sse_handlers.delete(fn);
};

global.connect_sse = () => {
  if (global.sse) global.sse.close();

  const sse = new EventSource("/api/sse", {
    withCredentials: true
  });

  global.sse = sse;

  sse.onerror = () => {
    status_server.innerText = "Status: Offline";
    status_server.classList.remove("badge-success");
    status_server.classList.add("badge-danger");

    sse.close();

    const delay = global.sse_retry_count < 10 ? 100 : 500;
    global.sse_retry_count++;

    setTimeout(() => {
      global.connect_sse();
    }, delay);
  };

  sse.onmessage = async (e) => {
    global.sse_retry_count = 0;
    const data = JSON.parse(e.data);

    if (data.type === 1) {
      switch (data.code) {
        case "OK": {
          global.sse_retry_count = 0;

          status_server.classList.add("badge-success");
          status_server.classList.remove("badge-danger");
          status_server.innerText = "Status: Online";

          if (global.refresh_handler) global.refresh_handler();
          break;
        }
        case "CHANGE_PROFILE": {
          await fetch_profile();
          refresh_permission();
          break;
        }
        case "UNAUTHORIZED": {
          if (global.change_password) {
            global.change_password = false;
            return;
          }

          const username = sessionStorage.getItem("username") || localStorage.getItem("username");
          const password = sessionStorage.getItem("password") || localStorage.getItem("password");

          if (username && password) {
            const res = await fetch("/login", {
              method: "POST",
              body: new URLSearchParams({ username, password })
            });

            if (res.status === 200) {
              localStorage.setItem("token", await res.text());
              sse.close();
              global.connect_sse();
              return;
            }
          }

          sse.close();
          localStorage.removeItem("token");
          window.location.href = "/login";
          break;
        }
      }
    }

    for (const handler of global.sse_handlers) {
      try {
        await handler(data);
      } catch (err) {
        console.error("SSE handler error:", err);
      }
    }
  };
};

function cssExists(href) {
  return !!document.querySelector(`link[href="${href}"]`);
}

function scriptExists(src) {
  return !!document.querySelector(`script[src="${src}"]`);
}

function clearPageCss() {
  document.querySelectorAll("link[data-page-css], style[data-page-css]").forEach(el => el.remove());
}

function clearPageScripts() {
  document.querySelectorAll("script[data-page-script]").forEach(el => el.remove());
}

function update_active_nav(url) {
  const path = new URL(url, location.origin).pathname;

  document.querySelectorAll(".nav-redirect").forEach(link => {
    const href = new URL(link.getAttribute("href"), location.origin).pathname;
    const data = link.dataset.url;

    link.classList.toggle("active", href === path || data === path);
  });
}

function loadCssAsync(href, attrName = null, attrValue = null) {
  return new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;

    link.setAttribute(attrName, attrValue);

    link.onload = () => resolve();
    link.onerror = reject;

    document.head.appendChild(link);
  });
}

function loadScriptAsync(src, datasetKey = null) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;

    if (datasetKey) s.dataset[datasetKey] = "1";

    s.onload = () => resolve();
    s.onerror = reject;

    document.body.appendChild(s);
  });
}

async function loadInitCssFromElement(el) {
  const href = new URL(el.href).pathname;
  if (!href || cssExists(href)) return;
  await loadCssAsync(href, "init-page-css", "1");
}

async function loadPageCssLinkFromElement(el) {
  const href = el.href;
  if (!href) return;
  await loadCssAsync(href, "data-page-css", "1");
}

function loadPageStyleFromElement(el) {
  const style = document.createElement("style");
  style.dataset.pageCss = "1";
  style.textContent = el.textContent;
  document.head.appendChild(style);
}

async function loadInitScriptFromElement(scriptEl) {
  const src = new URL(scriptEl.src).pathname;
  if (!src || scriptExists(src)) return;
  await loadScriptAsync(src, "initPageScript");
}

async function loadPageScriptFromElement(scriptEl) {
  const src = scriptEl.src;

  if (!src) return;
  await loadScriptAsync(src, "pageScript");
}

async function load_page(url, push = false) {
  if (global.sse.readyState !== EventSource.OPEN) {
    return swal2_mixin.fire({
      icon: "error",
      title: "Gagal load page karena kamu tidak terkoneksi dengan server."
    });
  }

  NProgress.start();
  
  try {
    const version = ++load_page_version;

    if (load_page_abort_controller) load_page_abort_controller.abort();
    load_page_abort_controller = new AbortController();


    let res;
    try {
      res = await fetch(url, {
        signal: load_page_abort_controller.signal
      });
    } catch(e) {
      if (e.name === "AbortError") return -1;
      throw e;
    }
    
    if (version !== load_page_version) return -1;

    if (res.redirected) {
      window.location.href = res.url;
      return;
    }

    const html = await res.text();
    if (version !== load_page_version) return -1;

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const newContent = doc.querySelector(".content-wrapper");
    if (!newContent) {
      window.location.href = url;
      return;
    }

    if (version !== load_page_version) return -1;
    if (global.deinit) {
      global.deinit();
      global.deinit = null;
    }

    global.element = {};

    const initCssElements = doc.querySelectorAll("link[init-page-css]");
    for (const el of initCssElements) await loadInitCssFromElement(el);
    NProgress.inc();

    if (version !== load_page_version) return -1;
    clearPageCss();

    const pageCssLinks = doc.querySelectorAll("link[data-page-css]");
    for (const el of pageCssLinks) await loadPageCssLinkFromElement(el);
    NProgress.inc();

    const pageStyles = doc.querySelectorAll("style[data-page-css]");
    pageStyles.forEach(loadPageStyleFromElement);
    NProgress.inc();

    const initScripts = doc.querySelectorAll("script[data-init-page-script]");
    for (const el of initScripts) await loadInitScriptFromElement(el);
    NProgress.inc();

    if (version !== load_page_version) return -1;
    clearPageScripts();

    if (version !== load_page_version) return -1;
    if (global.refresh_handler) global.refresh_handler = null;

    const new_co_wrap = document.createElement("div");
    new_co_wrap.className = "content-wrapper";
    new_co_wrap.innerHTML = newContent.innerHTML;

    const newContentEl = new_co_wrap.querySelector(".content");
    const newHeader = new_co_wrap.querySelector(".content-header");

    newContentEl.classList.add("page-hidden");
    newHeader.classList.add("page-hidden");

    co_wrap.after(new_co_wrap);
    co_wrap.remove();
    co_wrap = new_co_wrap;
    
    const pageScripts = doc.querySelectorAll("script[data-page-script]");
    for (const el of pageScripts) {
        await loadPageScriptFromElement(el);
    }

    requestAnimationFrame(() => {
        newContentEl.classList.remove("page-hidden");
        newHeader.classList.remove("page-hidden");
    });

    if (push) history.pushState({}, "", url);

    update_active_nav(url);
  } finally {
    NProgress.done();
  }
}

async function refresh_permission() {
  const permission = global.profile.permission_level;

  let redirect_recommended = null;
  document.querySelectorAll(".section_check").forEach(e => {
    const value = Number(e.dataset.value);
    if (permission & (1 << 0)) {
      e.style.display = "";
      if (!redirect_recommended) redirect_recommended = "/";
    } else {
      if (permission & (1 << value)) {
        const get_first_nav = e.querySelector(".nav-redirect");
        if (get_first_nav && !redirect_recommended) redirect_recommended = get_first_nav.getAttribute("href");
        e.style.display = "";
      } else {
        e.style.display = "none";
      }
    }
  });

  const activeLink = document.querySelector(".nav-link.active");
  if (!activeLink) return;

  const parentSection = activeLink.closest(".section_check");

  if (parentSection && parentSection.style.display === "none") {
    if (await load_page(redirect_recommended, true) === -1) return;
  }
}

async function fetch_profile() {
  try {
    const res = await fetch("/api/profile", {
      method: "GET",
      headers: {
        token: localStorage.getItem("token")
      }
    });

    if (res.status !== 200) throw new Error("Fetch failed");

    const res_json = await res.json();

    global.profile = res_json;

    name_profile1.innerText = res_json.full_name;
    name_profile2.innerText = `${res_json.full_name} (${res_json.username})`;
    role_profile1.innerText = res_json.role_name;

    if (res_json.profile_img) {
      profile_img1.src = res_json.profile_img;
      profile_img2.src = res_json.profile_img;
    }
  } catch (err) {

    swal2_mixin.fire({
      icon: "error",
      title: "Something went wrong! Please try again or contact admin."
    });
  }
}

(async function() {
  NProgress.start();
  await fetch_profile();
  NProgress.inc();
  sidebar_menu.innerHTML = sidebar_data;
  NProgress.inc();
  refresh_permission();
  
  let pathname = location.pathname.replaceAll(".html", "");
  for (const link of document.querySelectorAll(".nav-redirect")) {
    if (link.dataset.url === pathname) {
      link.classList.toggle("active", true);
      break;
    }
  }
  
  NProgress.inc();
  global.connect_sse();
  NProgress.done();
})();