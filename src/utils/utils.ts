import { Database } from "bun:sqlite";
import { CompiledQuery, SqliteAdapter, SqliteIntrospector, SqliteQueryCompiler, type DatabaseConnection, type Dialect, type Driver, type QueryResult } from 'kysely';

export const reader = Bun.stdin.stream().getReader();

// user input
export async function user_input(question: string) {
  process.stdout.write(question);

  const { value } = await reader.read();
  return new TextDecoder().decode(value).trim();
}

// mime types
export const mime_types: Record<string, string> = {
    html: "text/html",
    js: "application/javascript",
    css: "text/css",
    json: "application/json",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    ico: "image/x-icon",
};

// generate hex string of given length
export function generate_hex(length: number): string {
    if (length % 2) throw new Error("Length must be even");

    const bytes = new Uint8Array(Math.ceil(length / 2));

    crypto.getRandomValues(bytes);
    let hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
        "",
    );
    return hex.slice(0, length);
}

// bigint to buffer
export function bigint_to_buffer(num: bigint): Buffer {
    const negative = num < 0n;
    let abs = negative ? -num : num;
    let hex = abs.toString(16);
    if (hex.length % 2) hex = "0" + hex;
    const mag = Buffer.from(hex, "hex");
    const sign = Buffer.from([negative ? 1 : 0]);
    return Buffer.concat([sign, mag]);
}

// buffer to bigint
export function buffer_to_bigint(buf: Buffer): bigint {
    if (buf.length === 0) return 0n;
    const negative = buf[0] === 1;
    const mag_hex = buf.slice(1).toString("hex") || "0";
    let val = BigInt("0x" + mag_hex);
    return negative ? -val : val;
}

// bigint_to_uint8array
export function bigint_to_uint8array(num: bigint): Uint8Array {
    if (num === 0n) return new Uint8Array([0]);

    let abs = num < 0n ? -num : num;
    let bytes: number[] = [];

    while (abs > 0n) {
        bytes.unshift(Number(abs & 0xffn));
        abs >>= 8n;
    }

    return new Uint8Array(bytes);
}

// uint8array to bigint
export function uint8array_to_bigint(arr: Uint8Array | ArrayBufferLike): bigint {
    const u8 = arr instanceof Uint8Array ? arr : new Uint8Array(arr);
    if (u8.length === 0) return 0n;

    const negative = u8[0] === 1;

    let result = 0n;
    for (let i = 1; i < u8.length; i++) result = (result << 8n) + BigInt(u8[i]);

    return negative ? -result : result;
}

// get password hash only
export function get_password_hash_only(val: string): string {
    return val.slice(val.indexOf(",p=") + 3);
}

// to bigint safe
export function bigint_safe(val: any): bigint {
    if (val == null || isNaN(val)) return 0n;
    const str = val.toString().replaceAll(".", "");
    return str === "" ? 0n : BigInt(str);
}

export function parse_cookie(val: string): Map<string, string> {
    if (!val) return new Map();

    const out = new Map<string, string>();

    for (const part of val.split(";")) {
        const [k, v] = part.split("=", 2);
        if (!k) continue;
        out.set(k.trim(), decodeURIComponent((v ?? "").trim()));
    }

    return out;
}

// is valid date
export function is_valid_date(date: RegExpMatchArray): boolean {
    const year = Number(date[1]);
    const month = Number(date[2]);
    const day = Number(date[3]);

    // Cek dulu tahun, bulan, dan hari valid atau enggak (misal: 1-12, 1-31)
    if (month < 1 || month > 12 || day < 1 || day > 31) {
        return false;
    }

    let daysInMonth;
    switch (month) {
        case 4: // April
        case 6: // Juni
        case 9: // September
        case 11: // November
            daysInMonth = 30;
            break;
        case 2: // Februari
            // Cek tahun kabisat (leap year)
            if ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) {
                daysInMonth = 29;
            } else {
                daysInMonth = 28;
            }
            break;
        default: // Bulan dengan 31 hari
            daysInMonth = 31;
            break;
    }

    return day <= daysInMonth;
}

// check table exists
export function check_table_exists(db: Database, name_table: string): boolean {
    const stmt = db.prepare("PRAGMA table_list;");
    const res = stmt.all() as [{ name: string }];
    stmt.finalize();

    for (const row of res) {
        if (row.name === name_table) return true;
    }

    return false;
}
// mutex (mutual expression) lock & unlock
export class mutex {
    private queue: (() => void)[] = [];
    private locked = false;

    public async lock(): Promise<void> {
        return new Promise((resolve) => {
            if (!this.locked) {
                this.locked = true;
                resolve();
            } else {
                this.queue.push(resolve);
            }
        });
    }

    public unlock(): void {
        if (this.queue.length > 0) {
            const next = this.queue.shift();
            if (next) next();
        } else this.locked = false;
    }
}

// Check if numeric is string
export function is_numeric_string(str: any): boolean {
    if (str.length === 0 || str === null) return false;
    for (let i = 0; i < str.length; i++) {
        const c = str.charCodeAt(i);
        if (c < 48 || c > 57) return false;
    }
    return true;
}

function getYMD(
    ms: number,
    offsetMinutes: number = 0,
): { year: number; month: number; date: number } {
    const DAY = 86_400_000;

    ms += offsetMinutes * 60_000;

    let days = (ms / DAY) | 0;

    let year = 1970;
    while (true) {
        const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
        const daysInYear = leap ? 366 : 365;
        if (days < daysInYear) break;
        days -= daysInYear;
        year++;
    }

    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

    const mdays = leap
        ? [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
        : [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    let month = 0;
    while (days >= mdays[month]) {
        days -= mdays[month];
        month++;
    }

    const date = days + 1;

    return { year, month, date };
}

export function getYMD_Local(
    ms: number,
    offsetMinutes: number,
): { year: number; month: number; date: number } {
    return getYMD(ms + offsetMinutes * 60000);
}

export function get_previous_work_date(date: string | Date): Date {
  const d = new Date(date);
  const day = d.getDay();

  let diff;

  switch (day) {
    case 2:
      diff = 5;
      break;
    case 1:
      diff = 4;
      break;
    default:
      diff = 2;
  }

  d.setDate(d.getDate() - diff);
  return d;
}

export function formatYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}/${m}/${d}`;
}

export function check_image_type(buffer: Uint8Array | Buffer): 'jpg' | 'png' | false {
    if (buffer.length < 8) return false;

    if (
        buffer[0] === 0xFF &&
        buffer[1] === 0xD8 &&
        buffer[buffer.length - 2] === 0xFF &&
        buffer[buffer.length - 1] === 0xD9
    ) return 'jpg';

    if (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4E && // P
        buffer[3] === 0x47 && // N
        buffer[4] === 0x0D && // CR
        buffer[5] === 0x0A && // LF
        buffer[6] === 0x1A && // SUB
        buffer[7] === 0x0A    // LF
    ) return 'png';

    return false;
}

// bun:sqlite wrapper
class BunSqliteConnection implements DatabaseConnection {
  readonly #db: Database;
  constructor(db: Database) { this.#db = db; }

  async executeQuery<R>(compiledQuery: CompiledQuery): Promise<QueryResult<R>> {
    const stmt = this.#db.prepare(compiledQuery.sql);
    const parameters = compiledQuery.parameters as any[];

    if (compiledQuery.sql.trimStart().toUpperCase().startsWith('SELECT') || 
        compiledQuery.sql.trimStart().toUpperCase().startsWith('PRAGMA')) {
      const rows = stmt.all(...parameters) as R[];
      return { rows };
    } else {
      const info = stmt.run(...parameters);
      return {
        rows: [],
        insertId: BigInt(info.lastInsertRowid),
        numAffectedRows: BigInt(info.changes),
      };
    }
  }

  async *streamQuery<R>(compiledQuery: CompiledQuery, chunkSize: number): AsyncIterableIterator<QueryResult<R>> {
    const stmt = this.#db.prepare(compiledQuery.sql);
    const iter = stmt.iterate(...(compiledQuery.parameters as any[]));

    let rows: R[] = [];

    for (const row of iter) {
      rows.push(row as R);

      if (rows.length >= chunkSize) {
        yield { rows };
        rows = [];
      }
    }

    if (rows.length > 0) yield { rows };
  }
}

class BunSqliteDriver implements Driver {
  readonly #db: Database;
  constructor(db: Database) { this.#db = db; }

  async init(): Promise<void> {
    this.#db.run("PRAGMA journal_mode = WAL;");
    this.#db.run("PRAGMA synchronous = NORMAL;");
    this.#db.run("PRAGMA foreign_keys = ON;");
  }
  
  async acquireConnection(): Promise<DatabaseConnection> {
    return new BunSqliteConnection(this.#db);
  }
  
  async beginTransaction(conn: DatabaseConnection): Promise<void> {
    await conn.executeQuery(CompiledQuery.raw("BEGIN"));
  }
  
  async commitTransaction(conn: DatabaseConnection): Promise<void> {
    await conn.executeQuery(CompiledQuery.raw("COMMIT"));
  }
  
  async rollbackTransaction(conn: DatabaseConnection): Promise<void> {
    await conn.executeQuery(CompiledQuery.raw("ROLLBACK"));
  }
  
  async releaseConnection(): Promise<void> {}
  
  async destroy(): Promise<void> { 
    this.#db.close(); 
  }
}

export class BunSqliteDialect implements Dialect {
  readonly #db: Database;
  constructor(config: { database: Database }) {
    this.#db = config.database;
  }

  createAdapter() { return new SqliteAdapter(); }
  createDriver() { return new BunSqliteDriver(this.#db); }
  createIntrospector(db: any) { return new SqliteIntrospector(db); }
  createQueryCompiler() { return new SqliteQueryCompiler(); }
}