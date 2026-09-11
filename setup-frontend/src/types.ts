export type StepId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type DatabaseType = 'sqlite' | 'mysql' | 'postgresql';

export type TlsMode = 'generate' | 'upload';

export interface ServerConfig {
  protocol: 'http' | 'https';
  port: number;
  compile_html: boolean;
  tls: {
    mode: TlsMode;
    cert?: string; // base64
    key?: string;  // base64
    certFileName?: string;
    keyFileName?: string;
  };
}

export interface DatabaseConfig {
  type: DatabaseType;
  host: string;
  port: number;
  name: string;
  user: string;
  pass: string;
  db_new_migrate: boolean;
}

export interface AdminConfig {
  full_name: string;
  username: string;
  password: string;
  confirm_password: string;
}

export interface StoreConfig {
  store_name: string;
  store_desc: string;
  store_address: string;
  store_phone_num: string;
}

export interface InstallProgressState {
  currentStage: string;
  percentage: number;
  status: 'idle' | 'running' | 'success' | 'error';
  errorMessage?: string;
  redirectUrl?: string;
}
