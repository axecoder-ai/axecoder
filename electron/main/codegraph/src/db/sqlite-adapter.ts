/**
 * SQLite Adapter
 *
 * Primary: Node built-in `node:sqlite` (Node/Electron 22.5+).
 * Fallback: `better-sqlite3` for Electron 29 and other runtimes without node:sqlite.
 */

export interface SqliteStatement {
  run(...params: any[]): { changes: number; lastInsertRowid: number | bigint };
  get(...params: any[]): any;
  all(...params: any[]): any[];
  iterate(...params: any[]): IterableIterator<any>;
}

export interface SqliteDatabase {
  prepare(sql: string): SqliteStatement;
  exec(sql: string): void;
  pragma(str: string, options?: { simple?: boolean }): any;
  transaction<T>(fn: (...args: any[]) => T): (...args: any[]) => T;
  close(): void;
  readonly open: boolean;
}

export type SqliteBackend = 'node-sqlite' | 'better-sqlite3';

class NodeSqliteAdapter implements SqliteDatabase {
  private _db: any;

  constructor(dbPath: string) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DatabaseSync } = require('node:sqlite');
    this._db = new DatabaseSync(dbPath);
  }

  get open(): boolean {
    return this._db.isOpen;
  }

  prepare(sql: string): SqliteStatement {
    const stmt = this._db.prepare(sql);
    return {
      run(...params: any[]) {
        const r = stmt.run(...params);
        return {
          changes: Number(r?.changes ?? 0),
          lastInsertRowid: r?.lastInsertRowid ?? 0,
        };
      },
      get(...params: any[]) {
        return stmt.get(...params);
      },
      all(...params: any[]) {
        return stmt.all(...params);
      },
      iterate(...params: any[]) {
        return stmt.iterate(...params);
      },
    };
  }

  exec(sql: string): void {
    this._db.exec(sql);
  }

  pragma(str: string, options?: { simple?: boolean }): any {
    const trimmed = str.trim();
    if (trimmed.includes('=')) {
      this._db.exec(`PRAGMA ${trimmed}`);
      return;
    }
    const row = this._db.prepare(`PRAGMA ${trimmed}`).get();
    if (options?.simple) {
      return row && typeof row === 'object' ? Object.values(row)[0] : row;
    }
    return row;
  }

  transaction<T>(fn: (...args: any[]) => T): (...args: any[]) => T {
    return (...args: any[]) => {
      this._db.exec('BEGIN');
      try {
        const result = fn(...args);
        this._db.exec('COMMIT');
        return result;
      } catch (error) {
        this._db.exec('ROLLBACK');
        throw error;
      }
    };
  }

  close(): void {
    if (this._db.isOpen) this._db.close();
  }
}

class BetterSqliteAdapter implements SqliteDatabase {
  private _db: any;

  constructor(dbPath: string) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require('better-sqlite3');
    this._db = new Database(dbPath);
  }

  get open(): boolean {
    return this._db.open;
  }

  prepare(sql: string): SqliteStatement {
    const stmt = this._db.prepare(sql);
    return {
      run(...params: any[]) {
        const r = stmt.run(...params);
        return {
          changes: Number(r?.changes ?? 0),
          lastInsertRowid: r?.lastInsertRowid ?? 0,
        };
      },
      get(...params: any[]) {
        return stmt.get(...params);
      },
      all(...params: any[]) {
        return stmt.all(...params);
      },
      iterate(...params: any[]) {
        return stmt.iterate(...params);
      },
    };
  }

  exec(sql: string): void {
    this._db.exec(sql);
  }

  pragma(str: string, options?: { simple?: boolean }): any {
    return this._db.pragma(str, options);
  }

  transaction<T>(fn: (...args: any[]) => T): (...args: any[]) => T {
    return this._db.transaction(fn);
  }

  close(): void {
    if (this._db.open) this._db.close();
  }
}

const tryNodeSqlite = (): boolean => {
  try {
    require('node:sqlite');
    return true;
  } catch {
    return false;
  }
};

const tryBetterSqlite3 = (): boolean => {
  try {
    require('better-sqlite3');
    return true;
  } catch {
    return false;
  }
};

export const isAnySqliteBackendAvailable = (): boolean =>
  tryNodeSqlite() || tryBetterSqlite3();

export function createDatabase(dbPath: string): { db: SqliteDatabase; backend: SqliteBackend } {
  if (tryNodeSqlite()) {
    try {
      return { db: new NodeSqliteAdapter(dbPath), backend: 'node-sqlite' };
    } catch {
      // fall through to better-sqlite3
    }
  }
  if (tryBetterSqlite3()) {
    try {
      return { db: new BetterSqliteAdapter(dbPath), backend: 'better-sqlite3' };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to open SQLite via better-sqlite3: ${msg}`);
    }
  }
  throw new Error(
    'No SQLite backend available. Need node:sqlite (Node 22.5+) or better-sqlite3 (bundled with AxeCoder).',
  );
}
