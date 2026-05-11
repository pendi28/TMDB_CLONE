import { useRouter, usePathname } from "expo-router";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";

const RED = "#E50914";
const BG = "#0d0000";
const INACTIVE = "#6b7280";

const TABS = [
  { label: "Home",    icon: "🏠",  route: "/"        },
  { label: "Donghua", icon: "🐉",  route: "/donghua" },
  { label: "Anime",   icon: "⛩️",  route: "/anime"   },
  { label: "Drama",   icon: "🎭",  route: "/drama"   },
  { label: "Search",  icon: "🔍",  route: "/search"  },
];

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === "ios";

  return (
    <View style={[S.wrapper, { paddingBottom: Math.max(insets.bottom, 6) }]}>
      {isIOS ? (
        <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
      ) : null}
      <View style={S.bar}>
        {TABS.map(tab => {
          const active =
            tab.route === "/"
              ? pathname === "/" || pathname === "/index"
              : pathname.startsWith(tab.route);
          return (
            <TouchableOpacity
              key={tab.route}
              style={S.tabBtn}
              onPress={() => router.push(tab.route as never)}
              activeOpacity={0.75}
            >
              {active ? (
                <View style={S.activeContainer}>
                  <Text style={S.activeIcon}>{tab.icon}</Text>
                  <Text style={S.activeLabel}>{tab.label}</Text>
                </View>
              ) : (
                <View style={S.inactiveContainer}>
                  <Text style={S.inactiveIcon}>{tab.icon}</Text>
                  <Text style={S.inactiveLabel}>{tab.label}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const S = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Platform.OS === "ios" ? "transparent" : "rgba(13,0,0,0.97)",
    borderTopWidth: 1,
    borderTopColor: "#2a0000",
  },
  bar: {
    flexDirection: "row",
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 4,
  },
  activeContainer: {
    alignItems: "center",
    backgroundColor: RED,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 2,
  },
  activeIcon: { fontSize: 16 },
  activeLabel: { color: "#fff", fontSize: 10, fontWeight: "800" },
  inactiveContainer: {
    alignItems: "center",
    gap: 2,
  },
  inactiveIcon: { fontSize: 20, opacity: 0.5 },
  inactiveLabel: { color: INACTIVE, fontSize: 10, fontWeight: "500" },
});
