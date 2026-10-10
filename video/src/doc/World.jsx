import { AbsoluteFill, Img, OffthreadVideo, Sequence, staticFile } from "remotion";
import { D, E, p, io, W, cue, clamp01, lerp, TL } from "./time";
import { Bar, ChapterCard, Cursor, K, label, Laptop, LowerThird, openBox, Phone, Ripple, Row, Rule, SHADOW, Switch, type, wipe, Win } from "./kit";
import { Glow } from "./fx";
import { TOOLS, Tile } from "./Problem";
import { Lockup, SkyWindow } from "./Product";

/* ================================================================== 03 · case study: Maera */
// regions of public/doc/assets/maera.mp4 (1920×1080) — [source second, x, y, w, h]
const CLIPS = [
  [10.8, 590, 170, 860, 560], // today: takings, chairs, appointments
  [16.5, 40, 110, 880, 560], // calendar: every booking finds the next free artist
  [21.9, 590, 140, 860, 560], // point of sale
  [27.9, 40, 110, 900, 580], // receipts + WhatsApp
];
const SCREEN = { w: 960 * 0.93 - 36, h: 960 * 0.64 - 44 };

function Clip({ t, at, src, x, y, w, h, until }) {
  const fps = TL.fps;
  const from = Math.round(at * fps);
  const dur = Math.round((until - at) * fps) + 60;
  const k = p(t, at, 0.6, E.io5);
  const leave = until < 1e8 ? p(t, until, 0.6, E.io5) : 0;
  const push = lerp(1, 1.07, clamp01((t - at) / 3));
  const sc = Math.max(SCREEN.w / w, SCREEN.h / h) * push;
  const left = -x * sc + (SCREEN.w - w * sc) / 2;
  const top = -y * sc + (SCREEN.h - h * sc) / 2;
  return (
    <Sequence from={from} durationInFrames={dur} layout="none">
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#fff", clipPath: wipe(k, "up"), transform: `translateY(${-leave * 60}px)` }}>
        <OffthreadVideo src={staticFile("doc/assets/maera.mp4")} startFrom={Math.round(src * fps)} muted style={{ position: "absolute", left, top, width: 1920 * sc, height: 1080 * sc, maxWidth: "none" }} />
      </div>
    </Sequence>
  );
}

export function Maera({ t, sc }) {
  const card = sc.start + 0.95;
  const open = p(t, card + 0.05, 1.1, E.doc);
  const at = [card + 0.15, W("real1", 5) - 0.1, W("real1", 7) - 0.1, W("real1", 11) - 0.1];
  const tags = ["Bookings", "Bills", "Clients", "WhatsApp"];
  return (
    <AbsoluteFill style={{ background: D.bg }}>
      <Glow t={t} y={860} at={card} size={1500} />
      <LowerThird t={t} at={card + 0.1} kicker="Case study · Salon CRM" title="Maera Makeover Studio." y={200} />
      <div style={{ position: "absolute", inset: 0, transform: `perspective(1800px) rotateX(${(1 - open) * 26}deg) translateY(${(1 - open) * 140}px) scale(${lerp(0.94, 1, open)})`, transformOrigin: "50% 100%", opacity: clamp01(open * 2.5) }}>
        <Laptop x={60} y={520} w={960} sheen={p(t, card + 0.4, 2.4, E.io)}>
          {CLIPS.map(([src, x, y, w, h], i) => (
            <Clip key={i} t={t} at={at[i]} src={src} x={x} y={y} w={w} h={h} until={i + 1 < CLIPS.length ? at[i + 1] : 1e9} />
          ))}
        </Laptop>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1255, display: "flex", justifyContent: "center", gap: 14 }}>
        {tags.map((tg, i) => {
          const k = p(t, W("real1", 8) + i * 0.09, 0.7, E.doc);
          return (
            <span key={tg} style={{ padding: "16px 26px 18px", borderRadius: 40, background: i === 0 ? D.ink : "#fff", border: `1.5px solid ${D.line}`, boxShadow: SHADOW, ...type(28, i === 0 ? "#fff" : D.ink, { letterSpacing: "-0.01em", lineHeight: 1 }), clipPath: openBox(k, 40), transform: `translateY(${(1 - k) * 30}px)` }}>
              {tg}
            </span>
          );
        })}
      </div>
      <ChapterCard t={t} at={sc.start} n="03" title="The real world." sub="Built for real businesses." until={card} />
    </AbsoluteFill>
  );
}

/* ================================================================== 03 · store */
export function Store({ t, sc }) {
  const open = p(t, sc.start + 0.05, 0.9, E.doc);
  const sells = W("real2", 3);
  const orders = [
    ["₹2,499", "Linen shirt · Pune", "01:12"],
    ["₹1,150", "Ceramic mug set · Kochi", "02:47"],
    ["₹3,800", "Leather tote · Jaipur", "03:05"],
    ["₹899", "Notebook · Delhi", "03:31"],
  ];
  const mins = Math.round(lerp(12 + 60, 31 + 3 * 60, p(t, sells, 2.4, E.sine)));
  const clock = `0${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, "0")}`;
  return (
    <AbsoluteFill style={{ background: D.bg }}>
      <LowerThird t={t} at={sc.start + 0.1} kicker="Scenario · Retail" title="A store." y={200} />
      <Glow t={t} y={900} size={1400} color="rgba(123,92,255,0.10)" />
      <Phone y={400} screen={D.card} sheen={p(t, sc.start + 0.3, 2.4, E.io)} style={{ clipPath: openBox(open, 78), transform: `perspective(1800px) rotateY(${(1 - open) * -18}deg) translateY(${(1 - open) * 80}px)` }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 110, textAlign: "center" }}>
          <div style={label(20, D.sub)}>Tuesday · ☾ Do not disturb</div>
          <div style={{ marginTop: 10, ...type(140, D.ink, { letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums" }) }}>{clock}</div>
        </div>
        <div style={{ position: "absolute", left: 24, right: 24, top: 360, display: "flex", flexDirection: "column", gap: 14 }}>
          {orders.map(([amt, item, tm], i) => {
            const at = sells - 0.2 + i * 0.42;
            const k = p(t, at, 0.75, E.doc);
            return (
              <div key={i} style={{ background: "#fff", borderRadius: 26, padding: "20px 22px", display: "flex", gap: 18, alignItems: "center", boxShadow: "0 18px 30px -22px rgba(8,6,78,0.4)", clipPath: openBox(k, 26), transform: `translateY(${(1 - k) * -40}px)` }}>
                <span style={{ width: 58, height: 58, borderRadius: 16, background: D.ink, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Switch s={24} k={1} color="#fff" />
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", ...label(16, D.sub, { letterSpacing: "0.04em" }) }}>
                    <span>New order</span>
                    <span>{tm}</span>
                  </div>
                  <div style={{ marginTop: 8, ...type(30, D.ink, { letterSpacing: "-0.015em" }) }}>
                    {amt} <span style={{ color: D.sub }}>· {item}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Phone>
    </AbsoluteFill>
  );
}

/* ================================================================== 03 · team */
export function Team({ t, sc }) {
  const one = W("real3", 6) - 0.1;
  const merge = p(t, one - 0.35, 0.9, E.io5);
  const panel = p(t, one + 0.35, 0.95, E.doc);
  const scatter = [
    [150, 470],
    [760, 430],
    [460, 640],
    [170, 950],
    [740, 980],
  ];
  return (
    <AbsoluteFill style={{ background: D.bg }}>
      <LowerThird t={t} at={sc.start + 0.1} kicker="Scenario · Operations" title="A team." y={200} />
      {TOOLS.map(([name, g], i) => {
        const k = p(t, sc.start + 0.1 + i * 0.07, 0.8, E.doc);
        const [x0, y0] = scatter[i];
        const float = Math.sin(t * 1.4 + i) * 10;
        const x = lerp(x0, 455, merge);
        const y = lerp(y0 + float, 760, merge);
        return <Tile key={name} name={name} glyph={g} style={{ left: x, top: y, clipPath: openBox(k, 44), transform: `scale(${lerp(1, 0.2, merge)})`, opacity: 1 - p(t, one, 0.4, E.io) }} />;
      })}
      <Win w={840} h={620} title="One system" style={{ left: 120, top: 520, clipPath: openBox(panel, 22) }}>
        <div style={{ display: "flex", height: "100%" }}>
          <div style={{ width: 200, background: D.card, padding: 22, display: "flex", flexDirection: "column", gap: 18 }}>
            <Switch s={40} k={p(t, one + 0.8, 0.6, E.io)} />
            {TOOLS.map(([name], i) => (
              <div key={name} style={{ ...label(17, i === 0 ? D.ink : D.sub, { letterSpacing: "0.04em" }), clipPath: wipe(p(t, one + 0.6 + i * 0.06, 0.6, E.io), "up") }}>{name}</div>
            ))}
          </div>
          <div style={{ flex: 1, padding: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignContent: "start" }}>
            {[0, 1, 2, 3].map((j) => (
              <div key={j} style={{ height: 120, borderRadius: 16, background: j === 0 ? D.soft : D.card, padding: 16, clipPath: wipe(p(t, one + 0.7 + j * 0.07, 0.7, E.io), "up", 16) }}>
                <Bar w="45%" h={12} c={D.sub} />
                <Bar w="70%" h={30} c={j === 0 ? D.accent : D.ink} style={{ marginTop: 18 }} />
              </div>
            ))}
            <div style={{ gridColumn: "1 / 3", height: 150, borderRadius: 16, background: D.card, clipPath: wipe(p(t, one + 0.95, 0.7, E.io), "up", 16) }} />
          </div>
        </div>
      </Win>
    </AbsoluteFill>
  );
}

/* ================================================================== epilogue · built as one */
export function Close({ t, sc }) {
  const w = (i) => W("close", i) - 0.08;
  const built = W("close", 3) - 0.15;
  const conv = p(t, built - 0.1, 0.8, E.io5);
  const one = W("close", 5);
  return (
    <AbsoluteFill style={{ background: D.bg }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 620 + conv * 120, padding: "0.12em 0 0.26em", textAlign: "center", ...type(170), clipPath: `inset(0 0 ${conv * 100}% 0)` }}>
        <K t={t} at={w(0)}>Design</K>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 827 - conv * 120, padding: "0.12em 0 0.26em", textAlign: "center", ...type(110, D.sub), clipPath: `inset(${conv * 100}% 0 0 0)` }}>
        <Row t={t} style={{ justifyContent: "center" }} words={[["&", w(1)], ["development", w(2)]]} />
      </div>
      <Rule t={t} at={built - 0.1} dur={0.8} x={140} y={858} w={800} origin="center" style={{ opacity: 1 - p(t, built + 0.5, 0.5, E.io) }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 760, textAlign: "center", ...type(150) }}>
        <Row t={t} style={{ justifyContent: "center" }} words={[["Built", built + 0.45], ["as", built + 0.52], ["one.", Math.max(w(5), built + 0.6), { color: D.accent, transform: `scale(${1 + 0.06 * Math.sin(Math.PI * p(t, one + 0.2, 0.7, E.io))})` }]]} />
      </div>
    </AbsoluteFill>
  );
}

/* ================================================================== sign-off */
function SignBody({ t, sc, light }) {
  const w = (i) => W("sign", i);
  const avg = w(3) - 0.08;
  const cta = cue("sign").speechEnd + 0.35;
  const click = cta + 1.6;
  const ink = light ? "#fff" : D.ink;
  const mute = light ? "rgba(255,255,255,0.6)" : D.mute;
  const bx = 540;
  const by = 1325;
  return (
    <>
      <div style={{ position: "absolute", inset: 0, transform: `translateY(${-p(t, avg - 0.2, 1.0, E.io) * 140}px)` }}>
        <Lockup t={t} draw={sc.start + 0.1} on={w(0) - 0.05} ne={w(0) + 0.05} words={w(1) - 0.1} color={ink} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1000, textAlign: "center", ...type(68, ink, { letterSpacing: "-0.03em" }) }}>
        <Row t={t} style={{ justifyContent: "center" }} gap="0.22em" words={[[<span style={{ position: "relative", display: "inline-block" }}>Average<span style={{ position: "absolute", left: -4, right: -4, top: "52%", height: 6, borderRadius: 3, background: light ? "#fff" : D.red, transform: `scaleX(${p(t, w(5) - 0.05, 0.55, E.io)})`, transformOrigin: "left" }} /></span>, avg, { color: mute }], ["is", w(4) - 0.08], ["not", w(5) - 0.08], ["an", w(6) - 0.08], ["option.", w(7) - 0.08]]} />
      </div>
      <div style={{ position: "absolute", left: bx - 310, top: by - 56, width: 620, height: 112, borderRadius: 56, background: light ? (t >= click ? D.accent : "#fff") : D.ink, boxShadow: light ? "0 30px 60px -20px rgba(8,6,78,0.45)" : "none", clipPath: openBox(p(t, cta + 0.35, 0.8, E.doc), 56), display: "flex", alignItems: "center", justifyContent: "center", gap: 18, transform: `scale(${t >= click && t < click + 0.12 ? 0.96 : 1})` }}>
        <span style={type(40, light && t < click ? D.ink : "#fff", { letterSpacing: "-0.02em" })}>DM One Prime Studio</span>
        <span style={{ ...type(40, light && t < click ? D.ink : "#fff"), transform: `translateX(${Math.sin(t * 5) * 5}px)` }}>→</span>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1440, textAlign: "center", ...label(21, light ? "rgba(255,255,255,0.85)" : D.sub) }}>
        <K t={t} at={cta + 0.55} tilt={0}>Websites · Apps · CRM · ERP · SaaS · Shopify · Brand</K>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1490, textAlign: "center", ...label(21, ink) }}>
        <K t={t} at={cta + 0.7} tilt={0}>Let's build something prime</K>
      </div>
    </>
  );
}

export function Sign({ t, sc }) {
  const cta = cue("sign").speechEnd + 0.35;
  const click = cta + 1.6;
  const cur = p(t, cta + 0.6, click - cta - 0.65, E.io);
  const bx = 580;
  const by = 1335;
  return (
    <AbsoluteFill style={{ background: D.bg }}>
      <Glow t={t} y={880} size={1400} at={sc.start} />
      <SignBody t={t} sc={sc} />
      {/* the end card: a window of sky opens from the centre and the type turns white inside it */}
      {t >= cta - 0.1 && (
        <SkyWindow t={t} at={cta - 0.1} from={{ x: 540, y: 960 }} inset={0} top={0} bottom={0} radius={0} dur={1.1}>
          <SignBody t={t} sc={sc} light />
        </SkyWindow>
      )}
      <Ripple t={t} at={click} x={bx} y={by} size={240} color="#fff" />
      {t > cta + 0.55 && <Cursor x={lerp(980, bx, cur)} y={lerp(1720, by, cur)} scale={1.3} opacity={clamp01((t - cta - 0.55) * 3) * (1 - p(t, click + 1.0, 0.5, E.io))} />}
    </AbsoluteFill>
  );
}
