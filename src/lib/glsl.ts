// Shared GLSL for the dithered (halftone-square) WebGL layers.
// Shared GLSL for the dithered (halftone-square) WebGL layers.

export const FULLSCREEN_VERT = /* glsl */ `
  void main() {
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

// Ordered-dither thresholds, centred in (0,1): mean coverage is exactly 0.5,
// value 0 never lights and value 1 always does.
export const BAYER = /* glsl */ `
  float bayer2(vec2 a) {
    a = mod(floor(a), 2.0); // wrap first: exact, and safe on mediump / huge screens
    return fract(a.x * 0.5 + a.y * 0.75);
  }
  float bayer4(vec2 a) { // 16 levels
    return bayer2(0.5 * a) * 0.25 + bayer2(a) + 1.0 / 32.0;
  }
  float bayer8(vec2 a) { // 64 levels, smoother gradients
    return bayer2(0.25 * a) * 0.0625 + bayer2(0.5 * a) * 0.25 + bayer2(a) + 1.0 / 128.0;
  }
`;

// Smooth 3D value noise, cheap enough to run per cell.
export const NOISE = /* glsl */ `
  float hash3(vec3 p) { // Hoskins hash: sine-free, no grid artifacts
    p = fract(p * 0.1031);
    p += dot(p, p.zyx + 31.32);
    return fract((p.x + p.y) * p.z);
  }
  float valueNoise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0); // quintic: C2-smooth, no creases
    return mix(
      mix(mix(hash3(i), hash3(i + vec3(1, 0, 0)), f.x),
          mix(hash3(i + vec3(0, 1, 0)), hash3(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(hash3(i + vec3(0, 0, 1)), hash3(i + vec3(1, 0, 1)), f.x),
          mix(hash3(i + vec3(0, 1, 1)), hash3(i + vec3(1, 1, 1)), f.x), f.y),
      f.z);
  }
  float fbm(vec3 p) { // 3 octaves, ~[0,1]
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 3; i++) {
      s += a * valueNoise(p);
      p = p * 2.02 + 17.3; // offset decorrelates octaves
      a *= 0.5;
    }
    return s / 0.875;
  }
`;

// Halftone squares: one square per dither cell, sized by how far `value` clears the threshold.
export const DOT = /* glsl */ `
  // Needs \`uniform float uPitch;\` (INTEGER device px) declared before this chunk.
  vec2 ditherCell() { return floor(gl_FragCoord.xy / uPitch); }
  vec2 cellCenter(vec2 cell) { return (cell + 0.5) * uPitch; } // sample noise here, once per cell

  bool insideDot(vec2 cell, float value, float threshold) {
    if (value <= threshold) return false;
    float raw = mix(0.42, 0.86, clamp((value - threshold) * 1.4, 0.0, 1.0)) * uPitch;
    // Snap size to the pitch's parity so every dot is pixel-perfectly centred.
    float size = max(uPitch - 2.0 * floor((uPitch - raw) * 0.5 + 0.5), 2.0 - mod(uPitch, 2.0));
    vec2 local = floor(gl_FragCoord.xy) - cell * uPitch;
    vec2 lo = vec2((uPitch - size) * 0.5);
    return all(greaterThanEqual(local, lo)) && all(lessThan(local, lo + size));
  }
`;

// 1-bit ordered-dither helpers. Needs BAYER (and DOT for ditherCell / cellCenter).
export const DITHER = /* glsl */ `
  float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

  // t = (blackPoint, whitePoint, gamma, contrast)
  float tone(float v, vec4 t) {
    v = clamp((v - t.x) / max(t.y - t.x, 1e-4), 0.0, 1.0);
    v = pow(v, t.z);
    return clamp((v - 0.5) * t.w + 0.5, 0.0, 1.0);
  }

  // true = ink. v=0 is always ink, v=1 is never ink.
  bool ditherInk(vec2 cell, float v) { return v < bayer8(cell); }

  // Dithered dissolve. progress 0..1, bias 0..1 sets which cells go first
  // (a gradient or noise), spread is the width of the sweep.
  bool ditherReveal(vec2 cell, float progress, float spread, float bias) {
    return progress * (1.0 + spread) - bias * spread > bayer8(cell);
  }
`;

// Image to 1-bit Bayer, drawn on a fullscreen triangle. Needs WebGL2 (three >= r163).
export const DITHER_IMAGE_FRAG = /* glsl */ `
  uniform sampler2D uTex;
  uniform vec2  uResolution; // drawing-buffer px (css px * dpr)
  uniform vec2  uTexSize;    // image px
  uniform float uPitch;      // INTEGER device px per cell; 1-2 css px = fine grain
  uniform float uTime;
  uniform vec4  uTone;       // black, white, gamma, contrast
  uniform float uSharpen;    // ~0.6
  uniform float uDrift;      // ~0.04, slow living shimmer in the tone
  uniform float uReveal;     // 0..1 dithered dissolve-in
  uniform vec3  uInk;
  uniform vec4  uPaper;      // alpha 0 = transparent paper

  ${BAYER}
  ${NOISE}
  ${DOT}
  ${DITHER}

  // object-fit: cover
  vec2 coverUV(vec2 frag) {
    vec2 uv = frag / uResolution;
    float rr = uResolution.x / uResolution.y;
    float ri = uTexSize.x / uTexSize.y;
    vec2 s = rr > ri ? vec2(1.0, ri / rr) : vec2(rr / ri, 1.0);
    return (uv - 0.5) * s + 0.5;
  }

  float sampleV(vec2 uv, float lod) {
    vec4 c = textureLod(uTex, uv, lod);
    return mix(1.0, luma(c.rgb), c.a); // transparent PNGs fall back to paper
  }

  void main() {
    vec2 cell = ditherCell();
    vec2 fragC = cellCenter(cell);
    vec2 uv = coverUV(fragC);

    if (uReveal < 1.0) {
      float bias = clamp(1.0 - uv.y + (fbm(vec3(uv * 5.0, 3.7)) - 0.5) * 0.4, 0.0, 1.0);
      if (!ditherReveal(cell, uReveal, 0.35, bias)) { gl_FragColor = uPaper; return; }
    }

    // UVs are constant per cell, so hardware derivatives can't pick the mip. Do it by hand.
    vec2 dx = coverUV(fragC + vec2(uPitch, 0.0)) - uv;
    vec2 dy = coverUV(fragC + vec2(0.0, uPitch)) - uv;
    float lod = log2(max(abs(dx.x) * uTexSize.x, 1.0));

    float v = sampleV(uv, lod);
    float blur = 0.25 * (sampleV(uv + dx, lod) + sampleV(uv - dx, lod)
                       + sampleV(uv + dy, lod) + sampleV(uv - dy, lod));
    v += (v - blur) * uSharpen;                                   // unsharp mask at cell scale
    v += (fbm(vec3(uv * 3.0, uTime * 0.15)) - 0.5) * uDrift;      // subtle motion
    v = tone(v, uTone);

    gl_FragColor = ditherInk(cell, v) ? vec4(uInk, 1.0) : uPaper;
  }
`;