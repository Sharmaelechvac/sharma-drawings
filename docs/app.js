"use strict";
const $ = (s) => document.querySelector(s);
let DATA = { jobs: [] };
let builderFilter = "All";
let tab = "master";
let currentSheets = null, sheetIdx = 0;

const CATS = [["master", "Master Plans"], ["elec", "Electrical"], ["hvac", "HVAC"]];
const fmtSf = (v) => (v == null ? "not on file" : v.toLocaleString("en-US") + " SF");
const setViewable = (s) => !!(s.url || (s.sheets && s.sheets.length));
const fileKey = (j) => j.address || j.name; // filed by property address; model name when no address

function naturalCompare(a, b) {
  return a.localeCompare(b, "en", { numeric: true, sensitivity: "base" });
}

function stats() {
  const jobs = DATA.jobs.filter((j) => j.sets.some((s) => s.cat === tab));
  const sets = jobs.reduce((n, j) => n + j.sets.filter((s) => s.cat === tab).length, 0);
  const view = jobs.reduce((n, j) => n + j.sets.filter((s) => s.cat === tab && setViewable(s)).length, 0);
  $("#stats").innerHTML =
    `<div class="stat"><b>${jobs.length}</b><span>Jobs filed</span></div>` +
    `<div class="stat"><b>${sets}</b><span>Drawing sets</span></div>` +
    `<div class="stat"><b>${view}</b><span>Viewable here</span></div>`;
  $("#updatedAt").textContent = DATA.updatedAt ? "Index updated " + DATA.updatedAt : "";
}

function chips() {
  const builders = ["All", ...new Set(DATA.jobs.map((j) => j.builder))];
  $("#builderChips").innerHTML = builders.map((b) =>
    `<button class="chip${b === builderFilter ? " on" : ""}" data-b="${b}">${b}</button>`).join("");
  document.querySelectorAll(".chip").forEach((c) =>
    c.addEventListener("click", () => { builderFilter = c.dataset.b; chips(); renderList(); }));
}

function matches(j, q) {
  const hay = (j.name + " " + j.builder + " " + (j.address || "")).toLowerCase();
  return hay.includes(q) && (builderFilter === "All" || j.builder === builderFilter);
}

function renderList() {
  const q = $("#search").value.trim().toLowerCase();
  const list = DATA.jobs
    .filter((j) => j.sets.some((s) => s.cat === tab))
    .filter((j) => matches(j, q))
    .sort((a, b) => naturalCompare(fileKey(a), fileKey(b)));
  $("#emptyMsg").hidden = list.length > 0;
  $("#jobList").innerHTML = list.map((j, i) => {
    const sets = j.sets.filter((s) => s.cat === tab);
    const view = sets.filter(setViewable).length;
    const miss = sets.length - view;
    return `<button class="jobcard" data-id="${j.id}" style="animation-delay:${Math.min(i * 40, 300)}ms">
      <h2>${j.address ? j.name : j.name}</h2>
      <div class="builder">${j.builder}${j.byModel ? ` · <span class="modeltag">filed by model name</span>` : ""}</div>
      ${j.address ? `<div class="addr">${j.address}</div>` : `<div class="addr">No single property address — model-level documents</div>`}
      <div class="meta">
        <span class="pill gold">${sets.length} set${sets.length === 1 ? "" : "s"}</span>
        ${view ? `<span class="pill ok">${view} viewable</span>` : ""}
        ${miss ? `<span class="pill miss">${miss} not uploaded</span>` : ""}
        <span class="pill">Living ${fmtSf(j.livingSf)}</span>
        ${j.tonnage ? `<span class="pill">${j.tonnage}</span>` : ""}
      </div></button>`;
  }).join("");
  document.querySelectorAll(".jobcard").forEach((c) =>
    c.addEventListener("click", () => openJob(c.dataset.id)));
}

function setRow(j, s, i) {
  const tags = [`<span class="pill">${s.trade}</span>`];
  if (s.rev) tags.push(`<span class="pill gold">Rev ${s.rev}</span>`);
  if (s.date) tags.push(`<span class="pill">${s.date}</span>`);
  tags.push(`<span class="pill ${setViewable(s) ? "ok" : "miss"}">${s.status}</span>`);
  let action;
  if (s.url) action = `<a class="viewbtn" href="${s.url}" target="_blank" rel="noopener">View / Print PDF</a>`;
  else if (s.sheets) action = `<button class="viewbtn" data-sheets="${j.id}:${j.sets.indexOf(s)}">View Sheets (${s.sheets.length})</button>`;
  else action = `<div class="officenote">Not uploaded yet — see status above.</div>`;
  let revs = "";
  if (s.revisions) {
    revs = `<div class="revhist"><div class="revtitle">Revision history</div>` +
      s.revisions.map((r) =>
        `<div class="revrow"><span class="pill ${r.status === "Current" ? "gold" : "miss"}">${r.label} — ${r.status}</span>` +
        (r.url ? `<a class="revlink" href="${r.url}" target="_blank" rel="noopener">View</a>` : "") + `</div>`).join("") + `</div>`;
  } else if (!s.rev) {
    revs = `<div class="revhist"><div class="revtitle">Revision: not numbered on file</div></div>`;
  }
  return `<div class="setrow"><h3>${s.name}</h3><div class="kind">${s.kind}</div>
    <div class="tags">${tags.join("")}</div>${action}${revs}</div>`;
}

function openJob(id) {
  const j = DATA.jobs.find((x) => x.id === id);
  if (!j) return;
  $("#jobList").hidden = true; $(".controls").style.display = "none"; $("#stats").style.display = "none"; $("#tabBar").style.display = "none";
  $("#jobView").hidden = false;
  const details =
    `<div class="details">
       <div class="detail"><span>Living SF</span><b>${fmtSf(j.livingSf)}</b></div>
       <div class="detail"><span>Under Roof SF</span><b>${fmtSf(j.underRoofSf)}</b></div>
       <div class="detail"><span>Tonnage (HVAC)</span><b>${j.tonnage || "not on file"}</b></div>
       <div class="detail"><span>Service size (Electrical)</span><b>${j.serviceSize || "not on file"}</b></div>
     </div>`;
  const groups = CATS.map(([cat, label]) => {
    const sets = j.sets.filter((s) => s.cat === cat);
    if (!sets.length) return "";
    return `<h3 class="grouphead">${label}</h3>` + sets.map((s) => setRow(j, s)).join("");
  }).join("");
  $("#jobDetail").innerHTML =
    `<h2>${j.name}</h2><div class="builder">${j.builder}</div>` +
    (j.address ? `<div class="addr">${j.address}</div>` : `<div class="addr">Filed by model name — no single property address</div>`) +
    details + groups;
  document.querySelectorAll("[data-sheets]").forEach((b) =>
    b.addEventListener("click", () => {
      const [jid, idx] = b.dataset.sheets.split(":");
      openSheets(DATA.jobs.find((x) => x.id === jid).sets[+idx]);
    }));
  window.scrollTo({ top: 0 });
}

function closeJob() {
  $("#jobView").hidden = true;
  $("#jobList").hidden = false; $(".controls").style.display = ""; $("#stats").style.display = ""; $("#tabBar").style.display = "";
}

function openSheets(set) {
  currentSheets = set; sheetIdx = 0;
  $("#sheetTitle").textContent = set.name;
  $("#sheetViewer").hidden = false;
  showSheet();
}
function showSheet() {
  $("#sheetImg").src = currentSheets.sheets[sheetIdx];
  $("#sheetCount").textContent = `Sheet ${sheetIdx + 1} of ${currentSheets.sheets.length}`;
  $("#sheetPrev").disabled = sheetIdx === 0;
  $("#sheetNext").disabled = sheetIdx === currentSheets.sheets.length - 1;
}

async function load() {
  const r = await fetch("data.json?ts=" + Date.now());
  DATA = await r.json();
  stats(); chips(); renderList();
}

document.querySelectorAll(".tab").forEach((t) =>
  t.addEventListener("click", () => {
    tab = t.dataset.tab;
    document.querySelectorAll(".tab").forEach((x) => x.classList.toggle("on", x === t));
    stats(); renderList();
  }));
$("#search").addEventListener("input", renderList);
$("#backBtn").addEventListener("click", closeJob);
$("#refreshBtn").addEventListener("click", (e) => {
  e.currentTarget.classList.remove("spin"); void e.currentTarget.offsetWidth;
  e.currentTarget.classList.add("spin"); load();
});
$("#themeBtn").addEventListener("click", () => {
  const h = document.documentElement;
  h.dataset.theme = h.dataset.theme === "dark" ? "light" : "dark";
});
$("#sheetClose").addEventListener("click", () => { $("#sheetViewer").hidden = true; });
$("#sheetPrev").addEventListener("click", () => { if (sheetIdx > 0) { sheetIdx--; showSheet(); } });
$("#sheetNext").addEventListener("click", () => { if (sheetIdx < currentSheets.sheets.length - 1) { sheetIdx++; showSheet(); } });
document.addEventListener("keydown", (e) => {
  if ($("#sheetViewer").hidden) return;
  if (e.key === "Escape") $("#sheetViewer").hidden = true;
  if (e.key === "ArrowLeft") $("#sheetPrev").click();
  if (e.key === "ArrowRight") $("#sheetNext").click();
});

load();
