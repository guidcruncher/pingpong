import { type MachineInfo } from "@pingpong/shared"

export interface IMachineRepository {
  /**
   * Creates a new machine record or updates an existing one
   * based on the Mac Address. Handles all nested relational data.
   */
  upsert(info: MachineInfo): void

  /**
   * Retrieves a full MachineInfo object by its database ID.
   * Returns undefined if no machine matches the ID.
   */
  getById(id: number): MachineInfo | undefined

  /**
   * Returns a list of all discovered machines in the database.
   */
  listAll(): MachineInfo[]
}
