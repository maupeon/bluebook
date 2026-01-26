import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/CormorantGaramond";
import { colors } from "../MarketingVideo";

const { fontFamily: headingFont } = loadFont("normal", {
  weights: ["600", "700"],
  subsets: ["latin"],
});

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Logo animation
  const logoScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const logoRotate = interpolate(frame, [0, 30], [-10, 0], {
    extrapolateRight: "clamp",
  });

  // Title animation (delayed)
  const titleProgress = spring({
    frame: frame - 20,
    fps,
    config: { damping: 15 },
  });

  const titleOpacity = interpolate(titleProgress, [0, 1], [0, 1]);
  const titleY = interpolate(titleProgress, [0, 1], [50, 0]);

  // Subtitle animation (more delayed)
  const subtitleProgress = spring({
    frame: frame - 40,
    fps,
    config: { damping: 15 },
  });

  const subtitleOpacity = interpolate(subtitleProgress, [0, 1], [0, 1]);
  const subtitleY = interpolate(subtitleProgress, [0, 1], [30, 0]);

  // Floating hearts
  const hearts = [
    { x: width * 0.15, y: height * 0.2, size: 40, delay: 0 },
    { x: width * 0.85, y: height * 0.25, size: 30, delay: 10 },
    { x: width * 0.1, y: height * 0.7, size: 35, delay: 20 },
    { x: width * 0.9, y: height * 0.65, size: 45, delay: 15 },
    { x: width * 0.2, y: height * 0.45, size: 25, delay: 25 },
    { x: width * 0.8, y: height * 0.8, size: 38, delay: 5 },
  ];

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${colors.light} 0%, ${colors.muted} 50%, ${colors.primaryLight} 100%)`,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Floating Hearts */}
      {hearts.map((heart, i) => {
        const heartProgress = spring({
          frame: frame - heart.delay,
          fps,
          config: { damping: 20 },
        });
        const floatY = interpolate(
          frame,
          [0, 60, 120],
          [0, -15, 0],
          { extrapolateRight: "extend" }
        );
        const heartOpacity = interpolate(heartProgress, [0, 0.5, 1], [0, 0.3, 0.2]);

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: heart.x,
              top: heart.y + floatY * ((i % 2 === 0) ? 1 : -1),
              opacity: heartOpacity,
              transform: `scale(${heartProgress})`,
            }}
          >
            <svg
              width={heart.size}
              height={heart.size}
              viewBox="0 0 24 24"
              fill={colors.accent}
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
        );
      })}

      {/* Logo Book Icon */}
      <div
        style={{
          transform: `scale(${logoScale}) rotate(${logoRotate}deg)`,
          marginBottom: 40,
        }}
      >
        <div
          style={{
            width: 180,
            height: 180,
            borderRadius: 40,
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            boxShadow: `0 20px 60px ${colors.primary}50`,
          }}
        >
          <svg
            width="100"
            height="100"
            viewBox="0 0 24 24"
            fill="none"
            stroke={colors.white}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            <path d="M12 6v8" />
            <path d="M8 10h8" />
          </svg>
        </div>
      </div>

      {/* Title */}
      <div
        style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontFamily: headingFont,
            fontSize: 120,
            fontWeight: 700,
            color: colors.primary,
            margin: 0,
            lineHeight: 1,
            letterSpacing: -2,
          }}
        >
          Blue Book
        </h1>
      </div>

      {/* Subtitle */}
      <div
        style={{
          opacity: subtitleOpacity,
          transform: `translateY(${subtitleY}px)`,
          marginTop: 20,
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontFamily: headingFont,
            fontSize: 42,
            color: colors.secondary,
            margin: 0,
            fontWeight: 600,
          }}
        >
          Albumes Digitales para Bodas
        </p>
      </div>

      {/* Accent line */}
      <div
        style={{
          position: "absolute",
          bottom: height * 0.15,
          width: interpolate(frame, [50, 80], [0, 200], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          height: 4,
          background: `linear-gradient(90deg, ${colors.accent} 0%, ${colors.accentLight} 100%)`,
          borderRadius: 2,
        }}
      />
    </AbsoluteFill>
  );
};
