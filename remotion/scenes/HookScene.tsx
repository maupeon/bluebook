import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/CormorantGaramond";
import { loadFont as loadBodyFont } from "@remotion/google-fonts/Montserrat";
import { colors } from "../MarketingVideo";

const { fontFamily: headingFont } = loadFont("normal", {
  weights: ["600", "700"],
  subsets: ["latin"],
});

const { fontFamily: bodyFont } = loadBodyFont("normal", {
  weights: ["500", "600"],
  subsets: ["latin"],
});

export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Text reveal animation
  const textProgress = spring({
    frame,
    fps,
    config: { damping: 15 },
  });

  const textOpacity = interpolate(textProgress, [0, 1], [0, 1]);
  const textScale = interpolate(textProgress, [0, 1], [0.9, 1]);

  // Emphasis animation (delayed)
  const emphasisProgress = spring({
    frame: frame - 25,
    fps,
    config: { damping: 12, stiffness: 80 },
  });

  const emphasisScale = interpolate(emphasisProgress, [0, 1], [0.8, 1]);
  const emphasisOpacity = interpolate(emphasisProgress, [0, 1], [0, 1]);

  // Sparkle effect
  const sparkleOpacity = interpolate(
    frame,
    [40, 50, 60, 70],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${colors.white} 0%, ${colors.light} 100%)`,
        justifyContent: "center",
        alignItems: "center",
        padding: 60,
      }}
    >
      {/* Decorative circles */}
      <div
        style={{
          position: "absolute",
          top: height * 0.1,
          right: width * 0.1,
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${colors.accent}30 0%, transparent 70%)`,
          opacity: textProgress * 0.5,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: height * 0.15,
          left: width * 0.05,
          width: 250,
          height: 250,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${colors.primaryLight}40 0%, transparent 70%)`,
          opacity: textProgress * 0.5,
        }}
      />

      <div
        style={{
          textAlign: "center",
          opacity: textOpacity,
          transform: `scale(${textScale})`,
        }}
      >
        <h2
          style={{
            fontFamily: headingFont,
            fontSize: 72,
            fontWeight: 600,
            color: colors.dark,
            margin: 0,
            marginBottom: 30,
            lineHeight: 1.2,
          }}
        >
          Tus recuerdos de boda
        </h2>

        <div
          style={{
            opacity: emphasisOpacity,
            transform: `scale(${emphasisScale})`,
          }}
        >
          <h2
            style={{
              fontFamily: headingFont,
              fontSize: 80,
              fontWeight: 700,
              background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentDark} 100%)`,
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            merecen algo especial
          </h2>
        </div>

        {/* Sparkle icons */}
        <div
          style={{
            position: "absolute",
            top: height * 0.35,
            right: width * 0.15,
            opacity: sparkleOpacity,
          }}
        >
          <svg width="60" height="60" viewBox="0 0 24 24" fill={colors.accent}>
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
          </svg>
        </div>
        <div
          style={{
            position: "absolute",
            bottom: height * 0.3,
            left: width * 0.12,
            opacity: sparkleOpacity,
            transform: "rotate(20deg)",
          }}
        >
          <svg width="45" height="45" viewBox="0 0 24 24" fill={colors.primary}>
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
          </svg>
        </div>
      </div>
    </AbsoluteFill>
  );
};
