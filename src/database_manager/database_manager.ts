import { create_sqlite } from "./drivers/sqlite";
import { create_postgresql } from "./drivers/postgresql";
import { create_mysql } from "./drivers/mysql";

type DBType = "sqlite" | "postgresql" | "mysql";

interface Config {
    type: DBType;
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
    filename?: string;
}

type Driver = {
    run: (query: string, params?: any[]) => any;
    get: (query: string, params?: any[]) => any;
    all: (query: string, params?: any[]) => any;
    transaction: (fn: (tx: any) => Promise<void>) => any;
    close: () => any;
};

export class database_manager {
    private config: Config;
    private driver: Driver | null = null;

    run!: Driver["run"];
    get!: Driver["get"];
    all!: Driver["all"];
    transaction!: Driver["transaction"];
    close!: Driver["close"];

    constructor(config: Config) {
        this.config = config;
    }

    async init() {
        const factory: Record<DBType, any> = {
            sqlite: create_sqlite,
            postgresql: create_postgresql,
            mysql: create_mysql
        };

        const creator = factory[this.config.type];

        if (!creator) throw Error(`Unsupported database: ${this.config.type}`);

        this.driver = await creator(this.config);

        this.run = this.driver!.run.bind(this.driver);
        this.get = this.driver!.get.bind(this.driver);
        this.all = this.driver!.all.bind(this.driver);
        this.transaction = this.driver!.transaction.bind(this.driver);
        this.close = this.driver!.close.bind(this.driver);
    }
}