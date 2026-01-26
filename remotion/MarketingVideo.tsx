import { AbsoluteFill, useVideoConfig } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { IntroScene } from "./scenes/IntroScene";
import { HookScene } from "./scenes/HookScene";
import { Step1Scene } from "./scenes/Step1Scene";
import { Step2Scene } from "./scenes/Step2Scene";
import { Step3Scene } from "./scenes/Step3Scene";
import { FlipbookScene } from "./scenes/FlipbookScene";
import { CTAScene } from "./scenes/CTAScene";

// Blue Book Brand Colors
export const colors = {
  primary: "#6b9ac4",
  primaryDark: "#4a7ba7",
  primaryLight: "#a8c5db",
  secondary: "#97b8d8",
  accent: "#f4a7b9",
  accentLight: "#f8c8d4",
  accentDark: "#e88a9f",
  light: "#f0f7ff",
  muted: "#dbeafe",
  dark: "#2c3e50",
  white: "#ffffff",
};

export const MarketingVideo: React.FC = () => {
  const { fps } = useVideoConfig();

  // Scene durations in seconds
  const introDuration = 3.5 * fps;
  const hookDuration = 2.5 * fps;
  const step1Duration = 3 * fps;
  const step2Duration = 3 * fps;
  const step3Duration = 3 * fps;
  const flipbookDuration = 3 * fps;
  const ctaDuration = 2 * fps;

  const transitionDuration = 15;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.light }}>
      <TransitionSeries>
        {/* Intro Scene */}
        <TransitionSeries.Sequence durationInFrames={introDuration}>
          <IntroScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionDuration })}
        />

        {/* Hook Scene */}
        <TransitionSeries.Sequence durationInFrames={hookDuration}>
          <HookScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: transitionDuration })}
        />

        {/* Step 1: Choose Plan */}
        <TransitionSeries.Sequence durationInFrames={step1Duration}>
          <Step1Scene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: transitionDuration })}
        />

        {/* Step 2: Upload Photos */}
        <TransitionSeries.Sequence durationInFrames={step2Duration}>
          <Step2Scene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: transitionDuration })}
        />

        {/* Step 3: Share */}
        <TransitionSeries.Sequence durationInFrames={step3Duration}>
          <Step3Scene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionDuration })}
        />

        {/* Flipbook Demo */}
        <TransitionSeries.Sequence durationInFrames={flipbookDuration}>
          <FlipbookScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionDuration })}
        />

        {/* CTA Scene */}
        <TransitionSeries.Sequence durationInFrames={ctaDuration}>
          <CTAScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
