/**
 * @file gradient.ts
 * @description Fondo de degradado fluido (shader WebGL con three.js): colores suaves de la paleta Grafito
 * que se mezclan lentamente con ruido simplex. Muy oscuro para que el texto del login siga legible.
 */

import { Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, Vector2 } from 'three';
import { createRenderer, startLoop } from './threeRuntime';
import type { BackdropFocus, BackdropHandle, BackdropStart } from './types';

/** -1 empresas (ámbar), 0 neutro, 1 jóvenes (cobalto). */
function focusValue(focus: BackdropFocus): number {
  if (focus === 'young') return 1;
  if (focus === 'company') return -1;
  return 0;
}

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uFocus;
  uniform vec2 uRes;

  // Ruido simplex 3D (Ashima Arts / Stefan Gustavson, licencia MIT).
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0)) +
      i.y + vec4(0.0, i1.y, i2.y, 1.0)) +
      i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }

  // Paleta (sRGB).
  const vec3 CANVAS = vec3(0.047, 0.055, 0.075); // #0c0e13
  const vec3 NAVY   = vec3(0.071, 0.106, 0.231); // #121b3b
  const vec3 COBALT = vec3(0.420, 0.576, 1.000); // #6b93ff
  const vec3 BRAND  = vec3(0.000, 0.639, 1.000); // #00a3ff
  const vec3 AMBER  = vec3(0.941, 0.706, 0.357); // #f0b45b

  void main() {
    float aspect = uRes.x / max(uRes.y, 1.0);
    vec2 p = vec2((vUv.x - 0.5) * aspect, vUv.y - 0.5);
    float t = uTime * 0.045;

    // Coordenadas deformadas por el propio ruido para que el flujo parezca líquido.
    vec2 q = p * 1.1;
    q += 0.35 * vec2(snoise(vec3(p * 0.8, t)), snoise(vec3(p * 0.8 + 7.3, t)));

    float nNavy   = snoise(vec3(q * 0.9 + vec2(0.0, t * 0.6), t * 0.7));
    float nCobalt = snoise(vec3(q * 1.2 + vec2(3.1, -t * 0.4), t * 0.9 + 10.0));
    float nBrand  = snoise(vec3(q * 1.6 + vec2(-5.2, 1.7), t * 1.1 + 20.0));
    float nAmber  = snoise(vec3(q * 1.3 + vec2(8.4, -2.6), t * 0.8 + 30.0));

    // El foco desplaza ligeramente el peso hacia cobalto (jóvenes) o ámbar (empresas).
    float fy = max(uFocus, 0.0);
    float fc = max(-uFocus, 0.0);

    vec3 col = CANVAS;
    col = mix(col, NAVY,   smoothstep(-0.3, 0.8, nNavy) * 0.85);
    col = mix(col, COBALT, smoothstep(0.05, 0.95, nCobalt) * (0.22 + 0.08 * fy - 0.06 * fc));
    col = mix(col, BRAND,  smoothstep(0.35, 1.0, nBrand) * 0.1);
    col = mix(col, AMBER,  smoothstep(0.3, 1.0, nAmber) * (0.07 + 0.07 * fc - 0.03 * fy));

    // Columna central más apagada y viñeta en los bordes: el texto manda.
    float center = 1.0 - smoothstep(0.0, 0.45, abs(vUv.x - 0.5)) * 1.0;
    col = mix(col, CANVAS, center * 0.45);
    float vig = smoothstep(1.25, 0.35, length(p * vec2(0.85, 1.1)));
    col = mix(CANVAS, col, 0.55 + 0.45 * vig);

    // Tramado leve para evitar bandas en degradados tan oscuros.
    float dither = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
    col += dither / 255.0;

    gl_FragColor = vec4(col, 1.0);
  }
`;

export const start: BackdropStart = (canvas, opts): BackdropHandle => {
  const renderer = createRenderer(canvas);
  if (!renderer) return { setFocus: () => {}, dispose: () => {} };

  const { reducedMotion } = opts;
  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const geometry = new PlaneGeometry(2, 2);
  const uniforms = {
    uTime: { value: reducedMotion ? 37 : Math.random() * 100 },
    uFocus: { value: focusValue(opts.focus) },
    uRes: { value: new Vector2(1, 1) },
  };
  const material = new ShaderMaterial({ vertexShader, fragmentShader, uniforms, depthTest: false, depthWrite: false });
  scene.add(new Mesh(geometry, material));

  const t0 = uniforms.uTime.value;
  let targetFocus = uniforms.uFocus.value;

  const loop = startLoop({
    canvas,
    renderer,
    reducedMotion,
    onResize: (w, h) => uniforms.uRes.value.set(w, h),
    onFrame: (t, dt) => {
      uniforms.uTime.value = t0 + t;
      const ease = reducedMotion ? 1 : 1 - Math.exp(-dt * 2.5);
      uniforms.uFocus.value += (targetFocus - uniforms.uFocus.value) * ease;
      renderer.render(scene, camera);
    },
  });

  return {
    setFocus: (focus) => {
      targetFocus = focusValue(focus);
      if (reducedMotion) loop.renderOnce();
    },
    dispose: () => {
      loop.stop();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
};
