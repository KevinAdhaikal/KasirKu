import * as m0001 from "./0001_roles";
import * as m0002 from "./0002_users";
import * as m0003 from "./0003_kategori_barang";
import * as m0004 from "./0004_barang";
import * as m0005 from "./0005_barang_masuk";
import * as m0006 from "./0006_penjualan";
import * as m0007 from "./0007_penjualan_item";
import * as m0008 from "./0008_pembukuan";
import * as m0009 from "./0009_retur_barang";
import * as m0010 from "./0010_update_penjualan_no_struk";

export const migrations = [
    { name: "0001_roles", version: 1, up: m0001.up, down: m0001.down },
    { name: "0002_users", version: 1, up: m0002.up, down: m0002.down },
    { name: "0003_kategori_barang", version: 1, up: m0003.up, down: m0003.down },
    { name: "0004_barang", version: 1, up: m0004.up, down: m0004.down },
    { name: "0005_barang_masuk", version: 1, up: m0005.up, down: m0005.down },
    { name: "0006_penjualan", version: 1, up: m0006.up, down: m0006.down },
    { name: "0007_penjualan_item", version: 1, up: m0007.up, down: m0007.down },
    { name: "0008_pembukuan", version: 1, up: m0008.up, down: m0008.down },
    { name: "0009_retur_barang", version: 2, up: m0009.up, down: m0009.down },
    { name: "0010_update_penjualan_no_struk", version: 2, up: m0010.up, down: m0010.down }
];