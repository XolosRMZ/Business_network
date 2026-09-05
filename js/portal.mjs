import { loadMetrics, loadLineages } from './census.mjs';

function onVisible(element, callback, margin='100px') {
  if(!('IntersectionObserver' in window)){callback();return;}
  const observer=new IntersectionObserver(entries=>{
    if(entries.some(entry=>entry.isIntersecting)){observer.disconnect();callback();}
  },{rootMargin:margin});
  observer.observe(element);
}
for(const root of document.querySelectorAll('[data-network-scene]')) {
  let started=false;
  const button=root.querySelector('.scene-activate');
  const start=async()=>{
    if(started)return;
    started=true;button.hidden=true;
    try { const {mountNetwork}=await import('./network-scene.mjs');mountNetwork(root); }
    catch { const status=root.querySelector('.scene-status');status.hidden=false;status.textContent='Explora el ecosistema con los enlaces del mapa.'; }
  };
  if(matchMedia('(prefers-reduced-motion: reduce)').matches || navigator.connection?.saveData){
    button.hidden=false;button.addEventListener('click',start,{once:true});
  } else onVisible(root,()=>{
    if('requestIdleCallback' in window)requestIdleCallback(start,{timeout:1200});else setTimeout(start,0);
  });
}
const census=document.getElementById('censo-onchain');
if(census)onVisible(census,()=>{void loadMetrics(document);void loadLineages(document);},'300px');
