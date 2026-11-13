let JOBS = [];
let BUILDERS = [];

function esc(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function fmtDate(iso){
  if(!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
}
function docCard(d, kind){
  const badges = [];
  if(kind==='original') badges.push('<span class="badge orig">ORIGINAL PLANS</span>');
  if(d.revision) badges.push('<span class="badge rev">REV ' + esc(d.revision) + '</span>');
  if(d.status) badges.push('<span class="badge draft">' + esc(d.status) + '</span>');
  if(d.approval) badges.push('<span class="badge appr">✓ ' + esc(d.approval) + '</span>');
  const bits = [];
  if(d.source) bits.push(esc(d.source));
  if(d.planDate) bits.push('Plan date: ' + fmtDate(d.planDate));
  if(d.setDate) bits.push('Set date: ' + fmtDate(d.setDate));
  if(d.sheets) bits.push('Sheets: ' + d.sheets.map(esc).join(', '));
  if(d.pages) bits.push(d.pages + ' pages');
  if(d.sizeMB) bits.push(d.sizeMB + ' MB · PDF');
  return '<div class="doc">' +
    '<div>' + badges.join('') + '</div>' +
    '<div class="fname" style="margin-top:6px">' + esc(d.label || d.fileName) + '</div>' +
    '<div class="ddet">' + esc(d.fileName) + (bits.length ? '<br>' + bits.join(' · ') : '') + '</div>' +
    '<div class="btns">' +
      '<a class="btn view" href="' + esc(d.path) + '" target="_blank" rel="noopener">View PDF</a>' +
      '<a class="btn dl" href="' + esc(d.path) + '" download="' + esc(d.fileName) + '">Download</a>' +
    '</div></div>';
}
function render(filter){
  const q = (filter||'').trim().toLowerCase();
  const wrap = document.getElementById('jobs');
  const shown = JOBS.filter(j => !q || [j.jobName, j.address, j.builder, j.builderContacts].join(' ').toLowerCase().includes(q));
  document.getElementById('count').textContent = shown.length + (shown.length===1 ? ' job filed' : ' jobs filed');
  document.getElementById('empty').hidden = shown.length > 0;
  wrap.innerHTML = shown.map(j =>
    '<article class="job">' +
      '<h2>' + esc(j.jobName) + '</h2>' +
      '<div class="addr">' + esc(j.address) + '</div>' +
      '<div class="meta">Builder: ' + esc(j.builder) + (j.builderContacts ? ' · ' + esc(j.builderContacts) : '') +
        '<br>Filed: ' + fmtDate(j.dateFiled) + '</div>' +
      '<div class="section"><h3>ORIGINAL PLANS — AS RECEIVED</h3>' +
        (j.originals||[]).map(d => docCard(d,'original')).join('') + '</div>' +
      '<div class="section"><h3>SHARMA DRAWING SETS — BY REVISION</h3>' +
        (j.sharmaSets||[]).map(d => docCard(d,'sharma')).join('') +
        (j.nextRevision ? '<p class="revnote">Next revision: ' + esc(j.nextRevision) + '</p>' : '') + '</div>' +
      (j.builderSlug ? '<a class="masterlink" href="' + esc(j.builderSlug) + '/">Filed under the ' + esc(j.builder) + ' master page →</a>' : '') +
    '</article>'
  ).join('');
}
function renderBuilders(){
  const wrap = document.getElementById('builders');
  if(!BUILDERS.length){ wrap.innerHTML=''; return; }
  wrap.innerHTML = '<div class="builders"><h3>BUILDER MASTER PAGES</h3>' + BUILDERS.map(b => {
    const n = JOBS.filter(j => j.builder === b.name).length;
    return '<a class="bcard" href="' + esc(b.slug) + '/">' +
      (b.slug === 'nok-construction' ? '<img src="assets/nok-logo.png" alt="">' : '') +
      '<span><span class="bname">' + esc(b.name) + '</span>' +
      '<span class="bmeta" style="display:block">Contacts: ' + esc(b.contacts) + '<br>' + n + (n===1 ? ' job' : ' jobs') + ' filed</span></span>' +
      '<span class="go">›</span></a>';
  }).join('') + '</div><h3 class="jobshead">ALL JOBS</h3>';
}
fetch('data.json').then(r => r.json()).then(data => {
  JOBS = data.jobs || [];
  BUILDERS = data.builders || [];
  renderBuilders();
  render('');
}).catch(() => {
  document.getElementById('count').textContent = 'Could not load the job list.';
});
document.getElementById('search').addEventListener('input', e => render(e.target.value));
