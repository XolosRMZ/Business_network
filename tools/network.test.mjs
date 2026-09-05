import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NODE_POSITIONS, rotate, project, layoutNodes, icosphere, normal } from '../js/network-math.mjs';
import { count, readMetrics, lineageLinks, lineageCard, loadMetrics, loadLineages, fetchJSON } from '../js/census.mjs';

test('3D rotation preserves length and projection has real perspective',()=>{
  const point=[1,2,3],rotated=rotate(point,.7,-.2);
  assert.ok(Math.abs(Math.hypot(...point)-Math.hypot(...rotated))<1e-10);
  assert.deepEqual(project([0,0,0],0,0,600,500),[300,250,0]);
  assert.ok(project([1,0,1],0,0,600,500)[0]>project([1,0,-1],0,0,600,500)[0]);
});
test('sphere faces have finite, outward normals and a stable radius',()=>{
  const triangles=icosphere();assert.equal(triangles.length,80);
  for(const tri of triangles){
    const n=normal(tri);assert.ok(Math.abs(Math.hypot(...n)-1)<1e-9);
    assert.ok(n.reduce((sum,v,i)=>sum+v*tri[0][i],0)>0);
    for(const v of tri)assert.ok(Math.abs(Math.hypot(...v)-1.34)<1e-9);
  }
});
test('all six 44px targets stay inside mobile/desktop canvases without overlap',()=>{
  for(const [w,h] of [[288,288],[358,358],[560,480],[640,548]])for(let yaw=-Math.PI;yaw<Math.PI;yaw+=.1)for(let pitch=-.65;pitch<=.65;pitch+=.1){
    const points=layoutNodes(NODE_POSITIONS.map(p=>project(p,yaw,pitch,w,h)),w,h);
    for(const [x,y] of points){assert.ok(x>=25 && x<=w-25);assert.ok(y>=25 && y<=h-25);}
    for(let i=0;i<6;i++)for(let j=i+1;j<6;j++)assert.ok(Math.hypot(points[i][0]-points[j][0],points[i][1]-points[j][1])>=47.9);
  }
});
test('unknown or malformed metrics cannot masquerade as zero',()=>{
  assert.equal(count(0),0);
  for(const value of [null,undefined,'0',-1,NaN,Infinity,1.2,{},Number.MAX_SAFE_INTEGER+1])assert.equal(count(value),null);
  assert.throws(()=>readMetrics({}));assert.throws(()=>readMetrics([]));
});
test('published census retains its real zero validations and timestamp',()=>{
  const source=JSON.parse(readFileSync(new URL('../data/metrics.json',import.meta.url)));
  const result=readMetrics(source,Date.parse(source.ultima_actualizacion)+1000);
  assert.equal(result.entries['metric-lineages'],source.linajes_registrados);
  assert.equal(result.entries['metric-ipfs'],source.linajes_validados_ipfs);
  assert.equal(result.date.toISOString(),new Date(source.ultima_actualizacion).toISOString());
  assert.equal(result.label,'Última lectura del censo');
});
test('stale, future and invalid timestamps are reported honestly',()=>{
  const now=Date.parse('2026-09-05T18:00:00Z');
  for(const date of ['2026-01-01','2027-01-01','bad date',null]){
    const m=readMetrics({linajes_registrados:0,ultima_actualizacion:date},now);
    assert.equal(m.label,'Censo con actualización pendiente');
    if(date!=='2026-01-01')assert.equal(m.date,null);
  }
});
test('lineage links never accept injected schemes or invalid transaction IDs',()=>{
  const links=lineageLinks({slug:'\"><img src=x onerror=alert(1)>',txid:'javascript:alert(1)'});
  assert.equal(links.length,1);assert.ok(links[0][1].startsWith('https://explorer.xolosarmy.xyz/linaje/%22%3E%3C'));
  assert.equal(lineageLinks({slug:null,txid:'a'.repeat(64)})[0][1],'https://explorer.xolosarmy.xyz/tx/'+'a'.repeat(64));
});
// Minimal element contract. Deliberately rejects every innerHTML write.
class Element {
  constructor(tag){this.tag=tag;this.children=[];this.textContent='';}
  set innerHTML(value){throw new Error('Untrusted HTML sink used');}
  append(...nodes){this.children.push(...nodes);}
  prepend(...nodes){this.children.unshift(...nodes);}
  replaceChildren(...nodes){this.children=[...nodes];}
}
const fakeDocument=()=>{
  const elements=Object.fromEntries(['metrics-status-badge','metrics-last-update','metric-lineages','metric-events','metric-ipfs','metric-links','recent-lineages-grid'].map(id=>[id,new Element('div')]));
  for(const id of ['metric-lineages','metric-events','metric-ipfs','metric-links'])elements[id].textContent='—';
  return {elements,createElement:tag=>new Element(tag),getElementById:id=>elements[id]};
};
test('hostile lineage names stay literal text, including false validation states',()=>{
  const d=fakeDocument(),name='<img src=x onerror=alert(1)>';
  const card=lineageCard(d,{nombre:name,ipfsOk:'true',hasParents:'true',timestamp:0});
  assert.equal(card.children[1].textContent,name);
  assert.equal(card.children[0].textContent,'IPFS sin validar · Genealogía pendiente');
  assert.equal(card.children[2].textContent,'Fecha no disponible');
});
test('a failed metric fetch leaves unknown counts and a useful failure status',async()=>{
  const prior=globalThis.fetch;globalThis.fetch=async()=>({ok:false});
  try{const d=fakeDocument();await loadMetrics(d);assert.equal(d.elements['metric-lineages'].textContent,'—');assert.equal(d.elements['metrics-status-badge'].textContent,'No se pudo consultar el censo');}
  finally{globalThis.fetch=prior;}
});
test('empty and unavailable recent records are different states; fallback links survive',async()=>{
  const prior=globalThis.fetch;
  try{
    const d=fakeDocument();globalThis.fetch=async()=>({ok:true,json:async()=>[]});await loadLineages(d);
    assert.match(d.elements['recent-lineages-grid'].children[0].textContent,/aún no contiene/);
    const e=fakeDocument(),link=new Element('a');e.elements['recent-lineages-grid'].append(link);
    globalThis.fetch=async()=>{throw new Error('offline');};await loadLineages(e);
    assert.equal(e.elements['recent-lineages-grid'].children[1],link);
    assert.match(e.elements['recent-lineages-grid'].children[0].textContent,/no están disponibles/);
  }finally{globalThis.fetch=prior;}
});
test('fetchJSON requests current data and passes an abort signal',async()=>{
  const prior=globalThis.fetch;
  try{globalThis.fetch=async(url,options)=>{assert.equal(options.cache,'no-store');assert.ok(options.signal instanceof AbortSignal);return {ok:true,json:async()=>({ok:true})};};assert.deepEqual(await fetchJSON('/data/metrics.json'),{ok:true});}
  finally{globalThis.fetch=prior;}
});

import { mountNetwork } from '../js/network-scene.mjs';
function sceneEnvironment(webgl=true) {
  const saved=new Map();
  const install=(name,value)=>{saved.set(name,Object.getOwnPropertyDescriptor(globalThis,name));Object.defineProperty(globalThis,name,{value,configurable:true,writable:true});};
  class Target extends EventTarget {
    constructor(){super();this.hidden=true;this.style={};this.attributes={};this.textContent='';}
    setAttribute(k,v){this.attributes[k]=v;}
    removeAttribute(k){delete this.attributes[k];delete this[k];}
  }
  const nodes=Array.from({length:6},()=>new Target()),targets=new Map();
  for(const name of ['canvas','.network-stage','.scene-status','.scene-nodes','.scene-toolbar','.scene-center-label','.scene-detail','.network-fallback','[data-scene-pause]','[data-scene-reset]','[data-detail-index]','[data-detail-category]','[data-detail-title]','[data-detail-description]','[data-detail-link]'])targets.set(name,new Target());
  const root={querySelector:key=>targets.get(key),querySelectorAll:()=>nodes};
  const draws=[],deleted=[],frames=new Map();let next=1;
  const api={createShader:()=>({}),createProgram:()=>({}),createBuffer:()=>({}),getProgramParameter:()=>true,getAttribLocation:(_,name)=>['a_position','a_normal','a_color'].indexOf(name),getUniformLocation:()=>({}),drawArrays:(mode,start,count)=>draws.push({mode,start,count}),deleteBuffer:buffer=>deleted.push(buffer)};
  const gl=new Proxy(api,{get(object,key){if(key in object)return object[key];if(/^[A-Z_]+$/.test(key)){object[key]=next++;return object[key];}return ()=>{};}});
  targets.get('canvas').getContext=()=>webgl?gl:null;
  targets.get('.network-stage').getBoundingClientRect=()=>({width:358,height:358});
  const win=new Target(),doc=new Target(),motion=new Target();doc.hidden=false;motion.matches=true;
  install('window',win);install('document',doc);install('navigator',{connection:{saveData:false}});install('matchMedia',()=>motion);install('devicePixelRatio',2);
  install('requestAnimationFrame',callback=>{const id=next++;frames.set(id,callback);return id;});install('cancelAnimationFrame',id=>frames.delete(id));
  return {root,targets,nodes,draws,deleted,frames,doc,motion,restore:()=>{for(const [name,value] of saved){if(value)Object.defineProperty(globalThis,name,value);else delete globalThis[name];}}};
}
test('renderer initializes geometry and connects node selection without starting reduced-motion animation',()=>{
  const env=sceneEnvironment();
  try{
    const dispose=mountNetwork(env.root);
    assert.equal(env.targets.get('canvas').hidden,false);
    assert.equal(env.draws.length,5);assert.ok(env.draws.every(draw=>draw.count>0));
    assert.equal(env.frames.size,0);
    env.nodes[3].dispatchEvent(new Event('click'));
    assert.equal(env.targets.get('[data-detail-title]').textContent,'Guardianía RMZ');
    assert.equal(env.targets.get('[data-detail-link]').href,'/guardiania/');
    assert.equal(env.nodes[3].attributes['aria-pressed'],'true');
    dispose();assert.equal(env.deleted.length,5);
  }finally{env.restore();}
});
test('missing WebGL keeps the crawlable fallback visible',()=>{
  const env=sceneEnvironment(false);
  try{mountNetwork(env.root);assert.equal(env.targets.get('.network-fallback').hidden,false);assert.equal(env.targets.get('canvas').hidden,true);assert.match(env.targets.get('.scene-status').textContent,/no está disponible/);}
  finally{env.restore();}
});
test('context loss shows fallback, restoration rebuilds once, and pause stops the loop',()=>{
  const env=sceneEnvironment();
  try{
    mountNetwork(env.root);
    const canvas=env.targets.get('canvas');canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true}));
    assert.equal(env.targets.get('.network-fallback').hidden,false);
    assert.equal(env.frames.size,0);
    canvas.dispatchEvent(new Event('webglcontextrestored'));
    assert.equal(env.targets.get('.network-fallback').hidden,true);assert.equal(env.deleted.length,5);assert.equal(env.draws.length,10);
    const pause=env.targets.get('[data-scene-pause]');pause.dispatchEvent(new Event('click'));assert.equal(env.frames.size,1);
    pause.dispatchEvent(new Event('click'));assert.equal(env.frames.size,0);
    const ev=new Event('pagehide');Object.defineProperty(ev,'persisted',{value:false});window.dispatchEvent(ev);assert.equal(env.deleted.length,10);
  }finally{env.restore();}
});
