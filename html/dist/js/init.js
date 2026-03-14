const global = {

}

global.browser_loaded = false;
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

document.querySelectorAll(".nav-redirect").forEach(link => {
  link.addEventListener("click", async e => {
    e.preventDefault();

    const url = link.getAttribute("href");
    if (url === location.pathname) return;
    if (await load_page(url, true) === -1) return;
  });
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

  if (global.sse) {
    global.sse.close();
  }

  const sse = new EventSource("/api/sse", {
    withCredentials: true
  });

  global.sse = sse;

  sse.onopen = () => {
    global.sse_retry_count = 0;

    status_server.classList.add("badge-success");
    status_server.classList.remove("badge-danger");
    status_server.innerText = "Status: Online";
  };

  sse.onerror = () => {
    status_server.innerText = "Status: Offline";
    status_server.classList.remove("badge-success");
    status_server.classList.add("badge-danger");

    sse.close();

    const delay = global.sse_retry_count < 10 ? 100 : 1000;
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

        case "CHANGE_PROFILE":
          await fetch_profile();
          refresh_permission();
          break;

        case "UNAUTHORIZED": {

          if (global.change_password) {
            global.change_password = false;
            return;
          }

          const username = localStorage.getItem("username");
          const password = localStorage.getItem("password");

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
  document.querySelectorAll(".nav-redirect").forEach(link => {
    link.classList.toggle("active", link.getAttribute("href") === url || link.dataset.url === url);
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
  NProgress.start();
  if (!global.browser_loaded) global.browser_loaded = true;
  
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
    document.querySelector(".content-wrapper").innerHTML = newContent.innerHTML;
    document.title = doc.title;

    const pageScripts = doc.querySelectorAll("script[data-page-script]");
    for (const el of pageScripts) await loadPageScriptFromElement(el);
    NProgress.inc();

    if (push) history.pushState({}, "", url);

    update_active_nav(url);
  } finally {
    NProgress.done();
  }
}

async function refresh_permission() {
  const permission = global.profile.permission_level;

  document.querySelectorAll(".section_check").forEach(e => {
    const value = Number(e.dataset.value);

    if (permission & (1 << 0)) {
      e.style.display = "";
    } else {
      if (permission & (1 << value)) {
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
    if (await load_page("/", true) === -1) return;
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
  await fetch_profile();
  refresh_permission();
  global.connect_sse();
})();