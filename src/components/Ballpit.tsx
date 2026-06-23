'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// ─── Football texture (procedural, classic white+black pentagon look) ───────
let _footballTex: THREE.CanvasTexture | null = null;
function getFootballTexture(): THREE.CanvasTexture {
  if (_footballTex) return _footballTex;
  const W = 1024, H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // White base
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // Soft grey panel seams (so even the white area looks paneled)
  ctx.strokeStyle = '#d6d8de';
  ctx.lineWidth = 2;
  const seamCols = 6;
  for (let c = 0; c < seamCols; c++) {
    const x = (c / seamCols) * W;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let r = 1; r < 3; r++) {
    const y = (r / 3) * H;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // Classic black pentagons — larger, fewer, offset rows
  const drawPentagon = (cx: number, cy: number, r: number) => {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      const x = cx + r * Math.cos(a);
      const y = cy + r * Math.sin(a);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = '#0a0a0a';
    ctx.fill();
  };

  const cols = 6, rows = 3;
  const cellW = W / cols, cellH = H / rows;
  const pentR = Math.min(cellW, cellH) * 0.42;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cx = col * cellW + cellW / 2 + (row % 2 ? cellW / 2 : 0);
      const cy = row * cellH + cellH / 2;
      drawPentagon(cx, cy, pentR);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  _footballTex = tex;
  return tex;
}

// ─── Three wrapper (canvas + camera + scene + size/RAF) ─────────────────────
interface ThreeOptions {
  canvas: HTMLCanvasElement;
  size?: 'parent' | { width: number; height: number };
  rendererOptions?: THREE.WebGLRendererParameters;
}

class ThreeCtx {
  canvas: HTMLCanvasElement;
  camera: THREE.PerspectiveCamera;
  cameraFov: number;
  cameraMinAspect?: number;
  cameraMaxAspect?: number;
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  size = { width: 0, height: 0, wWidth: 0, wHeight: 0, ratio: 0, pixelRatio: 0 };
  onBeforeRender: (t: { elapsed: number; delta: number }) => void = () => {};
  onAfterResize: (s: ThreeCtx['size']) => void = () => {};
  isDisposed = false;
  private _opts: ThreeOptions;
  private _timer = new THREE.Timer();
  private _ts = { elapsed: 0, delta: 0 };
  private _running = false;
  private _intersecting = false;
  private _raf = 0;
  private _ro?: ResizeObserver;
  private _io?: IntersectionObserver;
  private _resizeTimer?: ReturnType<typeof setTimeout>;
  private _onResize = () => {
    if (this._resizeTimer) clearTimeout(this._resizeTimer);
    this._resizeTimer = setTimeout(() => this.resize(), 100);
  };
  private _onVis = () => {
    if (this._intersecting) document.hidden ? this._stop() : this._start();
  };
  private _onIntersect = (entries: IntersectionObserverEntry[]) => {
    this._intersecting = entries[0].isIntersecting;
    this._intersecting ? this._start() : this._stop();
  };

  constructor(opts: ThreeOptions) {
    this._opts = opts;
    this.canvas = opts.canvas;
    this.camera = new THREE.PerspectiveCamera();
    this.cameraFov = this.camera.fov;
    this.scene = new THREE.Scene();
    this.canvas.style.display = 'block';
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      powerPreference: 'high-performance',
      antialias: true,
      alpha: true,
      ...(opts.rendererOptions ?? {}),
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.resize();
    this._observe();
  }

  private _observe() {
    if (!(this._opts.size && typeof this._opts.size === 'object')) {
      window.addEventListener('resize', this._onResize);
      if (this._opts.size === 'parent' && this.canvas.parentNode) {
        this._ro = new ResizeObserver(this._onResize);
        this._ro.observe(this.canvas.parentNode as Element);
      }
    }
    this._io = new IntersectionObserver(this._onIntersect, { threshold: 0 });
    this._io.observe(this.canvas);
    document.addEventListener('visibilitychange', this._onVis);
  }

  resize() {
    let w: number, h: number;
    const sz = this._opts.size;
    if (sz && typeof sz === 'object') { w = sz.width; h = sz.height; }
    else if (sz === 'parent' && this.canvas.parentNode) {
      w = (this.canvas.parentNode as HTMLElement).offsetWidth;
      h = (this.canvas.parentNode as HTMLElement).offsetHeight;
    } else { w = window.innerWidth; h = window.innerHeight; }
    this.size.width = w; this.size.height = h; this.size.ratio = w / h;
    this.camera.aspect = w / h;
    if (this.cameraFov) {
      if (this.cameraMinAspect && this.camera.aspect < this.cameraMinAspect) this._fitFov(this.cameraMinAspect);
      else if (this.cameraMaxAspect && this.camera.aspect > this.cameraMaxAspect) this._fitFov(this.cameraMaxAspect);
      else this.camera.fov = this.cameraFov;
    }
    this.camera.updateProjectionMatrix();
    const rad = (this.camera.fov * Math.PI) / 180;
    this.size.wHeight = 2 * Math.tan(rad / 2) * this.camera.position.length();
    this.size.wWidth = this.size.wHeight * this.camera.aspect;
    this.renderer.setSize(w, h);
    const pr = Math.min(window.devicePixelRatio, 2);
    this.renderer.setPixelRatio(pr);
    this.size.pixelRatio = pr;
    this.onAfterResize(this.size);
  }

  private _fitFov(aspect: number) {
    const t = Math.tan(THREE.MathUtils.degToRad(this.cameraFov / 2)) / (this.camera.aspect / aspect);
    this.camera.fov = 2 * THREE.MathUtils.radToDeg(Math.atan(t));
  }

  private _start = () => {
    if (this._running) return;
    this._running = true;
    this._timer.reset();
    const tick = () => {
      this._raf = requestAnimationFrame(tick);
      this._timer.update();
      this._ts.delta = this._timer.getDelta();
      this._ts.elapsed += this._ts.delta;
      this.onBeforeRender(this._ts);
      this.renderer.render(this.scene, this.camera);
    };
    tick();
  };
  private _stop = () => {
    if (!this._running) return;
    cancelAnimationFrame(this._raf);
    this._running = false;
  };

  dispose() {
    if (this.isDisposed) return;
    this.isDisposed = true;
    window.removeEventListener('resize', this._onResize);
    this._ro?.disconnect();
    this._io?.disconnect();
    document.removeEventListener('visibilitychange', this._onVis);
    this._stop();
    this._timer.dispose();
    this.scene.traverse((o: THREE.Object3D) => {
      if ((o as THREE.Mesh).isMesh) {
        const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[];
        if (Array.isArray(m)) m.forEach(mat => mat.dispose());
        else m.dispose();
        (o as THREE.Mesh).geometry.dispose();
      }
    });
    this.scene.clear();
    this.renderer.dispose();
  }
}

// ─── Pointer / touch tracking (shared across instances) ─────────────────────
interface Pointer {
  position: THREE.Vector2;
  nPosition: THREE.Vector2;
  hover: boolean;
  touching: boolean;
  onMove: (p: Pointer) => void;
  onLeave: (p: Pointer) => void;
  dispose: () => void;
}
const _pointers = new Map<HTMLElement, Pointer>();
const _mouse = new THREE.Vector2();
let _listenersInstalled = false;
function _within(rect: DOMRect) {
  return _mouse.x >= rect.left && _mouse.x <= rect.left + rect.width && _mouse.y >= rect.top && _mouse.y <= rect.top + rect.height;
}
function _project(p: Pointer, rect: DOMRect) {
  p.position.x = _mouse.x - rect.left;
  p.position.y = _mouse.y - rect.top;
  p.nPosition.x = (p.position.x / rect.width) * 2 - 1;
  p.nPosition.y = (-p.position.y / rect.height) * 2 + 1;
}
function _onPointerMove(e: PointerEvent) {
  _mouse.x = e.clientX; _mouse.y = e.clientY;
  for (const [el, p] of _pointers) {
    const r = el.getBoundingClientRect();
    if (_within(r)) {
      _project(p, r);
      if (!p.hover) p.hover = true;
      p.onMove(p);
    } else if (p.hover && !p.touching) {
      p.hover = false; p.onLeave(p);
    }
  }
}
function _onPointerLeave() {
  for (const p of _pointers.values()) if (p.hover) { p.hover = false; p.onLeave(p); }
}
function _installListeners() {
  if (_listenersInstalled) return;
  document.addEventListener('pointermove', _onPointerMove);
  document.addEventListener('pointerleave', _onPointerLeave);
  _listenersInstalled = true;
}
function _removeListeners() {
  if (!_listenersInstalled) return;
  document.removeEventListener('pointermove', _onPointerMove);
  document.removeEventListener('pointerleave', _onPointerLeave);
  _listenersInstalled = false;
}
function attachPointer(el: HTMLElement, handlers: { onMove: (p: Pointer) => void; onLeave: (p: Pointer) => void }): Pointer {
  const p: Pointer = {
    position: new THREE.Vector2(),
    nPosition: new THREE.Vector2(),
    hover: false,
    touching: false,
    onMove: handlers.onMove,
    onLeave: handlers.onLeave,
    dispose: () => { _pointers.delete(el); if (_pointers.size === 0) _removeListeners(); },
  };
  _pointers.set(el, p);
  _installListeners();
  return p;
}

// ─── Physics ────────────────────────────────────────────────────────────────
interface PitConfig {
  count: number;
  colors: number[];
  ambientColor: number;
  ambientIntensity: number;
  lightIntensity: number;
  materialParams: {
    metalness: number; roughness: number; clearcoat: number; clearcoatRoughness: number;
  };
  minSize: number; maxSize: number; size0: number;
  gravity: number; friction: number; wallBounce: number; maxVelocity: number;
  maxX: number; maxY: number; maxZ: number;
  controlSphere0: boolean;
  followCursor: boolean;
  football: boolean;
}
const DEFAULTS: PitConfig = {
  count: 200, colors: [0, 0, 0],
  ambientColor: 0xffffff, ambientIntensity: 1, lightIntensity: 200,
  materialParams: { metalness: 0.5, roughness: 0.5, clearcoat: 1, clearcoatRoughness: 0.15 },
  minSize: 0.5, maxSize: 1, size0: 1,
  gravity: 0.5, friction: 0.9975, wallBounce: 0.95, maxVelocity: 0.15,
  maxX: 5, maxY: 5, maxZ: 2,
  controlSphere0: false, followCursor: true, football: false,
};

const _vA = new THREE.Vector3();
const _vB = new THREE.Vector3();
const _vC = new THREE.Vector3();
const _vD = new THREE.Vector3();
const _vE = new THREE.Vector3();
const _vF = new THREE.Vector3();
const _vG = new THREE.Vector3();
const _vH = new THREE.Vector3();
const _vI = new THREE.Vector3();

class Physics {
  config: PitConfig;
  position: Float32Array;
  velocity: Float32Array;
  sizes: Float32Array;
  center = new THREE.Vector3();
  constructor(cfg: PitConfig) {
    this.config = cfg;
    this.position = new Float32Array(3 * cfg.count);
    this.velocity = new Float32Array(3 * cfg.count);
    this.sizes = new Float32Array(cfg.count);
    this.center.toArray(this.position, 0);
    for (let i = 1; i < cfg.count; i++) {
      const s = 3 * i;
      this.position[s] = THREE.MathUtils.randFloatSpread(2 * cfg.maxX);
      this.position[s + 1] = THREE.MathUtils.randFloatSpread(2 * cfg.maxY);
      this.position[s + 2] = THREE.MathUtils.randFloatSpread(2 * cfg.maxZ);
    }
    this.sizes[0] = cfg.size0;
    for (let i = 1; i < cfg.count; i++) {
      this.sizes[i] = THREE.MathUtils.randFloat(cfg.minSize, cfg.maxSize);
    }
  }
  update(delta: number) {
    const cfg = this.config;
    const s = this.position, v = this.velocity, sz = this.sizes;
    let start = 0;
    if (cfg.controlSphere0) {
      start = 1;
      _vA.fromArray(s, 0);
      _vA.lerp(this.center, 0.1).toArray(s, 0);
      _vD.set(0, 0, 0).toArray(v, 0);
    }
    for (let i = start; i < cfg.count; i++) {
      const b = 3 * i;
      _vB.fromArray(s, b); _vE.fromArray(v, b);
      _vE.y -= delta * cfg.gravity * sz[i];
      _vE.multiplyScalar(cfg.friction);
      _vE.clampLength(0, cfg.maxVelocity);
      _vB.add(_vE);
      _vB.toArray(s, b); _vE.toArray(v, b);
    }
    for (let i = start; i < cfg.count; i++) {
      const b = 3 * i;
      _vB.fromArray(s, b); _vE.fromArray(v, b);
      const ri = sz[i];
      for (let j = i + 1; j < cfg.count; j++) {
        const ob = 3 * j;
        _vC.fromArray(s, ob); _vF.fromArray(v, ob);
        const rj = sz[j];
        _vG.copy(_vC).sub(_vB);
        const dist = _vG.length();
        const sumR = ri + rj;
        if (dist < sumR) {
          const overlap = sumR - dist;
          _vH.copy(_vG).normalize().multiplyScalar(0.5 * overlap);
          _vI.copy(_vH).multiplyScalar(Math.max(_vE.length(), 1));
          const Tk = _vH.clone().multiplyScalar(Math.max(_vF.length(), 1));
          _vB.sub(_vH); _vE.sub(_vI);
          _vB.toArray(s, b); _vE.toArray(v, b);
          _vC.add(_vH); _vF.add(Tk);
          _vC.toArray(s, ob); _vF.toArray(v, ob);
        }
      }
      if (cfg.controlSphere0) {
        _vA.fromArray(s, 0);
        _vG.copy(_vA).sub(_vB);
        const dist = _vG.length();
        const sumR0 = ri + sz[0];
        if (dist < sumR0) {
          const diff = sumR0 - dist;
          _vH.copy(_vG.normalize()).multiplyScalar(diff);
          _vI.copy(_vH).multiplyScalar(Math.max(_vE.length(), 2));
          _vB.sub(_vH); _vE.sub(_vI);
        }
      }
      if (Math.abs(_vB.x) + ri > cfg.maxX) { _vB.x = Math.sign(_vB.x) * (cfg.maxX - ri); _vE.x = -_vE.x * cfg.wallBounce; }
      if (cfg.gravity === 0) {
        if (Math.abs(_vB.y) + ri > cfg.maxY) { _vB.y = Math.sign(_vB.y) * (cfg.maxY - ri); _vE.y = -_vE.y * cfg.wallBounce; }
      } else if (_vB.y - ri < -cfg.maxY) {
        _vB.y = -cfg.maxY + ri; _vE.y = -_vE.y * cfg.wallBounce;
      }
      const maxB = Math.max(cfg.maxZ, cfg.maxSize);
      if (Math.abs(_vB.z) + ri > maxB) { _vB.z = Math.sign(_vB.z) * (cfg.maxZ - ri); _vE.z = -_vE.z * cfg.wallBounce; }
      _vB.toArray(s, b); _vE.toArray(v, b);
    }
  }
}

// ─── Subsurface-scattering MeshPhysicalMaterial ─────────────────────────────
class ScatterMaterial extends THREE.MeshPhysicalMaterial {
  uniforms = {
    thicknessDistortion: { value: 0.1 },
    thicknessAmbient: { value: 0 },
    thicknessAttenuation: { value: 0.1 },
    thicknessPower: { value: 2 },
    thicknessScale: { value: 10 },
  };
  constructor(params: THREE.MeshPhysicalMaterialParameters) {
    super(params);
    this.defines = { ...(this.defines ?? {}), USE_UV: '' };
    this.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms);
      shader.fragmentShader =
        'uniform float thicknessPower;\nuniform float thicknessScale;\nuniform float thicknessDistortion;\nuniform float thicknessAmbient;\nuniform float thicknessAttenuation;\n' +
        shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        'void main() {',
        `void RE_Direct_Scattering(const in IncidentLight directLight, const in vec2 uv, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, inout ReflectedLight reflectedLight) {
          vec3 scatteringHalf = normalize(directLight.direction + (geometryNormal * thicknessDistortion));
          float scatteringDot = pow(saturate(dot(geometryViewDir, -scatteringHalf)), thicknessPower) * thicknessScale;
          #ifdef USE_COLOR
            vec3 scatteringIllu = (scatteringDot + thicknessAmbient) * vColor.rgb;
          #else
            vec3 scatteringIllu = (scatteringDot + thicknessAmbient) * diffuse;
          #endif
          reflectedLight.directDiffuse += scatteringIllu * thicknessAttenuation * directLight.color;
        }
        void main() {`,
      );
      const replaced = THREE.ShaderChunk.lights_fragment_begin.replaceAll(
        'RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );',
        'RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );\nRE_Direct_Scattering(directLight, vUv, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, reflectedLight);',
      );
      shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_begin>', replaced);
    };
  }
}

// ─── Spheres (InstancedMesh) ────────────────────────────────────────────────
const _scratch = new THREE.Object3D();

class Spheres extends THREE.InstancedMesh {
  config: PitConfig;
  physics: Physics;
  pointLight!: THREE.PointLight;
  ambientLight!: THREE.AmbientLight;

  constructor(renderer: THREE.WebGLRenderer, opts: Partial<PitConfig>) {
    const cfg: PitConfig = { ...DEFAULTS, ...opts, materialParams: { ...DEFAULTS.materialParams, ...(opts.materialParams ?? {}) } };
    const envScene = new RoomEnvironment();
    const envMap = new THREE.PMREMGenerator(renderer).fromScene(envScene, 0.04).texture;
    const geom = new THREE.SphereGeometry(1, 32, 24);
    const mat = new ScatterMaterial({
      envMap,
      ...cfg.materialParams,
      ...(cfg.football ? { map: getFootballTexture(), roughness: 0.55, metalness: 0.15, clearcoat: 0.4 } : {}),
    });
    (mat as THREE.MeshStandardMaterial).envMapRotation = new THREE.Euler(-Math.PI / 2, 0, 0);
    super(geom, mat, cfg.count);
    this.config = cfg;
    this.physics = new Physics(cfg);
    this.ambientLight = new THREE.AmbientLight(cfg.ambientColor, cfg.ambientIntensity);
    this.add(this.ambientLight);
    this.pointLight = new THREE.PointLight(cfg.colors[0] ?? 0xffffff, cfg.lightIntensity);
    this.add(this.pointLight);
    this.applyColors(cfg.colors);
  }
  applyColors(colors: number[]) {
    if (!Array.isArray(colors) || colors.length < 1) return;
    const arr = colors.map(c => new THREE.Color(c));
    const tmp = new THREE.Color();
    for (let i = 0; i < this.count; i++) {
      const ratio = colors.length > 1 ? Math.min(1, i / Math.max(1, this.count - 1)) * (colors.length - 1) : 0;
      const idx = Math.floor(ratio);
      const a = arr[idx];
      const b = arr[Math.min(idx + 1, arr.length - 1)];
      const t = ratio - idx;
      tmp.r = a.r + t * (b.r - a.r);
      tmp.g = a.g + t * (b.g - a.g);
      tmp.b = a.b + t * (b.b - a.b);
      this.setColorAt(i, tmp);
      if (i === 0) this.pointLight.color.copy(tmp);
    }
    if (this.instanceColor) this.instanceColor.needsUpdate = true;
  }
  step(delta: number) {
    this.physics.update(delta);
    for (let i = 0; i < this.count; i++) {
      _scratch.position.fromArray(this.physics.position, 3 * i);
      if (i === 0 && !this.config.followCursor) _scratch.scale.setScalar(0);
      else _scratch.scale.setScalar(this.physics.sizes[i]);
      _scratch.updateMatrix();
      this.setMatrixAt(i, _scratch.matrix);
      if (i === 0) this.pointLight.position.copy(_scratch.position);
    }
    this.instanceMatrix.needsUpdate = true;
  }
}

// ─── createBallpit ──────────────────────────────────────────────────────────
function createBallpit(canvas: HTMLCanvasElement, opts: Partial<PitConfig>) {
  const ctx = new ThreeCtx({ canvas, size: 'parent' });
  ctx.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  ctx.camera.position.set(0, 0, 20);
  ctx.camera.lookAt(0, 0, 0);
  ctx.cameraMaxAspect = 1.5;
  ctx.resize();

  let spheres = new Spheres(ctx.renderer, opts);
  ctx.scene.add(spheres);

  let pointer: Pointer | null = null;
  if (opts.followCursor !== false) {
    canvas.style.touchAction = 'none';
    canvas.style.userSelect = 'none';
    const raycaster = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const hit = new THREE.Vector3();
    pointer = attachPointer(canvas, {
      onMove() {
        raycaster.setFromCamera(pointer!.nPosition, ctx.camera);
        ctx.camera.getWorldDirection(plane.normal);
        raycaster.ray.intersectPlane(plane, hit);
        spheres.physics.center.copy(hit);
        spheres.config.controlSphere0 = true;
      },
      onLeave() { spheres.config.controlSphere0 = false; },
    });
  }

  ctx.onBeforeRender = ({ delta }) => spheres.step(delta);
  ctx.onAfterResize = (s) => {
    spheres.config.maxX = s.wWidth / 2;
    spheres.config.maxY = s.wHeight / 2;
  };

  return {
    ctx,
    get spheres() { return spheres; },
    dispose() {
      pointer?.dispose();
      ctx.dispose();
    },
  };
}

// ─── React component ────────────────────────────────────────────────────────
interface BallpitProps extends Partial<PitConfig> {
  className?: string;
}

const Ballpit = ({ className = '', ...props }: BallpitProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const instRef = useRef<ReturnType<typeof createBallpit> | null>(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    instRef.current = createBallpit(c, props);
    return () => { instRef.current?.dispose(); instRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas className={className} ref={canvasRef} style={{ width: '100%', height: '100%' }} />;
};

export default Ballpit;
