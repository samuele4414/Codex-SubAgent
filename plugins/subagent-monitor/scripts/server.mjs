import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const pluginRoot = dirname(root);
const dataDirectory = join(pluginRoot, ".data");
const dataFile = join(dataDirectory, "events.json");
const host = "127.0.0.1";
const port = 43119;

if (!existsSync(dataDirectory)) mkdirSync(dataDirectory, { recursive: true });
if (!existsSync(dataFile)) writeFileSync(dataFile, "[]\n", "utf8");

function readEvents() {
  try { const parsed = JSON.parse(readFileSync(dataFile, "utf8")); return Array.isArray(parsed) ? parsed : []; }
  catch { return []; }
}
function saveEvents(events) { writeFileSync(dataFile, `${JSON.stringify(events, null, 2)}\n`, "utf8"); }
function send(response, status, body, type = "application/json; charset=utf-8") {
  response.writeHead(status, { "content-type": type, "cache-control": "no-store" }); response.end(body);
}
function dashboardHtml() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Subagent Monitor</title><style>:root{color-scheme:light dark;font-family:ui-sans-serif,system-ui,sans-serif;background:Canvas;color:CanvasText}body{margin:0 auto;max-width:1000px;padding:24px}header{display:flex;justify-content:space-between;gap:16px;align-items:baseline;border-bottom:1px solid GrayText;padding-bottom:16px}.muted,small{color:GrayText}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-top:20px}.card{border:1px solid GrayText;border-radius:10px;padding:14px}.row{display:flex;justify-content:space-between;gap:12px;align-items:baseline}.status{font-weight:700}.status.running{color:#b36200}.status.completed{color:#147d36}.status.failed{color:#c42b1c}.empty{margin-top:32px;color:GrayText}button{font:inherit;padding:7px 10px}code{font-family:ui-monospace,monospace}</style></head><body><header><div><h1>Subagent Monitor</h1><div class="muted">Declared activity from this Codex task</div></div><button id="clear">Clear history</button></header><section class="grid" id="summary" aria-live="polite"></section><main id="events"></main><script>const summary=document.getElementById('summary'),events=document.getElementById('events');const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));function elapsed(start,end){if(!start)return '—';const s=Math.max(0,Math.floor((new Date(end||Date.now())-new Date(start))/1000));return s<60?s+'s':Math.floor(s/60)+'m '+s%60+'s'}function render(data){const active=data.filter(x=>x.status==='running').length;summary.innerHTML='<div class="card"><div class="muted">Events</div><strong>'+data.length+'</strong></div><div class="card"><div class="muted">Active</div><strong>'+active+'</strong></div><div class="card"><div class="muted">Usage</div><strong>Not exposed</strong></div>';if(!data.length){events.innerHTML='<p class="empty">No subagent activity reported yet.</p>';return}events.innerHTML=data.slice().reverse().map(x=>'<article class="card"><div class="row"><strong>'+esc(x.role)+'</strong><span class="status '+esc(x.status)+'">'+esc(x.status)+'</span></div><p><code>'+esc(x.model)+'</code> · '+esc(x.reasoning)+' reasoning</p><div class="row"><small>'+esc(x.task||'No task label')+'</small><small>'+elapsed(x.startedAt,x.finishedAt)+'</small></div><small>Token and cost usage are not exposed by the local Codex runtime.</small></article>').join('')}async function load(){try{render(await (await fetch('/api/events')).json())}catch{events.innerHTML='<p class="empty">Monitor server unavailable.</p>'}}document.getElementById('clear').onclick=async()=>{await fetch('/api/events',{method:'DELETE'});load()};load();setInterval(load,1500);</script></body></html>`;
}

createServer((request, response) => {
  if (request.method === "GET" && request.url === "/") return send(response, 200, dashboardHtml(), "text/html; charset=utf-8");
  if (request.method === "GET" && request.url === "/api/health") return send(response, 200, '{"ok":true}');
  if (request.method === "GET" && request.url === "/api/events") return send(response, 200, JSON.stringify(readEvents()));
  if (request.method === "DELETE" && request.url === "/api/events") { saveEvents([]); return send(response, 204, ""); }
  if (request.method === "POST" && request.url === "/api/events") { let body=""; request.on("data", chunk => { body += chunk; }); request.on("end", () => { try { const event=JSON.parse(body); if(!event.id||!event.role||!event.status||!event.model||!event.reasoning) throw new Error("Missing event fields"); const events=readEvents(),index=events.findIndex(item=>item.id===event.id); if(index>=0) events[index]={...events[index],...event}; else events.push(event); saveEvents(events.slice(-200)); send(response,201,JSON.stringify(event)); } catch(error) { send(response,400,JSON.stringify({error:error.message})); } }); return; }
  send(response, 404, '{"error":"Not found"}');
}).listen(port, host, () => console.log(`Subagent Monitor: http://${host}:${port}`));
