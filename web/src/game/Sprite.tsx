import { useEffect, useMemo, useState } from "react";
import { PALETTE } from "./raster";
import { SPRITE_KINDS, spriteRows, type SpriteKind } from "./sprites";

export function Sprite({
  kind,
  blink = false,
  flap = 0,
  alt = "",
  width = 96,
  className = "",
}: {
  kind: SpriteKind;
  blink?: boolean;
  flap?: number;
  alt?: string;
  width?: number;
  className?: string;
}) {
  const closed = useBlink(blink);
  const shown: SpriteKind = kind === "butterfly" && flap === 1 ? "butterflyShut" : kind;
  const rows = spriteRows(shown, closed);
  const height = rows.length;
  const spriteWidth = rows[0]?.length ?? 1;
  const rects = useMemo(() => {
    const items: { x: number; y: number; fill: string }[] = [];
    rows.forEach((row, y) => {
      [...row].forEach((ch, x) => {
        const fill = PALETTE[ch];
        if (fill) items.push({ x, y, fill });
      });
    });
    return items;
  }, [rows]);
  return (
    <svg
      viewBox={`0 0 ${spriteWidth} ${height}`}
      width={width}
      height={(height / spriteWidth) * width}
      className={`sprite ${className}`}
      shapeRendering="crispEdges"
      role={alt ? "img" : "presentation"}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
    >
      {rects.map((rect) => (
        <rect key={`${rect.x}-${rect.y}`} x={rect.x} y={rect.y} width="1" height="1" fill={rect.fill} />
      ))}
    </svg>
  );
}

function useBlink(enabled: boolean): boolean {
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer = 0;
    let cancel = false;
    const loop = () => {
      timer = window.setTimeout(() => {
        if (cancel) return;
        setClosed(true);
        timer = window.setTimeout(() => {
          if (cancel) return;
          setClosed(false);
          loop();
        }, 130);
      }, 2200 + Math.random() * 2600);
    };
    loop();
    return () => {
      cancel = true;
      window.clearTimeout(timer);
    };
  }, [enabled]);
  return enabled && closed;
}

export function useFlap(): number {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setFrame((value) => (value === 0 ? 1 : 0)), 180);
    return () => window.clearInterval(id);
  }, []);
  return frame;
}

export function SpriteGallery() {
  return (
    <main className="gallery">
      <h1>Sprite garden</h1>
      <div className="gallery-grid">
        {SPRITE_KINDS.map((kind) => (
          <figure key={kind}>
            <Sprite kind={kind} blink={kind === "bramble"} width={160} alt={kind} />
            <figcaption>{kind}</figcaption>
          </figure>
        ))}
      </div>
    </main>
  );
}
