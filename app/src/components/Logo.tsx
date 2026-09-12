import React from "react";
import { Image, StyleSheet } from "react-native";

interface LogoProps {
  size?: "md" | "lg";
}

// The real GetFit mark (assets/logo.png) — already includes the wordmark, so
// nothing else needs to render alongside it. Square source asset (1254x1254)
// with the artwork occupying roughly its top two-thirds; "contain" keeps it
// undistorted regardless of the box size passed in.
export function Logo({ size = "md" }: LogoProps) {
  const boxSize = size === "lg" ? 220 : 160;

  return (
    <Image
      source={require("../../assets/logo.png")}
      resizeMode="contain"
      style={[styles.image, { width: boxSize, height: boxSize }]}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    alignSelf: "center",
  },
});
