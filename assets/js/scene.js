/* ==========================================================================
   Latent v2 — WebGL scene (three.js r149, UMD)
   - Liquid neon background (domain-warped flow, rendered at half resolution)
   - One chrome object that morphs: 0 sphere · 1 trefoil knot · 2 torus · 3 twisted ribbon
   - Neon "fill" that rises/drains like liquid (intro + contact section)
   ========================================================================== */
(function () {
  'use strict';

  // Ashima Arts 3D simplex noise (MIT)
  var SNOISE = [
    'vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}',
    'vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}',
    'vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}',
    'vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}',
    'float snoise(vec3 v){',
    '  const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);',
    '  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);',
    '  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);',
    '  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;',
    '  i=mod289(i);',
    '  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));',
    '  float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;',
    '  vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);',
    '  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);',
    '  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);',
    '  vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));',
    '  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;',
    '  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);',
    '  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));',
    '  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;',
    '  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;',
    '  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));',
    '}'
  ].join('\n');

  // ------------------------------------------------------------ background
  var BG_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

  var BG_FRAG = [
    'uniform vec2 uRes;',
    'uniform float uTime;',
    'uniform float uFlow;',
    'uniform float uIntensity;',
    'uniform float uFill;',
    'uniform float uWave;',
    'uniform vec2 uPointer;',
    'uniform float uPointerStr;',
    'uniform float uShift;',
    'uniform vec3 uNeon;',
    'uniform vec3 uDeep;',
    'varying vec2 vUv;',
    'float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }',
    'float vnoise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); vec2 u = f*f*(3.0-2.0*f);',
    '  return mix(mix(hash(i), hash(i+vec2(1.0,0.0)), u.x), mix(hash(i+vec2(0.0,1.0)), hash(i+vec2(1.0,1.0)), u.x), u.y); }',
    'float fbm(vec2 p){ float v = 0.0; float a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6);',
    '  for (int i = 0; i < 5; i++){ v += a * vnoise(p); p = m * p; a *= 0.5; } return v; }',
    'float fbm3(vec2 p){ float v = 0.0; float a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6);',
    '  for (int i = 0; i < 3; i++){ v += a * vnoise(p); p = m * p; a *= 0.5; } return v / 0.875; }',
    'void main(){',
    '  vec2 p = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0);',
    '  vec2 dp = p - uPointer; float pd = length(dp);',
    '  p += dp / max(pd, 0.001) * exp(-pd * 5.0) * 0.07 * uPointerStr;',
    '  float t = uFlow;',
    '  vec2 q = vec2(fbm3(p * 0.9 + vec2(0.0, t * 0.6)), fbm3(p * 0.9 + vec2(5.2, -t * 0.5)));',
    '  vec2 r = vec2(fbm3(p * 1.1 + 2.0 * q + vec2(1.7, 9.2) + t * 0.35), fbm3(p * 1.1 + 2.0 * q + vec2(8.3, 2.8) - t * 0.3));',
    '  float f = fbm(p * 1.6 + 2.2 * r);',
    // flowing neon ribbons made of thin strands, warped by the noise field
    '  float g = (p.y + p.x * 0.3) * 1.35 + (q.x - 0.5) * 1.5 + (r.y - 0.5) * 0.85 + uShift;',
    '  float g1 = mod(g + 1.35, 2.5) - 1.25;',
    '  float g2 = mod(g + 0.1, 2.5) - 1.25;',
    '  float rib = exp(-pow(g1 * 3.1, 2.0)) + exp(-pow(g2 * 4.6, 2.0)) * 0.55;',
    '  float sv = g * 34.0;',
    '  float sd = abs(fract(sv) - 0.5);',
    '  float sw = fwidth(sv) * 1.0 + 0.015;',
    '  float strand = 1.0 - smoothstep(0.0, sw, sd);',
    '  float sglow = exp(-sd * 8.0);',
    '  float body = smoothstep(0.3, 0.72, f);',
    '  float flick = 0.55 + 0.45 * smoothstep(0.35, 0.65, fbm3(vec2(g * 3.0, t * 0.8) + p * 0.6));',
    '  vec3 col = uDeep * pow(f, 2.0) * 0.22 * (0.25 + rib);',
    '  col += uNeon * (strand * 1.0 + sglow * 0.3) * rib * (0.45 + 0.55 * body) * flick;',
    '  col += uNeon * rib * rib * 0.09;',
    '  col += uDeep * rib * 0.55;',
    '  vec2 vv = vUv - 0.5; col *= 1.0 - dot(vv, vv) * 1.1;',
    '  col *= uIntensity;',
    // liquid neon fill with a moving surface
    '  float x = vUv.x;',
    '  float wave = (sin(x * 6.0 + uTime * 1.4) * 0.55 + sin(x * 13.0 - uTime * 2.1) * 0.3 + sin(x * 27.0 + uTime * 2.9) * 0.15) * uWave;',
    '  float surf = uFill + wave;',
    '  float edge = 0.0035;',
    '  float inside = 1.0 - smoothstep(surf - edge, surf + edge, vUv.y);',
    '  vec3 fillCol = uNeon * (0.93 + 0.07 * f);',
    '  float foam = exp(-abs(vUv.y - surf) * 90.0);',
    '  col = mix(col, fillCol, inside);',
    '  col += uNeon * foam * 0.55 * (1.0 - inside) * step(-0.05, uFill);',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  var COPY_FRAG = 'uniform sampler2D tMap; varying vec2 vUv; void main(){ gl_FragColor = texture2D(tMap, vUv); }';

  // ------------------------------------------------------------ morphing object
  var OBJ_VERT = [
    'uniform float uTime;',
    'uniform float uMorph;',
    'uniform float uAmp;',
    'uniform float uFreq;',
    'varying vec3 vN;',
    'varying vec3 vW;',
    SNOISE,
    'const float PI = 3.14159265;',
    'const float TAU = 6.28318531;',
    'vec3 sSphere(vec2 q){ float th = q.x * TAU; float ph = (1.0 - q.y) * PI; return vec3(-cos(th) * sin(ph), cos(ph), sin(th) * sin(ph)) * 1.3; }',
    'vec3 knotC(float t){ float rr = 0.95 + 0.42 * cos(3.0 * t); return vec3(rr * cos(2.0 * t), rr * sin(2.0 * t), 0.42 * sin(3.0 * t)); }',
    'vec3 sKnot(vec2 q){ float t = q.x * TAU; float ph = q.y * TAU; float e = 0.004;',
    '  vec3 c = knotC(t); vec3 a = knotC(t - e); vec3 b = knotC(t + e);',
    '  vec3 T = normalize(b - a); vec3 N = normalize(a + b - 2.0 * c); vec3 B = normalize(cross(T, N)); N = cross(B, T);',
    '  return (c + 0.27 * (cos(ph) * N + sin(ph) * B)) * 1.12; }',
    'vec3 sTorus(vec2 q){ float th = q.x * TAU; float ph = q.y * TAU; float R = 1.08; float r = 0.42;',
    '  return vec3((R + r * cos(ph)) * cos(th), (R + r * cos(ph)) * sin(th), r * sin(ph)); }',
    'vec3 sRibbon(vec2 q){ float th = q.x * TAU; float ph = q.y * TAU; float R = 1.12; float tw = th * 2.0;',
    '  vec2 cs = vec2(cos(ph) * 0.52, sin(ph) * 0.085); float c = cos(tw); float s = sin(tw);',
    '  vec2 rc = vec2(cs.x * c - cs.y * s, cs.x * s + cs.y * c);',
    '  return vec3((R + rc.x) * cos(th), (R + rc.x) * sin(th), rc.y); }',
    'vec3 shapeAt(float i, vec2 q){',
    '  if (i < 0.5) return sSphere(q);',
    '  if (i < 1.5) return sKnot(q);',
    '  if (i < 2.5) return sTorus(q);',
    '  return sRibbon(q);',
    '}',
    'vec3 surf(vec2 q){',
    '  float s = clamp(uMorph, 0.0, 3.0);',
    '  float fi = min(floor(s), 2.0);',
    '  float f = s - fi;',
    '  float ft = f * f * (3.0 - 2.0 * f);',
    '  vec3 p = mix(shapeAt(fi, q), shapeAt(fi + 1.0, q), ft);',
    '  float amp = uAmp + sin(ft * PI) * 0.42;',
    '  vec3 np = p * uFreq + vec3(uTime * 0.21, uTime * 0.17, -uTime * 0.13);',
    '  p += amp * 0.5 * vec3(snoise(np), snoise(np + vec3(31.4, 0.0, 7.1)), snoise(np + vec3(0.0, 71.2, 3.3)));',
    '  return p;',
    '}',
    'void main(){',
    '  vec2 q = uv;',
    '  vec2 qd = vec2(q.x, clamp(q.y, 0.003, 0.997));',
    '  float e = 0.0025;',
    '  vec3 pa = surf(qd);',
    '  vec3 pu = surf(qd + vec2(e, 0.0));',
    '  vec3 pv = surf(qd + vec2(0.0, e));',
    '  vec3 n = normalize(cross(pu - pa, pv - pa) + vec3(0.0, 1e-6, 0.0));',
    '  vec3 p = pa;',
    '  if (q.y < 0.003 || q.y > 0.997) p = surf(q);',
    '  vec4 w = modelMatrix * vec4(p, 1.0);',
    '  vW = w.xyz;',
    '  vN = normalize(mat3(modelMatrix) * n);',
    '  gl_Position = projectionMatrix * viewMatrix * w;',
    '}'
  ].join('\n');

  var OBJ_FRAG = [
    'uniform float uTime;',
    'uniform float uVisible;',
    'uniform float uOnNeon;',
    'uniform vec3 uNeon;',
    'uniform vec3 uMint;',
    'varying vec3 vN;',
    'varying vec3 vW;',
    SNOISE,
    'const float TAU = 6.28318531;',
    'float band(float x, float w){ float d = abs(fract(x) - 0.5); return 1.0 - smoothstep(0.0, w, d); }',
    'vec3 env(vec3 R){',
    '  float n = snoise(R * 1.3 + vec3(0.0, uTime * 0.10, uTime * 0.05));',
    '  float b1 = band(R.y * 2.6 + n * 0.45 + uTime * 0.04, 0.05);',
    '  float b2 = band(R.y * 5.3 - n * 0.3 - uTime * 0.07 + 0.25, 0.025) * 0.6;',
    '  float az = atan(R.z, R.x) / TAU;',
    '  float b3 = band(az * 5.0 + n * 0.25 + uTime * 0.02, 0.02) * smoothstep(-0.1, 0.5, R.y) * 0.7;',
    '  float top = smoothstep(0.45, 1.0, R.y);',
    '  float hor = exp(-abs(R.y + 0.05) * 7.0) * 0.35;',
    '  return uNeon * (b1 + b2 + b3 + hor) + uMint * top * 0.9;',
    '}',
    'void main(){',
    '  vec3 N = normalize(vN);',
    '  vec3 V = normalize(cameraPosition - vW);',
    '  float nv = dot(N, V);',
    '  if (nv < 0.0) { N = -N; nv = -nv; }',
    '  vec3 R = reflect(-V, N);',
    '  float fres = pow(1.0 - clamp(nv, 0.0, 1.0), 3.0);',
    '  vec3 col = vec3(0.004, 0.012, 0.006);',
    '  col += env(R) * mix(0.42, 1.0, fres) * (1.0 - 0.72 * uOnNeon);',
    '  col += uNeon * fres * mix(0.25, 0.5, uOnNeon);',
    '  vec3 L = normalize(vec3(-0.5, 0.75, 0.55));',
    '  col += uMint * pow(max(dot(R, L), 0.0), 90.0) * 1.4;',
    '  col = col / (1.0 + col * 0.25);',
    '  col *= uVisible;',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  // ------------------------------------------------------------ halo + dust
  var HALO_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
  var HALO_FRAG = [
    'uniform vec3 uNeon; uniform float uStrength; varying vec2 vUv;',
    'void main(){ float r = length(vUv - 0.5) * 2.0; float a = exp(-r * r * 5.0) * 0.42 + exp(-r * r * 22.0) * 0.25;',
    '  a *= smoothstep(1.0, 0.7, r) * uStrength; gl_FragColor = vec4(uNeon * a, a); }'
  ].join('\n');

  var DUST_VERT = [
    'attribute float aR;',
    'uniform float uTime; uniform float uPR;',
    'varying float vA;',
    'void main(){',
    '  vec3 p = position;',
    '  p.y = mod(p.y + uTime * 0.08 * (0.3 + aR) + 4.0, 8.0) - 4.0;',
    '  p.x += sin(uTime * 0.3 + aR * 20.0) * 0.18;',
    '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
    '  gl_Position = projectionMatrix * mv;',
    '  gl_PointSize = (1.4 + aR * 2.6) * uPR * (8.0 / -mv.z);',
    '  vA = 0.25 + 0.55 * aR;',
    '}'
  ].join('\n');
  var DUST_FRAG = [
    'uniform vec3 uNeon; uniform float uStrength; varying float vA;',
    'void main(){ float r = length(gl_PointCoord - 0.5); if (r > 0.5) discard; float a = smoothstep(0.5, 0.0, r) * vA * uStrength; gl_FragColor = vec4(uNeon * a, a); }'
  ].join('\n');

  function damp(c, t, l, dt) { return c + (t - c) * (1 - Math.exp(-l * dt)); }

  function create(canvas, opts) {
    opts = opts || {};
    if (!window.THREE) return null;
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    } catch (e) { return null; }
    if (!renderer || !renderer.getContext()) return null;

    var reduced = !!opts.reduced;
    var small = window.innerWidth < 760;
    var NEON = new THREE.Color('#39FF14');
    var MINT = new THREE.Color('#D8FFD2');
    var DEEP = new THREE.Color('#0B4A16');
    renderer.setClearColor(0x000000, 1);

    var camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);
    camera.position.set(0, 0, 8);
    var scene = new THREE.Scene();

    // background pass
    var bgScene = new THREE.Scene();
    var bgCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    var bgUniforms = {
      uRes: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 }, uFlow: { value: 0 }, uIntensity: { value: 1 },
      uFill: { value: -0.2 }, uWave: { value: 0.02 },
      uPointer: { value: new THREE.Vector2(9, 9) }, uPointerStr: { value: 0 }, uShift: { value: 0 },
      uNeon: { value: NEON }, uDeep: { value: DEEP }
    };
    var bgMat = new THREE.ShaderMaterial({ vertexShader: BG_VERT, fragmentShader: BG_FRAG, uniforms: bgUniforms, depthTest: false, depthWrite: false });
    bgMat.extensions = { derivatives: true };
    bgScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat));
    var rt = new THREE.WebGLRenderTarget(4, 4, { depthBuffer: false, stencilBuffer: false });
    var copy = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
      vertexShader: BG_VERT, fragmentShader: COPY_FRAG, uniforms: { tMap: { value: rt.texture } }, depthTest: false, depthWrite: false
    }));
    copy.frustumCulled = false;
    copy.renderOrder = -10;
    scene.add(copy);

    // halo
    var haloMat = new THREE.ShaderMaterial({
      vertexShader: HALO_VERT, fragmentShader: HALO_FRAG,
      uniforms: { uNeon: { value: NEON }, uStrength: { value: 0 } },
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending
    });
    var halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), haloMat);
    halo.renderOrder = -5;
    scene.add(halo);

    // morphing object
    var objUniforms = {
      uTime: { value: 0 }, uMorph: { value: 0 }, uAmp: { value: 0.3 }, uFreq: { value: 0.85 },
      uVisible: { value: 1 }, uOnNeon: { value: 0 },
      uNeon: { value: NEON }, uMint: { value: MINT }
    };
    var objMat = new THREE.ShaderMaterial({ vertexShader: OBJ_VERT, fragmentShader: OBJ_FRAG, uniforms: objUniforms, side: THREE.DoubleSide });
    var seg = small ? [180, 90] : [300, 150];
    var obj = new THREE.Mesh(new THREE.SphereGeometry(1, seg[0], seg[1]), objMat);
    obj.frustumCulled = false;
    var pivot = new THREE.Group();
    pivot.add(obj);
    scene.add(pivot);

    // dust
    var DN = small ? 260 : 520;
    var dpos = new Float32Array(DN * 3), dr = new Float32Array(DN);
    for (var i = 0; i < DN; i++) {
      dpos[i * 3] = (Math.random() - 0.5) * 14;
      dpos[i * 3 + 1] = (Math.random() - 0.5) * 8;
      dpos[i * 3 + 2] = -Math.random() * 5 + 1.5;
      dr[i] = Math.random();
    }
    var dgeo = new THREE.BufferGeometry();
    dgeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
    dgeo.setAttribute('aR', new THREE.BufferAttribute(dr, 1));
    var dustMat = new THREE.ShaderMaterial({
      vertexShader: DUST_VERT, fragmentShader: DUST_FRAG,
      uniforms: { uTime: { value: 0 }, uPR: { value: 1 }, uNeon: { value: NEON }, uStrength: { value: 1 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    var dust = new THREE.Points(dgeo, dustMat);
    dust.frustumCulled = false;
    dust.renderOrder = 2;
    scene.add(dust);

    // ---- state
    var cur = { shape: 0, amp: 0.3, x: 0, y: 0, scale: 1, visible: 1, bg: 1, tilt: 0, spin: 1 };
    var target = Object.assign({}, cur);
    var introFill = -0.2, ctaFill = -0.2, introScale = 1;
    var vel = 0, velS = 0, shiftT = 0, shiftC = 0;
    var spin = 0;
    var pointer = { x: 0, y: 0, sx: 0, sy: 0, str: 0, last: 0, on: false };
    var visW = 1, visH = 1, W = 1, H = 1;
    var onFrame = null;
    var running = true;
    var last = performance.now();

    function resize() {
      W = canvas.clientWidth || window.innerWidth;
      H = canvas.clientHeight || window.innerHeight;
      var pr = Math.min(window.devicePixelRatio || 1, W < 760 ? 1.5 : 1.75);
      renderer.setPixelRatio(pr);
      renderer.setSize(W, H, false);
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      visH = 2 * camera.position.z * Math.tan((camera.fov * Math.PI) / 360);
      visW = visH * camera.aspect;
      var bw = Math.max(2, Math.round(W * pr * 0.5)), bh = Math.max(2, Math.round(H * pr * 0.5));
      rt.setSize(bw, bh);
      bgUniforms.uRes.value.set(bw, bh);
      dustMat.uniforms.uPR.value = pr;
    }
    resize();
    window.addEventListener('resize', resize);

    function onPointer(e) {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
      pointer.on = true;
      pointer.last = performance.now();
      bgUniforms.uPointer.value.set((e.clientX / window.innerWidth - 0.5) * (W / H), 0.5 - e.clientY / window.innerHeight);
    }
    if (!reduced) window.addEventListener('pointermove', onPointer, { passive: true });

    function tick(now) {
      if (!running) return;
      var dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      var tScale = reduced ? 0.3 : 1;
      if (onFrame) onFrame(dt);

      cur.shape = damp(cur.shape, target.shape, 1.9, dt);
      cur.amp = damp(cur.amp, target.amp, 2.2, dt);
      cur.x = damp(cur.x, target.x, 2.6, dt);
      cur.y = damp(cur.y, target.y, 2.6, dt);
      cur.scale = damp(cur.scale, target.scale, 2.6, dt);
      cur.visible = damp(cur.visible, target.visible, 3, dt);
      cur.bg = damp(cur.bg, target.bg, 2.4, dt);
      cur.tilt = damp(cur.tilt, target.tilt, 2.2, dt);
      cur.spin = damp(cur.spin, target.spin, 2, dt);
      velS = damp(velS, vel, 4, dt);
      var speed = Math.min(Math.abs(velS) / 1400, 3);

      var idle = now - pointer.last > 900;
      pointer.str = damp(pointer.str, pointer.on && !idle ? 1 : 0, idle ? 1.3 : 5, dt);
      pointer.sx = damp(pointer.sx, pointer.x, 2.4, dt);
      pointer.sy = damp(pointer.sy, pointer.y, 2.4, dt);

      var time = bgUniforms.uTime.value + dt * tScale;
      bgUniforms.uTime.value = time;
      bgUniforms.uFlow.value += dt * tScale * (0.11 + speed * 0.35);
      bgUniforms.uIntensity.value = cur.bg;
      var fill = Math.max(introFill, ctaFill);
      bgUniforms.uFill.value = fill;
      bgUniforms.uWave.value = 0.014 + speed * 0.018;
      bgUniforms.uPointerStr.value = pointer.str;
      shiftC = damp(shiftC, shiftT, 3, dt);
      bgUniforms.uShift.value = shiftC;

      objUniforms.uTime.value = time;
      objUniforms.uMorph.value = cur.shape;
      objUniforms.uAmp.value = cur.amp + speed * 0.12;
      objUniforms.uVisible.value = 1.0;
      var presence = Math.max(0, Math.min(1, cur.visible));
      var objScreenY = 0.5 + cur.y;
      var onNeon = Math.min(1, Math.max(0, (fill - objScreenY + 0.12) / 0.24));
      objUniforms.uOnNeon.value = onNeon;

      spin += dt * tScale * 0.22 * cur.spin;
      pivot.position.set(cur.x * visW, cur.y * visH, 0);
      pivot.scale.setScalar(Math.max(0.0001, cur.scale * introScale * presence));
      obj.visible = presence > 0.01;
      pivot.rotation.set(cur.tilt - pointer.sy * 0.22, pointer.sx * 0.35, 0);
      // spin in the picture plane so knots and rings stay readable, with a slow wobble for depth
      obj.rotation.set(Math.sin(spin * 0.6) * 0.38, Math.sin(spin * 0.45 + 1.0) * 0.5, spin * 0.8);

      halo.position.set(pivot.position.x, pivot.position.y, -2.2);
      halo.scale.setScalar(7.5 * cur.scale * introScale * (0.4 + 0.6 * presence));
      haloMat.uniforms.uStrength.value = presence * (1 - onNeon) * 0.9;
      dustMat.uniforms.uTime.value = time;
      dustMat.uniforms.uStrength.value = (1 - Math.min(1, Math.max(0, fill))) * (0.4 + 0.6 * cur.bg);

      renderer.setRenderTarget(rt);
      renderer.render(bgScene, bgCam);
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) running = false;
      else if (!running) { running = true; last = performance.now(); requestAnimationFrame(tick); }
    });

    return {
      current: cur,
      setTarget: function (s) { Object.assign(target, s); },
      jump: function (s) { Object.assign(target, s); Object.assign(cur, s); },
      setIntroFill: function (v) { introFill = v; },
      setCtaFill: function (v) { ctaFill = v; },
      setIntroScale: function (v) { introScale = v; },
      setVelocity: function (v) { vel = v; },
      setShift: function (v) { shiftT = v; },
      onFrame: function (fn) { onFrame = fn; }
    };
  }

  window.LatentScene = { create: create };
})();
