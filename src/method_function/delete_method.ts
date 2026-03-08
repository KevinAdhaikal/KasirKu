import { global } from "../global";

export async function delete_method(req: Request, url: URL) {
    const token = <string>req.headers.get("token");

    switch(url.pathname) {
        case "/barang": {
            const user_info = global.user_sessions.get(token);
            if (!token || !user_info) return new Response("Unauthorized", {status: 401});

            const db = global.database;
            if (!db) return new Response("Internal Server Error", {status: 500});
            let stmt = db.prepare("SELECT permission_level FROM roles WHERE id = ?");
            const res_role = stmt.get(user_info.role_id) as {permission_level: number};
            stmt.finalize();
            if (!res_role) return new Response("Internal Server Error", {status: 500});

            if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.MANAGE_BARANG))) return new Response("0", {status: 403});

            const user_input = new URLSearchParams(await req.text());

            const id = Number(user_input.get("id"));

            if (!id || isNaN(id)) return new Response("Bad Request", {status: 400});

            try {
                db.run("DELETE FROM barang WHERE id = ?", [id]);
            } catch(e) {
                console.log("An error occured in delete_method.ts at /barang:", e);
                return new Response("Internal Server Error", {status: 500});
            }

            global.sse_clients.broadcast(JSON.stringify({
                type: 2,
                code: "DELETE_BARANG",
                data: {
                    id
                }
            }));

            return new Response("", {status: 200});
        }
        case "/kategori_barang": {
            const user_info = global.user_sessions.get(token);
            if (!token || !user_info) return new Response("Unauthorized", {status: 401});

            const db = global.database;
            if (!db) return new Response("Internal Server Error", {status: 500});
            let stmt = db.prepare("SELECT permission_level FROM roles WHERE id = ?");
            const res_role = stmt.get(user_info.role_id) as {permission_level: number};
            stmt.finalize();
            if (!res_role) return new Response("Internal Server Error", {status: 500});

            if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.MANAGE_BARANG))) return new Response("0", {status: 403});

            const user_input = new URLSearchParams(await req.text());

            const id = Number(user_input.get("id"));
            const recursive = user_input.get("recursive");

            if (!id || isNaN(id)) return new Response("Bad Request", {status: 400});
            if (id === 1) return new Response("1", {status: 403});
            if (!recursive) {
                const stmt = db.prepare("SELECT 1 FROM barang WHERE kategori_barang_id = ?");
                const res = stmt.get(id);
                stmt.finalize();

                if (res) return new Response("2", {status: 403});
            }

            try {
                db.run("DELETE FROM kategori_barang WHERE id = ?", [id]);
            } catch(e) {
                console.log("An error occured in delete_method.ts at /kategori_barang:", e);
                return new Response("Internal Server Error", {status: 500});
            }

            global.sse_clients.broadcast(JSON.stringify({
                type: 3,
                code: "DELETE_KATEGORI",
                data: {
                    id
                }
            }));
            return new Response("", {status: 200});
        }
        case "/pengeluaran": {
            const user_info = global.user_sessions.get(token);
            if (!token || !user_info) return new Response("Unauthorized", {status: 401});
            
            const db = global.database;
            if (!db) return new Response("Internal Server Error", {status: 500});
            let stmt = db.prepare("SELECT permission_level FROM roles WHERE id = ?");
            const res_role = stmt.get(user_info.role_id) as {permission_level: number};
            stmt.finalize();
            if (!res_role) return new Response("Internal Server Error", {status: 500});

            if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.MANAGE_PEMBUKUAN))) return new Response("0", {status: 403});

            const user_input = new URLSearchParams(await req.text());
            
            const id = Number(user_input.get("id"));

            if (!id) return new Response("", {status: 400});

            try {
                db.run("DELETE FROM pembukuan WHERE id = ? AND tipe = 1", [id]);
            } catch(e) {
                console.log("An error occured in delete_method.ts at /pengeluaran:", e);
                return new Response("Internal Server Error", {status: 500});
            }

            global.sse_clients.broadcast(JSON.stringify({
                type: 5,
                code: "DELETE_PENGELUARAN",
                data: {
                    id
                }
            }));
            
            return new Response("", {status: 200});
        }
        case "/user": { // delete user (administrator permission only)
            const user_info = global.user_sessions.get(token);
            if (!token || !user_info) return new Response("Unauthorized", {status: 401});
            
            const db = global.database;
            if (!db) return new Response("Internal Server Error", {status: 500});
            let stmt = db.prepare("SELECT permission_level FROM roles WHERE id = ?");
            const res_role = stmt.get(user_info.role_id) as {permission_level: number};
            stmt.finalize();
            if (!res_role) return new Response("Internal Server Error", {status: 500});

            if (!(res_role.permission_level & global.permissions.ADMINISTRATOR)) return new Response("0", {status: 403});

            const user_input = new URLSearchParams(await req.text());

            const id = Number(user_input.get("id"));
            if (!id || isNaN(id)) return new Response("Bad Request", {status: 400});

            if (id === user_info.user_id) return new Response("1", {status: 403});
            if (id === 1) return new Response("2", {status: 403});

            try {
                db.run("DELETE FROM users WHERE id = ?", [id]);
            } catch(e) {
                console.log("An error occured in delete_method.ts at /user:", e);
                return new Response("Internal Server Error", {status: 500});
            }
            
            global.sse_clients.remove_by_user_id(id);
            global.user_sessions.revoke_all_by_userid(id);

            global.sse_clients.send_to_role(1, JSON.stringify({
                type: 1,
                code: "REFRESH_USERS"
            }))

            return new Response("", {status: 200});
        }
        case "/role": { // delete role (administrator permission only)
            const user_info = global.user_sessions.get(token);
            if (!token || !user_info) return new Response("Unauthorized", {status: 401});

            const db = global.database;
            if (!db) return new Response("Internal Server Error", {status: 500});
            let stmt = db.prepare("SELECT permission_level FROM roles WHERE id = ?");
            const res_role = stmt.get(user_info.role_id) as {permission_level: number};
            stmt.finalize();
            if (!res_role) return new Response("Internal Server Error", {status: 500});

            if (!(res_role.permission_level & global.permissions.ADMINISTRATOR)) return new Response("0", {status: 403});

            const user_input = new URLSearchParams(await req.text());

            const id = Number(user_input.get("id"));
            const recursive = user_input.get("recursive");

            if (!id || isNaN(id)) return new Response("Bad Request", {status: 400});

            if (id === 1) return new Response("1", {status: 403});
            
            if (!recursive) {
                const stmt = db.prepare("SELECT 1 FROM users WHERE role_id = ?");
                const res = stmt.get(id);
                stmt.finalize();

                if (res) return new Response("2", {status: 403});
            }

            try {
                db.run("DELETE FROM roles WHERE id = ?", [id]);
            } catch(e) {
                console.log("An error occured in delete_method.ts at /role:", e);
                return new Response("Internal Server Error", {status: 500});
            }

            global.sse_clients.remove_by_role_id(id);
            global.user_sessions.revoke_all_by_roleid(id);

            global.sse_clients.send_to_role(1, JSON.stringify({
                type: 1,
                code: "REFRESH_RP"
            }))

            return new Response("", {status: 200});
        }
        default: {
            return new Response("Not Found", {status: 404});
        }
    }
}