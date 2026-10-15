/*
 * LumaTex package resolver for SwiftLaTeX's pdfTeX WebAssembly engine.
 * TeX source stays in the browser; this worker fetches only TeX Live files.
 * Package mirror based on TeX Live 2020, matching the engine format.
 */
'use strict';

const sw=self;
const rootPath=new URL(sw.registration.scope).pathname;
const texPrefix=rootPath+'texlive/';
const cacheName='lumatex-texlive-v1';
const staticMirror='https://cdn.jsdelivr.net/gh/SachaNevsky/latexdiff-texmf-dist@aca46fc00975feebf98e038976790805c3e932df';
const lsRUrl=staticMirror+'/ls-R';
const fallbackMirror='https://texlive.texlyre.org';
const extensions=['','.tfm','.pfb','.vf','.sty','.cls','.fd','.def','.cfg','.clo','.tex','.ltx','.map','.enc','.dfu','.ldf'];
let indexPromise=null;

sw.addEventListener('install',event=>event.waitUntil(sw.skipWaiting()));
sw.addEventListener('activate',event=>event.waitUntil(sw.clients.claim()));
sw.addEventListener('message',event=>{if(event.data?.type==='claim')event.waitUntil(sw.clients.claim())});

async function openTexCache(){try{return await caches.open(cacheName)}catch{return null}}
function withTimeout(url,ms){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),ms);return fetch(url,{signal:controller.signal}).finally(()=>clearTimeout(timer))}
function looksLikeHtml(buffer){const head=new TextDecoder().decode(new Uint8Array(buffer,0,Math.min(100,buffer.byteLength))).toLowerCase();return head.includes('<!doctype')||head.includes('<html')}
function validFile(buffer,name,isPk){if(!buffer.byteLength||looksLikeHtml(buffer))return false;const bytes=new Uint8Array(buffer);if(isPk)return bytes.length>2&&bytes[0]===0xf7&&bytes[1]===0x59;const ext=name.slice(name.lastIndexOf('.')).toLowerCase();if(ext==='.tfm'){const words=(bytes[0]<<8)|bytes[1];return words>6&&words*4<=bytes.length}if(ext==='.vf')return bytes.length>2&&bytes[0]===0xf7&&bytes[1]===0xca;if(ext==='.pfb')return bytes.length>2&&bytes[0]===0x80&&bytes[1]===0x01;return true}
function makeResponse(buffer,id,isPk){const headers={'Content-Type':'application/octet-stream','Access-Control-Allow-Origin':'*','Cache-Control':'public, max-age=86400'};headers[isPk?'pkid':'fileid']=id;return new Response(buffer,{status:200,headers})}

function loadFileIndex(){
  if(indexPromise)return indexPromise;
  indexPromise=(async()=>{
    const files=new Map();
    try{const response=await withTimeout(lsRUrl,60000);if(!response.ok)throw new Error('TeX Live index unavailable');let directory=null;for(const raw of (await response.text()).split('\n')){const line=raw.trim();if(!line||line.startsWith('%'))continue;if(line.endsWith(':')){directory=line.slice(0,-1).replace(/^\.\/?/,'');if(directory.startsWith('doc')||directory.startsWith('source'))directory=null;continue}if(directory&& !files.has(line))files.set(line,directory)}}catch{indexPromise=null}
    return files
  })();return indexPromise
}
async function resolveFile(name){const files=await loadFileIndex();for(const ext of extensions){const filename=name+ext,directory=files.get(filename);if(directory)return{path:directory+'/'+filename,filename}}return null}

async function handleTexLive(request,url){
  const cache=await openTexCache(),isPk=url.pathname.includes('/pdftex/pk/'),name=decodeURIComponent(url.pathname.split('/').pop()||'');
  const cached=cache?await cache.match(request):undefined;
  if(cached){const id=cached.headers.get(isPk?'pkid':'fileid')||name;if(validFile(await cached.clone().arrayBuffer(),id,isPk))return cached;await cache.delete(request)}
  const remember=async response=>{if(cache)try{await cache.put(request,response.clone())}catch{}return response};
  if(name.endsWith('.fmt')){try{const response=await fetch(request);if(response.ok){const data=await response.arrayBuffer();if(!looksLikeHtml(data))return remember(makeResponse(data,name,false))}}catch{}}
  if(!isPk){const file=await resolveFile(name);if(file){try{const response=await withTimeout(encodeURI(staticMirror+'/'+file.path),30000);if(response.ok){const data=await response.arrayBuffer();if(validFile(data,file.filename,false))return remember(makeResponse(data,file.filename,false))}}catch{}}}
  try{const suffix=url.pathname.slice(rootPath.length+'texlive'.length),remoteUrl=fallbackMirror+suffix,response=await withTimeout(remoteUrl,30000);if(response.ok){const data=await response.arrayBuffer(),id=response.headers.get(isPk?'pkid':'fileid')||name;if(validFile(data,id,isPk))return remember(makeResponse(data,id,isPk))}}catch{}
  return new Response('',{status:404,headers:{'Access-Control-Allow-Origin':'*'}})
}

sw.addEventListener('fetch',event=>{
  const request=event.request;if(request.method!=='GET')return;
  const url=new URL(request.url);if(url.origin!==sw.location.origin||!url.pathname.startsWith(texPrefix+'pdftex/'))return;
  event.respondWith(handleTexLive(request,url).catch(()=>fetch(request)))
});
