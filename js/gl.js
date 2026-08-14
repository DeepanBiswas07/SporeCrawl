/* ============================================================
   gl.js — raw WebGL2. No libraries, no build step.

   Two things:
     Backdrop — a living, domain-warped membrane rendered behind the
                entire interface. You are inside something alive.
     Bloom    — a real post-process pass over the battle canvas:
                bright-pass, separable blur, additive composite,
                plus chromatic aberration that kicks on impact.

   Everything degrades to "do nothing" if WebGL2 is unavailable.
   ============================================================ */
(function (global) {
  'use strict';

  const QUAD_VS = `#version 300 es
precision highp float;
const vec2 P[3] = vec2[3](vec2(-1.,-1.), vec2(3.,-1.), vec2(-1.,3.));
out vec2 vUv;
void main(){ vec2 p = P[gl_VertexID]; vUv = p*0.5+0.5; gl_Position = vec4(p,0.,1.); }`;

  /* ---------------- the living backdrop ---------------- */
  const BACKDROP_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform vec2  uRes;
uniform float uTime;
uniform vec3  uAccent;
uniform float uHeat;    // 0..1 how violent the current raid is
uniform float uPulse;   // 0..1 core damage flash
uniform float uDepth;   // 0..1 how deep the player is

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x),
             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
}
float fbm3(vec2 p){            // cheap, for domain warping
  float a = 0.5, s = 0.0;
  for(int i=0;i<3;i++){ s += a*noise(p); p *= 2.03; a *= 0.5; }
  return s;
}
float fbm(vec2 p){             // full detail, for the visible field
  float a = 0.5, s = 0.0;
  for(int i=0;i<5;i++){ s += a*noise(p); p *= 2.03; a *= 0.5; }
  return s;
}

void main(){
  vec2 p = (gl_FragCoord.xy - 0.5*uRes) / uRes.y;
  float t = uTime * 0.045;

  // two rounds of domain warping — this is what makes it read as tissue
  // rather than as a noise texture
  vec2 q = vec2(fbm3(p*1.5 + vec2(0.0, t)),
                fbm3(p*1.5 + vec2(5.2, 1.3) - t*0.7));
  vec2 r = vec2(fbm3(p*1.8 + 3.0*q + vec2(1.7, 9.2) + t*0.55),
                fbm3(p*1.8 + 3.0*q + vec2(8.3, 2.8) - t*0.42));
  float f = fbm(p*1.35 + 3.1*r);

  // ridged veins running through the mass
  float veins = pow(abs(sin(f*8.8 + t*2.4)), 7.0);
  // slow breathing
  float breathe = 0.82 + 0.18*sin(uTime*0.30);

  vec3 base = mix(vec3(0.021,0.025,0.032), vec3(0.030,0.020,0.038), uDepth);
  vec3 col  = base;
  col += uAccent * (f*f*0.15 + veins*0.11*(0.45 + uHeat*0.9)) * breathe;

  // a soft light source low-left, where the dungeon core sits
  vec2 core = p - vec2(-0.62, -0.10);
  col += uAccent * pow(max(0.0, 1.0 - length(core)*1.05), 3.0) * (0.055 + uHeat*0.05);

  // the room goes arterial when the core is being hit
  col = mix(col, vec3(0.42,0.05,0.09), uPulse*0.55*smoothstep(0.15,1.15,length(p)));

  col *= 1.0 - 0.58*smoothstep(0.30, 1.30, length(p));       // vignette
  col += (hash(gl_FragCoord.xy + fract(uTime)*137.0)-0.5)*0.013; // grain

  outColor = vec4(max(col, 0.0), 1.0);
}`;

  /* ---------------- post-process ---------------- */
  const BRIGHT_FS = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 outColor;
uniform sampler2D uTex; uniform float uThreshold;
void main(){
  vec3 c = texture(uTex, vUv).rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float k = smoothstep(uThreshold, uThreshold + 0.35, l);
  outColor = vec4(c * k, 1.0);
}`;

  const BLUR_FS = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 outColor;
uniform sampler2D uTex; uniform vec2 uDir; uniform vec2 uRes;
void main(){
  vec2 px = uDir / uRes;
  // 9-tap gaussian
  vec3 s = texture(uTex, vUv).rgb * 0.2270270270;
  s += texture(uTex, vUv + px*1.3846153846).rgb * 0.3162162162;
  s += texture(uTex, vUv - px*1.3846153846).rgb * 0.3162162162;
  s += texture(uTex, vUv + px*3.2307692308).rgb * 0.0702702703;
  s += texture(uTex, vUv - px*3.2307692308).rgb * 0.0702702703;
  outColor = vec4(s, 1.0);
}`;

  const COMPOSITE_FS = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 outColor;
uniform sampler2D uScene, uBloom;
uniform float uBloomAmt, uAberration, uShock, uTime;
uniform vec2 uRes;

void main(){
  vec2 uv = vUv;
  vec2 c  = uv - 0.5;

  // shock ripple on heavy impacts
  if (uShock > 0.001) {
    float d = length(c);
    uv += normalize(c + 1e-6) * sin(d*38.0 - uTime*13.0) * uShock * 0.006 * (1.0 - d);
  }

  // chromatic aberration, strongest at the edges
  float ab = uAberration * (0.0016 + dot(c,c)*0.010);
  vec3 scene;
  scene.r = texture(uScene, uv + c*ab).r;
  scene.g = texture(uScene, uv).g;
  scene.b = texture(uScene, uv - c*ab).b;

  vec3 bloom = texture(uBloom, uv).rgb;
  vec3 col = scene + bloom * uBloomAmt;

  // filmic-ish shoulder so the glow rolls off instead of clipping to white
  col = col / (col + vec3(0.92)) * 1.35;
  col *= 1.0 - 0.30*smoothstep(0.45, 1.15, length(c)*1.6);

  outColor = vec4(col, 1.0);
}`;

  /* ---------------- plumbing ---------------- */
  function compile(gl, vs, fs) {
    const mk = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.warn('[gl] shader:', gl.getShaderInfoLog(s)); return null;
      }
      return s;
    };
    const v = mk(gl.VERTEX_SHADER, vs), f = mk(gl.FRAGMENT_SHADER, fs);
    if (!v || !f) return null;
    const p = gl.createProgram();
    gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.warn('[gl] link:', gl.getProgramInfoLog(p)); return null;
    }
    gl.deleteShader(v); gl.deleteShader(f);
    const loc = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const u = gl.getActiveUniform(p, i); loc[u.name] = gl.getUniformLocation(p, u.name); }
    return { p, loc };
  }
  function target(gl, w, h) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { tex, fb, w, h };
  }
  function ctxOf(canvas) {
    try {
      return canvas.getContext('webgl2', {
        antialias: false, alpha: false, depth: false, stencil: false,
        powerPreference: 'high-performance', preserveDrawingBuffer: false
      });
    } catch (e) { return null; }
  }
  const hex2rgb = h => {
    const s = (h || '#5ce89a').replace('#', '');
    const n = parseInt(s.length === 3 ? s.split('').map(c => c + c).join('') : s, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  };

  /* ============================================================
     BACKDROP
     ============================================================ */
  function createBackdrop(canvas) {
    const gl = ctxOf(canvas);
    if (!gl) return null;
    const prog = compile(gl, QUAD_VS, BACKDROP_FS);
    if (!prog) return null;
    const vao = gl.createVertexArray();
    let W = 0, H = 0, dpr = 1;
    let accent = [0.36, 0.91, 0.60], heat = 0, pulse = 0, depth = 0;
    let tick = 0;

    function resize() {
      // half resolution: this is a soft background, nobody can tell
      dpr = Math.min(1.25, global.devicePixelRatio || 1) * 0.55;
      const w = Math.max(2, Math.round(global.innerWidth * dpr));
      const h = Math.max(2, Math.round(global.innerHeight * dpr));
      if (w === W && h === H) return;
      W = w; H = h; canvas.width = W; canvas.height = H;
    }
    resize();
    global.addEventListener('resize', resize);

    function set(o) {
      if (o.accent) accent = hex2rgb(o.accent);
      if (o.heat != null) heat = o.heat;
      if (o.pulse != null) pulse = o.pulse;
      if (o.depth != null) depth = o.depth;
    }
    function render(t) {
      // 30fps is plenty for something this slow, and halves the fill cost
      if ((tick++ & 1) === 1) return;
      resize();
      gl.viewport(0, 0, W, H);
      gl.useProgram(prog.p);
      gl.bindVertexArray(vao);
      gl.uniform2f(prog.loc.uRes, W, H);
      gl.uniform1f(prog.loc.uTime, t);
      gl.uniform3fv(prog.loc.uAccent, accent);
      gl.uniform1f(prog.loc.uHeat, heat);
      gl.uniform1f(prog.loc.uPulse, pulse);
      gl.uniform1f(prog.loc.uDepth, depth);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    return { render, set, resize, gl };
  }

  /* ============================================================
     BLOOM / POST — takes a 2D canvas, returns a graded frame
     ============================================================ */
  function createPost(canvas) {
    const gl = ctxOf(canvas);
    if (!gl) return null;
    const bright = compile(gl, QUAD_VS, BRIGHT_FS);
    const blur = compile(gl, QUAD_VS, BLUR_FS);
    const comp = compile(gl, QUAD_VS, COMPOSITE_FS);
    if (!bright || !blur || !comp) return null;

    const vao = gl.createVertexArray();
    const sceneTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, sceneTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    let W = 0, H = 0, a = null, b = null;

    function resize(w, h) {
      if (w === W && h === H) return;
      W = w; H = h;
      canvas.width = w; canvas.height = h;
      const bw = Math.max(2, w >> 2), bh = Math.max(2, h >> 2);
      [a, b].forEach(t => { if (t) { gl.deleteTexture(t.tex); gl.deleteFramebuffer(t.fb); } });
      a = target(gl, bw, bh); b = target(gl, bw, bh);
    }

    function pass(prog, out, setup) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, out ? out.fb : null);
      gl.viewport(0, 0, out ? out.w : W, out ? out.h : H);
      gl.useProgram(prog.p);
      gl.bindVertexArray(vao);
      setup(prog.loc);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    /** @param src  the 2D canvas holding this frame
        @param o    { bloom, aberration, shock, time } */
    function draw(src, o) {
      o = o || {};
      resize(src.width, src.height);
      gl.bindTexture(gl.TEXTURE_2D, sceneTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);

      // 1 · bright pass into a
      pass(bright, a, loc => {
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, sceneTex);
        gl.uniform1i(loc.uTex, 0);
        gl.uniform1f(loc.uThreshold, o.threshold == null ? 0.52 : o.threshold);
      });
      // 2 · separable blur, twice for a wider skirt
      for (let i = 0; i < 2; i++) {
        pass(blur, b, loc => {
          gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, a.tex);
          gl.uniform1i(loc.uTex, 0);
          gl.uniform2f(loc.uDir, 1, 0); gl.uniform2f(loc.uRes, a.w, a.h);
        });
        pass(blur, a, loc => {
          gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, b.tex);
          gl.uniform1i(loc.uTex, 0);
          gl.uniform2f(loc.uDir, 0, 1); gl.uniform2f(loc.uRes, b.w, b.h);
        });
      }
      // 3 · composite to screen
      pass(comp, null, loc => {
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, sceneTex);
        gl.uniform1i(loc.uScene, 0);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, a.tex);
        gl.uniform1i(loc.uBloom, 1);
        gl.uniform1f(loc.uBloomAmt, o.bloom == null ? 0.85 : o.bloom);
        gl.uniform1f(loc.uAberration, o.aberration || 0);
        gl.uniform1f(loc.uShock, o.shock || 0);
        gl.uniform1f(loc.uTime, o.time || 0);
        gl.uniform2f(loc.uRes, W, H);
      });
    }
    return { draw, gl };
  }

  global.GL = {
    createBackdrop, createPost,
    supported: (() => { try { return !!document.createElement('canvas').getContext('webgl2'); } catch (e) { return false; } })()
  };
})(this);
