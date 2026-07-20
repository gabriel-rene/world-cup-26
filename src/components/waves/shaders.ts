export const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

// A single scene: two team-colored waters over the pitch meeting at a front
// whose x-position IS the momentum value. Everything else (lapping, foam,
// shimmer, wake, goal ripples) is presentation of that one honest signal.
export const FRAG = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 outColor;

uniform float uTime;         // wall-clock seconds, drives the water texture
uniform float uSeed;         // per-match seed: deterministic replays
uniform float uMomentum;     // current momentum in [-1, 1], + = home (left)
uniform float uWake[16];     // trailing momentum, [0] oldest .. [15] now
uniform float uDrift;        // recent momentum trend, advects the noise
uniform vec3 uHomeColor;
uniform vec3 uAwayColor;
uniform float uGoalProgress; // 0..1 through the ripple, or -1 when none
uniform float uGoalSide;     // +1 home, -1 away

float hash(vec2 p) {
  p = fract(p * vec2(234.34, 435.345) + uSeed);
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    v += amp * noise(p);
    p = p * 2.03 + 17.7;
    amp *= 0.5;
  }
  return v;
}

const float GAIN = 0.425; // momentum -> front displacement; keeps both waters visible

float frontAt(float m, float rippleShift) {
  return 0.5 + GAIN * m + rippleShift;
}

void main() {
  // shoreline wobble: the front laps and fingers over time
  float rip = (fbm(vec2(vUv.y * 3.0, uTime * 0.14)) - 0.5) * 0.10;
  float fingers = (fbm(vec2(vUv.y * 9.0 + 31.7, uTime * 0.31)) - 0.5) * 0.05;
  float front = frontAt(uMomentum, rip + fingers);
  float d = vUv.x - front; // > 0 : away side of the front

  // which water
  float edge = 0.018 + 0.03 * fbm(vec2(vUv.y * 7.0 + 91.3, uTime * 0.2));
  float side = smoothstep(-edge, edge, d);
  vec3 col = mix(uHomeColor, uAwayColor, side);

  // water shimmer, advected toward the attacking direction
  vec2 flow = vec2(uTime * (0.03 + 0.25 * uDrift), uTime * 0.045);
  float shimmer = fbm(vUv * vec2(6.0, 4.0) + flow);
  col *= 0.72 + 0.5 * shimmer;

  // depth grading: bright at the contested front, deeper further away
  float depth = clamp(abs(d) * 1.7, 0.0, 1.0);
  col *= mix(1.18, 0.62, depth);

  // foam along the front
  float foam = exp(-pow(d / (edge * 1.8), 2.0));
  col += vec3(0.9, 0.95, 1.0) * foam * 0.4;

  // wake: faint contours where the front recently was
  for (int i = 0; i < 15; i++) {
    float w = float(i) / 15.0; // 0 oldest .. ~1 newest
    float fw = frontAt(uWake[i], rip * 0.6);
    float trail = exp(-pow((vUv.x - fw) / 0.012, 2.0));
    col += vec3(0.85, 0.92, 1.0) * trail * w * w * 0.10;
  }

  // goal: radial ripple from the scoring end + a wash of the scorer's color
  if (uGoalProgress >= 0.0) {
    vec2 origin = vec2(uGoalSide > 0.0 ? 0.94 : 0.06, 0.5);
    vec2 ar = vec2(1.0, 0.6476); // pitch aspect 68/105
    float r = length((vUv - origin) * ar);
    float ring = exp(-pow((r - uGoalProgress * 1.35) * 16.0, 2.0)) * (1.0 - uGoalProgress);
    vec3 washColor = uGoalSide > 0.0 ? uHomeColor : uAwayColor;
    float wash = pow(1.0 - uGoalProgress, 2.0) * 0.5;
    col = mix(col, washColor * 1.2, wash);
    col += vec3(1.0) * ring * 0.55;
  }

  outColor = vec4(col, 1.0);
}`;
