import React, { memo, useMemo } from "react";
import { View } from "react-native";
import Body from "react-native-body-highlighter";
import type { ExtendedBodyPart } from "react-native-body-highlighter";

import type { ExerciseCategory } from "../../api/workoutApi";
import { SUPPORT_COLOR, WORKED_COLOR, muscleHighlightFor } from "../../lib/exerciseArt";
import { colors, radii } from "../../theme/tokens";

interface Props {
  name: string;
  category?: ExerciseCategory;
  /** The library's muscle group when the caller has it; otherwise it is guessed from the name. */
  muscle?: string | null;
  size?: number;
}

// The figure is 200 x 400 at scale 1; it is sized to fit the tile's height.
const FIGURE_HEIGHT = 400;

/**
 * An anatomical figure with the muscles the exercise works shown in red, in
 * the style of fitness anatomy illustrations. It is drawn from vector data
 * bundled with the app, not downloaded, so it is instant and works offline.
 */
export const ExerciseThumb = memo(function ExerciseThumb({ name, category, muscle, size = 44 }: Props) {
  const highlight = useMemo(() => muscleHighlightFor(name, category, muscle), [name, category, muscle]);
  const data: ExtendedBodyPart[] = useMemo(
    () => [
      ...highlight.support.map((slug) => ({ slug, intensity: 1 })),
      ...highlight.worked.map((slug) => ({ slug, intensity: 2 })),
    ],
    [highlight]
  );
  const scale = (size * 0.94) / FIGURE_HEIGHT;

  return (
    <View
      // The figure never animates, so let Android draw it once as a texture
      // instead of re-rasterising hundreds of SVG paths while a list scrolls.
      renderToHardwareTextureAndroid
      style={{
        width: size,
        height: size,
        borderRadius: radii.sm,
        backgroundColor: colors.track,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <Body
        data={data}
        colors={[SUPPORT_COLOR, WORKED_COLOR]}
        side={highlight.side}
        gender="male"
        scale={scale}
        border="#B9B4A8"
        defaultFill="#D9D5CB"
      />
    </View>
  );
});
