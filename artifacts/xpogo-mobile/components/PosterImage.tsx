import { useState } from "react";
import { Image, View, Text, StyleSheet, ImageStyle, StyleProp, ViewStyle } from "react-native";

interface Props {
  uri: string | null | undefined;
  style: StyleProp<ImageStyle & ViewStyle>;
  fallbackIcon?: string;
  fallbackText?: string;
  resizeMode?: "cover" | "contain" | "stretch" | "center";
}

export default function PosterImage({
  uri,
  style,
  fallbackIcon = "🎬",
  fallbackText,
  resizeMode = "cover",
}: Props) {
  const [error, setError] = useState(false);

  if (!uri || error) {
    return (
      <View style={[style, S.fallback]}>
        <Text style={S.icon}>{fallbackIcon}</Text>
        {fallbackText ? (
          <Text style={S.text} numberOfLines={3}>{fallbackText}</Text>
        ) : null}
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={style as StyleProp<ImageStyle>}
      resizeMode={resizeMode}
      onError={() => setError(true)}
    />
  );
}

const S = StyleSheet.create({
  fallback: {
    backgroundColor: "#1a0000",
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  icon: { fontSize: 22 },
  text: { color: "#444", fontSize: 9, textAlign: "center", marginTop: 4 },
});
