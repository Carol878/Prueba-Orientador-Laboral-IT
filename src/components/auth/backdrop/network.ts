/**
 * @file network.ts
 * @description Fondo "Red de talento" (three.js): dos nubes de puntos —jóvenes a la izquierda, empresas
 * a la derecha— unidas por enlaces que aparecen y se desvanecen, y un enjambre de partículas que forma
 * el logotipo de Fad Juventud. Se carga bajo demanda con `import()` para no engordar el bundle principal.
 */

import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  LineBasicMaterial,
  LineSegments,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
} from 'three';
import logoUrl from '../../../assets/brand/fad-juventud-light.png';
import { createDiscTexture, createRenderer, startLoop } from './threeRuntime';
import type { BackdropFocus, BackdropHandle, BackdropStart } from './types';

const POINTS_PER_CLOUD = 200;
const LINKS = 120;
const CAMERA_Z = 10;
const FOV = 50;
/** Opacidad base de cada nube cuando ninguna está enfocada. */
const CLOUD_OPACITY = 0.5;
/** Opacidad del logotipo de partículas: presente pero sin competir con el texto. */
const LOGO_OPACITY = 0.4;
/** Duración total (s) de la formación del logotipo. */
const FORM_DURATION = 2.5;
const FORM_MAX_DELAY = 0.7;
/** Número aproximado de partículas del logotipo. */
const LOGO_TARGET_COUNT = 1500;

const COLOR_YOUNG = new Color('#6b93ff');
const COLOR_COMPANY = new Color('#f0b45b');
const COLOR_LOGO = new Color('#cfd3dc');
const COLOR_BRAND = new Color('#00a3ff');

/** Pesos de cada nube según el foco: [jóvenes, empresas]. */
function focusWeights(focus: BackdropFocus): [number, number] {
  if (focus === 'young') return [1.5, 0.35];
  if (focus === 'company') return [0.35, 1.5];
  return [1, 1];
}

/** Aleatorio con distribución aproximadamente normal (Box-Muller). */
function gauss(): number {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

interface Cloud {
  /** Posiciones locales (sin desplazar) de cada punto. */
  base: Float32Array;
  /** Desfase individual para la deriva suave. */
  phase: Float32Array;
  /** Posiciones en mundo del fotograma actual. */
  world: Float32Array;
  geometry: BufferGeometry;
  material: PointsMaterial;
  color: Color;
  /** Centro horizontal de la nube (se recalcula al redimensionar). */
  centerX: number;
}

interface Link {
  ca: number;
  ia: number;
  cb: number;
  ib: number;
  phase: number;
  speed: number;
  /** Atenuación extra para enlaces entre nubes (cruzan la columna central). */
  gain: number;
}

interface Logo {
  count: number;
  /** Destino en coordenadas unitarias (ancho 1, centrado). */
  target: Float32Array;
  start: Float32Array;
  delay: Float32Array;
  startColor: Float32Array;
  targetColor: Float32Array;
  geometry: BufferGeometry;
  material: PointsMaterial;
  /** Instante (s) en que empezó la formación; `null` si ya está formado de inicio. */
  t0: number | null;
  formed: boolean;
}

/** Muestrea los píxeles opacos del logotipo y devuelve destinos unitarios y colores. */
function sampleLogo(img: HTMLImageElement): { pos: number[]; col: number[] } {
  const w = 160;
  const h = Math.round((w * img.naturalHeight) / img.naturalWidth) || 114;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { pos: [], col: [] };
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;

  let opaque = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] > 140) opaque++;
  const step = Math.max(1, Math.round(Math.sqrt(opaque / LOGO_TARGET_COUNT)));

  const pos: number[] = [];
  const col: number[] = [];
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const k = (y * w + x) * 4;
      if (data[k + 3] <= 140) continue;
      const jx = (Math.random() - 0.5) * step * 0.5;
      const jy = (Math.random() - 0.5) * step * 0.5;
      pos.push((x + jx) / w - 0.5, -((y + jy) / w - h / w / 2), (Math.random() - 0.5) * 0.04);
      const blue = data[k + 2] > 180 && data[k] < 120;
      const color = blue ? COLOR_BRAND : COLOR_LOGO;
      col.push(color.r, color.g, color.b);
    }
  }
  return { pos, col };
}

export const start: BackdropStart = (canvas, opts): BackdropHandle => {
  const renderer = createRenderer(canvas);
  if (!renderer) return { setFocus: () => {}, dispose: () => {} };

  const { reducedMotion } = opts;
  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.1, 100);
  camera.position.z = CAMERA_Z;

  const disc = new CanvasTexture(createDiscTexture());
  let halfW = 8;
  let halfH = 4.66;
  let spread = 1;
  let time = 0;
  let disposed = false;

  // ── Nubes de jóvenes y empresas ──
  const makeCloud = (color: Color): Cloud => {
    const base = new Float32Array(POINTS_PER_CLOUD * 3);
    const phase = new Float32Array(POINTS_PER_CLOUD);
    for (let i = 0; i < POINTS_PER_CLOUD; i++) {
      base[i * 3] = gauss() * 0.9;
      base[i * 3 + 1] = gauss() * 1.5;
      base[i * 3 + 2] = gauss() * 1.2;
      phase[i] = Math.random() * Math.PI * 2;
    }
    const world = new Float32Array(POINTS_PER_CLOUD * 3);
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(world, 3));
    const material = new PointsMaterial({
      color,
      size: 0.12,
      map: disc,
      transparent: true,
      opacity: CLOUD_OPACITY,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    scene.add(new Points(geometry, material));
    return { base, phase, world, geometry, material, color, centerX: 0 };
  };
  const clouds: [Cloud, Cloud] = [makeCloud(COLOR_YOUNG), makeCloud(COLOR_COMPANY)];

  // ── Enlaces ──
  const linkPos = new Float32Array(LINKS * 6);
  const linkCol = new Float32Array(LINKS * 6);
  const linkGeometry = new BufferGeometry();
  linkGeometry.setAttribute('position', new BufferAttribute(linkPos, 3));
  linkGeometry.setAttribute('color', new BufferAttribute(linkCol, 3));
  const linkMaterial = new LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  scene.add(new LineSegments(linkGeometry, linkMaterial));

  /** Elige un par de puntos: casi siempre vecinos de la misma nube, a veces entre nubes. */
  const assignLink = (link: Link) => {
    const cross = Math.random() < 0.08;
    link.ca = Math.random() < 0.5 ? 0 : 1;
    link.ia = Math.floor(Math.random() * POINTS_PER_CLOUD);
    link.cb = cross ? 1 - link.ca : link.ca;
    if (cross) {
      link.ib = Math.floor(Math.random() * POINTS_PER_CLOUD);
    } else {
      // El más cercano entre unos cuantos candidatos: enlaces cortos y orgánicos.
      const b = clouds[link.ca].base;
      let best = 0;
      let bestD = Infinity;
      for (let k = 0; k < 20; k++) {
        const j = Math.floor(Math.random() * POINTS_PER_CLOUD);
        if (j === link.ia) continue;
        const dx = b[j * 3] - b[link.ia * 3];
        const dy = b[j * 3 + 1] - b[link.ia * 3 + 1];
        const dz = b[j * 3 + 2] - b[link.ia * 3 + 2];
        const d = dx * dx + dy * dy + dz * dz;
        if (d < bestD) {
          bestD = d;
          best = j;
        }
      }
      link.ib = best;
    }
    link.speed = 1 / (3 + Math.random() * 4);
    link.gain = cross ? 0.3 : 1;
  };
  const links: Link[] = Array.from({ length: LINKS }, () => {
    const link: Link = { ca: 0, ia: 0, cb: 0, ib: 0, phase: Math.random(), speed: 0.2, gain: 1 };
    assignLink(link);
    return link;
  });

  // ── Logotipo ──
  let logo: Logo | null = null;
  const logoMaterial = new PointsMaterial({
    size: 0.065,
    map: disc,
    vertexColors: true,
    transparent: true,
    opacity: LOGO_OPACITY,
    depthWrite: false,
  });
  /** Escala (ancho en mundo) y centro del logotipo; se recalculan al redimensionar. */
  let logoScale = 3.2;
  let logoX = 0;
  let logoY = 2.4;

  const img = new Image();
  img.decoding = 'async';
  img.onload = () => {
    if (disposed) return;
    updateClouds(time);
    const { pos, col } = sampleLogo(img);
    const count = pos.length / 3;
    if (!count) return;
    const target = new Float32Array(pos);
    const targetColor = new Float32Array(col);
    const start = new Float32Array(count * 3);
    const startColor = new Float32Array(count * 3);
    const delay = new Float32Array(count);
    // Cada partícula nace en un punto de una de las dos nubes: el talento forma la marca.
    for (let i = 0; i < count; i++) {
      const cloud = clouds[i % 2];
      const j = Math.floor(Math.random() * POINTS_PER_CLOUD);
      start[i * 3] = cloud.world[j * 3] + gauss() * 0.3;
      start[i * 3 + 1] = cloud.world[j * 3 + 1] + gauss() * 0.3;
      start[i * 3 + 2] = cloud.world[j * 3 + 2];
      startColor[i * 3] = cloud.color.r;
      startColor[i * 3 + 1] = cloud.color.g;
      startColor[i * 3 + 2] = cloud.color.b;
      delay[i] = Math.random() * FORM_MAX_DELAY;
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3));
    geometry.setAttribute('color', new BufferAttribute(new Float32Array(reducedMotion ? targetColor : startColor), 3));
    scene.add(new Points(geometry, logoMaterial));
    logo = {
      count,
      target,
      start,
      delay,
      startColor,
      targetColor,
      geometry,
      material: logoMaterial,
      t0: reducedMotion ? null : time,
      formed: reducedMotion,
    };
    if (reducedMotion) loop.renderOnce();
  };
  img.src = logoUrl;

  // ── Foco y parallax ──
  const weights: [number, number] = focusWeights(opts.focus);
  let targetWeights = focusWeights(opts.focus);
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointer = (e: PointerEvent) => {
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
  };
  if (!reducedMotion) window.addEventListener('pointermove', onPointer, { passive: true });

  // ── Actualización por fotograma ──
  const updateClouds = (t: number) => {
    for (let c = 0; c < 2; c++) {
      const cloud = clouds[c];
      const { base, phase, world } = cloud;
      for (let i = 0; i < POINTS_PER_CLOUD; i++) {
        const p = phase[i];
        world[i * 3] = cloud.centerX + base[i * 3] * spread + Math.sin(t * 0.25 + p) * 0.12;
        world[i * 3 + 1] = base[i * 3 + 1] * spread + Math.cos(t * 0.2 + p * 1.3) * 0.12;
        world[i * 3 + 2] = base[i * 3 + 2] + Math.sin(t * 0.15 + p * 0.7) * 0.1;
      }
      cloud.geometry.attributes.position.needsUpdate = true;
      cloud.material.opacity = Math.min(0.85, CLOUD_OPACITY * weights[c]);
    }
  };

  const updateLinks = (dt: number) => {
    for (let l = 0; l < LINKS; l++) {
      const link = links[l];
      link.phase += dt * link.speed;
      if (link.phase >= 1) {
        link.phase -= 1;
        assignLink(link);
      }
      const alpha = Math.sin(link.phase * Math.PI) * link.gain;
      const a = clouds[link.ca];
      const b = clouds[link.cb];
      const o = l * 6;
      linkPos[o] = a.world[link.ia * 3];
      linkPos[o + 1] = a.world[link.ia * 3 + 1];
      linkPos[o + 2] = a.world[link.ia * 3 + 2];
      linkPos[o + 3] = b.world[link.ib * 3];
      linkPos[o + 4] = b.world[link.ib * 3 + 1];
      linkPos[o + 5] = b.world[link.ib * 3 + 2];
      const ka = alpha * weights[link.ca];
      const kb = alpha * weights[link.cb];
      linkCol[o] = a.color.r * ka;
      linkCol[o + 1] = a.color.g * ka;
      linkCol[o + 2] = a.color.b * ka;
      linkCol[o + 3] = b.color.r * kb;
      linkCol[o + 4] = b.color.g * kb;
      linkCol[o + 5] = b.color.b * kb;
    }
    linkGeometry.attributes.position.needsUpdate = true;
    linkGeometry.attributes.color.needsUpdate = true;
  };

  const updateLogo = (t: number) => {
    if (!logo) return;
    const pos = logo.geometry.attributes.position.array as Float32Array;
    const colAttr = logo.geometry.attributes.color;
    const col = colAttr.array as Float32Array;
    const elapsed = logo.t0 === null ? Infinity : t - logo.t0;
    const forming = !logo.formed;
    const breathe = reducedMotion ? 1 : 1 + Math.sin(t * 0.5) * 0.006;
    const noise = reducedMotion ? 0 : 0.012;
    for (let i = 0; i < logo.count; i++) {
      const k = i * 3;
      const tx = logoX + logo.target[k] * logoScale * breathe + Math.sin(t * 0.7 + i * 0.37) * noise;
      const ty = logoY + logo.target[k + 1] * logoScale * breathe + Math.cos(t * 0.6 + i * 0.21) * noise;
      const tz = logo.target[k + 2];
      if (forming) {
        const p = easeInOutCubic(
          Math.min(1, Math.max(0, (elapsed - logo.delay[i]) / (FORM_DURATION - FORM_MAX_DELAY))),
        );
        pos[k] = logo.start[k] + (tx - logo.start[k]) * p;
        pos[k + 1] = logo.start[k + 1] + (ty - logo.start[k + 1]) * p;
        pos[k + 2] = logo.start[k + 2] + (tz - logo.start[k + 2]) * p;
        col[k] = logo.startColor[k] + (logo.targetColor[k] - logo.startColor[k]) * p;
        col[k + 1] = logo.startColor[k + 1] + (logo.targetColor[k + 1] - logo.startColor[k + 1]) * p;
        col[k + 2] = logo.startColor[k + 2] + (logo.targetColor[k + 2] - logo.startColor[k + 2]) * p;
      } else {
        pos[k] = tx;
        pos[k + 1] = ty;
        pos[k + 2] = tz;
      }
    }
    logo.geometry.attributes.position.needsUpdate = true;
    if (forming) {
      colAttr.needsUpdate = true;
      if (elapsed >= FORM_DURATION) {
        col.set(logo.targetColor);
        logo.formed = true;
      }
    }
  };

  const loop = startLoop({
    canvas,
    renderer,
    reducedMotion,
    onResize: (w, h) => {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      halfH = Math.tan(((FOV / 2) * Math.PI) / 180) * CAMERA_Z;
      halfW = halfH * camera.aspect;
      spread = Math.min(1, halfW / 6);
      clouds[0].centerX = -halfW * 0.66;
      clouds[1].centerX = halfW * 0.66;
      // Logotipo en la franja superior, moderado y sin invadir los laterales.
      // En pantallas anchas el logotipo ocupa el hueco a la derecha del titular;
      // en estrechas se oculta, porque chocaría con el logotipo real de la cabecera.
      const wide = camera.aspect > 1.3;
      logoMaterial.visible = wide;
      logoScale = wide ? Math.min(halfW * 0.34, 2.6) : Math.min(halfW * 0.5, 1.6);
      logoX = wide ? halfW * 0.5 : 0;
      logoY = wide ? halfH * 0.42 : halfH * 0.78;
    },
    onFrame: (t, dt) => {
      time = t;
      const ease = reducedMotion ? 1 : 1 - Math.exp(-dt * 3);
      weights[0] += (targetWeights[0] - weights[0]) * ease;
      weights[1] += (targetWeights[1] - weights[1]) * ease;
      pointer.x += (pointer.tx - pointer.x) * (1 - Math.exp(-dt * 2));
      pointer.y += (pointer.ty - pointer.y) * (1 - Math.exp(-dt * 2));
      camera.position.set(pointer.x * 0.45, -pointer.y * 0.3, CAMERA_Z);
      camera.lookAt(0, 0, 0);
      updateClouds(t);
      updateLinks(dt);
      updateLogo(t);
      renderer.render(scene, camera);
    },
  });

  return {
    setFocus: (focus) => {
      targetWeights = focusWeights(focus);
      if (reducedMotion) loop.renderOnce();
    },
    dispose: () => {
      disposed = true;
      loop.stop();
      img.onload = null;
      window.removeEventListener('pointermove', onPointer);
      clouds.forEach((c) => {
        c.geometry.dispose();
        c.material.dispose();
      });
      linkGeometry.dispose();
      linkMaterial.dispose();
      logo?.geometry.dispose();
      logoMaterial.dispose();
      disc.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
};
