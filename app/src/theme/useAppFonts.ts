import { useFonts as useBebasNeue, BebasNeue_400Regular } from "@expo-google-fonts/bebas-neue";
import {
  useFonts as useInter,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import {
  useFonts as useJetBrainsMono,
  JetBrainsMono_400Regular,
  JetBrainsMono_700Bold,
} from "@expo-google-fonts/jetbrains-mono";

/** Bundles the three-font system (UI/UX brief §1) as static assets instead of a runtime @import. */
export function useAppFonts() {
  const [bebasLoaded] = useBebasNeue({ BebasNeue_400Regular });
  const [interLoaded] = useInter({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [monoLoaded] = useJetBrainsMono({ JetBrainsMono_400Regular, JetBrainsMono_700Bold });

  return bebasLoaded && interLoaded && monoLoaded;
}
