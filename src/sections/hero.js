// Hero Section: WebGL Shader Art (Raymarching + Procedural Noise)
// Custom fragment shader with SDF raymarching

export function initHero() {
  const canvas = document.getElementById('hero-canvas')
  if (!canvas) return

  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
  if (!gl) {
    console.warn('WebGL not supported')
    return
  }

  const vertSrc = `
    attribute vec2 a_position;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `

  const fragSrc = `
    precision highp float;

    uniform vec2 u_resolution;
    uniform float u_time;
    uniform vec2 u_mouse;

    // --- Noise functions ---
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) {
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
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
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));

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

      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));

      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);

      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
      p0 *= norm.x;
      p1 *= norm.y;
      p2 *= norm.z;
      p3 *= norm.w;

      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    // --- SDF primitives ---
    float sdSphere(vec3 p, float r) {
      return length(p) - r;
    }

    float sdTorus(vec3 p, vec2 t) {
      vec2 q = vec2(length(p.xz) - t.x, p.y);
      return length(q) - t.y;
    }

    float sdBox(vec3 p, vec3 b) {
      vec3 q = abs(p) - b;
      return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
    }

    // --- Smooth boolean operations ---
    float smin(float a, float b, float k) {
      float h = clamp(0.5 + 0.5*(b-a)/k, 0.0, 1.0);
      return mix(b, a, h) - k*h*(1.0-h);
    }

    // --- Scene SDF ---
    float mapScene(vec3 p) {
      float t = u_time * 0.3;

      // Organic deformation via noise
      float n = snoise(p * 1.5 + t) * 0.3;

      // Central sphere with noise displacement
      float sphere = sdSphere(p, 1.2 + n);

      // Torus rings
      vec3 p1 = p;
      p1.xz = mat2(cos(t*0.7), -sin(t*0.7), sin(t*0.7), cos(t*0.7)) * p1.xz;
      float torus1 = sdTorus(p1, vec2(1.8, 0.15));

      vec3 p2 = p;
      p2.xy = mat2(cos(t*0.5), -sin(t*0.5), sin(t*0.5), cos(t*0.5)) * p2.xy;
      float torus2 = sdTorus(p2, vec2(2.1, 0.12));

      // Floating boxes
      vec3 p3 = p - vec3(sin(t)*1.5, cos(t*0.8)*0.5, cos(t)*1.5);
      float box1 = sdBox(p3, vec3(0.25)) - 0.05;

      vec3 p4 = p - vec3(cos(t*1.2)*1.8, sin(t*0.6)*0.8, sin(t*0.9)*1.8);
      float box2 = sdBox(p4, vec3(0.2)) - 0.05;

      // Mouse influence
      vec2 m = (u_mouse - 0.5) * 2.0;
      vec3 mp = p - vec3(m.x * 2.0, m.y * 2.0, 0.0);
      float mouseOrb = sdSphere(mp, 0.6 + sin(t * 3.0) * 0.1);

      // Combine
      float scene = smin(sphere, torus1, 0.3);
      scene = smin(scene, torus2, 0.3);
      scene = smin(scene, box1, 0.4);
      scene = smin(scene, box2, 0.4);
      scene = smin(scene, mouseOrb, 0.5);

      return scene;
    }

    // --- Normal calculation ---
    vec3 calcNormal(vec3 p) {
      vec2 e = vec2(0.001, 0.0);
      return normalize(vec3(
        mapScene(p + e.xyy) - mapScene(p - e.xyy),
        mapScene(p + e.yxy) - mapScene(p - e.yxy),
        mapScene(p + e.yyx) - mapScene(p - e.yyx)
      ));
    }

    // --- Soft shadow ---
    float softShadow(vec3 ro, vec3 rd, float tmin, float tmax, float k) {
      float res = 1.0;
      float t = tmin;
      for (int i = 0; i < 32; i++) {
        float h = mapScene(ro + rd * t);
        res = min(res, k * h / t);
        t += clamp(h, 0.01, 0.1);
        if (h < 0.001 || t > tmax) break;
      }
      return clamp(res, 0.0, 1.0);
    }

    // --- AO ---
    float calcAO(vec3 pos, vec3 nor) {
      float occ = 0.0;
      float sca = 1.0;
      for (int i = 0; i < 5; i++) {
        float h = 0.01 + 0.12 * float(i) / 4.0;
        float d = mapScene(pos + h * nor);
        occ += (h - d) * sca;
        sca *= 0.95;
      }
      return clamp(1.0 - 3.0 * occ, 0.0, 1.0);
    }

    void main() {
      vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);

      // Camera
      float t = u_time * 0.2;
      vec3 ro = vec3(4.0 * sin(t), 2.0 + sin(t*0.5), 4.0 * cos(t));
      vec3 ta = vec3(0.0, 0.0, 0.0);
      vec3 ww = normalize(ta - ro);
      vec3 uu = normalize(cross(ww, vec3(0.0, 1.0, 0.0)));
      vec3 vv = cross(uu, ww);
      vec3 rd = normalize(uv.x * uu + uv.y * vv + 1.8 * ww);

      // Raymarch
      float dist = 0.0;
      float totalDist = 0.0;
      vec3 col = vec3(0.0);

      for (int i = 0; i < 100; i++) {
        vec3 p = ro + rd * totalDist;
        dist = mapScene(p);

        if (dist < 0.001) {
          // Hit
          vec3 nor = calcNormal(p);
          vec3 lig = normalize(vec3(0.8, 0.6, 0.4));
          float dif = clamp(dot(nor, lig), 0.0, 1.0);
          float ao = calcAO(p, nor);
          float sha = softShadow(p, lig, 0.01, 4.0, 16.0);

          // Material
          vec3 mat = vec3(0.4, 0.5, 0.7);
          float fresnel = pow(1.0 - max(dot(-rd, nor), 0.0), 3.0);
          mat = mix(mat, vec3(0.8, 0.4, 0.9), fresnel * 0.5);

          // Noise-based color variation
          float nc = snoise(p * 2.0 + u_time * 0.1) * 0.5 + 0.5;
          mat = mix(mat, vec3(0.3, 0.8, 0.6), nc * 0.3);

          col = vec3(0.05) * ao;
          col += dif * sha * mat * 1.2;
          col += fresnel * vec3(0.4, 0.3, 0.6) * 0.5;

          // Fog
          float fog = 1.0 - exp(-totalDist * 0.08);
          col = mix(col, vec3(0.02, 0.01, 0.04), fog);
          break;
        }

        totalDist += dist;
        if (totalDist > 20.0) break;
      }

      // Background gradient
      if (dist >= 0.001) {
        vec3 bg = mix(
          vec3(0.02, 0.01, 0.06),
          vec3(0.05, 0.02, 0.1),
          uv.y + 0.5
        );
        // Stars
        float stars = snoise(rd * 100.0) > 0.97 ? 1.0 : 0.0;
        bg += stars * vec3(0.8, 0.9, 1.0) * 0.5;
        col = bg;
      }

      // Vignette
      col *= 1.0 - 0.3 * dot(uv, uv);

      // Tone mapping
      col = col / (1.0 + col);
      col = pow(col, vec3(0.4545));

      gl_FragColor = vec4(col, 1.0);
    }
  `

  // Compile shader
  function createShader(gl, type, source) {
    const shader = gl.createShader(type)
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader error:', gl.getShaderInfoLog(shader))
      gl.deleteShader(shader)
      return null
    }
    return shader
  }

  function createProgram(gl, vert, frag) {
    const program = gl.createProgram()
    gl.attachShader(program, vert)
    gl.attachShader(program, frag)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program error:', gl.getProgramInfoLog(program))
      return null
    }
    return program
  }

  const vertShader = createShader(gl, gl.VERTEX_SHADER, vertSrc)
  const fragShader = createShader(gl, gl.FRAGMENT_SHADER, fragSrc)
  const program = createProgram(gl, vertShader, fragShader)

  if (!program) return

  // Fullscreen quad
  const positions = new Float32Array([-1,-1, 1,-1, -1,1, 1,1])
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)

  const aPosition = gl.getAttribLocation(program, 'a_position')
  const uResolution = gl.getUniformLocation(program, 'u_resolution')
  const uTime = gl.getUniformLocation(program, 'u_time')
  const uMouse = gl.getUniformLocation(program, 'u_mouse')

  let mouseX = 0.5, mouseY = 0.5

  document.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect()
    mouseX = (e.clientX - rect.left) / rect.width
    mouseY = 1.0 - (e.clientY - rect.top) / rect.height
  })

  function resize() {
    const dpr = Math.min(window.devicePixelRatio, 2)
    canvas.width = canvas.clientWidth * dpr
    canvas.height = canvas.clientHeight * dpr
    gl.viewport(0, 0, canvas.width, canvas.height)
  }

  resize()
  window.addEventListener('resize', resize)

  const startTime = performance.now()

  function render() {
    const time = (performance.now() - startTime) / 1000

    gl.useProgram(program)
    gl.enableVertexAttribArray(aPosition)
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0)

    gl.uniform2f(uResolution, canvas.width, canvas.height)
    gl.uniform1f(uTime, time)
    gl.uniform2f(uMouse, mouseX, mouseY)

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    requestAnimationFrame(render)
  }

  render()
}
