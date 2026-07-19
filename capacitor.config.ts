import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.sinarsentosa.pos",
  appName: "SinarSentosaPOS",
  server: {
    url: "https://sinarsentosa.vercel.app/app",
    cleartext: false,
  },
};

export default config;
