import React, { useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { Dumbbell } from "lucide-react-native";

import { colors, radii } from "../../theme/tokens";

interface Props {
  uri?: string;
  size?: number;
}

/**
 * Exercise photo with a quiet placeholder. The image is a remote file; React
 * Native's image layer caches it on disk after the first load, so scrolling
 * the picker or reopening a workout does not re-download it. A failed load
 * (offline, CDN hiccup) falls back to the placeholder instead of leaving a
 * broken-image hole.
 */
export function ExerciseThumb({ uri, size = 44 }: Props) {
  const [failed, setFailed] = useState(false);
  const box = { width: size, height: size, borderRadius: radii.sm };

  if (!uri || failed) {
    return (
      <View style={[styles.placeholder, box]}>
        <Dumbbell size={Math.round(size * 0.45)} color={colors.faint} />
      </View>
    );
  }
  return <Image source={{ uri }} style={[styles.image, box]} onError={() => setFailed(true)} />;
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.track },
  placeholder: { backgroundColor: colors.track, alignItems: "center", justifyContent: "center" },
});
