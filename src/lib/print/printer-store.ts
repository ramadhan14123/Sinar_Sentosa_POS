import type { PrinterConfig } from "./types"

const STORAGE_KEY = "sinar-pos:printer-config"

const defaults: PrinterConfig = {
  connectionType: "bluetooth",
  printerName: "",
  bluetoothAddress: "",
  ipAddress: "",
  port: 9100,
  autoPrint: true,
}

export function loadPrinterConfig(): PrinterConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...defaults }
    return { ...defaults, ...JSON.parse(raw) }
  } catch {
    return { ...defaults }
  }
}

export function savePrinterConfig(config: PrinterConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}
