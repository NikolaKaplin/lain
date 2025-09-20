import { useEffect } from "react";
import "./App.css";
import { VFX } from "@vfx-js/core";
import { invoke } from "@tauri-apps/api/core";

function App() {
  useEffect(() => {
    const audio = new Audio("/lain.mp3");
    audio.loop = true;

    const playAudio = async () => {
      try {
        await audio.play();
      } catch (error) {
        console.log("Автозапуск звука заблокирован браузером");
      }
    };

    playAudio();

    const interval = setInterval(() => {
      invoke("lain_window_toggle", { visible: false });
      audio.pause();
      const time = Math.random() * (2000 - 500) + 500;
      setTimeout(() => {
        invoke("lain_window_toggle", { visible: true });
        playAudio();
      }, time);
    }, 2000);

    return () => {
      clearInterval(interval);
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);

  const shader = `
precision highp float;
uniform sampler2D src;
uniform vec2 offset;
uniform vec2 resolution;
uniform float time;
out vec4 outColor;

vec4 readTex(vec2 uv) {  
  vec4 c = texture(src, uv);  
  c.a *= smoothstep(.5, .499, abs(uv.x - .5)) * smoothstep(.5, .499, abs(uv.y - .5));  // smooth edge
  return c;
}

vec2 zoom(vec2 uv, float t) {
  return (uv - .5) * t + .5;
}
float wave(float y) {
  return sin(y * 1190. + time * 3.) * sin(y * 1001. + time * 7.) * sin(y * 1479. + time * .5) * 0.001;
}
float rand(vec3 p) {
  return fract(sin(dot(p, vec3(829., 4839., 432.))) * 39428.);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - offset) / resolution;       
  
  vec2 p = uv * 2. - 1.;
  p.x *= resolution.x / resolution.y;
  float l = length(p); 
   
  // distort
  float dist = pow(l, 2.) * .3;
  dist = smoothstep(0., 1., dist);
  uv = zoom(uv, 0.5 + dist);  
    
  // blur
  vec2 du = (uv - .5);
  float a = atan(p.y, p.x);
  float rd = rand(vec3(a, time, 0));
  uv = (uv - .5) * (1.0 + rd * pow(l * 0.7, 3.) * 0.3) + .5;
    
  vec2 uvr = uv;
  vec2 uvg = uv;
  vec2 uvb = uv;
    
  // aberration
  float d = (1. + sin(uv.y * 20. + time * 3.) * 0.1) * 0.05;
  uvr.x += 0.0015;
  uvb.x -= 0.0015;
  uvr = zoom(uvr, 1. + d * l * l);
  uvb = zoom(uvb, 1. - d * l * l);    
    
  vec4 cr = readTex(uvr);
  vec4 cg = readTex(uvg);
  vec4 cb = readTex(uvb);  
  
  outColor = vec4(cr.r, cg.g, cb.b, (cr.a + cg.a + cb.a) / 1.);

  
  vec4 deco;

  // scanline
  float res = resolution.y;
  deco += (
    sin(uv.y * res * .7 + time * 100.) *
    sin(uv.y * res * .3 - time * 130.)
  ) * 0.05;

  // grid
  deco += smoothstep(.01, .0, min(fract(uv.x * 20.), fract(uv.y * 20.))) * 0.1;

  outColor += deco * smoothstep(2., 0., l);
  
  // vignette
  outColor *= 1.8 - l * l;  


  // dither
  outColor += rand(vec3(p, time)) * 0.1;     
}
`;

  const shader2 = `
precision highp float;
uniform sampler2D src;
uniform vec2 offset;
uniform vec2 resolution;
uniform float time;
uniform float id;
out vec4 outColor;

vec4 readTex(vec2 uv) {  
  vec4 c = texture(src, uv);  
  c.a *= smoothstep(.5, .499, abs(uv.x - .5)) * smoothstep(.5, .499, abs(uv.y - .5));  // smooth edge
  return c;
}

float rand(vec2 p) {
  return fract(sin(dot(p, vec2(829., 483.))) * 394.);
}
float rand(vec3 p) {
  return fract(sin(dot(p, vec3(829., 4839., 432.))) * 39428.);
}

vec2 dist(vec2 uv, float f) {
  float t = time + id;
  uv += sin(uv.y * 12. + t * 1.7) * sin(uv.y * 17. + t * 2.3) * f;

  return uv;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - offset) / resolution;
  vec2 uvr = uv, uvg = uv, uvb = uv;

  float r = rand(vec2(floor(time * 43.), id));
  //float r = rand(vec2(time, id));  
  if (r > 0.8) {
    float y = sin(floor(uv.y / 0.07)) + sin(floor(uv.y / 0.003 + time));
    float f = rand(vec2(y, floor(time * 5.0) + id)) * 2. - 1.;
    uvr.x += f * 0.1;
    uvg.x += f * 0.2;
    uvb.x += f * 0.3;
  }
  
    
  float r2 = rand(vec2(floor(time * 37.), id + 10.));
  if (r2 > 0.9) {
    uvr.x += sin(uv.y * 7. + time + id + 1.) * 0.03;
    uvg.x += sin(uv.y * 5. + time + id + 2.) * 0.03;
    uvb.x += sin(uv.y * 3. + time + id + 3.) * 0.03;
  }
  
  
  vec4 cr = readTex(uvr);
  vec4 cg = readTex(uvg);
  vec4 cb = readTex(uvb);  
  
  outColor = vec4(cr.r, cg.g, cb.b, (cr.a + cg.a + cb.a) / 1.);
}
`;

  const vfx = new VFX({
    scrollPadding: false,
    postEffect: { shader },
  });

  window.addEventListener("load", function () {
    let i = 0;
    for (const e of document.querySelectorAll("img,h1,h2,p")) {
      const z = e.getAttribute("data-z");
      vfx.add(e as HTMLElement, {
        shader: shader2,
        uniforms: { id: i++ },
        zIndex: z ? parseInt(z) : 0,
        // overlay: true,
      });
    }
  });

  return (
    <div id="main">
      <img src="lain.png" alt="lain" />
    </div>
  );
}

export default App;
