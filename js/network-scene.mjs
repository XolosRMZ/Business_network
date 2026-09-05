import { CAMERA, FOCAL, NODE_POSITIONS, icosphere, normal, project, layoutNodes } from './network-math.mjs';

const MODULES = [
  ['Tonalli Wallet','IDENTIDAD Y VALOR','Gestiona XEC, RMZ y tus activos digitales con una billetera de autocustodia.','https://app.tonalli.cash'],
  ['Xolos Explorer','MEMORIA PÚBLICA','Consulta las transacciones y los registros del linaje de la red.','https://explorer.xolosarmy.xyz'],
  ['Teyolia Flipstarter','FONDEO COLECTIVO','Conoce las campañas y contribuye a las iniciativas de la comunidad.','https://teyolia.cash'],
  ['Guardianía RMZ','ACCESO VERIFICABLE','Explora la verificación de RMZ sobre eCash como llave de acceso.','/guardiania/'],
  ['XoloLegend Marketplace','CULTURA DIGITAL','Descubre los NFTs y la expresión digital de la comunidad xolosArmy.','https://marketplace.xolosarmy.xyz'],
  ['Xolos Ramírez','ORIGEN VIVO','Conoce a los xoloitzcuintles y a las personas detrás de esta historia.','https://xolosramirez.com'],
];
const VERTEX = `
attribute vec3 a_position;
attribute vec3 a_normal;
attribute vec3 a_color;
uniform vec2 u_rotation;
uniform float u_aspect;
uniform float u_lit;
uniform float u_size;
varying vec3 v_color;
vec3 rotate(vec3 p) {
  float c=cos(u_rotation.x),s=sin(u_rotation.x);
  p=vec3(p.x*c+p.z*s,p.y,-p.x*s+p.z*c);
  c=cos(u_rotation.y);s=sin(u_rotation.y);
  return vec3(p.x,p.y*c-p.z*s,p.y*s+p.z*c);
}
void main() {
  vec3 p=rotate(a_position);
  float depth=${CAMERA.toFixed(1)}-p.z;
  gl_Position=vec4(p.x*${FOCAL}/u_aspect,p.y*${FOCAL},1.0050125*depth-0.20050125,depth);
  gl_PointSize=u_size;
  vec3 n=rotate(a_normal);
  float light=.3+max(dot(n,normalize(vec3(-.5,.8,1.))),0.)*.95;
  v_color=a_color*mix(1.,light,u_lit);
}`;
const FRAGMENT = `
precision mediump float;
varying vec3 v_color;
uniform float u_points;
void main() {
  float alpha=1.;
  if(u_points>.5) {
    float r=length(gl_PointCoord-.5)*2.;
    if(r>1.) discard;
    alpha=1.-smoothstep(.2,1.,r);
  }
  gl_FragColor=vec4(v_color*alpha,alpha);
}`;

export function mountNetwork(root) {
  const canvas = root.querySelector('canvas');
  const stage = root.querySelector('.network-stage');
  const status = root.querySelector('.scene-status');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = Boolean(navigator.connection?.saveData);
  let paused = reduced.matches || saveData, visible = true, disposed = false, lost = false;
  let yaw = -.24, pitch = -.16, frame = 0, previous = 0, width = 1, height = 1;
  const buttons = [...root.querySelectorAll('[data-node]')];
  const pauseButton = root.querySelector('[data-scene-pause]');
  const controller = new AbortController();
  const options = { signal: controller.signal };
  let gl, program, buffers = [], resizeObserver, visibilityObserver, dispose;
  const showFallback = (message) => {
    for (const selector of ['canvas','.scene-nodes','.scene-toolbar','.scene-center-label','.scene-detail']) root.querySelector(selector).hidden = true;
    root.querySelector('.network-fallback').hidden = false;
    status.textContent = message;
    status.hidden = false;
  };
  try {
    gl = canvas.getContext('webgl', { alpha:true, antialias:true, depth:true, powerPreference:'low-power' });
    if (!gl) throw new Error('WebGL unavailable');
    const compile = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source); gl.compileShader(shader);
      return shader;
    };
    program = gl.createProgram();
    const vertex=compile(gl.VERTEX_SHADER,VERTEX), fragment=compile(gl.FRAGMENT_SHADER,FRAGMENT);
    gl.attachShader(program,vertex); gl.attachShader(program,fragment);
    gl.bindAttribLocation(program,0,'a_position');
    gl.linkProgram(program);
    gl.deleteShader(vertex); gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error('Shader link failed');
    gl.useProgram(program);
    const locations = Object.fromEntries(['rotation','aspect','lit','size','points'].map(name => [name,gl.getUniformLocation(program,`u_${name}`)]));
    const attributes = ['position','normal','color'].map(name => gl.getAttribLocation(program,`a_${name}`));
    const createBuffer = (data, mode, lit=0, size=1) => {
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER,buffer); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
      const item = { buffer, mode, lit, size, count:data.length/9 };
      buffers.push(item); return item;
    };
    const gold=[.7,.54,.26], jade=[.25,.51,.39];
    const triangles=[], edges=[], orbits=[], points=[], connections=[];
    const vertexData = (target,p,n,color) => target.push(...p,...n,...color);
    for (const tri of icosphere()) {
      const n=normal(tri), color=n[0]>.05?[.2,.3,.21]:[.38,.30,.13];
      for (const p of tri) vertexData(triangles,p,n,color);
      for (let i=0;i<3;i++) for(const p of [tri[i],tri[(i+1)%3]]) vertexData(edges,p,[0,0,0],[.34,.38,.22]);
    }
    for (let ring=0;ring<3;ring++) {
      const point = (angle) => {
        const r=ring===0?2.12:1.75;
        const x=Math.cos(angle)*r,y=Math.sin(angle)*r;
        return ring===0?[x,y*.78,y*.42]:ring===1?[x*.7,y*.5,x*.6-y*.25]:[x*.7,y*.7,-x*.55];
      };
      for (let i=0;i<160;i++) for (const p of [point(i/160*Math.PI*2),point((i+1)/160*Math.PI*2)]) vertexData(orbits,p,[0,0,0],ring===0?gold:jade);
    }
    for (const p of NODE_POSITIONS) {
      vertexData(points,p,[0,0,0],[1,.84,.48]);
      for (const endpoint of [p,p.map(v=>v*.62)]) vertexData(connections,endpoint,[0,0,0],gold);
    }
    // Deterministic distant particles; no texture downloads or per-frame allocations on the GPU.
    for (let i=0;i<100;i++) {
      const a=i*2.399963,r=1.65+(i%11)*.07;
      vertexData(points,[Math.cos(a)*r,Math.sin(a)*r*.95,-.8-(i%7)*.22],[0,0,0],[.35,.44,.31]);
    }
    const solid=createBuffer(triangles,gl.TRIANGLES,1);
    const wires=createBuffer(edges,gl.LINES);
    const rings=createBuffer(orbits,gl.LINES);
    const links=createBuffer(connections,gl.LINES);
    const dots=createBuffer(points,gl.POINTS,0,5);
    gl.enable(gl.DEPTH_TEST); gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0,0,0,0);
    const render = () => {
      if (disposed || lost || !visible || document.hidden) return;
      gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      gl.uniform2f(locations.rotation,yaw,pitch);
      gl.uniform1f(locations.aspect,width/height);
      for (const item of [solid,wires,rings,links,dots]) {
        gl.bindBuffer(gl.ARRAY_BUFFER,item.buffer);
        attributes.forEach((location,i) => { gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location,3,gl.FLOAT,false,36,i*12); });
        gl.uniform1f(locations.lit,item.lit);
        gl.uniform1f(locations.size,item.size*Math.min(devicePixelRatio||1,1.5));
        gl.uniform1f(locations.points,item.mode===gl.POINTS?1:0);
        // Offset the filled faces so the edge overlay does not z-fight.
        if (item===solid) { gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(1,1); }
        else gl.disable(gl.POLYGON_OFFSET_FILL);
        gl.drawArrays(item.mode,0,item.count);
      }
      const positions=layoutNodes(NODE_POSITIONS.map(p=>project(p,yaw,pitch,width,height)),width,height);
      buttons.forEach((button,i) => {
        const [x,y,z]=positions[i];
        button.style.transform=`translate(${x-22}px,${y-22}px)`;
        button.style.zIndex=String(Math.round((z+4)*10));
      });
    };
    const stop = () => { cancelAnimationFrame(frame); frame=0; previous=0; };
    const tick = (time) => {
      frame=0;
      if (disposed || lost || paused || !visible || document.hidden) return;
      // Cap actual redraws to 30fps even on high-refresh displays.
      if (!previous || time-previous>=1000/30) {
        const delta=previous?Math.min((time-previous)/1000,.1):0;
        yaw+=delta*.085; previous=time; render();
      }
      frame=requestAnimationFrame(tick);
    };
    const resume = () => { if (!frame && !paused && visible && !document.hidden && !disposed && !lost) frame=requestAnimationFrame(tick); };
    const updatePause = () => {
      pauseButton.textContent=paused?'Reanudar giro':'Pausar giro';
      pauseButton.setAttribute('aria-pressed',String(paused));
      if(paused) stop(); else resume();
    };
    const resize = () => {
      const rect=stage.getBoundingClientRect();
      width=Math.max(1,rect.width); height=Math.max(1,rect.height);
      const dpr=Math.min(devicePixelRatio||1,1.5);
      canvas.width=Math.round(width*dpr); canvas.height=Math.round(height*dpr);
      gl.viewport(0,0,canvas.width,canvas.height); render();
    };
    const select = (index) => {
      const [name,category,description,url]=MODULES[index];
      root.querySelector('[data-detail-index]').textContent=String(index+1).padStart(2,'0');
      root.querySelector('[data-detail-category]').textContent=category;
      root.querySelector('[data-detail-title]').textContent=name;
      root.querySelector('[data-detail-description]').textContent=description;
      const link=root.querySelector('[data-detail-link]');
      link.href=url; link.setAttribute('aria-label',`Abrir ${name}`);
      if(url.startsWith('/')) link.removeAttribute('target'); else link.target='_blank';
      buttons.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
    };
    for(const selector of ['canvas','.scene-nodes','.scene-toolbar','.scene-center-label','.scene-detail']) root.querySelector(selector).hidden=false;
    root.querySelector('.network-fallback').hidden=true;
    status.hidden=true;
    buttons.forEach((button,i)=>button.addEventListener('click',()=>{select(i);paused=true;updatePause();},options));
    root.querySelector('[data-scene-reset]').addEventListener('click',()=>{yaw=-.24;pitch=-.16;render();},options);
    pauseButton.addEventListener('click',()=>{paused=!paused;updatePause();},options);
    canvas.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(event.key)) return;
      event.preventDefault(); paused=true;updatePause();
      if(event.key==='ArrowLeft')yaw-=.12;
      if(event.key==='ArrowRight')yaw+=.12;
      if(event.key==='ArrowUp')pitch=Math.min(.65,pitch+.1);
      if(event.key==='ArrowDown')pitch=Math.max(-.65,pitch-.1);
      if(event.key==='Home'){yaw=-.24;pitch=-.16;}
      render();
    },options);
    let pointer=null;
    canvas.addEventListener('pointerdown',event=>{
      if(!event.isPrimary || event.button!==0)return;
      pointer={id:event.pointerId,x:event.clientX,y:event.clientY};
      canvas.setPointerCapture(event.pointerId);paused=true;updatePause();
    },options);
    canvas.addEventListener('pointermove',event=>{
      if(!pointer || pointer.id!==event.pointerId)return;
      yaw+=(event.clientX-pointer.x)*.007;
      // Leave vertical touch gestures available for normal page scrolling.
      if(event.pointerType!=='touch')pitch=Math.max(-.65,Math.min(.65,pitch+(event.clientY-pointer.y)*.005));
      pointer.x=event.clientX;pointer.y=event.clientY;render();
    },options);
    const release=()=>{pointer=null;};
    for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,release,options);
    root.querySelector('.scene-nodes').addEventListener('focusin',()=>{paused=true;updatePause();},options);
    reduced.addEventListener('change',()=>{if(reduced.matches){paused=true;updatePause();}},options);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else{render();resume();}},options);
    if('ResizeObserver' in window){resizeObserver=new ResizeObserver(resize);resizeObserver.observe(stage);}
    else window.addEventListener('resize',resize,options);
    if('IntersectionObserver' in window){
      visibilityObserver=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible){resize();resume();}else stop();});
      visibilityObserver.observe(stage);
    }
    canvas.addEventListener('webglcontextlost',event=>{
      event.preventDefault();lost=true;stop();showFallback('El mapa 3D no está disponible. Puedes seguir explorando los enlaces del ecosistema.');
    },options);
    // Restore all GPU objects and listeners once the browser restores its context.
    canvas.addEventListener('webglcontextrestored',()=>{dispose();mountNetwork(root);},options);
    dispose=()=>{
      disposed=true;stop();controller.abort();resizeObserver?.disconnect();visibilityObserver?.disconnect();
      for(const item of buffers)gl.deleteBuffer(item.buffer);
      gl.deleteProgram(program);
    };
    // BFCache must keep the mounted renderer; normal navigation frees resources.
    window.addEventListener('pagehide',event=>{if(!event.persisted)dispose();else stop();},options);
    window.addEventListener('pageshow',()=>{render();resume();},options);
    resize();updatePause();
    return dispose;
  } catch {
    controller.abort();resizeObserver?.disconnect();visibilityObserver?.disconnect();
    if(frame)cancelAnimationFrame(frame);
    if(gl){for(const item of buffers)gl.deleteBuffer(item.buffer);if(program)gl.deleteProgram(program);}
    showFallback('El mapa 3D no está disponible en este dispositivo. Explora la red con los enlaces.');
    return ()=>{};
  }
}
