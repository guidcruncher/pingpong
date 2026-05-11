import Database from "better-sqlite3"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { cwd } from "node:process"
import * as process from "node:process"

/**
 * Interface for database configuration options
 */
interface DbOptions {
  path?: string
  readonly?: boolean
  fileMustExist?: boolean
}

/**
 * Instantiates the SQLite database, enables foreign keys,
 * and optionally runs a schema initialization script.
 */
export function initDatabase(options?: DbOptions): Database.Database {
  try {
    const isProduction: boolean = process.env.NODE_ENV === "production"
    let dbFile = options?.path ?? join(cwd(), "../../../run/data/", "network-inventory.db")

    if (isProduction) {
      dbFile = "/data/network-inventory.db"
    }

    const db = new Database(dbFile, {
      readonly: options?.readonly ?? false,
      fileMustExist: options?.fileMustExist ?? false,
      // Useful for debugging queries in development
      verbose: process.env.NODE_ENV === "development" ? console.log : undefined,
    })

    // 1. Enable Foreign Key constraints (Disabled by default in SQLite)
    db.pragma("foreign_keys = ON")

    // 2. Performance Tuning: Use Write-Ahead Logging for better concurrency
    db.pragma("journal_mode = WAL")
    db.pragma("synchronous = NORMAL")

    console.log(`Database initialized at: ${dbFile}`)
    return db
  } catch (error) {
    console.error("Failed to initialize database:", error)
    throw error
  }
}
