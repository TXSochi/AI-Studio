/* ==========================================================================
   Latent — particle scene (three.js)
   One point cloud that "denoises" into four forms:
   0 ampersand (human & machine) · 1 latent field · 2 sphere · 3 halo
   ========================================================================== */
(function () {
  'use strict';

  // Ashima Arts 3D simplex noise (MIT)
  var NOISE = [
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

  var VERT = [
    'attribute vec3 aAmp;',
    'attribute vec3 aField;',
    'attribute vec3 aSphere;',
    'attribute vec3 aRing;',
    'attribute vec3 aJit;',
    'attribute vec4 aRand;',
    'uniform float uTime;',
    'uniform float uShape;',
    'uniform float uNoise;',
    'uniform float uSize;',
    'uniform float uPixelRatio;',
    'uniform float uPointerStrength;',
    'uniform vec3 uPointer;',
    'varying float vAccent;',
    'varying float vAlpha;',
    NOISE,
    'vec3 fieldPos(vec3 p){',
    '  float w = 0.30*sin(p.x*1.05 + uTime*0.50) + 0.17*sin(p.z*2.3 - uTime*0.38) + 0.07*sin((p.x+p.z)*3.6 + uTime*0.85);',
    '  vec3 q = vec3(p.x, w, p.z);',
    '  float a = 0.62; float c = cos(a); float s = sin(a);',
    '  return vec3(q.x, q.y*c - q.z*s, q.y*s + q.z*c);',
    '}',
    'vec3 shapeAt(float i){',
    '  if (i < 0.5) return aAmp;',
    '  if (i < 1.5) return fieldPos(aField);',
    '  if (i < 2.5) return aSphere;',
    '  return aRing;',
    '}',
    'void main(){',
    '  float sh = clamp(uShape, 0.0, 3.0);',
    '  float fi = min(floor(sh), 2.0);',
    '  float f = sh - fi;',
    '  float d = aRand.x * 0.45;',
    '  float ft = smoothstep(d, d + 0.55, f);',
    '  vec3 p = mix(shapeAt(fi), shapeAt(fi + 1.0), ft);',
    '  float scatter = sin(ft * 3.14159265) * 0.6;',
    '  float amp = uNoise + scatter;',
    '  vec3 np = p * 0.42 + vec3(0.0, 0.0, uTime * 0.07);',
    '  vec3 flow = vec3(snoise(np), snoise(np + vec3(19.1, 7.3, 3.7)), snoise(np + vec3(-4.2, 13.9, 27.5)));',
    '  p += (aJit * 1.1 + flow * 0.95) * amp;',
    '  p += flow * 0.022;',
    '  vec4 world = modelMatrix * vec4(p, 1.0);',
    '  vec2 dp = world.xy - uPointer.xy;',
    '  float dl = length(dp);',
    '  float push = (1.0 - smoothstep(0.0, 1.15, dl)) * uPointerStrength;',
    '  world.xy += (dp / max(dl, 0.0001)) * push * 0.42;',
    '  world.z += push * 0.35;',
    '  vec4 mv = viewMatrix * world;',
    '  gl_Position = projectionMatrix * mv;',
    '  gl_PointSize = uSize * (0.55 + aRand.y * 0.9) * uPixelRatio / -mv.z;',
    '  vAccent = step(0.88, aRand.z);',
    '  float depth = clamp((-mv.z - 8.6) / 2.2, 0.0, 1.0);',
    '  vAlpha = (0.58 + 0.42 * aRand.y) * (1.0 - clamp(amp - 0.5, 0.0, 1.0) * 0.4) * (1.0 - depth * 0.62);',
    '}'
  ].join('\n');

  var FRAG = [
    'uniform vec3 uInk;',
    'uniform vec3 uAccent;',
    'uniform vec3 uWhite;',
    'uniform float uWhiteMix;',
    'uniform float uOpacity;',
    'varying float vAccent;',
    'varying float vAlpha;',
    'void main(){',
    '  vec2 c = gl_PointCoord - 0.5;',
    '  float r = length(c);',
    '  if (r > 0.5) discard;',
    '  float a = smoothstep(0.5, 0.12, r) * vAlpha * uOpacity;',
    '  vec3 col = mix(uInk, uAccent, vAccent);',
    '  col = mix(col, uWhite, uWhiteMix);',
    '  gl_FragColor = vec4(col, a);',
    '}'
  ].join('\n');

  // ------------------------------------------------------------------ helpers
  function gauss() {
    var u = 0, v = 0;
    while (!u) u = Math.random();
    while (!v) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  // Sample an italic Bodoni ampersand from a 2D canvas.
  function glyphPoints(n, family) {
    var S = 640;
    var cv = document.createElement('canvas');
    cv.width = cv.height = S;
    var g = cv.getContext('2d', { willReadFrequently: true });
    g.fillStyle = '#000';
    g.fillRect(0, 0, S, S);
    g.fillStyle = '#fff';
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    g.font = 'italic 400 ' + Math.round(S * 0.8) + 'px ' + family;
    var m = g.measureText('&');
    var asc = m.actualBoundingBoxAscent || S * 0.55;
    var desc = m.actualBoundingBoxDescent || 0;
    g.fillText('&', S / 2, S / 2 + (asc - desc) / 2);

    var data = g.getImageData(0, 0, S, S).data;
    var fill = [], edge = [];
    var minX = S, maxX = 0, minY = S, maxY = 0;
    for (var y = 1; y < S - 1; y++) {
      for (var x = 1; x < S - 1; x++) {
        var i = (y * S + x) * 4;
        if (data[i] > 127) {
          fill.push(x, y);
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
          if (data[i - 4] < 128 || data[i + 4] < 128 || data[i - S * 4] < 128 || data[i + S * 4] < 128) edge.push(x, y);
        }
      }
    }
    if (fill.length < 200) return null;

    var cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    var span = Math.max(maxX - minX, maxY - minY);
    var H = 3.5; // world units for the longest side
    var out = new Float32Array(n * 3);
    for (var k = 0; k < n; k++) {
      var useEdge = Math.random() < 0.34 && edge.length;
      var src = useEdge ? edge : fill;
      var j = (Math.random() * (src.length / 2)) | 0;
      var px = src[j * 2] + Math.random() - 0.5;
      var py = src[j * 2 + 1] + Math.random() - 0.5;
      out[k * 3] = ((px - cx) / span) * H;
      out[k * 3 + 1] = -((py - cy) / span) * H;
      out[k * 3 + 2] = (Math.random() - 0.5) * (useEdge ? 0.12 : 0.42);
    }
    return out;
  }

  function fieldPoints(n) {
    var out = new Float32Array(n * 3);
    for (var k = 0; k < n; k++) {
      out[k * 3] = (Math.random() - 0.5) * 11.0;
      out[k * 3 + 1] = 0;
      out[k * 3 + 2] = (Math.random() - 0.5) * 5.0;
    }
    return out;
  }

  function spherePoints(n, R) {
    var out = new Float32Array(n * 3);
    var golden = Math.PI * (3 - Math.sqrt(5));
    for (var k = 0; k < n; k++) {
      var y = 1 - (k / (n - 1)) * 2;
      var r = Math.sqrt(1 - y * y);
      var t = golden * k;
      var rr = R * (0.965 + Math.random() * 0.035);
      out[k * 3] = Math.cos(t) * r * rr;
      out[k * 3 + 1] = y * rr;
      out[k * 3 + 2] = Math.sin(t) * r * rr;
    }
    // shuffle so morphs travel in every direction
    for (var i = n - 1; i > 0; i--) {
      var j = (Math.random() * (i + 1)) | 0;
      for (var c = 0; c < 3; c++) {
        var tmp = out[i * 3 + c]; out[i * 3 + c] = out[j * 3 + c]; out[j * 3 + c] = tmp;
      }
    }
    return out;
  }

  function ringPoints(n) {
    var out = new Float32Array(n * 3);
    var R = 2.05;
    var tx = 1.12, tz = -0.22;
    var cxr = Math.cos(tx), sxr = Math.sin(tx), czr = Math.cos(tz), szr = Math.sin(tz);
    for (var k = 0; k < n; k++) {
      var th = Math.random() * Math.PI * 2;
      var dust = Math.random() < 0.14;
      var spread = dust ? 0.32 : 0.075;
      var rr = R + gauss() * spread;
      var x = Math.cos(th) * rr;
      var y = Math.sin(th) * rr;
      var z = gauss() * spread * 0.8;
      // tilt around X, then Z
      var y1 = y * cxr - z * sxr, z1 = y * sxr + z * cxr;
      var x2 = x * czr - y1 * szr, y2 = x * szr + y1 * czr;
      out[k * 3] = x2; out[k * 3 + 1] = y2; out[k * 3 + 2] = z1;
    }
    return out;
  }

  function damp(cur, target, lambda, dt) {
    return cur + (target - cur) * (1 - Math.exp(-lambda * dt));
  }

  // ------------------------------------------------------------------ scene
  function create(canvas, opts) {
    opts = opts || {};
    if (!window.THREE) return null;
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
    } catch (e) {
      return null;
    }
    if (!renderer || !renderer.getContext()) return null;

    var reduced = !!opts.reduced;
    var count = opts.count || 16000;
    renderer.setClearColor(0x000000, 0);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0, 9);

    var amp = glyphPoints(count, opts.family || 'Georgia, serif') || spherePoints(count, 1.6);
    var field = fieldPoints(count);
    var sphere = spherePoints(count, 1.55);
    var ring = ringPoints(count);
    var jit = new Float32Array(count * 3);
    var rnd = new Float32Array(count * 4);
    for (var k = 0; k < count; k++) {
      jit[k * 3] = gauss() * 1.25;
      jit[k * 3 + 1] = gauss() * 0.95;
      jit[k * 3 + 2] = gauss() * 0.8;
      rnd[k * 4] = Math.random();
      rnd[k * 4 + 1] = Math.random();
      rnd[k * 4 + 2] = Math.random();
      rnd[k * 4 + 3] = Math.random();
    }

    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(amp, 3));
    geo.setAttribute('aAmp', new THREE.BufferAttribute(amp, 3));
    geo.setAttribute('aField', new THREE.BufferAttribute(field, 3));
    geo.setAttribute('aSphere', new THREE.BufferAttribute(sphere, 3));
    geo.setAttribute('aRing', new THREE.BufferAttribute(ring, 3));
    geo.setAttribute('aJit', new THREE.BufferAttribute(jit, 3));
    geo.setAttribute('aRand', new THREE.BufferAttribute(rnd, 4));

    var uniforms = {
      uTime: { value: 0 },
      uShape: { value: 0 },
      uNoise: { value: 0 },
      uSize: { value: 15 },
      uPixelRatio: { value: 1 },
      uPointer: { value: new THREE.Vector3(99, 99, 0) },
      uPointerStrength: { value: 0 },
      uInk: { value: new THREE.Color('#17181B') },
      uAccent: { value: new THREE.Color('#1E3FE0') },
      uWhite: { value: new THREE.Color('#F3F4EF') },
      uWhiteMix: { value: 0 },
      uOpacity: { value: 0 }
    };

    var mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: uniforms,
      transparent: true,
      depthWrite: false,
      depthTest: false
    });

    var points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    var group = new THREE.Group();
    group.add(points);
    scene.add(group);

    // ---- state
    var cur = { shape: 0, noise: 0, x: 0, y: 0, scale: 1, opacity: 0, white: 0, spin: 0 };
    var target = Object.assign({}, cur);
    var loadNoise = 0;
    var spinAngle = 0;
    var pointer = { x: 0, y: 0, sx: 0, sy: 0, strength: 0, active: false, lastMove: 0 };
    var visW = 1, visH = 1;
    var running = true;
    var last = performance.now();
    var onFrame = null;

    function resize() {
      var w = canvas.clientWidth || window.innerWidth;
      var h = canvas.clientHeight || window.innerHeight;
      var pr = Math.min(window.devicePixelRatio || 1, 2);
      renderer.setPixelRatio(pr);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      visH = 2 * camera.position.z * Math.tan((camera.fov * Math.PI) / 360);
      visW = visH * camera.aspect;
      uniforms.uPixelRatio.value = pr;
      // slightly larger points on small screens so the forms stay legible
      uniforms.uSize.value = w < 760 ? 17 : 15;
    }
    resize();
    window.addEventListener('resize', resize);

    var ndc = new THREE.Vector3();
    var dir = new THREE.Vector3();
    function onPointer(e) {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
      pointer.active = true;
      pointer.lastMove = performance.now();
      ndc.set(pointer.x, pointer.y, 0.5).unproject(camera);
      dir.copy(ndc).sub(camera.position).normalize();
      var dist = -camera.position.z / dir.z;
      uniforms.uPointer.value.copy(camera.position).addScaledVector(dir, dist);
    }
    if (!reduced) window.addEventListener('pointermove', onPointer, { passive: true });

    function tick(now) {
      if (!running) return;
      var dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      uniforms.uTime.value += dt * (reduced ? 0.25 : 1);

      if (onFrame) onFrame(dt);

      cur.shape = damp(cur.shape, target.shape, 2.6, dt);
      cur.noise = damp(cur.noise, target.noise, 2.8, dt);
      cur.x = damp(cur.x, target.x, 3, dt);
      cur.y = damp(cur.y, target.y, 3, dt);
      cur.scale = damp(cur.scale, target.scale, 3, dt);
      cur.opacity = damp(cur.opacity, target.opacity, 3.2, dt);
      cur.white = damp(cur.white, target.white, 3, dt);
      cur.spin = damp(cur.spin, target.spin, 2, dt);

      var idle = performance.now() - pointer.lastMove > 900;
      pointer.strength = damp(pointer.strength, pointer.active && !idle ? 1 : 0, idle ? 1.4 : 5, dt);
      pointer.sx = damp(pointer.sx, pointer.x, 2.2, dt);
      pointer.sy = damp(pointer.sy, pointer.y, 2.2, dt);

      spinAngle += dt * 0.16 * cur.spin;
      uniforms.uShape.value = cur.shape;
      uniforms.uNoise.value = cur.noise + loadNoise;
      uniforms.uOpacity.value = cur.opacity;
      uniforms.uWhiteMix.value = cur.white;
      uniforms.uPointerStrength.value = reduced ? 0 : pointer.strength;

      group.position.set(cur.x * visW, cur.y * visH, 0);
      group.scale.setScalar(cur.scale);
      group.rotation.y = spinAngle * cur.spin + pointer.sx * 0.26;
      group.rotation.x = -pointer.sy * 0.14;

      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { running = false; }
      else if (!running) { running = true; last = performance.now(); requestAnimationFrame(tick); }
    });

    return {
      setTarget: function (s) { Object.assign(target, s); },
      jump: function (s) { Object.assign(target, s); Object.assign(cur, s); },
      setLoadNoise: function (n) { loadNoise = n; },
      current: cur,
      onFrame: function (fn) { onFrame = fn; },
      setTheme: function (t) {
        if (t.ink) uniforms.uInk.value.set(t.ink);
        if (t.accent) uniforms.uAccent.value.set(t.accent);
        mat.blending = t.blend === 'additive' ? THREE.AdditiveBlending : THREE.NormalBlending;
        mat.needsUpdate = true;
      }
    };
  }

  window.LatentScene = { create: create };
})();
