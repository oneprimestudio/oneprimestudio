import { AbsoluteFill, interpolateColors } from "remotion";
import { Dither } from "../lib/Dither";
import { C, clamp01, cue, E, H_, hash, HIT, lerp, MONO, noise3, p, W, W_ } from "../lib/core";
import { Cursor, display, mono, Pill, Ripple, Scramble, Type, Words } from "../lib/ui";

const sat = clamp01;

/* ------------------------------------------------------------------ shared: live static */
function Static({ t, amount, color = C.haze, px = 6 }) {
  return (
    <Dither
      px={px}
      color={color}
      field={(i, j, x, y) => {
        const n = noise3(x * 0.0055, y * 0.0055 - t * 0.18, t * 0.32);
        const band = (t * 0.21) % 1.3 - 0.15;
        const scan = Math.exp(-((y / H_ - band) ** 2) / 0.0016) * 0.5;
        return ((n - 0.5) * 1.7 + 0.18 + scan) * amount;
      }}
    />
  );
}

/* ================================================================== HOOK */
export function Hook({ t }) {
  const a = cue("hook1").words;
  const b = cue("hook2").words;
  const brk = W("hook2", 0) - 0.08;
  const g = t > brk && t < brk + 0.24; // the break: the first claim glitches
  const jx = g ? (hash(Math.floor(t * 60), 3, 1) - 0.5) * 46 : 0;
  const slice = g ? hash(Math.floor(t * 60), 7, 2) * 70 : 0;
  const dim = lerp(1, 0.28, p(t, brk + 0.1, 0.5));
  const amount = 0.25 + 0.3 * p(t, 0, 0.7) * (0.85 + 0.15 * Math.sin(t * 37)) + 0.35 * (g ? 1 : 0) + 0.2 * p(t, 3.1, 0.6);
  const push = 1 + 0.035 * clamp01(t / 3.7);
  const broken = t > brk;
  return (
    <AbsoluteFill style={{ background: C.night }}>
      <Static t={t} amount={amount} />
      <AbsoluteFill style={{ transform: `scale(${push})` }}>
        <div style={{ position: "absolute", left: 80, top: 470, ...display(152, C.sand), opacity: dim }}>
          <div style={{ transform: `translateX(${jx}px)`, clipPath: g ? `inset(${slice}% 0 ${70 - slice}% 0)` : undefined }}>
            <div>
              <Words t={t} words={[["Most", a[0].t], ["software", a[1].t]]} />
            </div>
            <div>
              <Words t={t} words={[["works.", a[2].t]]} />
            </div>
          </div>
          {g && (
            <div style={{ position: "absolute", inset: 0, color: C.accent, transform: `translateX(${-jx * 0.6}px)`, mixBlendMode: "screen" }}>
              <div>Most software</div>
              <div>works.</div>
            </div>
          )}
        </div>
        <div style={{ position: "absolute", left: 80, top: 850, ...display(152, C.sand) }}>
          <div>
            <Words t={t} words={[["Nobody", b[0].t, { color: C.accent }], ["wants", b[1].t]]} />
          </div>
          <div>
            <Words t={t} words={[["to", b[2].t], ["use", b[3].t], ["it.", b[4].t]]} />
          </div>
        </div>
        <div style={{ position: "absolute", left: 86, top: 1230, display: "flex", alignItems: "center", gap: 18, ...mono(26, C.sand) }}>
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: 7,
              background: broken ? C.accent : C.sand,
              opacity: t > 1.35 ? (Math.floor(t * 4) % 2 ? 1 : 0.35) : 0,
            }}
          />
          {broken ? (
            <Scramble key="b" t={t} at={brk + 0.05} dur={0.6} text="[ ACTIVE USERS: 0 ]" />
          ) : (
            <Scramble key="a" t={t} at={1.35} dur={0.7} text="[ SYSTEM STATUS: WORKING ]" />
          )}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

/* ================================================================== PROBLEM */
const card = (extra) => ({
  position: "absolute",
  background: "#0e0c63",
  border: "1.5px solid rgba(239,237,233,0.2)",
  borderRadius: 14,
  boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
  ...extra,
});

function presence(t, a, b) {
  const k = p(t, a - 0.12, 0.45);
  const o = p(t, b, 0.3, E.in);
  return { opacity: k * (1 - o), transform: `scale(${lerp(0.94, 1, k) - 0.05 * o})` };
}

// 1 · fourteen clicks through nested menus
const C0 = W("prob1", 0) + 0.12;
const C1 = W("prob1", 5) + 0.25;
const CLICKS = Array.from({ length: 14 }, (_, k) => C0 + (C1 - C0) * (k / 13) ** 0.85);
const PANEL = (m) => ({ x: 90 + m * 64, y: 350 + m * 76 });
const ITEMS = ["Settings", "Preferences", "Advanced", "More options…"];
const target = (k) => {
  const m = Math.floor(k / 2);
  const { x, y } = PANEL(m);
  return { x: x + 270, y: y + 104 + (k % 2 ? 3 : 1) * 56 };
};

function Clicks({ t }) {
  const count = CLICKS.filter((c) => t >= c).length;
  let k = CLICKS.findIndex((c) => t < c);
  if (k < 0) k = 13;
  const from = k === 0 ? { x: 900, y: 1000 } : target(k - 1);
  const to = target(k);
  const s = k === 0 ? p(t, C0 - 0.5, 0.5, E.inOut) : p(t, CLICKS[k - 1] + 0.01, CLICKS[k] - CLICKS[k - 1] - 0.02, E.inOut);
  const cx = lerp(from.x, to.x, s);
  const cy = lerp(from.y, to.y, s);
  return (
    <>
      {Array.from({ length: 7 }, (_, m) => {
        const at = CLICKS[m * 2] - 0.03;
        if (t < at) return null;
        const k2 = p(t, at, 0.22, E.out);
        const { x, y } = PANEL(m);
        return (
          <div key={m} style={card({ left: x, top: y, width: 430, padding: "18px 0", opacity: k2, transform: `translateY(${(1 - k2) * -14}px)` })}>
            <div style={{ ...mono(20, "rgba(239,237,233,0.45)"), padding: "0 26px 14px", borderBottom: "1px solid rgba(239,237,233,0.12)" }}>
              Menu › Level {m + 1}
            </div>
            {ITEMS.map((it, r) => {
              const hot = (r === 1 || r === 3) && count > m * 2 + (r === 3 ? 1 : 0);
              return (
                <div key={r} style={{ ...mono(25, hot ? C.sand : "rgba(239,237,233,0.6)", { letterSpacing: "0.03em", textTransform: "none" }), padding: "13px 26px", background: hot ? "rgba(47,107,255,0.35)" : "transparent" }}>
                  {it}
                  <span style={{ float: "right", opacity: 0.5 }}>›</span>
                </div>
              );
            })}
          </div>
        );
      })}
      {CLICKS.map((c, i) => (
        <Ripple key={i} t={t} at={c} x={target(i).x} y={target(i).y} size={80} />
      ))}
      <Cursor x={cx} y={cy} color={C.sand} outline={C.ink} scale={1.15} />
      <div style={{ position: "absolute", right: 92, top: 290, textAlign: "right" }}>
        <div style={mono(22, "rgba(239,237,233,0.55)")}>Clicks</div>
        <div style={{ fontFamily: MONO, fontSize: 150, lineHeight: 1, color: C.accent, fontVariantNumeric: "tabular-nums", transform: `scale(${1 + 0.08 * Math.exp(-Math.max(0, t - (CLICKS[count - 1] ?? -9)) / 0.06)})`, transformOrigin: "right center" }}>
          {String(count).padStart(2, "0")}
        </div>
      </div>
    </>
  );
}

// 2 · a dashboard nobody reads
function Widget({ kind, seed }) {
  const r = (i) => hash(seed, i, 9);
  const stroke = "rgba(239,237,233,0.75)";
  if (kind === 0)
    return (
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 92, padding: "0 6px" }}>
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i} style={{ flex: 1, height: `${20 + r(i) * 80}%`, background: i === 4 ? C.accent : stroke, opacity: i === 4 ? 1 : 0.7 }} />
        ))}
      </div>
    );
  if (kind === 1) {
    const pts = Array.from({ length: 10 }, (_, i) => `${i * 18},${80 - r(i) * 70}`).join(" ");
    return (
      <svg width="170" height="92" viewBox="0 0 170 90">
        <polyline points={pts} fill="none" stroke={stroke} strokeWidth="3" />
      </svg>
    );
  }
  if (kind === 2)
    return (
      <svg width="170" height="92" viewBox="0 0 170 92">
        <circle cx="85" cy="46" r="34" fill="none" stroke="rgba(239,237,233,0.2)" strokeWidth="14" />
        <circle cx="85" cy="46" r="34" fill="none" stroke={C.accent} strokeWidth="14" strokeDasharray={`${60 + r(1) * 120} 400`} transform="rotate(-90 85 46)" />
      </svg>
    );
  return (
    <div style={{ fontFamily: MONO, color: C.sand, fontSize: 46, lineHeight: 1.1, paddingTop: 14 }}>
      {(r(2) * 90 + 9).toFixed(1)}K<div style={{ fontSize: 15, opacity: 0.5, letterSpacing: "0.1em" }}>▲ {(r(3) * 9).toFixed(2)}%</div>
    </div>
  );
}

function Dashboard({ t }) {
  const at = W("prob2", 0);
  const dim = p(t, W("prob2", 2) + 0.12, 0.5, E.inOut);
  return (
    <>
      <div style={{ position: "absolute", left: 110, top: 330, width: 860, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, opacity: lerp(1, 0.16, dim) }}>
        {Array.from({ length: 16 }, (_, k) => {
          const kk = p(t, at + k * 0.055, 0.35, E.back);
          return (
            <div key={k} style={card({ position: "relative", height: 158, padding: 16, opacity: clamp01(kk * 1.5), transform: `scale(${lerp(0.6, 1, kk)})` })}>
              <div style={{ ...mono(13, "rgba(239,237,233,0.45)"), marginBottom: 8 }}>KPI_{String(k * 13 + 7).padStart(3, "0")}</div>
              <Widget kind={k % 4} seed={k + 3} />
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 640, textAlign: "center", opacity: dim, transform: `translateY(${(1 - dim) * 20}px)` }}>
        <span style={{ ...mono(30, C.ink), background: C.sand, padding: "16px 26px" }}>214 metrics · 0 read</span>
      </div>
    </>
  );
}

// 3 · websites that look like everyone else's
const STAMPS = Array.from({ length: 12 }, (_, k) => W("prob3", 0) + 0.15 + 1.6 * (k / 11) ** 0.7);
function Wire() {
  const l = "rgba(239,237,233,0.55)";
  return (
    <div style={card({ position: "relative", width: 250, height: 180, padding: 14, borderRadius: 10 })}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ width: 40, height: 8, background: l }} />
        <span style={{ width: 80, height: 8, background: "rgba(239,237,233,0.25)" }} />
      </div>
      <div style={{ height: 58, background: "rgba(239,237,233,0.12)", padding: 10, marginBottom: 10 }}>
        <div style={{ width: "70%", height: 10, background: l, marginBottom: 7 }} />
        <div style={{ width: "45%", height: 10, background: l }} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ flex: 1, height: 52, border: `1.5px solid ${l}` }} />
        ))}
      </div>
    </div>
  );
}
function Templates({ t }) {
  const n = STAMPS.filter((s) => t >= s).length;
  const zoom = lerp(2.6, 1, p(t, STAMPS[0], STAMPS[11] - STAMPS[0] + 0.2, E.inOut));
  return (
    <>
      <div style={{ position: "absolute", left: 135, top: 320, width: 810, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, transform: `scale(${zoom})`, transformOrigin: "135px 100px" }}>
        {STAMPS.map((s, k) => {
          const kk = p(t, s, 0.25, E.back);
          return (
            <div key={k} style={{ opacity: t >= s ? 1 : 0, transform: `scale(${lerp(1.25, 1, kk)})` }}>
              <Wire />
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 96, top: 1040, ...mono(24, "rgba(239,237,233,0.6)") }}>
        template_v3.html <span style={{ color: C.accent }}>×{String(n).padStart(2, "0")}</span>
      </div>
    </>
  );
}

// 4 · systems your team quietly works around
const NOTES = [
  { text: "use workaround.xlsx", x: 520, y: 420, r: 6 },
  { text: "ask Ravi first!!", x: 160, y: 690, r: -7 },
  { text: "don't click save twice", x: 560, y: 780, r: 4 },
  { text: "use the OLD portal", x: 230, y: 960, r: -3 },
];
function Erp({ t }) {
  const err = W("prob4", 0) + 0.15;
  const e = p(t, err, 0.3, E.back);
  const shakeX = t > err && t < err + 0.3 ? Math.sin((t - err) * 90) * 10 * (1 - (t - err) / 0.3) : 0;
  const fields = ["Customer ID", "Order type", "Warehouse", "Tax code", "Approver", "Ref. no."];
  return (
    <>
      <div style={card({ left: 120, top: 330, width: 840, height: 690, borderRadius: 10, overflow: "hidden" })}>
        <div style={{ ...mono(17, "rgba(239,237,233,0.6)"), padding: "16px 22px", background: "rgba(239,237,233,0.06)", borderBottom: "1px solid rgba(239,237,233,0.12)" }}>
          Order entry — ERP v2.3.1 <span style={{ float: "right" }}>— □ ×</span>
        </div>
        <div style={{ padding: "26px 30px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "22px 26px" }}>
          {fields.map((f, i) => (
            <div key={i}>
              <div style={{ ...mono(15, "rgba(239,237,233,0.5)"), marginBottom: 8 }}>{f} *</div>
              <div style={{ height: 50, border: "1.5px solid rgba(239,237,233,0.25)", borderRadius: 4 }} />
            </div>
          ))}
        </div>
        <div style={{ position: "absolute", right: 30, bottom: 28, ...mono(18, "rgba(239,237,233,0.35)"), border: "1.5px solid rgba(239,237,233,0.2)", padding: "14px 30px" }}>Save</div>
      </div>
      <div style={card({ left: 220, top: 520, width: 640, padding: "28px 34px", background: C.sand, border: "none", opacity: clamp01(e * 2), transform: `translateX(${shakeX}px) scale(${lerp(0.85, 1, e)})` })}>
        <div style={{ ...mono(26, C.ink) }}>
          <span style={{ color: C.accent }}>⚠</span> Error 0x00F4
        </div>
        <div style={{ ...mono(18, C.graphite, { letterSpacing: "0.06em" }), marginTop: 12 }}>Field required: [unknown]. Contact admin.</div>
      </div>
      {NOTES.map((n, k) => {
        const at = W("prob4", k + 2) + 0.05;
        const kk = p(t, at, 0.28, E.back);
        if (t < at) return null;
        return (
          <div
            key={k}
            style={{
              position: "absolute",
              left: n.x,
              top: n.y,
              width: 300,
              padding: "22px 22px 30px",
              background: "#f4f0c8",
              color: C.ink,
              fontFamily: MONO,
              fontSize: 23,
              lineHeight: 1.3,
              boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
              transform: `rotate(${n.r}deg) scale(${lerp(1.5, 1, kk)})`,
              opacity: clamp01(kk * 3),
            }}
          >
            <span style={{ position: "absolute", left: 110, top: -12, width: 80, height: 24, background: "rgba(47,107,255,0.55)" }} />
            {n.text}
          </div>
        );
      })}
    </>
  );
}

const PROBLEMS = [
  { id: "prob1", comp: Clicks, lines: [[["Fourteen", 0, true], ["clicks,", 1]], [["to", 2], ["do", 3], ["one", 4], ["thing.", 5]]] },
  { id: "prob2", comp: Dashboard, lines: [[["Dashboards", 0]], [["nobody", 1, true], ["reads.", 2]]] },
  { id: "prob3", comp: Templates, lines: [[["Websites", 0], ["that", 1], ["look", 2]], [["like", 3], ["everyone", 4, true], ["else's.", 5]]] },
  { id: "prob4", comp: Erp, lines: [[["Systems", 0], ["your", 1], ["team", 2]], [["quietly", 3], ["works", 4, true], ["around.", 5]]] },
];

export function Problem({ t, sc }) {
  const end = sc.end;
  const chaos = p(t, end - 0.75, 0.5);
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Static t={t} amount={0.35 + 0.4 * chaos} />
      <div style={{ position: "absolute", left: 96, top: 232, ...mono(22, "rgba(239,237,233,0.6)") }}>
        <Scramble t={t} at={sc.start + 0.2} dur={0.7} text="(01) — The problem" />
      </div>
      {PROBLEMS.map((pr, i) => {
        const c = cue(pr.id);
        const next = PROBLEMS[i + 1] ? cue(PROBLEMS[i + 1].id).speechStart : end + 1;
        const a = c.speechStart - 0.25;
        const b = next - 0.32;
        if (t < a - 0.2 || t > b + 0.4) return null;
        const Comp = pr.comp;
        const jitter = chaos > 0 && i === 3 ? (hash(Math.floor(t * 60), i, 4) - 0.5) * 24 * chaos : 0;
        return (
          <div key={pr.id}>
            <AbsoluteFill style={{ ...presence(t, a, b), transformOrigin: "540px 700px", translate: `${jitter}px 0` }}>
              <Comp t={t} />
            </AbsoluteFill>
            <div style={{ position: "absolute", left: 84, top: 1190, ...display(104, C.sand) }}>
              {pr.lines.map((line, li) => (
                <div key={li}>
                  <Words t={t} out={b} words={line.map(([w, wi, hot]) => [w, c.words[wi].t, hot ? { color: C.accent } : undefined])} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

/* ================================================================== SWITCH */
export function Switch({ t, sc }) {
  const hit = HIT.switch;
  const s = 320;
  const on = p(t, hit, 0.45, E.back);
  const appear = p(t, sc.start + 0.15, 0.7, E.out);
  const flood = p(t, hit + 0.02, 0.85, E.out);
  const lit = t >= hit;
  const kx = 540 - 0.875 * s + 0.11 * s + 0.12 * s + 0.26 * s + on * (1.53 * s - 0.24 * s - 0.52 * s);
  const flash = t > hit ? Math.exp(-(t - hit) / 0.07) : 0;
  const ring = p(t, hit, 0.9, E.out);
  const fillC = interpolateColors(p(t, hit, 0.12, E.linear), [0, 1], ["rgba(47,107,255,0)", "rgba(47,107,255,1)"]);
  const strokeC = interpolateColors(p(t, hit, 0.12, E.linear), [0, 1], ["rgba(239,237,233,0.4)", "rgba(47,107,255,1)"]);
  const knobC = interpolateColors(p(t, hit, 0.12, E.linear), [0, 1], ["rgba(239,237,233,0.6)", "rgba(239,237,233,1)"]);
  const typeEnd = W("switch", 0) + 0.034 * 15;
  return (
    <AbsoluteFill style={{ background: flood >= 0.999 ? C.sand : C.night }}>
      {!lit && <Static t={t} amount={0.18} />}
      {lit && flood < 0.999 && (
        <Dither
          px={8}
          color={C.sand}
          field={(i, j, x, y) => {
            const r = Math.hypot(x - kx, y - 900) / 2300;
            return sat((flood * 1.15 - r) / 0.12);
          }}
        />
      )}
      <div style={{ position: "absolute", left: 0, right: 0, top: 640, textAlign: "center", ...mono(34, C.sand), opacity: 1 - p(t, hit + 0.25, 0.3) }}>
        <Type t={t} at={W("switch", 0)} end={typeEnd} text="SO WE FLIPPED THE " caret={!lit} />
        {lit && <span style={{ color: C.accent }}>SWITCH</span>}
      </div>
      <div style={{ position: "absolute", left: 540 - 0.875 * s, top: 900 - 0.45 * s, opacity: appear, transform: `scale(${lerp(0.88, 1, appear) * (1 + 0.04 * flash)})` }}>
        <Pill s={s} k={on} stroke={strokeC} fill={fillC} knob={knobC} />
      </div>
      {lit && ring < 1 && (
        <div style={{ position: "absolute", left: 540 - 0.875 * s * (1 + ring * 1.4) - 6, top: 900 - 0.45 * s * (1 + ring * 1.4) - 6, width: 1.75 * s * (1 + ring * 1.4) + 12, height: 0.9 * s * (1 + ring * 1.4) + 12, borderRadius: 999, border: `4px solid ${C.accent}`, opacity: 1 - ring }} />
      )}
      <div style={{ position: "absolute", left: 0, right: 0, top: 1150, textAlign: "center", ...mono(26, C.ink) }}>
        {lit && <Scramble t={t} at={hit + 0.25} dur={0.5} text="[ STATE: ON ]" />}
      </div>
      <AbsoluteFill style={{ background: "#ffffff", opacity: flash * 0.5 }} />
    </AbsoluteFill>
  );
}
