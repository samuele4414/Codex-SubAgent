import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const pluginRoot = dirname(root);
const dataDirectory = join(pluginRoot, ".data");
const dataFile = join(dataDirectory, "events.json");
const windowFile = join(dataDirectory, "window.json");
const host = "127.0.0.1";
const port = Number(process.env.SUBAGENT_MONITOR_PORT || 43119);
const fiveHoursMs = 5 * 60 * 60 * 1000;

if (!existsSync(dataDirectory)) mkdirSync(dataDirectory, { recursive: true });
if (!existsSync(dataFile)) writeFileSync(dataFile, "[]\n", "utf8");

function readJson(file, fallback) {
  try { return JSON.parse(readFileSync(file, "utf8")); } catch { return fallback; }
}
function readEvents() { const parsed = readJson(dataFile, []); return Array.isArray(parsed) ? parsed : []; }
function saveEvents(events) { writeFileSync(dataFile, `${JSON.stringify(events, null, 2)}\n`, "utf8"); }
function readWindow() { const value = readJson(windowFile, null); return value?.startedAt && value?.endsAt ? value : null; }
function saveWindow(value) { writeFileSync(windowFile, `${JSON.stringify(value, null, 2)}\n`, "utf8"); }
function clearData() { saveEvents([]); if (existsSync(windowFile)) writeFileSync(windowFile, "null\n", "utf8"); }
function asDate(value) { const date = new Date(value); return Number.isNaN(date.valueOf()) ? null : date; }
function isoAfter(date, milliseconds) { return new Date(date.valueOf() + milliseconds).toISOString(); }
function durationSeconds(event) {
  const start = asDate(event.startedAt), end = asDate(event.finishedAt);
  return start && end ? Math.max(0, Math.round((end - start) / 1000)) : null;
}
function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b), middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}
function ensureWindow(startedAt) {
  const now = asDate(startedAt) || new Date();
  const current = readWindow();
  if (current && asDate(current.endsAt)?.valueOf() > now.valueOf()) return current;
  const window = { startedAt: now.toISOString(), endsAt: isoAfter(now, fiveHoursMs), source: "first declared subagent start" };
  saveWindow(window);
  return window;
}
function windowFromHistory(events) {
  const current = readWindow();
  if (current) return current;
  const starts = events.map(event => asDate(event.startedAt)).filter(Boolean);
  if (!starts.length) return null;
  const firstStart = new Date(Math.min(...starts.map(date => date.valueOf())));
  const window = { startedAt: firstStart.toISOString(), endsAt: isoAfter(firstStart, fiveHoursMs), source: "earliest existing declared subagent start" };
  saveWindow(window);
  return window;
}
function summary(events) {
  const now = new Date();
  const window = windowFromHistory(events);
  const endsAt = asDate(window?.endsAt);
  const remainingSeconds = endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : null;
  const completed = events.filter(event => event.status === "completed" && durationSeconds(event) !== null);
  const samplesFor = event => completed
    .filter(sample => sample.role === event.role && sample.model === event.model && sample.reasoning === event.reasoning)
    .map(durationSeconds);
  const projections = events.filter(event => event.status === "started").map(event => {
    const samples = samplesFor(event), expectedDurationSeconds = median(samples), startedAt = asDate(event.startedAt);
    return {
      id: event.id,
      sampleCount: samples.length,
      expectedDurationSeconds,
      projectedFinishAt: expectedDurationSeconds !== null && startedAt ? isoAfter(startedAt, expectedDurationSeconds * 1000) : null
    };
  });
  return {
    observationWindow: window ? {
      ...window,
      durationSeconds: fiveHoursMs / 1000,
      remainingSeconds,
      expired: remainingSeconds === 0,
      disclaimer: "This is an observation window started by the first declared subagent run. It is not the Codex quota window, which the local runtime does not expose."
    } : null,
    activity: {
      declaredRuns: events.length,
      activeRuns: events.filter(event => event.status === "started").length,
      completedRuns: completed.length,
      observedElapsedSeconds: completed.reduce((total, event) => total + durationSeconds(event), 0),
      disclaimer: "Observed elapsed time is wall-clock time per declared run. Concurrent runs can overlap, so it is not quota consumption."
    },
    usage: {
      inputTokens: "unavailable",
      outputTokens: "unavailable",
      cost: "unavailable",
      disclaimer: "The local Codex runtime does not expose token counts, cost, or quota consumption. This monitor never estimates them."
    },
    projections: {
      method: "median elapsed duration of completed runs with the same declared role, model, and reasoning",
      disclaimer: "Time projections are historical wall-clock estimates only. They do not predict tokens, cost, or Codex quota usage.",
      activeRuns: projections
    }
  };
}
function send(response, status, body, type = "application/json; charset=utf-8") {
  response.writeHead(status, { "content-type": type, "cache-control": "no-store" }); response.end(body);
}
function dashboardHtml() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Subagent Monitor</title><style>:root{color-scheme:light dark;font-family:ui-sans-serif,system-ui,sans-serif;background:Canvas;color:CanvasText}body{margin:0 auto;max-width:1100px;padding:24px}header{display:flex;justify-content:space-between;gap:16px;align-items:baseline;border-bottom:1px solid GrayText;padding-bottom:16px}.muted,small{color:GrayText}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-top:20px}.card{border:1px solid GrayText;border-radius:10px;padding:14px}.row{display:flex;justify-content:space-between;gap:12px;align-items:baseline}.status{font-weight:700}.status.running{color:#b36200}.status.completed{color:#147d36}.status.failed{color:#c42b1c}.empty{margin-top:32px;color:GrayText}button{font:inherit;padding:7px 10px}code{font-family:ui-monospace,monospace}h2{margin:28px 0 8px;font-size:1.1rem}.notice{border-left:4px solid GrayText;padding:10px 12px;margin-top:20px;background:color-mix(in srgb,CanvasText 5%,Canvas)}</style></head><body><header><div><h1>Subagent Monitor</h1><div class="muted">Declared activity from this Codex task</div></div><button id="clear">Clear history</button></header><p class="notice">Token input/output, costs, and the real Codex quota window are unavailable in the local runtime. This dashboard records declared activity only and never estimates usage.</p><section class="grid" id="summary" aria-live="polite"></section><main id="events"></main><script>const summary=document.getElementById('summary'),events=document.getElementById('events');const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));function elapsed(seconds){if(seconds===null||seconds===undefined)return '—';const s=Math.max(0,Math.floor(seconds));return s<60?s+'s':Math.floor(s/60)+'m '+s%60+'s'}function duration(start,end){return start?elapsed(Math.floor(((new Date(end||Date.now()))-new Date(start))/1000)):'—'}function stamp(value){return value?new Date(value).toLocaleString():'Not started'}function projectionFor(stats,id){return stats.projections.activeRuns.find(p=>p.id===id)}function render(data,stats){const w=stats.observationWindow,a=stats.activity;summary.innerHTML='<div class="card"><div class="muted">Declared runs</div><strong>'+a.declaredRuns+'</strong><small>'+a.activeRuns+' active · '+a.completedRuns+' completed</small></div><div class="card"><div class="muted">5-hour observation window</div><strong>'+ (w?elapsed(w.remainingSeconds):'Not started')+'</strong><small>'+ (w?'Ends '+esc(stamp(w.endsAt)):'Starts with the first declared run')+'</small></div><div class="card"><div class="muted">Observed elapsed time</div><strong>'+elapsed(a.observedElapsedSeconds)+'</strong><small>Run durations can overlap</small></div><div class="card"><div class="muted">Token / cost usage</div><strong>Unavailable</strong><small>Never estimated</small></div>';const projection=stats.projections.activeRuns;if(projection.length)events.innerHTML='<h2>Time projections</h2>'+projection.map(p=>'<article class="card"><strong>Run '+esc(p.id)+'</strong><p>'+ (p.expectedDurationSeconds===null?'No matching completed runs yet.':esc(elapsed(p.expectedDurationSeconds))+' median from '+p.sampleCount+' matching run(s); projected finish '+esc(stamp(p.projectedFinishAt)))+'</p><small>Historical wall-clock estimate only; not a token, cost, or quota forecast.</small></article>').join('');else events.innerHTML='';events.innerHTML+='<h2>Declared runs</h2>'+(!data.length?'<p class="empty">No subagent activity reported yet.</p>':data.slice().reverse().map(x=>'<article class="card"><div class="row"><strong>'+esc(x.role)+'</strong><span class="status '+esc(x.status)+'">'+esc(x.status)+'</span></div><p><code>'+esc(x.model)+'</code> · '+esc(x.reasoning)+' reasoning</p><div class="row"><small>'+esc(x.task||'No task label')+'</small><small>'+duration(x.startedAt,x.finishedAt)+'</small></div><small>Declared metadata; token and cost usage are unavailable.</small></article>').join(''))}async function load(){try{const [data,stats]=await Promise.all([fetch('/api/events').then(r=>r.json()),fetch('/api/summary').then(r=>r.json())]);render(data,stats)}catch{events.innerHTML='<p class="empty">Monitor server unavailable.</p>'}}document.getElementById('clear').onclick=async()=>{await fetch('/api/events',{method:'DELETE'});load()};load();setInterval(load,1500);</script></body></html>`;
}
function windowBoundsScript() {
  return `<script>(()=>{const target=document.getElementById('summary'),format=value=>new Date(value).toLocaleString();async function showBounds(){try{const window=(await fetch('/api/summary').then(response=>response.json())).observationWindow,card=[...target.querySelectorAll('.card')].find(item=>item.textContent.includes('5-hour observation window'));if(!window||!card)return;const detail=card.querySelector('small');if(detail)detail.textContent='Starts '+format(window.startedAt)+' · Ends '+format(window.endsAt)}catch{}}new MutationObserver(showBounds).observe(target,{childList:true});showBounds()})()</script>`;
}

createServer((request, response) => {
  if (request.method === "GET" && request.url === "/") return send(response, 200, dashboardHtml().replace("</body>", `${windowBoundsScript()}</body>`), "text/html; charset=utf-8");
  if (request.method === "GET" && request.url === "/api/health") return send(response, 200, '{"ok":true}');
  if (request.method === "GET" && request.url === "/api/events") return send(response, 200, JSON.stringify(readEvents()));
  if (request.method === "GET" && request.url === "/api/summary") return send(response, 200, JSON.stringify(summary(readEvents())));
  if (request.method === "DELETE" && request.url === "/api/events") { clearData(); return send(response, 204, ""); }
  if (request.method === "POST" && request.url === "/api/events") { let body=""; request.on("data", chunk => { body += chunk; }); request.on("end", () => { try { const event=JSON.parse(body); if(!event.id||!event.role||!event.status||!event.model||!event.reasoning) throw new Error("Missing event fields"); if(!["started","completed","failed"].includes(event.status)) throw new Error("Invalid status"); if(event.status === "started") ensureWindow(event.startedAt); const events=readEvents(),index=events.findIndex(item=>item.id===event.id); if(index>=0) events[index]={...events[index],...event,task:event.task || events[index].task}; else events.push(event); saveEvents(events.slice(-200)); send(response,201,JSON.stringify(event)); } catch(error) { send(response,400,JSON.stringify({error:error.message})); } }); return; }
  send(response, 404, '{"error":"Not found"}');
}).listen(port, host, () => console.log(`Subagent Monitor: http://${host}:${port}`));
