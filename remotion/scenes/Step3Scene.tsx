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
  weights: ["500", "600", "700"],
  subsets: ["latin"],
});

export const Step3Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Step number animation
  const stepProgress = spring({
    frame,
    fps,
    config: { damping: 12 },
  });

  // Title animation
  const titleProgress = spring({
    frame: frame - 10,
    fps,
    config: { damping: 15 },
  });

  // Link card animation
  const linkProgress = spring({
    frame: frame - 25,
    fps,
    config: { damping: 12 },
  });

  // Social icons stagger
  const socialIcons = [
    { name: "WhatsApp", color: "#25D366", delay: 35 },
    { name: "Facebook", color: "#1877F2", delay: 42 },
    { name: "Twitter", color: "#1DA1F2", delay: 49 },
    { name: "Email", color: colors.accent, delay: 56 },
  ];

  // Ripple effect
  const ripple1 = interpolate(
    frame,
    [30, 90],
    [0, 200],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const ripple1Opacity = interpolate(
    frame,
    [30, 90],
    [0.4, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const ripple2 = interpolate(
    frame,
    [45, 105],
    [0, 200],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const ripple2Opacity = interpolate(
    frame,
    [45, 105],
    [0.3, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${colors.muted} 0%, ${colors.light} 100%)`,
        justifyContent: "center",
        alignItems: "center",
        padding: 60,
      }}
    >
      {/* Step indicator */}
      <div
        style={{
          position: "absolute",
          top: height * 0.12,
          opacity: interpolate(stepProgress, [0, 1], [0, 1]),
          transform: `scale(${interpolate(stepProgress, [0, 1], [0.5, 1])})`,
        }}
      >
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentDark} 100%)`,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            boxShadow: `0 10px 40px ${colors.accent}50`,
          }}
        >
          <span
            style={{
              fontFamily: bodyFont,
              fontSize: 48,
              fontWeight: 700,
              color: colors.white,
            }}
          >
            3
          </span>
        </div>
      </div>

      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: height * 0.26,
          textAlign: "center",
          opacity: interpolate(titleProgress, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(titleProgress, [0, 1], [30, 0])}px)`,
        }}
      >
        <h2
          style={{
            fontFamily: headingFont,
            fontSize: 64,
            fontWeight: 700,
            color: colors.primary,
            margin: 0,
          }}
        >
          Comparte con todos
        </h2>
        <p
          style={{
            fontFamily: bodyFont,
            fontSize: 28,
            color: colors.secondary,
            marginTop: 15,
          }}
        >
          Un solo link, acceso para todos
        </p>
      </div>

      {/* Link Card with ripple effect */}
      <div
        style={{
          position: "relative",
          marginTop: height * 0.12,
        }}
      >
        {/* Ripples */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: ripple1,
            height: ripple1,
            borderRadius: "50%",
            border: `3px solid ${colors.accent}`,
            opacity: ripple1Opacity,
            transform: "translate(-50%, -50%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: ripple2,
            height: ripple2,
            borderRadius: "50%",
            border: `3px solid ${colors.primary}`,
            opacity: ripple2Opacity,
            transform: "translate(-50%, -50%)",
          }}
        />

        {/* Link container */}
        <div
          style={{
            opacity: interpolate(linkProgress, [0, 1], [0, 1]),
            transform: `scale(${interpolate(linkProgress, [0, 1], [0.8, 1])})`,
          }}
        >
          <div
            style={{
              width: 600,
              padding: 30,
              borderRadius: 25,
              background: colors.white,
              boxShadow: `0 15px 50px ${colors.dark}15`,
              display: "flex",
              alignItems: "center",
              gap: 20,
            }}
          >
            {/* Link icon */}
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 15,
                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke={colors.white}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </div>

            {/* URL text */}
            <div style={{ flex: 1 }}>
              <p
                style={{
                  fontFamily: bodyFont,
                  fontSize: 14,
                  color: colors.secondary,
                  margin: 0,
                  marginBottom: 5,
                }}
              >
                Tu album esta listo en:
              </p>
              <p
                style={{
                  fontFamily: bodyFont,
                  fontSize: 24,
                  fontWeight: 600,
                  color: colors.primary,
                  margin: 0,
                }}
              >
                bluebook.mx/album/ana-y-carlos
              </p>
            </div>

            {/* Copy button */}
            <div
              style={{
                padding: "15px 25px",
                borderRadius: 15,
                background: colors.accent,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke={colors.white}
                strokeWidth="2"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span
                style={{
                  fontFamily: bodyFont,
                  fontSize: 16,
                  fontWeight: 600,
                  color: colors.white,
                }}
              >
                Copiar
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Social sharing icons */}
      <div
        style={{
          position: "absolute",
          bottom: height * 0.15,
          display: "flex",
          gap: 30,
        }}
      >
        {socialIcons.map((icon, i) => {
          const iconProgress = spring({
            frame: frame - icon.delay,
            fps,
            config: { damping: 12 },
          });

          return (
            <div
              key={i}
              style={{
                opacity: interpolate(iconProgress, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(iconProgress, [0, 1], [50, 0])}px) scale(${interpolate(iconProgress, [0, 1], [0.5, 1])})`,
              }}
            >
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 25,
                  background: icon.color,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  boxShadow: `0 8px 30px ${icon.color}40`,
                }}
              >
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill={colors.white}
                >
                  {icon.name === "WhatsApp" && (
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  )}
                  {icon.name === "Facebook" && (
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  )}
                  {icon.name === "Twitter" && (
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                  )}
                  {icon.name === "Email" && (
                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                  )}
                </svg>
              </div>
              <p
                style={{
                  fontFamily: bodyFont,
                  fontSize: 14,
                  color: colors.secondary,
                  textAlign: "center",
                  marginTop: 10,
                }}
              >
                {icon.name}
              </p>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
