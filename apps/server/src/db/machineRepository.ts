import Database from "better-sqlite3"
import { initDatabase } from "./initDatabase.js"
import { IMachineRepository } from "./IMachineRepository.js"

import {
  MachineInfo,
  MdnsService,
  PortStatus,
  VendorInfo,
  DevicePrediction,
  SecurityAssessment,
  CertificateDetails,
} from "@pingpong/shared"

/**
 * Interface representing the flat structure of the machines table joined with vendors.
 */
interface MachineRow {
  id: number
  hostname?: string
  mac_address: string
  prediction_type?: string
  prediction_os?: string
  prediction_hardware?: string
  security_score?: number
  security_level?: SecurityAssessment["level"]
  first_seen: number
  last_seen: number
  // Joined vendor fields
  mac_prefix?: string
  company?: string
  address?: string
  country?: string
  block_start?: string
  block_end?: string
  block_size?: number
  block_type?: string
  updated?: string
  is_rand?: number
  is_private?: number
}

interface PortRow {
  port_number: number
  is_open: number
  protocol?: string
  service?: string
  // Joined certificate fields
  fingerprint?: string
  serial_number?: string
  valid_from?: string
  valid_to?: string
  is_self_signed?: number
  subject_alt_name?: string
  subject_cn?: string
  subject_org?: string
  subject_ou?: string
  subject_country?: string
  issuer_cn?: string
  issuer_org?: string
  issuer_ou?: string
  issuer_country?: string
}

interface MdnsRow {
  name: string
  type: string
  protocol: "tcp" | "udp"
  port: number
  txt_json: string
}

const db = initDatabase()

export class MachineRepository implements IMachineRepository {
  /**
   * Mapping: Database Rows -> MachineInfo Interface
   */
  private mapToInterface(
    row: MachineRow,
    ips: string[],
    mdns: MdnsRow[],
    ports: PortRow[],
    rules: string[],
    remediations: string[],
  ): MachineInfo {
    return {
      hostname: row.hostname,
      macAddress: row.mac_address,
      ipAddresses: ips,
      vendor: row.mac_prefix
        ? {
            macPrefix: row.mac_prefix,
            company: row.company!,
            address: row.address!,
            country: row.country!,
            blockStart: row.block_start!,
            blockEnd: row.block_end!,
            blockSize: row.block_size!,
            blockType: row.block_type!,
            updated: row.updated!,
            isRand: Boolean(row.is_rand),
            isPrivate: Boolean(row.is_private),
          }
        : undefined,
      deviceType: row.prediction_type
        ? {
            type: row.prediction_type,
            os: row.prediction_os!,
            hardware: row.prediction_hardware,
          }
        : undefined,
      security: {
        score: row.security_score ?? 0,
        level: row.security_level ?? "Low",
        triggeredRules: rules,
        remediations: remediations,
      },
      firstSeen: row.first_seen ?? 0,
      lastSeen: row.last_seen ?? 0,
      mdnsServices: mdns.map((m) => ({
        name: m.name,
        type: m.type,
        protocol: m.protocol,
        port: m.port,
        txt: JSON.parse(m.txt_json),
      })),
      ports: ports.map((p) => ({
        port: p.port_number,
        isOpen: Boolean(p.is_open),
        protocol: p.protocol,
        service: p.service,
        certificate: p.fingerprint
          ? {
              fingerprint: p.fingerprint,
              serialNumber: p.serial_number!,
              validFrom: p.valid_from!,
              validTo: p.valid_to!,
              isSelfSigned: Boolean(p.is_self_signed),
              subjectaltname: p.subject_alt_name,
              subject: {
                commonName: p.subject_cn!,
                organization: p.subject_org,
                organizationalUnit: p.subject_ou,
                country: p.subject_country,
              },
              issuer: {
                commonName: p.issuer_cn!,
                organization: p.issuer_org,
                organizationalUnit: p.issuer_ou,
                country: p.issuer_country,
              },
            }
          : undefined,
      })),
    }
  }

  /**
   * UPSERT a complete MachineInfo structure
   */
  upsert(info: MachineInfo): void {
    const runUpsert = db.transaction((data: MachineInfo) => {
      // 1. Upsert Machine Base
      const machineResult = db
        .prepare(
          `
          INSERT INTO machines (hostname, mac_address, prediction_type, prediction_os, prediction_hardware, security_score, security_level, first_seen, last_seen)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(mac_address) DO UPDATE SET
            hostname=excluded.hostname,
            prediction_type=excluded.prediction_type,
            prediction_os=excluded.prediction_os,
            prediction_hardware=excluded.prediction_hardware,
            security_score=excluded.security_score,
            security_level=excluded.security_level,
            last_seen = excluded.last_seen
          RETURNING id
        `,
        )
        .get(
          data.hostname,
          data.macAddress,
          data.deviceType?.type,
          data.deviceType?.os,
          data.deviceType?.hardware,
          data.security?.score,
          data.security?.level,
          data.firstSeen,
          data.lastSeen,
        ) as { id: number }

      const mId = machineResult.id

      // 2. Clear related lists for fresh sync
      db.prepare("DELETE FROM machine_ips WHERE machine_id = ?").run(mId)
      db.prepare("DELETE FROM mdns_services WHERE machine_id = ?").run(mId)
      db.prepare("DELETE FROM ports WHERE machine_id = ?").run(mId)
      db.prepare("DELETE FROM security_rules WHERE machine_id = ?").run(mId)
      db.prepare("DELETE FROM security_remediations WHERE machine_id = ?").run(mId)

      // 3. Re-insert IPs
      const insertIp = db.prepare("INSERT INTO machine_ips (machine_id, ip_address) VALUES (?, ?)")
      for (const ip of data.ipAddresses) insertIp.run(mId, ip)

      // 4. Upsert Vendor
      if (data.vendor) {
        db.prepare(
          `
          INSERT INTO vendors (machine_id, mac_prefix, company, address, country, block_start, block_end, block_size, block_type, updated, is_rand, is_private)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(machine_id) DO UPDATE SET 
            company=excluded.company,
            updated=excluded.updated
        `,
        ).run(
          mId,
          data.vendor.macPrefix,
          data.vendor.company,
          data.vendor.address,
          data.vendor.country,
          data.vendor.blockStart,
          data.vendor.blockEnd,
          data.vendor.blockSize,
          data.vendor.blockType,
          data.vendor.updated,
          data.vendor.isRand ? 1 : 0,
          data.vendor.isPrivate ? 1 : 0,
        )
      }

      // 5. Insert Ports & Certificates
      const insertCert = db.prepare(`
        INSERT INTO certificates (fingerprint, serial_number, subject_cn, subject_org, subject_ou, subject_country, issuer_cn, issuer_org, issuer_ou, issuer_country, valid_from, valid_to, subject_alt_name, is_self_signed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(fingerprint) DO UPDATE SET serial_number=excluded.serial_number
        RETURNING id
      `)

      const insertPort = db.prepare(
        "INSERT INTO ports (machine_id, port_number, is_open, protocol, service, certificate_id) VALUES (?, ?, ?, ?, ?, ?)",
      )

      for (const p of data.ports || []) {
        let certId: number | null = null
        if (p.certificate) {
          const certObj = p.certificate
          const res = insertCert.get(
            certObj.fingerprint,
            certObj.serialNumber,
            certObj.subject.commonName,
            certObj.subject.organization,
            certObj.subject.organizationalUnit,
            certObj.subject.country,
            certObj.issuer.commonName,
            certObj.issuer.organization,
            certObj.issuer.organizationalUnit,
            certObj.issuer.country,
            certObj.validFrom,
            certObj.validTo,
            certObj.subjectaltname,
            certObj.isSelfSigned ? 1 : 0,
          ) as { id: number }
          certId = res.id
        }
        insertPort.run(mId, p.port, p.isOpen ? 1 : 0, p.protocol, p.service, certId)
      }

      // 6. Insert mDNS Services
      if (data.mdnsServices) {
        const insertMdns = db.prepare(
          "INSERT INTO mdns_services (machine_id, name, type, protocol, port, txt_json) VALUES (?, ?, ?, ?, ?, ?)",
        )
        for (const srv of data.mdnsServices) {
          insertMdns.run(mId, srv.name, srv.type, srv.protocol, srv.port, JSON.stringify(srv.txt))
        }
      }

      // 7. Insert Security Assessments
      if (data.security) {
        const insertRule = db.prepare(
          "INSERT INTO security_rules (machine_id, rule_name) VALUES (?, ?)",
        )
        for (const rule of data.security.triggeredRules || []) {
          insertRule.run(mId, rule)
        }

        const insertRem = db.prepare(
          "INSERT INTO security_remediations (machine_id, remediation_text) VALUES (?, ?)",
        )
        for (const rem of data.security.remediations || []) {
          insertRem.run(mId, rem)
        }
      }
    })

    runUpsert(info)
  }

  /**
   * Select a single machine by ID
   */
  getById(id: number): MachineInfo | undefined {
    const machine = db
      .prepare(
        "SELECT m.*, v.* FROM machines m LEFT JOIN vendors v ON m.id = v.machine_id WHERE m.id = ?",
      )
      .get(id) as MachineRow | undefined

    if (!machine) return undefined

    const ips = db
      .prepare("SELECT ip_address FROM machine_ips WHERE machine_id = ?")
      .all(id)
      .map((r: any) => r.ip_address) as string[]

    const mdns = db.prepare("SELECT * FROM mdns_services WHERE machine_id = ?").all(id) as MdnsRow[]

    const ports = db
      .prepare(
        `
        SELECT p.*, c.* FROM ports p 
        LEFT JOIN certificates c ON p.certificate_id = c.id 
        WHERE p.machine_id = ?
      `,
      )
      .all(id) as PortRow[]

    const rules = db
      .prepare("SELECT rule_name FROM security_rules WHERE machine_id = ?")
      .all(id)
      .map((r: any) => r.rule_name) as string[]

    const rems = db
      .prepare("SELECT remediation_text FROM security_remediations WHERE machine_id = ?")
      .all(id)
      .map((r: any) => r.remediation_text) as string[]

    return this.mapToInterface(machine, ips, mdns, ports, rules, rems)
  }

  /**
   * List all machines
   */
  listAll(): MachineInfo[] {
    const ids = db.prepare("SELECT id FROM machines").all() as { id: number }[]
    return ids.map((row) => this.getById(row.id)!)
  }
}
