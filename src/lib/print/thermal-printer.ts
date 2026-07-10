// Thermal printer abstraction layer
// Actual Bluetooth/USB/Ethernet connection requires Capacitor native plugins

import { EscPosEncoder } from "./esc-pos-encoder"
import type { PrinterConfig, ReceiptData } from "./types"

export async function testConnection(config: PrinterConfig): Promise<boolean> {
  console.log(`[ThermalPrinter] Testing connection: ${config.connectionType}`)
  try {
    // TODO: Implement native connection test when Capacitor plugins are available
    // For Bluetooth: await BluetoothLe.connect(config.bluetoothAddress)
    // For USB: await UsbDevice.requestDevice(...)
    // For Ethernet: await fetch(`http://${config.ipAddress}:${config.port}`)
    return false
  } catch {
    return false
  }
}

export async function printReceiptThermal(
  config: PrinterConfig,
  receipt: ReceiptData,
): Promise<boolean> {
  console.log(`[ThermalPrinter] Printing receipt via ${config.connectionType}`)
  try {
    const encoder = new EscPosEncoder()
    const data = buildThermalReceipt(encoder, receipt).build()
    // TODO: Send data via native connection
    // e.g., await BluetoothLe.write(data)
    console.log(`[ThermalPrinter] Receipt data (${data.length} bytes) ready for transmission`)
    return false
  } catch {
    return false
  }
}

function buildThermalReceipt(enc: EscPosEncoder, receipt: ReceiptData): EscPosEncoder {
  const { store } = receipt

  enc.init()
    .align("center")
    .fontSize(2, 2)
    .textLine(store.business_name)
    .fontSize(1, 1)

  if (store.business_address) enc.textLine(store.business_address)
  if (store.business_phone) enc.textLine(`Telp: ${store.business_phone}`)
  enc.lineFeed()
  enc.hr()
  enc.align("center")
  enc.textLine("STRUK PEMBAYARAN")
  enc.hr()

  enc.align("left")
  enc.bold(true).text("No. ").bold(false).textLine(receipt.orderCode)
  enc.textLine(`Pelanggan: ${receipt.customerName}`)
  enc.textLine(`Tanggal: ${receipt.createdAt}`)
  enc.hr()

  enc.bold(true).align("center").textLine("--- PESANAN ---").align("left").bold(false)
  enc.lineFeed()

  for (const item of receipt.items) {
    enc.bold(true).textLine(`${item.quantity}x ${item.name}`).bold(false)
    enc.row(`${formatPrice(item.price)}/item`, formatPrice(item.subtotal))
  }

  enc.hr()
  enc.bold(true).row("TOTAL", formatPrice(receipt.totalIdr)).bold(false)
  enc.hr()

  enc.align("center")
  enc.textLine(receipt.store.footer_message)
  enc.lineFeed()

  if (receipt.store.show_wifi && receipt.store.wifi_ssid) {
    enc.textLine(`WiFi: ${receipt.store.wifi_ssid}`)
    enc.textLine(`Password: ${receipt.store.wifi_password}`)
  }
  if (receipt.store.show_instagram && receipt.store.instagram) {
    enc.textLine(`IG: ${receipt.store.instagram}`)
  }
  if (receipt.store.show_whatsapp && receipt.store.whatsapp) {
    enc.textLine(`WA: ${receipt.store.whatsapp}`)
  }

  enc.lineFeed(2)
  enc.cut()

  return enc
}

function formatPrice(amount: number): string {
  return `Rp${amount.toLocaleString("id-ID")}`
}
