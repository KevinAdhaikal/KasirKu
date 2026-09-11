/*
──────────────────────────────────────────────────────────────
                           KasirKu
        Simple & Efficient Point of Sale (PoS) System

            Author      : Kevin Adhaikal
            Copyright   : (C) 2026 Kevin Adhaikal
            License     : AplikasiKasir License

    Permission is granted to modify and distribute this
    software, but the author's name must not be removed
                     or altered.
──────────────────────────────────────────────────────────────
*/

const MAX_CONCURRENT = 4;

import { readdir, mkdir } from "node:fs/promises";

let future_import = {
    minifyHTML: null as any,
    minifyJS: null as any,
    CleanCSS: null as any,
    brotliCompressSync: null as any
}

function get_env_value(key: string): string | undefined {
    const value = Bun.env[key] ?? process.env[key];
    if (value === undefined) return undefined;
    const trimmed = String(value).trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

function get_env_int(key: string): number | undefined {
    const value = get_env_value(key);
    if (!value) return undefined;

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function get_env_bool(key: string): boolean | undefined {
    const value = get_env_value(key)?.toLowerCase();
    if (!value) return undefined;
    if (value === "true") return true;
    if (value === "false") return false;
    return undefined;
}

async function process_file(full_path: string) {
    const srcFile = Bun.file(full_path)
    const stat_file = await srcFile.stat()

    const build_path = full_path.replace("html/", "html_build/")
    let need_compile = false

    try {
        const stat_build = await Bun.file(build_path).stat()
        if (stat_file.mtime > stat_build.mtime) need_compile = true
    } catch {
        need_compile = true
    }

    if (!need_compile) return

    console.log("[BUILD]", full_path)

    let res: any
    const ext = full_path.slice(full_path.lastIndexOf("."))

    if (ext === ".html") {
        const text = await srcFile.text()

        res = await future_import.minifyHTML(text, {
            collapseWhitespace: true,
            removeComments: true,
            removeOptionalTags: true,
            collapseBooleanAttributes: true,
            minifyCSS: true,
            minifyJS: true
        })
    }
    else if (ext === ".js" && !full_path.endsWith(".min.js")) {
        const text = await srcFile.text()
        const res_js = await future_import.minifyJS(text)
        res = res_js.code
    }
    else if (ext === ".css" && !full_path.endsWith(".min.css")) {
        const text = await srcFile.text()
        const res_css = new future_import.CleanCSS().minify(text)
        res = res_css.styles
    }
    else {
        res = await srcFile.arrayBuffer()
    }

    await Bun.write(build_path, future_import.brotliCompressSync(res))
}

async function scan_html_file(startDir: string) {
    const dirs = [startDir]
    const tasks = new Set<Promise<any>>()

    while (dirs.length) {
        const dir = dirs.pop()!
        const entries = await readdir(dir, { withFileTypes: true })

        for (const entry of entries) {
            const full_path = dir + "/" + entry.name

            if (entry.isDirectory()) {
                dirs.push(full_path)
                continue
            }

            const task = process_file(full_path)

            tasks.add(task)
            task.finally(() => tasks.delete(task))

            if (tasks.size >= MAX_CONCURRENT) {
                await Promise.race(tasks)
            }
        }
    }

    await Promise.all(tasks)
}

async function prepare() {
    console.log("[LOG] Preparing Server...");

    // Preapre Profile Image Folder
    if (!(await Bun.file("./profile_img").exists())) {
        await mkdir("./profile_img", { recursive: true });
    }


    process.exit(0);
}

prepare();