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

export const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Main content animation
  const contentProgress = spring({
    frame,
    fps,
    config: { damping: 12 },
  });

  // Button animation (delayed)
  const buttonProgress = spring({
    frame: frame - 15,
    fps,
    config: { damping: 10, stiffness: 80 },
  });

  // URL animation (more delayed)
  const urlProgress = spring({
    frame: frame - 25,
    fps,
    config: { damping: 15 },
  });

  // Pulse animation for button
  const pulse = interpolate(
    frame,
    [30, 45, 60],
    [1, 1.05, 1],
    { extrapolateRight: "extend" }
  );

  // Floating hearts
  const hearts = [
    { x: width * 0.1, y: height * 0.15, size: 35, delay: 0 },
    { x: width * 0.9, y: height * 0.2, size: 28, delay: 8 },
    { x: width * 0.15, y: height * 0.8, size: 32, delay: 15 },
    { x: width * 0.85, y: height * 0.75, size: 40, delay: 5 },
    { x: width * 0.5, y: height * 0.1, size: 25, delay: 12 },
  ];

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
        justifyContent: "center",
        alignItems: "center",
        padding: 60,
      }}
    >
      {/* Decorative elements */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: `radial-gradient(circle at 30% 20%, ${colors.white}10 0%, transparent 40%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: `radial-gradient(circle at 70% 80%, ${colors.accent}20 0%, transparent 40%)`,
        }}
      />

      {/* Floating hearts */}
      {hearts.map((heart, i) => {
        const heartProgress = spring({
          frame: frame - heart.delay,
          fps,
          config: { damping: 20 },
        });
        const floatY = interpolate(
          frame,
          [0, 30, 60],
          [0, -10, 0],
          { extrapolateRight: "extend" }
        );

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: heart.x,
              top: heart.y + floatY * ((i % 2 === 0) ? 1 : -1),
              opacity: interpolate(heartProgress, [0, 1], [0, 0.25]),
              transform: `scale(${heartProgress})`,
            }}
          >
            <svg
              width={heart.size}
              height={heart.size}
              viewBox="0 0 24 24"
              fill={colors.white}
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
        );
      })}

      {/* Main content */}
      <div
        style={{
          textAlign: "center",
          opacity: interpolate(contentProgress, [0, 1], [0, 1]),
          transform: `scale(${interpolate(contentProgress, [0, 1], [0.9, 1])})`,
        }}
      >
        {/* Heart icon */}
        <div
          style={{
            width: 120,
            height: 120,
            margin: "0 auto 40px",
            borderRadius: "50%",
            background: `${colors.white}15`,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            border: `2px solid ${colors.white}30`,
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
        </div>

        {/* Title */}
        <h2
          style={{
            fontFamily: headingFont,
            fontSize: 72,
            fontWeight: 700,
            color: colors.white,
            margin: 0,
            marginBottom: 20,
            lineHeight: 1.1,
          }}
        >
          Crea tu album
        </h2>
        <h2
          style={{
            fontFamily: headingFont,
            fontSize: 72,
            fontWeight: 700,
            color: colors.accent,
            margin: 0,
            marginBottom: 40,
            lineHeight: 1.1,
          }}
        >
          hoy mismo
        </h2>

        {/* CTA Button */}
        <div
          style={{
            opacity: interpolate(buttonProgress, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(buttonProgress, [0, 1], [40, 0])}px) scale(${pulse})`,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 15,
              padding: "25px 50px",
              borderRadius: 60,
              background: colors.accent,
              boxShadow: `0 15px 50px ${colors.accentDark}60`,
            }}
          >
            <span
              style={{
                fontFamily: bodyFont,
                fontSize: 28,
                fontWeight: 700,
                color: colors.dark,
              }}
            >
              Comenzar ahora
            </span>
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke={colors.dark}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12,5 19,12 12,19" />
            </svg>
          </div>
        </div>

        {/* URL */}
        <div
          style={{
            marginTop: 50,
            opacity: interpolate(urlProgress, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(urlProgress, [0, 1], [20, 0])}px)`,
          }}
        >
          <p
            style={{
              fontFamily: bodyFont,
              fontSize: 32,
              fontWeight: 600,
              color: colors.white,
              margin: 0,
            }}
          >
            bluebook.mx
          </p>
        </div>
      </div>

      {/* Bottom trust badges */}
      <div
        style={{
          position: "absolute",
          bottom: height * 0.08,
          display: "flex",
          gap: 40,
          opacity: interpolate(urlProgress, [0, 1], [0, 0.7]),
        }}
      >
        {[
          { icon: "shield", text: "Pago seguro" },
          { icon: "clock", text: "Listo en minutos" },
          { icon: "infinity", text: "Acceso de por vida" },
        ].map((item, i) => (
          <div
            key={i}
            style={{
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
              {item.icon === "shield" && (
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              )}
              {item.icon === "clock" && (
                <>
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </>
              )}
              {item.icon === "infinity" && (
                <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z" />
              )}
            </svg>
            <span
              style={{
                fontFamily: bodyFont,
                fontSize: 16,
                color: colors.white,
              }}
            >
              {item.text}
            </span>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
