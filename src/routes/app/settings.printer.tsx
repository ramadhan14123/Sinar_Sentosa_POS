import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/shared/layouts/AppShell";
import { useRole } from "@/shared/hooks/use-role";
import { usePrinterConnection } from "@/features/settings/hooks/usePrinterConnection";
import { PrinterStatusCard } from "@/features/settings/components/PrinterStatusCard";
import { PrinterConnectionCard } from "@/features/settings/components/PrinterConnectionCard";
import { PrinterTestCard } from "@/features/settings/components/PrinterTestCard";
import { StoreInfoForm } from "@/features/settings/components/StoreInfoForm";

export const Route = createFileRoute("/app/settings/printer")({ component: PrinterSettingsPage });

function PrinterSettingsPage() {
  const role = useRole();
  const userRole = role.data?.role === "owner" ? "owner" : "cashier";

  const {
    printer,
    updatePrinter,
    connectionStatus,
    connectionType,
    selectedBluetoothDevice,
    scanning,
    bluetoothDevices,
    bluetoothOff,
    bluetoothPermissionDenied,
    handleScanBluetooth,
    handleConnectBluetooth,
    scanningUsb,
    usbDevices,
    handleScanUsb,
    handleConnectUsb,
    wifiInfo,
    wifiUnavailable,
    handleConnectEthernet,
    connecting,
    testing,
    testPrinting,
    testingDrawer,
    handleTestConnection,
    handleTestPrint,
    handleTestCashDrawer,
    handleDisconnect,
  } = usePrinterConnection();

  return (
    <AppShell role={userRole} eyebrow="Pengaturan" title="Printer & Toko">
      <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column: Status & Connection */}
        <div className="lg:col-span-6 space-y-6">
          <PrinterStatusCard
            connectionStatus={connectionStatus}
            connectionType={connectionType}
            selectedBluetoothDevice={selectedBluetoothDevice}
            printer={printer}
            onDisconnect={handleDisconnect}
          />

          <PrinterConnectionCard
            printer={printer}
            updatePrinter={updatePrinter}
            connecting={connecting}
            scanning={scanning}
            bluetoothDevices={bluetoothDevices}
            selectedBluetoothDevice={selectedBluetoothDevice}
            bluetoothOff={bluetoothOff}
            bluetoothPermissionDenied={bluetoothPermissionDenied}
            onScanBluetooth={handleScanBluetooth}
            onConnectBluetooth={handleConnectBluetooth}
            scanningUsb={scanningUsb}
            usbDevices={usbDevices}
            onScanUsb={handleScanUsb}
            onConnectUsb={handleConnectUsb}
            wifiInfo={wifiInfo}
            wifiUnavailable={wifiUnavailable}
            onConnectEthernet={handleConnectEthernet}
            connectBluetoothManual={(address) => handleConnectBluetooth({ name: "Printer", address, paired: true })}
          />

          {connectionStatus === "connected" && (
            <PrinterTestCard
              testing={testing}
              testPrinting={testPrinting}
              testingDrawer={testingDrawer}
              onTestConnection={handleTestConnection}
              onTestPrint={handleTestPrint}
              onTestCashDrawer={handleTestCashDrawer}
            />
          )}
        </div>

        {/* Right Column: Store Information */}
        <div className="lg:col-span-6 space-y-6">
          <StoreInfoForm />
        </div>
      </div>
    </AppShell>
  );
}
