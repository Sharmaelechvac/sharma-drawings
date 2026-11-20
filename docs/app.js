"use strict";
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

let DATA = { jobs: [] };
let tab = "electrical";
let builderFilter = "All";
const tabState = {}; // per-tab {q, scroll}
let currentJob = null;

const TABS = { electrical: "Electrical", hvac: "HVAC", master: "Master Plans", archive: "Archive" };
const TAB_ICONS = {
  electrical: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M13.2 2.3 4.9 13.4c-.28.38.02 1 .5 1h4.9l-1.5 6.3c-.12.5.55.8.88.4l8.3-11.1c.28-.38-.02-1-.5-1h-4.9l1.5-6.3c.12-.5-.55-.8-.88-.4z"/></svg>',
  hvac: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><path d="M12 10.4c.2-2.5-.3-5.4-1.9-6.2C8.6 3.4 7 4.6 7.3 6.4c.3 2 2.4 3.6 4.7 4zM13.6 12c2.5.2 5.4-.3 6.2-1.9.8-1.5-.4-3.1-2.2-2.8-2 .3-3.6 2.4-4 4.7zM12 13.6c-.2 2.5.3 5.4 1.9 6.2 1.5.8 3.1-.4 2.8-2.2-.3-2-2.4-3.6-4.7-4zM10.4 12c-2.5-.2-5.4.3-6.2 1.9-.8 1.5.4 3.1 2.2 2.8 2-.3 3.6-2.4 4-4.7z"/></svg>',
  master: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21V5.5A1.5 1.5 0 0 1 5.5 4h8A1.5 1.5 0 0 1 15 5.5V21"/><path d="M15 9.5h3.5A1.5 1.5 0 0 1 20 11v10"/><path d="M2.5 21h19"/><path d="M7.5 8h4M7.5 12h4M7.5 16h4"/></svg>',
  archive: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 4.5h17V9h-17z"/><path d="M5 9v9.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V9"/><path d="M10 13h4"/></svg>'
};
const GROUPS = [["master", "MASTER PLANS"], ["electrical", "ELECTRICAL"], ["hvac", "HVAC"]];
const fmtSf = (v) => (v == null ? "not on file" : Number(v).toLocaleString("en-US") + " SF");
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const setImages = (s) => s.images || s.sheets || [];
const setViewable = (s) => !!(s.url || setImages(s).length);
const hasPart = (s, d) => (s.parts || []).some((p) => p.discipline === d && p.url);

function setRelevant(s, t) {
  if (t === "archive") return !!s.archived;
  if (s.archived) return false;
  if (t === "electrical") return s.group === "electrical" || hasPart(s, "Electrical");
  if (t === "hvac") return s.group === "hvac" || hasPart(s, "Mechanical");
  if (t === "master")
    return s.group === "master" || (s.parts || []).some((p) => p.discipline !== "Electrical" && p.discipline !== "Mechanical");
  return false;
}
const jobRelevant = (j, t) => (j.sets || []).some((s) => setRelevant(s, t));

/* ---------------- data ---------------- */
async function loadData(spin) {
  if (spin) $("#refreshBtn").classList.add("spin");
  try {
    const r = await fetch("data.json?ts=" + Date.now(), { cache: "no-store" });
    DATA = await r.json();
  } catch (e) { /* keep last good copy */ }
  if (spin) setTimeout(() => $("#refreshBtn").classList.remove("spin"), 750);
  renderList();
  if (currentJob) renderDetail(currentJob, false);
}

/* ---------------- list ---------------- */
function visibleJobs() {
  const q = ($("#search").value || "").trim().toLowerCase();
  return DATA.jobs.filter((j) => {
    if (!jobRelevant(j, tab)) return false;
    if (builderFilter !== "All" && j.builder !== builderFilter) return false;
    if (!q) return true;
    const hay = [j.key, j.name, j.builder, j.address, j.model].join(" ").toLowerCase();
    return q.split(/\s+/).every((w) => hay.includes(w));
  });
}

function renderChips() {
  const builders = ["All", ...new Set(DATA.jobs.filter((j) => jobRelevant(j, tab)).map((j) => j.builder).filter(Boolean))].sort(
    (a, b) => (a === "All" ? -1 : b === "All" ? 1 : a.localeCompare(b))
  );
  if (!builders.includes(builderFilter)) builderFilter = "All";
  $("#chips").innerHTML = builders
    .map((b) => `<button class="chip${b === builderFilter ? " on" : ""}" data-b="${esc(b)}">${esc(b)}</button>`)
    .join("");
  $$("#chips .chip").forEach((c) =>
    c.addEventListener("click", () => { builderFilter = c.dataset.b; renderList(); })
  );
}

function renderList() {
  $$("#tabbar .tab").forEach((b) => b.classList.toggle("on", b.dataset.tab === tab));
  $("#largeTitle").textContent = tab === "archive" ? "Archive" : "Drawings & Prints";
  renderChips();
  const jobs = visibleJobs();
  const setCount = jobs.reduce((n, j) => n + j.sets.filter((s) => setRelevant(s, tab)).length, 0);
  $("#largeSub").textContent =
    tab === "archive"
      ? `${jobs.length} job${jobs.length === 1 ? "" : "s"} · ${setCount} archived set${setCount === 1 ? "" : "s"}`
      : `${TABS[tab]} · ${jobs.length} job${jobs.length === 1 ? "" : "s"} · ${setCount} set${setCount === 1 ? "" : "s"} on file`;
  const body = $("#listBody");
  if (!jobs.length) {
    body.innerHTML = `<div class="empty">${tab === "archive" ? "Nothing archived yet." : "No jobs match."}</div>`;
    return;
  }
  body.innerHTML =
    `<div class="group" style="margin-top:14px">` +
    jobs
      .map((j) => {
        const n = j.sets.filter((s) => setRelevant(s, tab)).length;
        return `<button class="row" data-job="${esc(j.id)}">
          <div class="row-thumb">${TAB_ICONS[tab] || TAB_ICONS.master}</div>
          <div class="row-main">
            <div class="row-title">${esc(j.key)}</div>
            <div class="row-sub">${esc(j.builder || "")}${j.model ? " · " + esc(j.model) : ""}</div>
          </div>
          <div class="row-side"><span>${n} set${n === 1 ? "" : "s"}</span>
            <span class="chev"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9.5 5.5 6.5 6.5-6.5 6.5"/></svg></span>
          </div></button>`;
      })
      .join("") +
    `</div>`;
  $$("#listBody .row").forEach((r) => {
    r.addEventListener("touchstart", () => r.classList.add("pressing"), { passive: true });
    r.addEventListener("touchend", () => setTimeout(() => r.classList.remove("pressing"), 120));
    r.addEventListener("click", () => openJob(r.dataset.job));
  });
}

/* ---------------- detail ---------------- */
function detailRow(k, v, nofile) {
  return `<div class="kv"><span class="k">${esc(k)}</span><span class="v${nofile ? " nofile" : ""}">${esc(v)}</span></div>`;
}

function setHtml(j, s) {
  const parts = (s.parts || []).filter((p) => p.url);
  const meta = [];
  if (s.rev) meta.push(`<span class="pill rev">${esc(s.rev)}</span>`);
  if (s.date) meta.push(`<span class="pill">${esc(s.date)}</span>`);
  if (s.statusLabel) meta.push(`<span class="pill no">${esc(s.statusLabel)}</span>`);
  else
    meta.push(
      setViewable(s) || parts.length
        ? `<span class="pill ok">On file</span>`
        : `<span class="pill no">${esc(s.status || "Not uploaded")}</span>`
    );
  let h = `<div class="set"><div class="set-head"><div class="set-main">
    <div class="set-name">${esc(s.name)}</div>
    ${meta.length ? `<div class="set-meta">${meta.join("")}</div>` : ""}
    </div>`;
  if (s.url) h += `<button class="view-btn" data-view="${esc(s.url)}" data-title="${esc(s.name)}">View</button>`;
  else if (setImages(s).length)
    h += `<button class="view-btn" data-sheets="${esc(j.id)}|${esc(s.name)}">View</button>`;
  h += `</div>`;
  if (s.note) h += `<div class="set-note">${esc(s.note)}</div>`;
  if (parts.length) {
    h += `<div class="parts">` + parts.map((p) =>
      `<div class="part"><div class="part-main">
         <div class="part-name">${esc(p.discipline)}</div>
         <div class="part-sub">${p.pages ? p.pages + " pp" : ""}${p.sheets && p.sheets.length ? " · " + esc(p.sheets.join(", ")) : ""}</div>
       </div><button class="part-btn" data-view="${esc(p.url)}" data-title="${esc(s.name + " — " + p.discipline)}">View</button></div>`
    ).join("") + `</div>`;
  }
  if (!s.rev && !(s.history || []).length) h += `<div class="archived-note">Revision: not numbered on file</div>`;
  if ((s.history || []).length) {
    h += `<div class="history"><div class="h-title">Revision history</div>` +
      s.history.map((x) =>
        `<div class="h-row"><span class="pill rev">${esc(x.rev || "—")}</span><span class="grow">${esc(x.label || "")}</span><span style="color:var(--label-2)">${esc(x.date || "")}</span>${x.url ? `<button class="h-open" data-view="${esc(x.url)}" data-title="${esc(x.label || s.name)}">Open</button>` : ""}</div>`
      ).join("") + `</div>`;
  }
  if (s.archived) h += `<div class="archived-note">Archived — kept on file, no longer the working set.</div>`;
  return h + `</div>`;
}

function renderDetail(j, animate) {
  const d = j.details || {};
  let h = `<div class="detail-head"><h2>${esc(j.key)}</h2>
    <div class="detail-sub">${esc(j.builder || "")}${j.name && j.name !== j.key ? " · " + esc(j.name) : ""}</div>
    ${j.byModel ? `<span class="model-tag">Filed by model — no street address</span>` : ""}
  </div>`;
  h += `<div class="group-label">Details</div><div class="group">`;
  h += detailRow("Living SF", fmtSf(d.livingSf), d.livingSf == null);
  h += detailRow("Under Roof SF", fmtSf(d.underRoofSf), d.underRoofSf == null);
  h += detailRow("Tonnage", d.tonnage || "not on file", !d.tonnage);
  h += detailRow("Service size", d.service || "not on file", !d.service);
  (d.extra || []).forEach((x) => { h += detailRow(x[0], x[1], false); });
  h += `</div>`;
  const live = (j.sets || []).filter((s) => !s.archived);
  const arch = (j.sets || []).filter((s) => s.archived);
  for (const [g, label] of GROUPS) {
    const sets = live.filter((s) => (s.group || "master") === g);
    if (!sets.length) continue;
    h += `<div class="group-label">${label}</div><div class="group">` + sets.map((s) => setHtml(j, s)).join("") + `</div>`;
  }
  if (arch.length) {
    h += `<div class="group-label">ARCHIVED</div><div class="group">` + arch.map((s) => setHtml(j, s)).join("") + `</div>`;
  }
  h += `<footer class="foot">Sharma Electric &amp; HVAC · EC13013924 · CAC1823596</footer>`;
  const dv = $("#detailView");
  dv.innerHTML = h;
  dv.hidden = false;
  requestAnimationFrame(() => dv.classList.add("open"));
  dv.scrollTop = 0;
  $$("#detailView [data-view]").forEach((b) =>
    b.addEventListener("click", () => openViewer(b.dataset.title, { url: b.dataset.view }))
  );
  $$("#detailView [data-sheets]").forEach((b) =>
    b.addEventListener("click", () => {
      const [jid, sname] = b.dataset.sheets.split("|");
      const job = DATA.jobs.find((x) => x.id === jid);
      const set = job && job.sets.find((x) => x.name === sname);
      if (set) openViewer(set.name, { images: setImages(set) });
    })
  );
  $("#backBtn").hidden = false;
  $("#barLogo").style.visibility = "hidden";
  $("#backLabel").textContent = TABS[tab];
  $("#barTitle").textContent = j.key;
  $("#bar").classList.add("show-title");
}

function openJob(id) {
  const j = DATA.jobs.find((x) => x.id === id);
  if (!j) return;
  currentJob = j;
  tabState[tab] = tabState[tab] || {};
  tabState[tab].scroll = $("#listView").scrollTop;
  renderDetail(j, true);
}

function closeJob() {
  const dv = $("#detailView");
  dv.classList.remove("open");
  setTimeout(() => { dv.hidden = true; }, 360);
  currentJob = null;
  $("#backBtn").hidden = true;
  $("#barLogo").style.visibility = "";
  $("#barTitle").textContent = "Drawings & Prints";
  $("#listView").scrollTop = (tabState[tab] || {}).scroll || 0;
  onListScroll();
}

/* ---------------- viewer ---------------- */
let chromeTimer = null;
function openViewer(title, src) {
  const v = $("#viewer");
  $("#viewerTitle").textContent = title;
  const body = $("#viewerBody");
  const counter = $("#viewerCounter");
  if (src.images && src.images.length) {
    body.innerHTML = `<div class="pager" id="pager">` + src.images.map((u) => `<div class="page"><img src="${esc(u)}" alt=""></div>`).join("") + `</div>`;
    $("#viewerOpen").href = src.images[0];
    const upd = () => {
      const p = $("#pager");
      const i = Math.round(p.scrollLeft / p.clientWidth);
      counter.textContent = `Sheet ${i + 1} of ${src.images.length}`;
    };
    $("#pager").addEventListener("scroll", () => requestAnimationFrame(upd), { passive: true });
    counter.hidden = false; upd();
  } else {
    body.innerHTML = `<iframe src="${esc(src.url)}" title="${esc(title)}"></iframe>`;
    $("#viewerOpen").href = src.url;
    counter.hidden = true;
  }
  v.hidden = false;
  v.classList.remove("chrome-off");
  pokeChrome();
}
function pokeChrome() {
  const v = $("#viewer");
  v.classList.remove("chrome-off");
  clearTimeout(chromeTimer);
  chromeTimer = setTimeout(() => v.classList.add("chrome-off"), 2600);
}
function closeViewer() {
  $("#viewer").hidden = true;
  $("#viewerBody").innerHTML = "";
  clearTimeout(chromeTimer);
}

/* ---------------- chrome / events ---------------- */
function onListScroll() {
  const y = $("#listView").scrollTop;
  $("#bar").classList.toggle("scrolled", y > 4);
  if (!currentJob) $("#bar").classList.toggle("show-title", y > 46);
}
$("#listView").addEventListener("scroll", onListScroll, { passive: true });
$("#detailView").addEventListener("scroll", () => $("#bar").classList.toggle("scrolled", $("#detailView").scrollTop > 4), { passive: true });

$$("#tabbar .tab").forEach((b) =>
  b.addEventListener("click", () => {
    if (currentJob) closeJob();
    tabState[tab] = tabState[tab] || {};
    tabState[tab].q = $("#search").value;
    tabState[tab].scroll = $("#listView").scrollTop;
    tab = b.dataset.tab;
    builderFilter = "All";
    $("#search").value = (tabState[tab] || {}).q || "";
    $("#searchClear").hidden = !$("#search").value;
    renderList();
    $("#listView").scrollTop = (tabState[tab] || {}).scroll || 0;
    onListScroll();
  })
);
$("#search").addEventListener("input", () => {
  $("#searchClear").hidden = !$("#search").value;
  renderList();
});
$("#searchClear").addEventListener("click", () => {
  $("#search").value = ""; $("#searchClear").hidden = true; renderList();
});
$("#backBtn").addEventListener("click", closeJob);
$("#refreshBtn").addEventListener("click", () => loadData(true));
$("#themeBtn").addEventListener("click", () => {
  const el = document.documentElement;
  const next = el.dataset.theme === "dark" ? "light" : "dark";
  el.dataset.theme = next;
  try { localStorage.setItem("drawings-theme", next); } catch (e) {}
});
$("#viewerClose").addEventListener("click", closeViewer);
$("#viewerBody").addEventListener("click", pokeChrome);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { if (!$("#viewer").hidden) closeViewer(); else if (currentJob) closeJob(); }
});
try {
  const saved = localStorage.getItem("drawings-theme");
  if (saved) document.documentElement.dataset.theme = saved;
} catch (e) {}

loadData(false);
