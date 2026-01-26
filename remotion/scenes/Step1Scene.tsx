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

export const Step1Scene: React.FC = () => {
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

  // Cards stagger animation
  const card1Progress = spring({
    frame: frame - 20,
    fps,
    config: { damping: 12 },
  });

  const card2Progress = spring({
    frame: frame - 30,
    fps,
    config: { damping: 12 },
  });

  const card3Progress = spring({
    frame: frame - 40,
    fps,
    config: { damping: 12 },
  });

  const plans = [
    { name: "Basico", price: "$499", photos: "50 fotos", progress: card1Progress },
    { name: "Premium", price: "$799", photos: "150 fotos", progress: card2Progress, highlighted: true },
    { name: "Deluxe", price: "$1,299", photos: "Ilimitadas", progress: card3Progress },
  ];

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${colors.light} 0%, ${colors.white} 100%)`,
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
            1
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
          Elige tu plan
        </h2>
        <p
          style={{
            fontFamily: bodyFont,
            fontSize: 28,
            color: colors.secondary,
            marginTop: 15,
          }}
        >
          Un pago unico, recuerdos de por vida
        </p>
      </div>

      {/* Plan Cards */}
      <div
        style={{
          display: "flex",
          gap: 30,
          marginTop: height * 0.15,
        }}
      >
        {plans.map((plan, index) => (
          <div
            key={index}
            style={{
              opacity: interpolate(plan.progress, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(plan.progress, [0, 1], [80, 0])}px) scale(${interpolate(plan.progress, [0, 1], [0.8, 1])})`,
            }}
          >
            <div
              style={{
                width: 280,
                padding: 35,
                borderRadius: 30,
                background: plan.highlighted
                  ? `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`
                  : colors.white,
                boxShadow: plan.highlighted
                  ? `0 20px 60px ${colors.primary}40`
                  : `0 10px 40px ${colors.dark}15`,
                textAlign: "center",
                transform: plan.highlighted ? "scale(1.05)" : "scale(1)",
              }}
            >
              {plan.highlighted && (
                <div
                  style={{
                    position: "absolute",
                    top: -15,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: colors.accent,
                    color: colors.dark,
                    fontFamily: bodyFont,
                    fontSize: 14,
                    fontWeight: 600,
                    padding: "8px 20px",
                    borderRadius: 20,
                  }}
                >
                  Mas popular
                </div>
              )}
              <h3
                style={{
                  fontFamily: headingFont,
                  fontSize: 36,
                  fontWeight: 700,
                  color: plan.highlighted ? colors.white : colors.primary,
                  margin: 0,
                  marginBottom: 10,
                }}
              >
                {plan.name}
              </h3>
              <p
                style={{
                  fontFamily: bodyFont,
                  fontSize: 48,
                  fontWeight: 700,
                  color: plan.highlighted ? colors.white : colors.dark,
                  margin: 0,
                }}
              >
                {plan.price}
              </p>
              <p
                style={{
                  fontFamily: bodyFont,
                  fontSize: 18,
                  color: plan.highlighted ? colors.accentLight : colors.secondary,
                  marginTop: 10,
                }}
              >
                {plan.photos}
              </p>
            </div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
