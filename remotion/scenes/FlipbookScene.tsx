import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
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

export const FlipbookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Book entrance animation
  const bookProgress = spring({
    frame,
    fps,
    config: { damping: 15 },
  });

  // Page flip animation - occurs mid-scene
  const flipStart = 40;
  const flipDuration = 25;
  const pageFlipProgress = interpolate(
    frame,
    [flipStart, flipStart + flipDuration],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.quad),
    }
  );

  // Title animation
  const titleProgress = spring({
    frame: frame - 10,
    fps,
    config: { damping: 15 },
  });

  // Feature badges
  const features = [
    { text: "Animacion fluida", delay: 50 },
    { text: "Modo pantalla completa", delay: 60 },
    { text: "Galeria de fotos", delay: 70 },
  ];

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${colors.light} 0%, ${colors.primaryLight}40 100%)`,
        justifyContent: "center",
        alignItems: "center",
        padding: 60,
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${colors.accent}30 0%, transparent 70%)`,
          opacity: bookProgress,
        }}
      />

      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: height * 0.1,
          textAlign: "center",
          opacity: interpolate(titleProgress, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(titleProgress, [0, 1], [30, 0])}px)`,
        }}
      >
        <h2
          style={{
            fontFamily: headingFont,
            fontSize: 56,
            fontWeight: 700,
            color: colors.primary,
            margin: 0,
          }}
        >
          Flipbook interactivo
        </h2>
        <p
          style={{
            fontFamily: bodyFont,
            fontSize: 26,
            color: colors.secondary,
            marginTop: 12,
          }}
        >
          Como un libro real, en tu celular
        </p>
      </div>

      {/* Flipbook */}
      <div
        style={{
          perspective: 1500,
          opacity: interpolate(bookProgress, [0, 1], [0, 1]),
          transform: `scale(${interpolate(bookProgress, [0, 1], [0.8, 1])})`,
        }}
      >
        {/* Book shadow */}
        <div
          style={{
            position: "absolute",
            bottom: -30,
            left: "50%",
            transform: "translateX(-50%)",
            width: "80%",
            height: 30,
            background: `radial-gradient(ellipse, ${colors.dark}30 0%, transparent 70%)`,
            borderRadius: "50%",
          }}
        />

        {/* Book container */}
        <div
          style={{
            width: 450,
            height: 550,
            position: "relative",
            transformStyle: "preserve-3d",
          }}
        >
          {/* Left page (static) */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: "50%",
              height: "100%",
              background: `linear-gradient(135deg, ${colors.accentLight} 0%, ${colors.accent}40 100%)`,
              borderRadius: "20px 0 0 20px",
              boxShadow: `inset -5px 0 15px ${colors.dark}10`,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              padding: 20,
            }}
          >
            <svg
              width="60"
              height="60"
              viewBox="0 0 24 24"
              fill={colors.accent}
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            <p
              style={{
                fontFamily: headingFont,
                fontSize: 22,
                color: colors.primary,
                marginTop: 15,
                textAlign: "center",
              }}
            >
              Nuestra Historia
            </p>
          </div>

          {/* Right page (static back) */}
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              width: "50%",
              height: "100%",
              background: `linear-gradient(135deg, ${colors.primaryLight}60 0%, ${colors.muted} 100%)`,
              borderRadius: "0 20px 20px 0",
              boxShadow: `inset 5px 0 15px ${colors.dark}05`,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              padding: 20,
            }}
          >
            <svg
              width="50"
              height="50"
              viewBox="0 0 24 24"
              fill="none"
              stroke={colors.primary}
              strokeWidth="1.5"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21,15 16,10 5,21" />
            </svg>
            <p
              style={{
                fontFamily: bodyFont,
                fontSize: 14,
                color: colors.secondary,
                marginTop: 15,
                textAlign: "center",
              }}
            >
              Pagina 2 de 50
            </p>
          </div>

          {/* Flipping page */}
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              width: "50%",
              height: "100%",
              transformOrigin: "left center",
              transform: `rotateY(${interpolate(pageFlipProgress, [0, 1], [0, -180])}deg)`,
              transformStyle: "preserve-3d",
            }}
          >
            {/* Front of flipping page */}
            <div
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                background: `linear-gradient(135deg, ${colors.white} 0%, ${colors.light} 100%)`,
                borderRadius: "0 20px 20px 0",
                backfaceVisibility: "hidden",
                boxShadow: `5px 0 20px ${colors.dark}20`,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                padding: 20,
              }}
            >
              <svg
                width="50"
                height="50"
                viewBox="0 0 24 24"
                fill="none"
                stroke={colors.accent}
                strokeWidth="1.5"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21,15 16,10 5,21" />
              </svg>
              <p
                style={{
                  fontFamily: bodyFont,
                  fontSize: 14,
                  color: colors.secondary,
                  marginTop: 15,
                  textAlign: "center",
                }}
              >
                El Gran Dia
              </p>
            </div>

            {/* Back of flipping page */}
            <div
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                background: `linear-gradient(135deg, ${colors.muted} 0%, ${colors.primaryLight}60 100%)`,
                borderRadius: "20px 0 0 20px",
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
                boxShadow: `-5px 0 20px ${colors.dark}15`,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                padding: 20,
              }}
            >
              <svg
                width="50"
                height="50"
                viewBox="0 0 24 24"
                fill={colors.primary}
              >
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
              <p
                style={{
                  fontFamily: bodyFont,
                  fontSize: 14,
                  color: colors.secondary,
                  marginTop: 15,
                  textAlign: "center",
                }}
              >
                Momentos Especiales
              </p>
            </div>
          </div>

          {/* Book spine */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: 0,
              width: 8,
              height: "100%",
              background: `linear-gradient(180deg, ${colors.primaryDark} 0%, ${colors.primary} 50%, ${colors.primaryDark} 100%)`,
              transform: "translateX(-50%)",
              borderRadius: 2,
              boxShadow: `0 0 10px ${colors.dark}30`,
            }}
          />
        </div>
      </div>

      {/* Feature badges */}
      <div
        style={{
          position: "absolute",
          bottom: height * 0.1,
          display: "flex",
          gap: 20,
        }}
      >
        {features.map((feature, i) => {
          const badgeProgress = spring({
            frame: frame - feature.delay,
            fps,
            config: { damping: 15 },
          });

          return (
            <div
              key={i}
              style={{
                opacity: interpolate(badgeProgress, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(badgeProgress, [0, 1], [30, 0])}px)`,
              }}
            >
              <div
                style={{
                  padding: "15px 25px",
                  borderRadius: 50,
                  background: colors.white,
                  boxShadow: `0 5px 20px ${colors.dark}10`,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: colors.accent,
                  }}
                />
                <span
                  style={{
                    fontFamily: bodyFont,
                    fontSize: 16,
                    fontWeight: 500,
                    color: colors.dark,
                  }}
                >
                  {feature.text}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
