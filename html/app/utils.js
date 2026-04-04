const money_idr = new Intl.NumberFormat('id-ID', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});
const format_thousand_separator = new Intl.NumberFormat("id-ID");

// array or object to bigint
function ao_to_bigint(value) {
    if (typeof value === "object") {
        if (Array.isArray(value?.data)) value = value.data;
        else value = Object.values(value);
    }

    if (!Array.isArray(value) || value.length === 0) return 0n;

    const negative = value[0] === 1;

    let result = 0n;
    for (let i = 1; i < value.length; i++) {
        result = (result << 8n) + BigInt(value[i]);
    }
    return negative ? -result : result;
}

function money_format_bigint(value) {
    let str = value.toString();

    if (str.length < 3) str = str.padStart(3, "0");

    let intPart = str.slice(0, -2);
    let decimalPart = str.slice(-2);
    let formattedInt = new Intl.NumberFormat('id-ID').format(BigInt(intPart || "0"));

    return formattedInt + "," + decimalPart;
}

// bilangan absolute using BigInt
function absBigInt(n) {
  return n < 0n ? -n : n;
}

function formatIDR(raw) {
    // buang semua non-digit
    let digits = raw.replace(/\D/g, "");
    if (digits === "") return "";

    // parse ke integer
    let num = BigInt(digits); 

    // hitung integer & desimal (dalam sen → 2 digit terakhir)
    let intPart = num / 100n;
    let decPart = (num % 100n).toString().padStart(2, "0");

    // format ribuan pakai titik
    let intStr = intPart.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    return intStr + "," + decPart;
}

function format_thousand_separator_input(raw) {
    // buang semua non-digit
    let digits = raw.replace(/\D/g, "");
    if (digits === "") return "";

    // format ribuan pakai titik
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function bigint_safe(val) {
    if (val == null || isNaN(val)) return 0n;
    const str = val.toString().replaceAll(".", "");
    return str === "" ? 0n : BigInt(str);
}

document.addEventListener("input", function (e) {
  if (e.target.matches(".money_format_idr")) {
    e.target.value = formatIDR(e.target.value);
  }
}, true);

document.addEventListener("input", function (e) {
  if (e.target.matches(".format_thousand_separator")) {
    e.target.value = format_thousand_separator_input(e.target.value);
  }
}, true);

function pad_string(val, pad_min = 4) {
    return String(val).padStart(4, '0');
}

function get_previous_work_date(date) {
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

function formatYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}/${m}/${d}`;
}

function format_date(date) {
  const pad = (n) => n.toString().padStart(2, "0");

  return (
    date.getFullYear() + "/" +
    pad(date.getMonth() + 1) + "/" +
    pad(date.getDate()) + " " +
    pad(date.getHours()) + ":" +
    pad(date.getMinutes()) + ":" +
    pad(date.getSeconds())
  );
}

class mutex {
    queue = [];
    locked = false;

    async lock() {
        return new Promise(resolve => {
            if (!this.locked) {
                this.locked = true;
                resolve();
            } else {
                this.queue.push(resolve);
            }
        });
    }

    unlock() {
        if (this.queue.length > 0) {
            const next = this.queue.shift();
            if (next) next();
        } else this.locked = false;
    }
}