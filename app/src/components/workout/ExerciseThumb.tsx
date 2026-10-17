import React from "react";
import { View } from "react-native";
import Svg, { Circle, G, Polyline, Rect } from "react-native-svg";

import type { ExerciseCategory } from "../../api/workoutApi";
import { ART_COLORS, ArtGroup, artGroupFor } from "../../lib/exerciseArt";
import { radii } from "../../theme/tokens";

interface Props {
  name: string;
  category?: ExerciseCategory;
  /** The library's muscle group when the caller has it; otherwise it is guessed from the name. */
  muscle?: string | null;
  size?: number;
}

/**
 * Abstract artwork for an exercise: a tinted tile with simple shapes that
 * hint at the muscle worked (two rounded blocks for chest, a V for back,
 * stacked blocks for core, and so on). It is drawn, not downloaded, so it is
 * instant, works offline, and shows no people.
 */
export function ExerciseThumb({ name, category, muscle, size = 44 }: Props) {
  const group = artGroupFor(name, category, muscle);
  const { bg, fg } = ART_COLORS[group];
  return (
    <View style={{ width: size, height: size, borderRadius: radii.sm, backgroundColor: bg, overflow: "hidden" }}>
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Shapes group={group} color={fg} />
      </Svg>
    </View>
  );
}

function Shapes({ group, color }: { group: ArtGroup; color: string }) {
  const soft = 0.35;
  switch (group) {
    case "chest":
      return (
        <G>
          <Rect x={8} y={14} width={14} height={20} rx={7} fill={color} />
          <Rect x={26} y={14} width={14} height={20} rx={7} fill={color} />
          <Rect x={22} y={20} width={4} height={8} rx={2} fill={color} opacity={soft} />
        </G>
      );
    case "back":
      return (
        <G>
          <Rect x={20} y={8} width={8} height={32} rx={4} fill={color} opacity={soft} />
          <Rect x={7} y={12} width={14} height={26} rx={7} fill={color} transform="rotate(14 14 25)" />
          <Rect x={27} y={12} width={14} height={26} rx={7} fill={color} transform="rotate(-14 34 25)" />
        </G>
      );
    case "shoulders":
      return (
        <G>
          <Circle cx={12} cy={22} r={8} fill={color} />
          <Circle cx={36} cy={22} r={8} fill={color} />
          <Rect x={14} y={19} width={20} height={6} rx={3} fill={color} opacity={soft} />
          <Rect x={19} y={30} width={10} height={8} rx={4} fill={color} opacity={soft} />
        </G>
      );
    case "arms":
      return (
        <G transform="rotate(-35 24 24)">
          <Rect x={6} y={19} width={36} height={10} rx={5} fill={color} opacity={soft} />
          <Circle cx={22} cy={24} r={9} fill={color} />
        </G>
      );
    case "legs":
      return (
        <G>
          <Rect x={10} y={7} width={11} height={34} rx={5.5} fill={color} />
          <Rect x={27} y={7} width={11} height={34} rx={5.5} fill={color} opacity={0.65} />
          <Circle cx={15.5} cy={34} r={4} fill={color} opacity={soft} />
        </G>
      );
    case "glutes":
      return (
        <G>
          <Circle cx={16} cy={26} r={11} fill={color} />
          <Circle cx={32} cy={26} r={11} fill={color} opacity={0.65} />
        </G>
      );
    case "core":
      return (
        <G>
          {[0, 1, 2].map((row) =>
            [0, 1].map((col) => (
              <Rect
                key={`${row}-${col}`}
                x={11 + col * 14}
                y={8 + row * 11.5}
                width={12}
                height={9.5}
                rx={3.5}
                fill={color}
                opacity={row === 2 ? 0.55 : 1}
              />
            ))
          )}
        </G>
      );
    case "cardio":
      return (
        <Polyline
          points="5,26 15,26 20,12 27,38 33,22 37,26 43,26"
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    default:
      return (
        <G>
          <Circle cx={24} cy={24} r={16} fill={color} opacity={0.25} />
          <Circle cx={24} cy={24} r={9} fill={color} opacity={0.55} />
          <Circle cx={24} cy={24} r={3.5} fill={color} />
        </G>
      );
  }
}
