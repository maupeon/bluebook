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

export const Step2Scene: React.FC = () => {
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

  // Upload area animation
  const uploadProgress = spring({
    frame: frame - 25,
    fps,
    config: { damping: 12 },
  });

  // Photos flying in animation
  const photosProgress = spring({
    frame: frame - 40,
    fps,
    config: { damping: 10, stiffness: 80 },
  });

  const photos = [
    { x: -180, y: -80, rotate: -15, delay: 0 },
    { x: 0, y: -120, rotate: 5, delay: 5 },
    { x: 180, y: -80, rotate: 12, delay: 10 },
    { x: -120, y: 60, rotate: -8, delay: 15 },
    { x: 120, y: 60, rotate: 10, delay: 20 },
  ];

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${colors.white} 0%, ${colors.muted} 100%)`,
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
            2
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
          Sube tus fotos
        </h2>
        <p
          style={{
            fontFamily: bodyFont,
            fontSize: 28,
            color: colors.secondary,
            marginTop: 15,
          }}
        >
          Arrastra, suelta y listo
        </p>
      </div>

      {/* Upload Zone with Photos */}
      <div
        style={{
          position: "relative",
          marginTop: height * 0.15,
          opacity: interpolate(uploadProgress, [0, 1], [0, 1]),
          transform: `scale(${interpolate(uploadProgress, [0, 1], [0.8, 1])})`,
        }}
      >
        {/* Upload container */}
        <div
          style={{
            width: 500,
            height: 350,
            borderRadius: 40,
            border: `4px dashed ${colors.primaryLight}`,
            background: `${colors.white}`,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            position: "relative",
            overflow: "visible",
          }}
        >
          {/* Upload icon */}
          <svg
            width="80"
            height="80"
            viewBox="0 0 24 24"
            fill="none"
            stroke={colors.primary}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17,8 12,3 7,8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p
            style={{
              fontFamily: bodyFont,
              fontSize: 24,
              color: colors.secondary,
              marginTop: 20,
            }}
          >
            Sube tus mejores fotos
          </p>

          {/* Flying photos */}
          {photos.map((photo, index) => {
            const photoDelay = photo.delay;
            const individualProgress = spring({
              frame: frame - 40 - photoDelay,
              fps,
              config: { damping: 15, stiffness: 100 },
            });

            const startY = -400;
            const startX = photo.x * 2;

            return (
              <div
                key={index}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  opacity: interpolate(individualProgress, [0, 0.3, 1], [0, 1, 1]),
                  transform: `
                    translate(
                      ${interpolate(individualProgress, [0, 1], [startX, photo.x])}px,
                      ${interpolate(individualProgress, [0, 1], [startY, photo.y])}px
                    )
                    rotate(${interpolate(individualProgress, [0, 1], [photo.rotate * 3, photo.rotate])}deg)
                  `,
                }}
              >
                <div
                  style={{
                    width: 100,
                    height: 120,
                    borderRadius: 12,
                    background: `linear-gradient(135deg, ${colors.accentLight} 0%, ${colors.accent} 100%)`,
                    boxShadow: `0 8px 30px ${colors.dark}20`,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={colors.white}
                    strokeWidth="2"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21,15 16,10 5,21" />
                  </svg>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Source icons */}
      <div
        style={{
          position: "absolute",
          bottom: height * 0.12,
          display: "flex",
          gap: 40,
          opacity: interpolate(
            spring({ frame: frame - 60, fps, config: { damping: 15 } }),
            [0, 1],
            [0, 1]
          ),
        }}
      >
        {["Celular", "Drive", "Dropbox"].map((source, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 15,
                background: colors.white,
                boxShadow: `0 4px 20px ${colors.dark}10`,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill={colors.primary}
              >
                {i === 0 && (
                  <path d="M17 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm-3 18H10v-1h4v1zm4-3H6V5h12v12z" />
                )}
                {i === 1 && (
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                )}
                {i === 2 && (
                  <path d="M12 2L4 8l8 6 8-6-8-6zm0 12l-8-6v8l8 6 8-6v-8l-8 6z" />
                )}
              </svg>
            </div>
            <span
              style={{
                fontFamily: bodyFont,
                fontSize: 16,
                color: colors.secondary,
              }}
            >
              {source}
            </span>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
