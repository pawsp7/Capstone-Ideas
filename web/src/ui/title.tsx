import { useFlap, Sprite } from "../game/Sprite";
import { Button, SoundToggle, useGo } from "./chrome";

export function TitleScreen() {
  const go = useGo();
  const flap = useFlap();
  return (
    <main className="title-screen">
      <p className="eyebrow">Grades 1–6</p>
      <h1>
        Harmony
        <br />
        Garden
      </h1>
      <p className="lede">A garden for feelings, fair words, and calm bodies.</p>
      <div className="title-stage">
        <span className="title-butterfly">
          <Sprite kind="butterfly" flap={flap} width={78} alt="" />
        </span>
        <span className="title-tree left">
          <Sprite kind="pine" width={108} alt="" />
        </span>
        <span className="title-tree right">
          <Sprite kind="pine" width={92} alt="" />
        </span>
        <Sprite kind="bramble" blink width={240} alt="Bramble, a cream garden spirit with leafy ears" className="hero" />
      </div>
      <div className="title-actions">
        <Button onClick={() => go({ name: "join" })}>Enter as a student</Button>
        <Button variant="ghost" onClick={() => go({ name: "keeper" })}>
          I am a garden keeper
        </Button>
        <SoundToggle />
      </div>
      <p className="footnote">Teachers and counselors · Garden names, not real names · Progress stays on this device</p>
    </main>
  );
}
