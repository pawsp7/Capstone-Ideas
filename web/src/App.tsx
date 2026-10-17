import { useEffect } from "react";
import { SpriteGallery } from "./game/Sprite";
import { gardenStore, useGarden } from "./state/useGarden";
import { Flash, NavContext, SampleBanner } from "./ui/chrome";
import { DashboardScreen, KeeperScreen, RosterScreen } from "./ui/desk";
import { ChallengeScreen, ExerciseScreen, MountainScreen, TrialsScreen } from "./ui/practices";
import { allowedScreen, screenKey, useHashRoute, type Screen } from "./ui/router";
import {
  CheckInScreen,
  CreatureScreen,
  ForestScreen,
  GardenScreen,
  GroveScreen,
  JoinScreen,
  JournalScreen,
  PlayScreen,
} from "./ui/student";
import { TitleScreen } from "./ui/title";

export function App() {
  if (import.meta.env.DEV && window.location.search.includes("sprites")) return <SpriteGallery />;
  return <GardenApp />;
}

function GardenApp() {
  const snap = useGarden();
  const { screen, go } = useHashRoute();
  useEffect(() => {
    const next = allowedScreen(screen, snap.session);
    if (screenKey(next) !== screenKey(screen)) go(next);
  }, [screen, snap.session, go]);
  useEffect(() => {
    if (!snap.flash) return;
    const timer = window.setTimeout(() => gardenStore().clearFlash(), 4200);
    return () => window.clearTimeout(timer);
  }, [snap.flash]);

  return (
    <NavContext.Provider value={go}>
      {snap.sample && <SampleBanner />}
      {snap.flash && <Flash text={snap.flash} />}
      <ScreenSwitch screen={screen} />
    </NavContext.Provider>
  );
}

function ScreenSwitch({ screen }: { screen: Screen }) {
  switch (screen.name) {
    case "title":
      return <TitleScreen />;
    case "join":
      return <JoinScreen code={screen.code} />;
    case "checkin":
      return <CheckInScreen />;
    case "garden":
      return <GardenScreen />;
    case "grove":
      return <GroveScreen />;
    case "play":
      return <PlayScreen scenarioId={screen.scenarioId} />;
    case "forest":
      return <ForestScreen />;
    case "creature":
      return <CreatureScreen emotionId={screen.emotionId} />;
    case "mountain":
      return <MountainScreen />;
    case "exercise":
      return <ExerciseScreen exerciseId={screen.exerciseId} />;
    case "trials":
      return <TrialsScreen />;
    case "challenge":
      return <ChallengeScreen challengeId={screen.challengeId} />;
    case "journal":
      return <JournalScreen />;
    case "keeper":
      return <KeeperScreen />;
    case "dashboard":
      return <DashboardScreen />;
    case "roster":
      return <RosterScreen />;
    default:
      return <TitleScreen />;
  }
}
