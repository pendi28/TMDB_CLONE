const base = require("./app.json").expo;

const existingPlugins = base.plugins || [];
const hasNavBar = existingPlugins.some((p) =>
  Array.isArray(p) ? p[0] === "expo-navigation-bar" : p === "expo-navigation-bar"
);

// ⚠️  TMDB Key: set via EAS secret "EXPO_PUBLIC_TMDB_KEY" di https://expo.dev
// Jangan hardcode key di sini karena file ini masuk ke GitHub
// Cara set: eas secret:create --scope project --name EXPO_PUBLIC_TMDB_KEY --value "api_key_kamu"

module.exports = ({ config }) => ({
  ...base,
  plugins: [
    ...existingPlugins,
    ...(hasNavBar ? [] : [["expo-navigation-bar", { position: "absolute", visibility: "visible" }]]),
  ],
  extra: {
    ...base.extra,
    tmdbKey: process.env.EXPO_PUBLIC_TMDB_KEY || "",
    firebaseSecret: process.env.EXPO_PUBLIC_FIREBASE_SECRET || "",
  },
});
