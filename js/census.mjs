// Treat a failed or malformed observation as unknown, never as an observed zero.
export function count(value) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}
export function readMetrics(value, now = Date.now()) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid census');
  const entries = {
    'metric-lineages':count(value.linajes_registrados),
    'metric-events':count(value.txs_xolo_detectadas),
    'metric-ipfs':count(value.linajes_validados_ipfs),
    'metric-links':count(value.registros_con_padre_y_madre),
  };
  if(Object.values(entries).every(n=>n===null)) throw new Error('Empty census');
  const parsed = typeof value.ultima_actualizacion === 'string' ? Date.parse(value.ultima_actualizacion) : NaN;
  const validDate = Number.isFinite(parsed) && parsed > 0 && parsed <= now + 5*60*1000;
  const date = validDate ? new Date(parsed) : null;
  const stale = !date || now-parsed > 48*60*60*1000;
  return { entries, date, label:stale?'Censo con actualización pendiente':'Última lectura del censo' };
}
export function lineageLinks(item) {
  const links=[];
  if(typeof item.slug==='string' && item.slug.trim()) links.push(['Ver linaje',`https://explorer.xolosarmy.xyz/linaje/${encodeURIComponent(item.slug)}`]);
  if(typeof item.txid==='string' && /^[a-f0-9]{64}$/i.test(item.txid)) links.push(['Ver transacción',`https://explorer.xolosarmy.xyz/tx/${item.txid}`]);
  return links;
}
export async function fetchJSON(url) {
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(),8000);
  try {
    const response=await fetch(url,{cache:'no-store',signal:controller.signal});
    if(!response.ok) throw new Error('Census unavailable');
    return await response.json();
  } finally { clearTimeout(timer); }
}
const formatDate = date => new Intl.DateTimeFormat('es-MX',{dateStyle:'medium',timeStyle:'short',timeZone:'UTC'}).format(date)+' UTC';
export async function loadMetrics(document) {
  const badge=document.getElementById('metrics-status-badge');
  if(!badge)return;
  try {
    const result=readMetrics(await fetchJSON('/data/metrics.json'));
    for(const [id,value] of Object.entries(result.entries)) document.getElementById(id).textContent=value===null?'—':new Intl.NumberFormat('es-MX').format(value);
    const time=document.getElementById('metrics-last-update');
    time.textContent=result.date?formatDate(result.date):'Fecha no disponible';
    if(result.date)time.dateTime=result.date.toISOString();
    badge.textContent=result.label;
  } catch {
    badge.textContent='No se pudo consultar el censo';
    document.getElementById('metrics-last-update').textContent='Sin datos actualizados';
  }
}
export function lineageCard(document,item) {
  const article=document.createElement('article');article.className='lineage-card';
  const status=document.createElement('span');status.className='lineage-status';
  status.textContent=`${item.ipfsOk===true?'IPFS validado':'IPFS sin validar'} · ${item.hasParents===true?'Padres enlazados':'Genealogía pendiente'}`;
  const title=document.createElement('h4');
  title.textContent=(typeof item.nombre==='string' && item.nombre.trim()) || (typeof item.slug==='string' && item.slug.trim()) || 'Registro XOLO';
  const meta=document.createElement('p');
  const timestamp=typeof item.timestamp==='number'?new Date(item.timestamp*1000):null;
  meta.textContent=timestamp && Number.isFinite(timestamp.getTime()) && item.timestamp>0?formatDate(timestamp):'Fecha no disponible';
  const links=document.createElement('div');links.className='lineage-links';
  for(const [label,url] of lineageLinks(item)) {
    const link=document.createElement('a');link.textContent=label;link.href=url;link.target='_blank';link.rel='noopener noreferrer';links.append(link);
  }
  article.append(status,title,meta,links);return article;
}
export async function loadLineages(document) {
  const grid=document.getElementById('recent-lineages-grid');if(!grid)return;
  try {
    const items=await fetchJSON('/data/recent-registrations.json');
    if(!Array.isArray(items) || items.some(item=>!item || typeof item!=='object' || Array.isArray(item)))throw new Error('Invalid records');
    if(items.length){grid.replaceChildren(...items.slice(0,6).map(item=>lineageCard(document,item)));return;}
    const p=document.createElement('p');p.className='data-message';p.textContent='El censo publicado aún no contiene registros recientes.';grid.replaceChildren(p);
  } catch {
    // Keep the crawlable Explorer link even if the independent data request fails.
    const p=document.createElement('p');p.className='data-message';p.textContent='Los registros recientes no están disponibles en este momento.';grid.prepend(p);
  }
}
