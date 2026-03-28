import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "de.leadsolution.app",
  appName: "LeadSolution",
  webDir: "out",
  server: {
    url: "https://hub.leadsolution.de",
    cleartext: false,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#08080A",
      showSpinner: false,
    },
  },
}

export default config
