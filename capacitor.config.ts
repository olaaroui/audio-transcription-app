import type { CapacitorConfig } from "@capacitor/core"

const config: CapacitorConfig = {
  appId: "com.audionotes.app",
  appName: "Audio Notes",
  webDir: "out",
  server: {
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#ffffff",
      showSpinner: false,
    },
  },
}

export default config
