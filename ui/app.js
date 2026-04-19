// ============ Book data ============
const COVERS = [
  { t: "Meditations", a: "Marcus Aurelius", bg: "#2E2A24", fg: "#D4A15F", serif: true, mark: "M·A", ornType: "rule" },
  { t: "Pride and Prejudice", a: "Jane Austen", bg: "#7A3A4A", fg: "#F5E8D5", mark: "1813", ornType: "rule" },
  { t: "The Great Gatsby", a: "F. Scott Fitzgerald", bg: "#1C3A4F", fg: "#D4A15F", mark: "1925", ornType: "diamond" },
  { t: "1984", a: "George Orwell", bg: "#1A1A1A", fg: "#C44536", mark: "Vol. I", ornType: "rule" },
  { t: "Frankenstein", a: "Mary Shelley", bg: "#2C3A2E", fg: "#E8D9B8", mark: "1818", ornType: "rule" },
  { t: "Jane Eyre", a: "Charlotte Brontë", bg: "#4A2E3E", fg: "#E6D5B8", mark: "Vol. II", ornType: "rule" },
  { t: "Walden", a: "Henry D. Thoreau", bg: "#3E4A2E", fg: "#E6D5B8", mark: "Essay", ornType: "diamond" },
  { t: "Dracula", a: "Bram Stoker", bg: "#2A1A1A", fg: "#A8452F", mark: "1897", ornType: "rule" },
  { t: "Wuthering Heights", a: "Emily Brontë", bg: "#3A3A4A", fg: "#D4C6A8", mark: "1847", ornType: "rule" },
  { t: "The Iliad", a: "Homer", bg: "#5A3A1A", fg: "#E6C88A", mark: "Bk. I", ornType: "diamond" },
  { t: "Essays", a: "Michel de Montaigne", bg: "#3A2E1A", fg: "#C69A5A", mark: "Livre I", ornType: "rule" },
  { t: "Moby-Dick", a: "Herman Melville", bg: "#1A2E3A", fg: "#D4C6A8", mark: "1851", ornType: "rule" },
];

function makeCover(c, size){
  return `
    <div class="cov" style="background:${c.bg}; color:${c.fg};">
      <div class="spine"></div>
      <div class="mark">${c.mark}</div>
      <div class="orn" style="background:${c.fg}"></div>
      <div>
        <div class="t" style="font-size:${size||15}px; line-height:1.0; font-style:italic; font-variation-settings:'opsz' 72;">${c.t}</div>
      </div>
      <div class="a" style="color:${c.fg}">${c.a}</div>
    </div>`;
}

// ============ Sample book content (Meditations — public domain) ============
const SAMPLE_BOOK = {
  title: "Meditations",
  author: "Marcus Aurelius",
  cover: COVERS[0],
  translated: "Tr. George Long, 1862",
  year: "c. 170 CE",
  lang: "English (translated)",
  runtime: "7h 22m",
  words: 68420,
  chapters: [
    { n: 1, t: "Book I — Debts and Lessons", dur: "42:18", words: 4210, status: "done", prog: 100 },
    { n: 2, t: "Book II — On the River of Things", dur: "31:04", words: 3102, status: "done", prog: 100 },
    { n: 3, t: "Book III — What Remains", dur: "38:47", words: 3884, status: "done", prog: 100, playing: true },
    { n: 4, t: "Book IV — The Inner Citadel", dur: "52:11", words: 5222, status: "done", prog: 100 },
    { n: 5, t: "Book V — Duty at Dawn", dur: "44:36", words: 4461, status: "running", prog: 64 },
    { n: 6, t: "Book VI — The Ruling Principle", dur: "49:52", words: 4988, status: "running", prog: 23 },
    { n: 7, t: "Book VII — On Opinion", dur: "47:20", words: 4732, status: "queued", prog: 0 },
    { n: 8, t: "Book VIII — The Present Moment", dur: "41:08", words: 4118, status: "queued", prog: 0 },
    { n: 9, t: "Book IX — That Which Injures", dur: "36:45", words: 3675, status: "queued", prog: 0 },
    { n: 10, t: "Book X — Nature & Substance", dur: "38:02", words: 3801, status: "queued", prog: 0 },
    { n: 11, t: "Book XI — On Tragedy", dur: "43:19", words: 4332, status: "failed", prog: 0, err: "TTS rate limit" },
    { n: 12, t: "Book XII — Go In Peace", dur: "28:54", words: 2895, status: "queued", prog: 0 },
  ]
};

// Book III text — sentences arrays for sync. Times fabricated but plausible.
const CHAPTER_TEXT = {
  heading: "Book III",
  subtitle: "What Remains",
  paragraphs: [
    [ // paragraph 0
      { text: "We ought to consider not only that our life is daily wasting away and a smaller part of it is left, but that if a man should live longer, it is quite uncertain whether the understanding will still continue sufficient for the comprehension of things.", t0: 0.5, t1: 13.6 },
      { text: "For if he shall begin to fall into dotage, perspiration and nutrition and imagination and appetite, and whatever else there is of the kind, will not fail.", t0: 13.8, t1: 24.1 },
      { text: "But the power of making use of ourselves, and filling up the measure of our duty, and clearly separating all appearances, and considering whether a man should now depart from life — this power fails first.", t0: 24.3, t1: 40.4 },
    ],
    [ // paragraph 1
      { text: "We must make haste then, not only because we are daily nearer to death, but also because the conception of things and the understanding of them cease first.", t0: 41.2, t1: 52.9 },
      { text: "Such things as these we ought to observe, that the paths of life are short, and that those who receive the honors of the world are equally unknown; soon forgotten, swallowed up in the remoteness of the past.", t0: 53.1, t1: 67.9 },
      { text: "What then is that about which we ought to employ our serious pains?", t0: 68.2, t1: 72.5 },
    ],
    [ // paragraph 2
      { text: "This one thing: thoughts just, and acts social, and words which never lie, and a disposition which gladly accepts all that happens as necessary, as usual, as flowing from a principle and source of the same kind.", t0: 73.0, t1: 88.8 },
      { text: "Yield thyself to Clotho; let her spin thy thread into whatever web she pleases.", t0: 89.2, t1: 95.7 },
      { text: "All things are in a common change; and thou art a part of the whole.", t0: 96.0, t1: 102.4 },
    ],
    [ // paragraph 3
      { text: "Nothing is so conducive to greatness of mind as the power to examine systematically and truthfully everything that presents itself in life.", t0: 103.0, t1: 114.0 },
      { text: "And to look at these things in such a way as to consider of what kind the universe is, and of what kind this thing in the universe is.", t0: 114.3, t1: 123.8 },
      { text: "And what is its relation to the whole — and of what kind it is by the nature of the whole, and who is he that uses it.", t0: 124.0, t1: 133.9 },
    ]
  ]
};

// ============ rendering helpers ============
const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];

function fmtTime(s){
  if (isNaN(s)) return "0:00";
  s = Math.max(0, Math.floor(s));
  const m = Math.floor(s/60), r = s%60;
  return `${m}:${String(r).padStart(2,"0")}`;
}

// ========== LIBRARY ==========
function renderLibrary(){
  const currentCh = SAMPLE_BOOK.chapters.find(c => c.playing);
  const firstSent = CHAPTER_TEXT.paragraphs[0][0].text;
  const html = `
    <div class="page-h">
      <div>
        <div class="eyebrow" style="margin-bottom:10px;">Your Library · 14 Volumes</div>
        <h1>Good evening,<br/><em>Iris.</em></h1>
      </div>
      <div class="sub">Pick up where you left you off, or bring a new ebook into the fold. Generation resumes automatically.</div>
    </div>

    <div class="continue">
      <div class="cover-wrap"><div class="cover">${makeCover(SAMPLE_BOOK.cover, 16)}</div></div>
      <div class="body">
        <div class="eye"><span class="eyebrow">Continue Listening</span></div>
        <div class="t">Meditations<span style="color:var(--ink-3);font-style:italic;"> · Book III</span></div>
        <div class="by serif" style="font-style:italic; color:var(--ink-3); font-size:15px;">Marcus Aurelius · tr. George Long · narrated by Ember</div>
        <div class="line">
          <div class="meta num">14:22 / 38:47</div>
          <div class="prog"><div class="fill"></div></div>
          <div class="meta">38%</div>
        </div>
      </div>
      <div class="actions">
        <div class="resume">
          <button class="play-big" data-goto="player">
            <svg class="icn lg" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M8 5v14l11-7z"/></svg>
          </button>
          <div class="where">
            <div class="ch">Ch. III · 38%</div>
            <div class="st">“…yield thyself to Clotho; let her spin thy thread…”</div>
          </div>
        </div>
        <hr class="hair" style="margin: 6px 0;">
        <div style="display:flex; gap:8px;">
          <button class="btn sm" data-goto="detail"><svg class="icn sm" viewBox="0 0 24 24"><path d="M4 5h16M4 12h16M4 19h10"/></svg>Chapters</button>
          <button class="btn sm ghost"><svg class="icn sm" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Add note</button>
        </div>
      </div>
    </div>

    <div class="shelf">
      <div class="h">
        <div style="display:flex; align-items:baseline; gap:14px;">
          <h2>In Progress <em>· 3</em></h2>
        </div>
        <div class="sort"><span class="on">Recent</span><span>Author</span><span>Added</span><span>Length</span></div>
      </div>
      <div class="grid">
        ${renderCard(COVERS[0], "Meditations", "Marcus Aurelius", "5h 14m", 38, "gen", "Ch 3 of 12")}
        ${renderCard(COVERS[1], "Pride and Prejudice", "Jane Austen", "11h 02m", 72, null, "Ch 47 of 61")}
        ${renderCard(COVERS[2], "The Great Gatsby", "F. Scott Fitzgerald", "4h 48m", 14, null, "Ch 2 of 9")}
      </div>
    </div>

    <div class="shelf">
      <div class="h">
        <div><h2>Processing <em>· 2</em></h2></div>
        <div class="meta">· 5 of 23 chapters remaining</div>
      </div>
      <div class="grid">
        ${renderCardProcessing(COVERS[3], "1984", "George Orwell", 14, 23, "running")}
        ${renderCardProcessing(COVERS[4], "Frankenstein", "Mary Shelley", 6, 24, "running")}
      </div>
    </div>

    <div class="shelf">
      <div class="h">
        <div><h2>Library <em>· 9</em></h2></div>
        <div class="meta">Sorted by date added</div>
      </div>
      <div class="grid">
        ${renderCard(COVERS[5], "Jane Eyre", "Charlotte Brontë", "18h 33m", 0, null, "Ready")}
        ${renderCard(COVERS[6], "Walden", "H. D. Thoreau", "9h 14m", 0, null, "Ready")}
        ${renderCard(COVERS[7], "Dracula", "Bram Stoker", "15h 21m", 0, "new", "Just added")}
        ${renderCard(COVERS[8], "Wuthering Heights", "Emily Brontë", "12h 08m", 0, null, "Ready")}
        ${renderCard(COVERS[9], "The Iliad", "Homer", "21h 44m", 0, null, "Ready")}
        ${renderCard(COVERS[10], "Essays", "Michel de Montaigne", "33h 17m", 0, null, "Ready")}
        ${renderCard(COVERS[11], "Moby-Dick", "Herman Melville", "24h 51m", 0, null, "Ready")}
        <div class="card" style="opacity:.7; cursor:pointer;" data-goto="upload">
          <div class="ph" style="aspect-ratio:2/3;">
            <div style="text-align:center; display:flex; flex-direction:column; align-items:center; gap:10px;">
              <svg class="icn xl" viewBox="0 0 24 24" style="color:var(--ink-3);"><path d="M12 5v14M5 12h14"/></svg>
              Drop an EPUB
            </div>
          </div>
          <div>
            <div class="t serif" style="font-size:15px;">Add new book</div>
            <div class="a">up to 50 MB</div>
          </div>
        </div>
      </div>
    </div>
  `;
  $("#screen-library").innerHTML = html;
}

function renderCard(cov, t, a, dur, prog, badge, sub){
  const bhtml = badge ? `<div class="badge ${badge}">${badge==="new"?"New":"Generated"}</div>` : "";
  const phtml = prog > 0 ? `<div class="bar"><div class="f" style="width:${prog}%"></div></div>` : "";
  return `
    <div class="card" data-goto="${t==='Meditations'?'detail':'detail'}">
      <div class="cover">${makeCover(cov)}${bhtml}</div>
      <div>
        <div class="meta-row"><div class="t">${t}</div><div class="dur">${dur}</div></div>
        <div class="a">${a}</div>
        <div class="meta-row" style="margin-top:2px;">
          <div class="meta">${sub}</div>
          ${prog > 0 ? `<div class="meta num">${prog}%</div>` : ""}
        </div>
        ${phtml}
      </div>
    </div>
  `;
}

function renderCardProcessing(cov, t, a, doneCh, total, status){
  const pct = Math.round(doneCh/total*100);
  return `
    <div class="card">
      <div class="cover">${makeCover(cov)}<div class="badge" style="background:var(--gold);">Generating</div></div>
      <div>
        <div class="meta-row"><div class="t">${t}</div><div class="dur num">${doneCh}/${total}</div></div>
        <div class="a">${a}</div>
        <div class="bar" style="margin-top:8px;"><div class="f" style="width:${pct}%"></div></div>
        <div class="meta" style="margin-top:4px; display:flex; justify-content:space-between;">
          <span style="color:var(--gold);">● Narrating ch ${doneCh+1}</span>
          <span>~${Math.round((total-doneCh)*1.8)} min left</span>
        </div>
      </div>
    </div>
  `;
}

// ========== DETAIL ==========
function renderDetail(){
  const b = SAMPLE_BOOK;
  const html = `
    <div class="bd">
      <div class="left">
        <div class="bigcover">${makeCover(b.cover, 22)}</div>
        <div class="facts">
          <div class="row"><span>Author</span><span>Marcus Aurelius</span></div>
          <div class="row"><span>Translator</span><span>George Long</span></div>
          <div class="row"><span>Original</span><span>c. 170 CE</span></div>
          <div class="row"><span>Chapters</span><span>12</span></div>
          <div class="row"><span>Word count</span><span>68,420</span></div>
          <div class="row"><span>Est. runtime</span><span>7h 22m</span></div>
          <div class="row"><span>Voice</span><span style="color:var(--gold);">Ember</span></div>
          <div class="row"><span>Added</span><span>Mar 19, 2026</span></div>
        </div>
      </div>

      <div class="right">
        <div class="crumb"><a data-goto="library">Library</a> / Meditations</div>
        <h1>Meditations,<br/><em>writ by his own hand.</em></h1>
        <div class="au">Marcus Aurelius · translated by George Long</div>

        <p class="lede">Twelve short books of private reflection, composed by a Roman emperor on campaign and never intended to be read. The text moves like breath — turning from duty, to death, to the discipline of the present moment — a manual for being, written to no one.</p>

        <div class="gen-panel">
          <div class="left">
            <div class="eye">
              <span class="eyebrow">Narration</span>
              <span class="meta">· 5 of 12 chapters complete · ~38 min left</span>
            </div>
            <div style="display:flex; align-items:baseline; gap:18px;">
              <h3>Choose a voice</h3>
              <span class="meta">Tap to preview (14s)</span>
            </div>
            <div class="voices">
              ${["Alloy — neutral","Echo — resonant","Fable — literary","Onyx — deep","Ember — warm","Shimmer — bright"].map((v,i)=>{
                const [name,desc] = v.split(" — ");
                const active = name==="Ember";
                return `<button class="voice-chip ${active?'active':''}"><span class="dot"></span>${name}<span style="opacity:.6; margin-left:4px;">${desc}</span></button>`;
              }).join("")}
            </div>
          </div>
          <div style="display:flex; flex-direction:column; gap:10px;">
            <button class="btn gold xl">
              <svg class="icn" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M8 5v14l11-7z"/></svg>
              Resume generation
            </button>
            <button class="btn sm ghost">
              <svg class="icn sm" viewBox="0 0 24 24"><path d="M21 12a9 9 0 11-3-6.7M21 3v6h-6"/></svg>
              Re-generate from start
            </button>
          </div>
        </div>

        <table class="chapters-table">
          <thead><tr>
            <th>#</th><th>Chapter</th><th>Status</th><th style="text-align:right;">Words</th><th style="text-align:right;">Duration</th><th></th>
          </tr></thead>
          <tbody>
            ${b.chapters.map(ch => `
              <tr class="${ch.playing?'playing':''}" ${ch.playing?'data-goto="player"':''}>
                <td class="n">${String(ch.n).padStart(2,"0")}</td>
                <td>
                  <div class="ct">${ch.t.split("—")[0]}<em>—${ch.t.split("—")[1]}</em></div>
                </td>
                <td class="st">
                  ${ch.status === 'running'
                    ? `<div style="display:flex; flex-direction:column; gap:4px;">
                         <span class="st-pill running"><span class="d"></span>Narrating</span>
                         <div class="prog-cell"><div class="f" style="width:${ch.prog}%"></div></div>
                       </div>`
                    : `<span class="st-pill ${ch.status}"><span class="d"></span>${ch.status.charAt(0).toUpperCase()+ch.status.slice(1)}</span>`}
                  ${ch.err ? `<div class="meta" style="color:var(--red); margin-top:4px;">${ch.err}</div>` : ""}
                </td>
                <td class="wc">${ch.words.toLocaleString()}</td>
                <td class="dur num">${ch.dur}</td>
                <td style="width:40px;">
                  <button class="plybtn" title="${ch.status==='done'?'Play':(ch.status==='failed'?'Retry':'—')}">
                    ${ch.status === 'failed'
                      ? `<svg class="icn sm" viewBox="0 0 24 24"><path d="M21 12a9 9 0 11-3-6.7M21 3v6h-6"/></svg>`
                      : `<svg class="icn sm" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M8 5v14l11-7z"/></svg>`}
                  </button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
  $("#screen-detail").innerHTML = html;
}

// ========== UPLOAD ==========
function renderUpload(){
  $("#screen-upload").innerHTML = `
    <div class="up-wrap">
      <div class="eyebrow" style="margin-bottom:14px;">New book · step 1 of 2</div>
      <h1>Bring a book<br/><em>into the fold.</em></h1>
      <p class="sub">Drop an EPUB and we'll parse chapters, extract the cover, and hand it to the narrator. Everything is scoped to you — your texts and their audio live in your library alone.</p>

      <div class="dropzone" id="dropzone">
        <svg class="icn xl" viewBox="0 0 24 24"><path d="M12 16V4M6 10l6-6 6 6M4 20h16"/></svg>
        <h3>Drop your EPUB here</h3>
        <div class="or">— or —</div>
        <button class="btn primary" id="browseFake">Browse files</button>
        <div class="constraints">.EPUB · up to 50 MB · duplicates detected by hash</div>
      </div>

      <div class="up-progress" id="upProgress">
        <div class="r">
          <div class="ic"><svg class="icn" viewBox="0 0 24 24"><path d="M4 4h10l6 6v10a2 2 0 01-2 2H4z"/><path d="M14 4v6h6"/></svg></div>
          <div class="m">
            <div class="t">Meditations.epub</div>
            <div class="s">3.82 MB · sha256 7f3c…a912</div>
          </div>
          <div class="meta num" id="upPct">64%</div>
        </div>
        <div class="track"><div class="f" id="upFill" style="width:64%"></div></div>
        <div class="steps">
          <div class="step done"><div class="s">✓</div>Uploaded to storage</div>
          <div class="step done"><div class="s">✓</div>Validated EPUB (12 chapters detected)</div>
          <div class="step now"><div class="s">3</div>Extracting cover & metadata</div>
          <div class="step"><div class="s">4</div>Preparing chapter text for narration</div>
        </div>
      </div>

      <div class="up-result" id="upResult">
        <div class="head">
          <div class="bc">${makeCover(COVERS[0])}</div>
          <div class="info">
            <div class="t">Meditations<em>, writ by his own hand</em></div>
            <div class="a">Marcus Aurelius · tr. George Long</div>
            <div class="f">
              <span>12 chapters</span>
              <span>·</span>
              <span>68,420 words</span>
              <span>·</span>
              <span>est. 7h 22m</span>
              <span>·</span>
              <span>~$2.40 to narrate</span>
            </div>
          </div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            <button class="btn primary" data-goto="detail">Choose voice →</button>
            <button class="btn sm ghost">Rename</button>
          </div>
        </div>
        <div class="chlist">
          ${SAMPLE_BOOK.chapters.slice(0,8).map(c => `
            <div class="row">
              <span class="n">${String(c.n).padStart(2,"0")}</span>
              <span class="t">${c.t}</span>
              <span class="w num">${c.words.toLocaleString()} w</span>
            </div>
          `).join("")}
          <div class="row" style="opacity:.5;">
            <span class="n">···</span><span class="t serif" style="font-style:italic;">4 more chapters</span><span></span>
          </div>
        </div>
      </div>
    </div>
  `;

  // Fake upload sequence
  $("#browseFake").onclick = () => {
    $("#dropzone").style.display = "none";
    $("#upProgress").classList.add("on");
    let p = 0;
    const iv = setInterval(() => {
      p += 8 + Math.random()*8;
      if (p >= 100) { p = 100; clearInterval(iv); finishUpload(); }
      $("#upFill").style.width = p+"%";
      $("#upPct").textContent = Math.round(p)+"%";
    }, 200);
  };
  function finishUpload(){
    setTimeout(()=>{
      $("#upProgress").classList.remove("on");
      $("#upResult").classList.add("on");
    }, 400);
  }
}

// ========== PLAYER ==========
function renderPlayer(){
  let html = `
    <div class="player-page">
      <div class="bar">
        <div class="nowplaying">
          <div class="mini-cov">${makeCover(SAMPLE_BOOK.cover, 12)}</div>
          <div class="np-meta">
            <div class="ch">Book III · Chapter 3 of 12</div>
            <div class="tt">What Remains</div>
            <div class="au">Meditations · Marcus Aurelius</div>
          </div>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn sm ghost" id="expandFSP">
            <svg class="icn sm" viewBox="0 0 24 24"><path d="M4 4h6M4 4v6M20 4h-6M20 4v6M4 20h6M4 20v-6M20 20h-6M20 20v-6"/></svg>
            Enter immersive
          </button>
          <button class="btn sm ghost" data-goto="detail">
            <svg class="icn sm" viewBox="0 0 24 24"><path d="M3 6l18-3v18L3 18z"/></svg>
            Chapters
          </button>
        </div>
      </div>

      <div class="reading-frame" id="readingFrame">
        <div class="chapter-head">
          <div class="eye">· Liber Tertius ·</div>
          <h2>What Remains</h2>
          <div class="orn">· · ·</div>
        </div>
        ${renderReading()}
      </div>
    </div>
  `;
  $("#screen-player").innerHTML = html;

  $("#expandFSP").onclick = () => openFSP();
}

function renderReading(){
  return CHAPTER_TEXT.paragraphs.map((para, pi) => {
    return `<p class="para">${para.map((s, si) => {
      const sid = `s-${pi}-${si}`;
      const words = s.text.split(/(\s+)/).map((w,wi) => {
        if (/^\s+$/.test(w)) return w;
        return `<span class="word" data-wi="${wi}"><span class="base">${w}</span><span class="wipe" aria-hidden="true">${w}</span></span>`;
      }).join("");
      return `<span class="sent" id="${sid}" data-t0="${s.t0}" data-t1="${s.t1}">${words}</span>`;
    }).join(" ")}</p>`;
  }).join("");
}

// ========== MINI / FSP ==========
function renderMini(){
  const m = $("#mini");
  m.innerHTML = `
    <div class="np">
      <div class="c">${makeCover(SAMPLE_BOOK.cover, 10)}</div>
      <div class="info">
        <div class="t">What Remains</div>
        <div class="s">Book III · Meditations</div>
      </div>
    </div>
    <div class="center">
      <div class="transport">
        <button class="iconbtn" title="Prev chapter"><svg class="icn" viewBox="0 0 24 24"><path d="M19 20L9 12l10-8zM5 4v16"/></svg></button>
        <button class="iconbtn" title="-15"><svg class="icn" viewBox="0 0 24 24"><path d="M1 4v6h6"/><path d="M3.5 10a9 9 0 11-2 5"/><text x="10" y="16" font-family="monospace" font-size="8" font-weight="600" fill="currentColor" stroke="none">15</text></svg></button>
        <button class="iconbtn play" id="miniPlay">
          <svg class="icn" viewBox="0 0 24 24" fill="currentColor" stroke="none" id="miniPlayIcon"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>
        </button>
        <button class="iconbtn" title="+15"><svg class="icn" viewBox="0 0 24 24"><path d="M23 4v6h-6"/><path d="M20.5 10a9 9 0 10-2 5"/><text x="8" y="16" font-family="monospace" font-size="8" font-weight="600" fill="currentColor" stroke="none">15</text></svg></button>
        <button class="iconbtn" title="Next chapter"><svg class="icn" viewBox="0 0 24 24"><path d="M5 4l10 8-10 8zM19 4v16"/></svg></button>
      </div>
      <div class="scrub">
        <span class="t num" id="miniCur">0:00</span>
        <div class="track" id="miniTrack"><div class="fill" id="miniFill"></div><div class="knob" id="miniKnob"></div></div>
        <span class="t r num">38:47</span>
      </div>
    </div>
    <div class="right">
      <button class="speed" id="miniSpeed">1.0×</button>
      <button class="iconbtn" title="Voice"><svg class="icn" viewBox="0 0 24 24"><path d="M3 10v4M7 6v12M11 8v8M15 4v16M19 8v8M23 10v4"/></svg></button>
      <button class="expand" id="miniExpand" title="Immersive">
        <svg class="icn sm" viewBox="0 0 24 24"><path d="M4 4h6M4 4v6M20 4h-6M20 4v6M4 20h6M4 20v-6M20 20h-6M20 20v-6"/></svg>
      </button>
    </div>
  `;
}

function renderFSP(){
  const fsp = $("#fsp");
  fsp.innerHTML = `
    <div class="fsp-bar">
      <div class="l">
        <div class="mini-cov" style="width:40px; height:58px;">${makeCover(SAMPLE_BOOK.cover, 11)}</div>
        <div class="title-wrap">
          <div class="s">Book III · What Remains</div>
          <div class="t">Meditations <span style="color:var(--ink-3); font-style:italic;">— Marcus Aurelius</span></div>
        </div>
      </div>
      <div style="display:flex; gap:8px;">
        <button class="btn sm ghost">
          <svg class="icn sm" viewBox="0 0 24 24"><path d="M12 8v8M8 12h8"/><circle cx="12" cy="12" r="9"/></svg>
          Bookmark
        </button>
        <button class="btn sm ghost" id="closeFSP">
          <svg class="icn sm" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>
          Close
        </button>
      </div>
    </div>
    <div class="body">
      <div class="reading-col" id="fspReading">
        <div class="reading-frame" style="margin: 40px auto 240px;">
          <div class="chapter-head">
            <div class="eye">· Liber Tertius ·</div>
            <h2>What Remains</h2>
            <div class="orn">· · ·</div>
          </div>
          ${renderReading()}
        </div>
      </div>
      <div class="sidebar-col">
        <h4>In this chapter</h4>
        <div class="meta" style="margin-bottom:20px; color:var(--ink-2); font-family: var(--font-serif); font-style: italic; font-size: 14px; line-height: 1.5;">“We must make haste — not only because we are daily nearer to death, but also because the understanding cease first.”</div>

        <h4>Chapters</h4>
        <ul class="chap-list">
          ${SAMPLE_BOOK.chapters.map(c => `
            <li class="${c.playing?'on':''} ${c.status==='done'?'done':''}">
              <span class="n">${String(c.n).padStart(2,"0")}</span>
              <span class="ct serif">${c.t.split('—')[1] || c.t}</span>
              <span class="d num">${c.dur}</span>
            </li>
          `).join("")}
        </ul>

        <h4>Voice</h4>
        <div style="display:flex; align-items:center; gap:10px; padding:10px 12px; border:1px solid var(--rule); background: var(--paper-3);">
          <div style="width:28px; height:28px; border-radius:50%; background:var(--gold); display:grid; place-items:center; color:#fff; font-family: var(--font-serif); font-size:14px;">E</div>
          <div style="flex:1;">
            <div style="font-family: var(--font-serif); font-size:15px;">Ember</div>
            <div class="meta">warm · mid-range · en-US</div>
          </div>
          <button class="btn sm ghost">change</button>
        </div>
      </div>
    </div>

    <div class="fsp-controls">
      <div class="scrub">
        <span class="t num" id="fspCur">0:00</span>
        <div class="track" id="fspTrack"><div class="fill" id="fspFill"></div><div class="knob" id="fspKnob"></div></div>
        <span class="t r num">38:47</span>
      </div>
      <div class="tr">
        <button class="iconbtn" title="Prev chapter"><svg class="icn lg" viewBox="0 0 24 24"><path d="M19 20L9 12l10-8zM5 4v16"/></svg></button>
        <button class="iconbtn" title="-15s"><svg class="icn lg" viewBox="0 0 24 24"><path d="M1 4v6h6"/><path d="M3.5 10a9 9 0 11-2 5"/><text x="10" y="16" font-family="monospace" font-size="7" font-weight="600" fill="currentColor" stroke="none">15</text></svg></button>
        <button class="big-play" id="fspPlay">
          <svg class="icn xl" viewBox="0 0 24 24" fill="currentColor" stroke="none" id="fspPlayIcon"><path d="M7 4h4v16H7zM14 4h4v16h-4z"/></svg>
        </button>
        <button class="iconbtn" title="+15s"><svg class="icn lg" viewBox="0 0 24 24"><path d="M23 4v6h-6"/><path d="M20.5 10a9 9 0 10-2 5"/><text x="8" y="16" font-family="monospace" font-size="7" font-weight="600" fill="currentColor" stroke="none">15</text></svg></button>
        <button class="iconbtn" title="Next chapter"><svg class="icn lg" viewBox="0 0 24 24"><path d="M5 4l10 8-10 8zM19 4v16"/></svg></button>
      </div>
    </div>
  `;

  $("#closeFSP").onclick = closeFSP;
  $("#fspPlay").onclick = togglePlay;
}

function openFSP(){ $("#fsp").classList.add("on"); }
function closeFSP(){ $("#fsp").classList.remove("on"); }

// ========== Playback simulation ==========
const TOTAL_DUR = 133.9; // last sentence end
let curTime = 38.2; // start partway
let playing = true;

function setTime(t){
  curTime = Math.max(0, Math.min(TOTAL_DUR, t));
  updateSync();
  const pct = curTime / TOTAL_DUR * 100;
  $("#miniFill").style.width = pct+"%";
  $("#miniKnob").style.left = pct+"%";
  $("#miniCur").textContent = fmtTime(curTime);
  if ($("#fspFill")) {
    $("#fspFill").style.width = pct+"%";
    $("#fspKnob").style.left = pct+"%";
    $("#fspCur").textContent = fmtTime(curTime);
  }
}

function updateSync(){
  // find active sentence
  const sents = [...document.querySelectorAll(".sent")];
  sents.forEach(s => {
    const t0 = parseFloat(s.dataset.t0);
    const t1 = parseFloat(s.dataset.t1);
    s.classList.remove("active", "played");
    if (curTime >= t1) s.classList.add("played");
    else if (curTime >= t0 && curTime <= t1) {
      s.classList.add("active");
      // word sync within
      const words = [...s.querySelectorAll(".word")];
      const n = words.length;
      const frac = (curTime - t0) / (t1 - t0);
      const idx = Math.floor(frac * n);
      words.forEach((w, i) => {
        w.classList.remove("played","current");
        if (i < idx) w.classList.add("played");
        else if (i === idx) w.classList.add("current");
      });
    }
  });
}

function togglePlay(){
  playing = !playing;
  const playIcon = playing
    ? `<path d="M6 4h4v16H6zM14 4h4v16h-4z"/>`
    : `<path d="M8 5v14l11-7z"/>`;
  if ($("#miniPlayIcon")) $("#miniPlayIcon").innerHTML = playIcon;
  if ($("#fspPlayIcon")) $("#fspPlayIcon").innerHTML = playIcon;
}

// tick
setInterval(() => {
  if (!playing) return;
  setTime(curTime + 0.25);
  if (curTime >= TOTAL_DUR) setTime(0);
}, 250);

// ========== TWEAKS ==========
function renderTweaks(){
  $("#tweaks").innerHTML = `
    <h4>Tweaks <em>· in-session</em></h4>
    <div class="grp">
      <div class="lbl">Theme <span class="v" id="tv-theme">Light</span></div>
      <div class="seg" id="tw-theme">
        <button data-v="light" class="on">Light</button>
        <button data-v="dark">Dark</button>
      </div>
    </div>
    <div class="grp">
      <div class="lbl">Density <span class="v" id="tv-density">Comfortable</span></div>
      <div class="seg" id="tw-density">
        <button data-v="compact">Compact</button>
        <button data-v="normal">Normal</button>
        <button data-v="comfortable" class="on">Roomy</button>
      </div>
    </div>
    <div class="grp">
      <div class="lbl">Reading font <span class="v" id="tv-font">Serif</span></div>
      <div class="seg" id="tw-font">
        <button data-v="serif" class="on">Serif</button>
        <button data-v="sans">Sans</button>
        <button data-v="display">Display</button>
      </div>
    </div>
    <div class="grp">
      <div class="lbl">Reading size <span class="v num" id="tv-size">22px</span></div>
      <input type="range" id="tw-size" class="rng" min="16" max="28" step="1" value="22"/>
    </div>
    <div class="grp">
      <div class="lbl">Highlight <span class="v" id="tv-hl">Word wipe</span></div>
      <div class="seg" id="tw-hl">
        <button data-v="word" class="on">Word</button>
        <button data-v="sentence">Block</button>
        <button data-v="scale">Scale</button>
        <button data-v="gutter">Gutter</button>
      </div>
    </div>
    <div class="grp">
      <div class="lbl">Voice <span class="v" id="tv-voice">Ember</span></div>
      <div class="seg" id="tw-voice">
        ${["Alloy","Echo","Fable","Onyx","Ember","Shimmer"].map(v=>`<button data-v="${v}" class="${v==='Ember'?'on':''}">${v}</button>`).join("")}
      </div>
    </div>
  `;

  function hook(grpId, apply){
    const g = $("#"+grpId);
    g.querySelectorAll("button").forEach(b => {
      b.onclick = () => {
        g.querySelectorAll("button").forEach(x => x.classList.remove("on"));
        b.classList.add("on");
        apply(b.dataset.v);
      };
    });
  }
  hook("tw-theme", v => { setTheme(v); $("#tv-theme").textContent = v[0].toUpperCase()+v.slice(1); });
  hook("tw-density", v => { document.documentElement.dataset.density = v; $("#tv-density").textContent = v[0].toUpperCase()+v.slice(1); });
  hook("tw-font", v => {
    $("#tv-font").textContent = v[0].toUpperCase()+v.slice(1);
    const map = { serif: 'var(--font-serif)', sans: 'var(--font-sans)', display: '"Newsreader", serif' };
    document.querySelectorAll(".reading-frame").forEach(f => f.style.fontFamily = map[v]);
    if (v === "display") {
      document.querySelectorAll(".reading-frame").forEach(f => f.style.fontVariationSettings = '"opsz" 72');
    } else {
      document.querySelectorAll(".reading-frame").forEach(f => f.style.fontVariationSettings = '"opsz" 16');
    }
  });
  $("#tw-size").oninput = (e) => {
    const v = e.target.value;
    document.documentElement.style.setProperty('--reading-size', v+'px');
    $("#tv-size").textContent = v+"px";
  };
  hook("tw-hl", v => {
    document.documentElement.dataset.hl = v;
    $("#tv-hl").textContent = { word:"Word wipe", sentence:"Block fill", scale:"Scale", gutter:"Gutter" }[v];
  });
  hook("tw-voice", v => { $("#tv-voice").textContent = v; });
}

// ========== Theme ==========
function setTheme(t){
  document.documentElement.dataset.theme = t;
  $("#themeLabel").textContent = t === "dark" ? "Light" : "Dark";
  const icon = t === "dark"
    ? `<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>`
    : `<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>`;
  $("#themeIcon").innerHTML = icon;
}

// ========== Navigation ==========
function goto(screen){
  $$(".screen").forEach(s => s.classList.remove("active"));
  $("#screen-"+screen).classList.add("active");
  $$(".rail .nav").forEach(n => n.classList.remove("active"));
  const target = document.querySelector(`.rail .nav[data-goto="${screen}"]`);
  if (target) target.classList.add("active");
  window.scrollTo(0, 0);
}

// ========== Init ==========
document.documentElement.dataset.theme = "light";
document.documentElement.dataset.hl = "word";
document.documentElement.dataset.density = "comfortable";

renderLibrary();
renderUpload();
renderDetail();
renderPlayer();
renderMini();
renderFSP();
renderTweaks();

// Wire up
document.addEventListener("click", (e) => {
  const g = e.target.closest("[data-goto]");
  if (g) { e.preventDefault(); goto(g.dataset.goto); }
});

$("#themeToggle").onclick = () => {
  const cur = document.documentElement.dataset.theme;
  setTheme(cur === "dark" ? "light" : "dark");
  // sync tweaks seg
  $$("#tw-theme button").forEach(b => b.classList.toggle("on", b.dataset.v === document.documentElement.dataset.theme));
  $("#tv-theme").textContent = document.documentElement.dataset.theme[0].toUpperCase()+document.documentElement.dataset.theme.slice(1);
};
$("#tweakToggle").onclick = () => {
  $("#tweaks").classList.toggle("on");
};
$("#miniPlay").onclick = togglePlay;
$("#miniExpand").onclick = openFSP;
$("#miniTrack").onclick = (e) => {
  const r = e.currentTarget.getBoundingClientRect();
  const f = (e.clientX - r.left) / r.width;
  setTime(f * TOTAL_DUR);
};

// Click sentence to seek
document.addEventListener("click", (e) => {
  const s = e.target.closest(".sent");
  if (s && s.dataset.t0) {
    setTime(parseFloat(s.dataset.t0));
    if (!playing) togglePlay();
  }
});

// Edit mode hook
window.addEventListener("message", (e) => {
  if (e.data?.type === "__activate_edit_mode") $("#tweaks").classList.add("on");
  if (e.data?.type === "__deactivate_edit_mode") $("#tweaks").classList.remove("on");
});
window.parent.postMessage({type:"__edit_mode_available"}, "*");

setTime(38.2);
