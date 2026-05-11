/**
 * Represents a specific service discovered via mDNS (e.g., _http._tcp)
 */
export interface MdnsService {
  name: string
  type: string
  protocol: "tcp" | "udp"
  port: number
  txt: Record<string, string>
}
