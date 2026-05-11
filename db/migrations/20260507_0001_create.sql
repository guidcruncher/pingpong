-- migrate:up

-- Machines table (Core Entity)
CREATE TABLE machines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hostname TEXT,
    mac_address TEXT UNIQUE,
    prediction_type TEXT,
    prediction_os TEXT,
    prediction_hardware TEXT,
    security_score REAL,
    security_level TEXT,
    first_seen INTEGER,
    last_seen INTEGER
);

-- IP Addresses (One-to-Many with Machine)
CREATE TABLE machine_ips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    machine_id INTEGER NOT NULL,
    ip_address TEXT NOT NULL,
    FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE
);

-- Vendor Information (One-to-One with Machine)
CREATE TABLE vendors (
    machine_id INTEGER PRIMARY KEY,
    mac_prefix TEXT,
    company TEXT,
    address TEXT,
    country TEXT,
    block_start TEXT,
    block_end TEXT,
    block_size INTEGER,
    block_type TEXT,
    updated TEXT,
    is_rand BOOLEAN,
    is_private BOOLEAN,
    FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE
);

-- mDNS Services (One-to-Many with Machine)
CREATE TABLE mdns_services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    machine_id INTEGER NOT NULL,
    name TEXT,
    type TEXT,
    protocol TEXT,
    port INTEGER,
    txt_json TEXT, -- Storing Record<string, string> as JSON string
    FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE
);

-- Certificates (Reusable by Ports)
CREATE TABLE certificates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fingerprint TEXT UNIQUE,
    serial_number TEXT,
    subject_cn TEXT,
    subject_org TEXT,
    subject_ou TEXT,
    subject_country TEXT,
    issuer_cn TEXT,
    issuer_org TEXT,
    issuer_ou TEXT,
    issuer_country TEXT,
    valid_from TEXT,
    valid_to TEXT,
    subject_alt_name TEXT,
    is_self_signed BOOLEAN
);

-- Ports (One-to-Many with Machine)
CREATE TABLE ports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    machine_id INTEGER NOT NULL,
    port_number INTEGER NOT NULL,
    is_open BOOLEAN,
    protocol TEXT,
    service TEXT,
    certificate_id INTEGER,
    FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE,
    FOREIGN KEY (certificate_id) REFERENCES certificates(id) ON DELETE SET NULL
);

-- Security Rules & Remediations (Many-to-Many or simple One-to-Many)
CREATE TABLE security_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    machine_id INTEGER NOT NULL,
    rule_name TEXT,
    FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE
);

CREATE TABLE security_remediations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    machine_id INTEGER NOT NULL,
    remediation_text TEXT,
    FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE
);

-- Indices for performance
CREATE INDEX idx_machine_mac ON machines(mac_address);
CREATE INDEX idx_port_machine ON ports(machine_id);

-- migrate:down

DROP TABLE IF EXISTS security_remediations;
DROP TABLE IF EXISTS security_rules;
DROP TABLE IF EXISTS ports;
DROP TABLE IF EXISTS certificates;
DROP TABLE IF EXISTS mdns_services;
DROP TABLE IF EXISTS vendors;
DROP TABLE IF EXISTS machine_ips;
DROP TABLE IF EXISTS machines;
