const { useState, useEffect, useRef } = React;

// ===== Shared cover data =====
const COVERS = {
  med:   { t: "Meditations", a: "Marcus Aurelius", bg: "#2E2A24", fg: "#D4A15F", mark: "M·A" },
  pride: { t: "Pride and Prejudice", a: "Jane Austen", bg: "#7A3A4A", fg: "#F5E8D5", mark: "1813" },
  gats:  { t: "The Great Gatsby", a: "F. Scott Fitzgerald", bg: "#1C3A4F", fg: "#D4A15F", mark: "1925" },
  nf:    { t: "1984", a: "George Orwell", bg: "#1A1A1A", fg: "#C44536", mark: "Vol. I" },
  frank: { t: "Frankenstein", a: "Mary Shelley", bg: "#2C3A2E", fg: "#E8D9B8", mark: "1818" },
  jane:  { t: "Jane Eyre", a: "Charlotte Brontë", bg: "#4A2E3E", fg: "#E6D5B8", mark: "Vol. II" },
  walden:{ t: "Walden", a: "H. D. Thoreau", bg: "#3E4A2E", fg: "#E6D5B8", mark: "Essay" },
  drac:  { t: "Dracula", a: "Bram Stoker", bg: "#2A1A1A", fg: "#A8452F", mark: "1897" },
  iliad: { t: "The Iliad", a: "Homer", bg: "#5A3A1A", fg: "#E6C88A", mark: "Bk. I" },
};

function Cov({ c, size = "sm" }) {
  return (
    <div className={`cov ${size}`} style={{ background: c.bg, color: c.fg }}>
      <div className="spine"></div>
      <div className="mark">{c.mark}</div>
      <div>
        <div className="t">{c.t}</div>
      </div>
      <div className="a">{c.a}</div>
    </div>
  );
}

// ===== Sentence data (Book III, Meditations) =====
const PARAS = [
  [
    { id: "a0", t: "We ought to consider not only that our life is daily wasting away and a smaller part of it is left,", t0: 0.5, t1: 6.8 },
    { id: "a1", t: "but that if a man should live longer, it is quite uncertain whether the understanding will still continue sufficient for the comprehension of things.", t0: 6.9, t1: 15.6 },
  ],
  [
    { id: "b0", t: "We must make haste then — not only because we are daily nearer to death, but also because the conception of things and the understanding of them cease first.", t0: 16.0, t1: 27.2 },
    { id: "b1", t: "Yield thyself to Clotho; let her spin thy thread into whatever web she pleases.", t0: 27.4, t1: 33.0 },
  ],
];

function Reading({ mode = "word", time }) {
  return (
    <div className={`reading-m ${mode === "block" ? "block" : ""}`}>
      <div className="chead">
        <div className="eb">Liber Tertius</div>
        <h2>What Remains</h2>
        <div className="orn">· · ·</div>
      </div>
      {PARAS.map((para, pi) => (
        <p className="para" key={pi}>
          {para.map((s, si) => {
            let cls = "sent";
            if (time > s.t1) cls += " played";
            else if (time >= s.t0 && time <= s.t1) cls += " active";
            const words = s.t.split(/(\s+)/);
            const active = time >= s.t0 && time <= s.t1;
            const frac = active ? (time - s.t0) / (s.t1 - s.t0) : 0;
            const wordTokens = words.filter(w => !/^\s+$/.test(w));
            const curIdx = Math.floor(frac * wordTokens.length);
            let wi = -1;
            return (
              <React.Fragment key={si}>
                <span className={cls}>
                  {words.map((w, j) => {
                    if (/^\s+$/.test(w)) return w;
                    wi++;
                    let wcls = "word";
                    if (active && wi < curIdx) wcls += " played";
                    if (active && wi === curIdx) wcls += " current";
                    return (
                      <span className={wcls} key={j}>
                        <span className="base">{w}</span>
                        <span className="wipe" aria-hidden="true">{w}</span>
                      </span>
                    );
                  })}
                </span>
                {si < para.length - 1 ? " " : ""}
              </React.Fragment>
            );
          })}
        </p>
      ))}
    </div>
  );
}

// ===== Icons =====
const I = {
  play: <svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M8 5v14l11-7z"/></svg>,
  pause: <svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>,
  search: <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>,
  plus: <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>,
  home: <svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8v10a2 2 0 01-2 2h-4v-7h-6v7H5a2 2 0 01-2-2z"/></svg>,
  book: <svg viewBox="0 0 24 24"><path d="M4 5a2 2 0 012-2h12v18H6a2 2 0 01-2-2zM4 17h14"/></svg>,
  up:   <svg viewBox="0 0 24 24"><path d="M12 16V4M6 10l6-6 6 6M4 20h16"/></svg>,
  pers: <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 5-6 8-6s7 2 8 6"/></svg>,
  back: <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>,
  dots: <svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>,
  chev: <svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>,
  down: <svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>,
  prev: <svg viewBox="0 0 24 24"><path d="M19 20L9 12l10-8zM5 4v16"/></svg>,
  next: <svg viewBox="0 0 24 24"><path d="M5 4l10 8-10 8zM19 4v16"/></svg>,
  b15:  <svg viewBox="0 0 24 24"><path d="M1 4v6h6"/><path d="M3.5 10a9 9 0 11-2 5"/><text x="9" y="16" fontFamily="JetBrains Mono" fontSize="7" fontWeight="600" fill="currentColor" stroke="none">15</text></svg>,
  f15:  <svg viewBox="0 0 24 24"><path d="M23 4v6h-6"/><path d="M20.5 10a9 9 0 10-2 5"/><text x="8" y="16" fontFamily="JetBrains Mono" fontSize="7" fontWeight="600" fill="currentColor" stroke="none">15</text></svg>,
  bmark:<svg viewBox="0 0 24 24"><path d="M5 3h14v18l-7-4-7 4z"/></svg>,
  list: <svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h10"/></svg>,
  epub: <svg viewBox="0 0 24 24"><path d="M4 4h10l6 6v10a2 2 0 01-2 2H4z"/><path d="M14 4v6h6"/></svg>,
  close:<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>,
};

// ===== Status bar (simplified, minimal) =====
function StatusBar({ dark, time = "9:41" }) {
  const c = dark ? "#fff" : "#000";
  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 52, display: "flex",
      justifyContent: "space-between", alignItems: "center", padding: "18px 28px 0", zIndex: 10,
      fontFamily: "-apple-system, system-ui", fontWeight: 600, fontSize: 15, color: c }}>
      <div>{time}</div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <svg width="16" height="11" viewBox="0 0 19 12">
          <rect x="0" y="7.5" width="3.2" height="4.5" rx="0.7" fill={c}/>
          <rect x="4.8" y="5" width="3.2" height="7" rx="0.7" fill={c}/>
          <rect x="9.6" y="2.5" width="3.2" height="9.5" rx="0.7" fill={c}/>
          <rect x="14.4" y="0" width="3.2" height="12" rx="0.7" fill={c}/>
        </svg>
        <svg width="15" height="11" viewBox="0 0 17 12">
          <path d="M8.5 3.2C10.8 3.2 12.9 4.1 14.4 5.6L15.5 4.5C13.7 2.7 11.2 1.5 8.5 1.5C5.8 1.5 3.3 2.7 1.5 4.5L2.6 5.6C4.1 4.1 6.2 3.2 8.5 3.2Z" fill={c}/>
          <circle cx="8.5" cy="10.5" r="1.5" fill={c}/>
        </svg>
        <svg width="24" height="12" viewBox="0 0 27 13">
          <rect x="0.5" y="0.5" width="23" height="12" rx="3.5" stroke={c} strokeOpacity="0.35" fill="none"/>
          <rect x="2" y="2" width="17" height="9" rx="2" fill={c}/>
        </svg>
      </div>
    </div>
  );
}

function Phone({ children, dark = false, width = 380, height = 820 }) {
  return (
    <div style={{
      width, height, borderRadius: 50, overflow: "hidden", position: "relative",
      background: dark ? "#000" : "#F5F0E6",
      boxShadow: "0 40px 80px -20px rgba(0,0,0,0.35), 0 0 0 2px rgba(0,0,0,0.12), 0 0 0 14px #0d0b08",
    }}>
      {/* Dynamic island */}
      <div style={{ position: "absolute", top: 11, left: "50%", transform: "translateX(-50%)",
        width: 120, height: 34, borderRadius: 22, background: "#000", zIndex: 50 }} />
      <StatusBar dark={dark} />
      {/* Home indicator */}
      <div style={{ position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)",
        width: 130, height: 5, borderRadius: 100, background: dark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.25)", zIndex: 60 }} />
      <div className={`phone-content ${dark ? "dark" : ""}`}>
        <div className="app paper-tex">{children}</div>
      </div>
    </div>
  );
}

// ===== Screens =====

function LibraryScreen() {
  return (
    <>
      <div className="ptop"></div>
      <div className="appbar">
        <div className="logo">Vocescribe</div>
        <div className="right">
          <button className="ibtn">{I.search}</button>
          <button className="ibtn">{I.plus}</button>
        </div>
      </div>
      <div className="lt">
        <div className="eyebrow">Good evening, Iris</div>
        <h1>Your <em>library.</em></h1>
      </div>

      <div className="continue-m">
        <div className="cov" style={{ width: 68, height: 100, background: COVERS.med.bg, color: COVERS.med.fg, padding: "8px 8px 9px 11px", display:"flex", flexDirection:"column", justifyContent:"space-between", overflow:"hidden", position:"relative" }}>
          <div className="spine"></div>
          <div className="mark" style={{ position:"absolute", right:7, top:7, fontFamily:"JetBrains Mono", fontSize:7, opacity:.6 }}>M·A</div>
          <div style={{ fontSize: 10, fontStyle: "italic", fontFamily:"Newsreader", lineHeight: 1.05, zIndex:1 }}>Meditations</div>
          <div style={{ fontFamily:"Inter Tight", fontSize: 6.5, textTransform:"uppercase", letterSpacing:"0.14em", opacity:.75, zIndex:1 }}>Marcus Aurelius</div>
        </div>
        <div className="mid">
          <div className="eb">Continue · Book III · 38%</div>
          <div className="t">What <em>Remains</em></div>
          <div className="a">Marcus Aurelius · narr. Ember</div>
          <div className="bar"><div className="f"></div></div>
          <div className="meta"><span>14:22</span><span>38:47</span></div>
        </div>
        <button className="playb">{I.play}</button>
      </div>

      <div className="shelf-h"><h2>In progress <em>· 3</em></h2><span className="more">See all</span></div>
      <div className="hshelf">
        {[COVERS.med, COVERS.pride, COVERS.gats].map((c, i) => (
          <div className="mini-card" key={i}>
            <div className="c"><Cov c={c} size="md"/><div className="badge">Gen</div></div>
            <div className="t">{c.t}</div>
            <div className="a">{c.a}</div>
            <div className="bar"><div className="f" style={{ width: [38,72,14][i]+"%" }}></div></div>
          </div>
        ))}
      </div>

      <div className="shelf-h"><h2>Processing <em>· 2</em></h2><span className="more">~18m</span></div>
      <div className="vlist">
        <div className="vrow">
          <div className="c"><Cov c={COVERS.nf}/></div>
          <div className="m">
            <div className="t">1984</div>
            <div className="a">George Orwell</div>
            <div className="x">
              <span style={{color:"var(--gold)"}}>● Narrating 14/23</span>
              <span>· ~12m left</span>
            </div>
          </div>
          <div className="d" style={{ fontFamily:"JetBrains Mono", fontSize:11, color:"var(--gold)" }}>61%</div>
        </div>
        <div className="vrow">
          <div className="c"><Cov c={COVERS.frank}/></div>
          <div className="m">
            <div className="t">Frankenstein</div>
            <div className="a">Mary Shelley</div>
            <div className="x">
              <span style={{color:"var(--gold)"}}>● Narrating 6/24</span>
              <span>· ~34m left</span>
            </div>
          </div>
          <div className="d" style={{ fontFamily:"JetBrains Mono", fontSize:11, color:"var(--gold)" }}>25%</div>
        </div>
      </div>

      <div className="shelf-h"><h2>Ready <em>· 9</em></h2><span className="more">Recent</span></div>
      <div className="vlist" style={{ paddingBottom: 170 }}>
        {[
          [COVERS.jane, "18h 33m"],
          [COVERS.walden, "9h 14m"],
          [COVERS.drac, "15h 21m"],
          [COVERS.iliad, "21h 44m"],
        ].map(([c, d], i) => (
          <div className="vrow" key={i}>
            <div className="c"><Cov c={c}/></div>
            <div className="m">
              <div className="t">{c.t}</div>
              <div className="a">{c.a}</div>
              <div className="x"><span>{d}</span><span>·</span><span>Ready</span></div>
            </div>
            <button className="plb" style={{ width:30, height:30, borderRadius:"50%", border:"1px solid var(--rule)", background:"transparent", color:"var(--ink-2)", display:"grid", placeItems:"center" }}>{I.play}</button>
          </div>
        ))}
      </div>

      <MiniBarStatic />
      <TabBar active="home" />
    </>
  );
}

function DetailScreen() {
  return (
    <>
      <div className="ptop"></div>
      <div className="appbar">
        <button className="ibtn">{I.back}</button>
        <div style={{ fontFamily:"JetBrains Mono", fontSize:10, letterSpacing:"0.12em", textTransform:"uppercase", color:"var(--ink-3)" }}>Library · Volume</div>
        <button className="ibtn">{I.dots}</button>
      </div>

      <div className="det-hero">
        <div className="bc"><Cov c={COVERS.med} size="lg"/></div>
        <h1>Meditations<br/><em>writ by his own hand.</em></h1>
        <div className="au">Marcus Aurelius · tr. George Long</div>
        <div className="facts">
          <span>12 chapters</span>
          <span className="dot"></span>
          <span>7h 22m</span>
          <span className="dot"></span>
          <span>Ember</span>
        </div>
      </div>

      <div className="det-actions">
        <button className="bigbtn">{I.play} Resume · 14:22</button>
        <button className="bigbtn ghost" style={{ flex:"0 0 46px", padding:0 }}>{I.bmark}</button>
      </div>

      <div className="det-desc">
        Twelve short books of private reflection, composed by a Roman emperor on campaign and never intended to be read. The text moves like breath — turning from duty, to death, to the discipline of the present moment.
      </div>

      <div className="voice-box">
        <div className="h"><h3>Voice</h3><span className="meta">· 14s preview</span></div>
        <div className="chips">
          {["Alloy","Echo","Fable","Onyx","Ember","Shimmer"].map(v => (
            <div key={v} className={`vchip ${v==="Ember"?"on":""}`}><span className="d"></span>{v}</div>
          ))}
        </div>
      </div>

      <div className="chlist-m">
        <div style={{ fontFamily:"JetBrains Mono", fontSize:10, letterSpacing:"0.14em", textTransform:"uppercase", color:"var(--ink-3)", padding:"10px 0 4px", borderBottom:"1px solid var(--rule)", marginBottom: 4 }}>
          Chapters · 12
        </div>
        {[
          { n:1, t:"Book I", sub:"Debts and Lessons", d:"42:18", status:"done" },
          { n:2, t:"Book II", sub:"On the River of Things", d:"31:04", status:"done" },
          { n:3, t:"Book III", sub:"What Remains", d:"14:22 / 38:47", status:"play" },
          { n:4, t:"Book IV", sub:"The Inner Citadel", d:"52:11", status:"done" },
          { n:5, t:"Book V", sub:"Duty at Dawn", d:"64%", status:"run" },
          { n:6, t:"Book VI", sub:"The Ruling Principle", d:"23%", status:"run" },
          { n:7, t:"Book VII", sub:"On Opinion", d:"—", status:"queued" },
          { n:8, t:"Book VIII", sub:"The Present Moment", d:"—", status:"queued" },
        ].map(ch => (
          <div className={`chrow ${ch.status==="play"?"playing":""} ${ch.status==="run"?"running":""} ${ch.status==="queued"?"queued":""}`} key={ch.n}>
            <div className="n">{String(ch.n).padStart(2,"0")}</div>
            <div className="ct">
              <div className="t">{ch.t} — <em>{ch.sub}</em></div>
              <div className="x">
                {ch.status==="done" && <span className="pill done"><span className="dt"></span>Done</span>}
                {ch.status==="run"  && <span className="pill run"><span className="dt"></span>Narrating</span>}
                {ch.status==="play" && <span className="pill done"><span className="dt"></span>Playing</span>}
                {ch.status==="queued" && <span className="pill"><span className="dt"></span>Queued</span>}
                <span style={{ color:"var(--ink-3)" }}>{ch.d}</span>
              </div>
            </div>
            <button className="plb">{I.play}</button>
          </div>
        ))}
      </div>

      <TabBar active="book" />
    </>
  );
}

function PlayerScreen({ dark, mode = "word" }) {
  const [time, setTime] = useState(4.2);
  useEffect(() => {
    const iv = setInterval(() => setTime(t => (t + 0.25 > 33 ? 4 : t + 0.25)), 250);
    return () => clearInterval(iv);
  }, []);
  return (
    <div className="player-app">
      <div className="ptop"></div>
      <div className="phead">
        <button className="back">{I.down}</button>
        <div className="pm">
          <div className="eb">Book III · Ch 3 of 12</div>
          <div className="tt">What Remains</div>
        </div>
        <button className="mnu ibtn">{I.list}</button>
      </div>
      <Reading mode={mode} time={time}/>
      <div className="pcontrols">
        <div className="scrub">
          <span className="t">14:22</span>
          <div className="track"><div className="f"></div><div className="k"></div></div>
          <span className="t r">38:47</span>
        </div>
        <div className="transport">
          <button className="ibtn">{I.prev}</button>
          <button className="ibtn">{I.b15}</button>
          <button className="play">{I.pause}</button>
          <button className="ibtn">{I.f15}</button>
          <button className="ibtn">{I.next}</button>
        </div>
        <div className="bottom">
          <button><span className="speed-pill">1.0×</span></button>
          <button>Ember <svg viewBox="0 0 24 24" style={{ width: 10, height: 10 }}><path d="M6 9l6 6 6-6" stroke="currentColor" fill="none" strokeWidth="1.5"/></svg></button>
          <button>{I.bmark} Bookmark</button>
        </div>
      </div>
    </div>
  );
}

function UploadScreen() {
  return (
    <>
      <div className="ptop"></div>
      <div className="appbar">
        <button className="ibtn">{I.close}</button>
        <div style={{ fontFamily:"JetBrains Mono", fontSize:10, letterSpacing:"0.12em", textTransform:"uppercase", color:"var(--ink-3)" }}>New book · 1 of 2</div>
        <div style={{ width: 36 }}></div>
      </div>

      <div className="up-wrap-m">
        <div className="eyebrow" style={{ fontFamily:"JetBrains Mono", fontSize:10, letterSpacing:"0.16em", textTransform:"uppercase", color:"var(--ink-3)", marginBottom:10 }}>Add an EPUB</div>
        <h1>Bring a book<br/><em>into the fold.</em></h1>
        <div className="sub">Drop an EPUB and we'll parse chapters, extract the cover, and hand it to the narrator — all of it scoped to you.</div>

        <div className="dropzone-m">
          {I.up}
          <h3>Drop EPUB here</h3>
          <button className="btn-p">Choose from Files</button>
          <div className="con">.EPUB · up to 50 MB</div>
        </div>

        <div className="up-progress-m">
          <div className="r">
            <div className="ic">{I.epub}</div>
            <div className="m">
              <div className="t">Meditations.epub</div>
              <div className="s">3.82 MB · 7f3c…a912</div>
            </div>
            <div className="pct">64%</div>
          </div>
          <div className="tr"><div className="f"></div></div>
          <div className="steps">
            <div className="step done"><div className="s">✓</div>Uploaded to storage</div>
            <div className="step done"><div className="s">✓</div>Validated EPUB · 12 chapters</div>
            <div className="step now"><div className="s">3</div>Extracting cover + metadata</div>
            <div className="step"><div className="s">4</div>Prepare text for narration</div>
          </div>
        </div>
      </div>
    </>
  );
}

function ImmersiveScreen({ dark }) {
  const [time, setTime] = useState(15.5);
  useEffect(() => {
    const iv = setInterval(() => setTime(t => (t + 0.25 > 33 ? 13 : t + 0.25)), 250);
    return () => clearInterval(iv);
  }, []);
  return (
    <div className="player-app" style={{ background: dark ? "var(--paper)" : "var(--paper)" }}>
      <div className="ptop"></div>
      <div className="phead" style={{ borderBottom: 0 }}>
        <button className="back">{I.down}</button>
        <div className="pm" style={{ textAlign: "center" }}>
          <div className="eb">Liber Tertius</div>
        </div>
        <button className="mnu ibtn">{I.dots}</button>
      </div>
      <Reading mode="block" time={time}/>
      <div className="pcontrols">
        <div className="scrub">
          <span className="t">21:08</span>
          <div className="track"><div className="f" style={{ width: "54%" }}></div><div className="k" style={{ left: "54%" }}></div></div>
          <span className="t r">38:47</span>
        </div>
        <div className="transport">
          <button className="ibtn">{I.prev}</button>
          <button className="ibtn">{I.b15}</button>
          <button className="play">{I.pause}</button>
          <button className="ibtn">{I.f15}</button>
          <button className="ibtn">{I.next}</button>
        </div>
        <div className="bottom">
          <button><span className="speed-pill">1.25×</span></button>
          <button>Ember <svg viewBox="0 0 24 24" style={{ width: 10, height: 10 }}><path d="M6 9l6 6 6-6" stroke="currentColor" fill="none" strokeWidth="1.5"/></svg></button>
          <button>{I.bmark} Saved</button>
        </div>
      </div>
    </div>
  );
}

// ===== Reusable chrome =====
function MiniBarStatic() {
  return (
    <div className="mini-m">
      <div className="c"><Cov c={COVERS.med}/></div>
      <div className="m">
        <div className="t">What Remains</div>
        <div className="p"><div className="f"></div></div>
      </div>
      <button className="btn2">{I.b15}</button>
      <button className="btn">{I.pause}</button>
    </div>
  );
}

function TabBar({ active }) {
  const tabs = [
    ["home", "Library", I.home],
    ["up", "Add", I.up],
    ["book", "Books", I.book],
    ["pers", "You", I.pers],
  ];
  return (
    <div className="tabbar">
      {tabs.map(([k, label, icon]) => (
        <div key={k} className={`tab ${active === k ? "on" : ""}`}>
          {icon}
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

// ===== Labels =====
function FrameWrap({ label, sub, children }) {
  return (
    <div className="frame-wrap">
      {children}
      <div className="frame-label">{label}<em>{sub}</em></div>
    </div>
  );
}

function DarkWrap({ children }) {
  // Wrap screen in dark-scoped container (CSS variable overrides)
  return <div className="dark" style={{ width: "100%", height: "100%" }}>{children}</div>;
}

// ===== Render rows =====
ReactDOM.createRoot(document.getElementById("row-light")).render(
  <>
    <FrameWrap label="01 Library" sub="Continue, in progress, processing, ready">
      <Phone><LibraryScreen/></Phone>
    </FrameWrap>
    <FrameWrap label="02 Book detail" sub="Cover, description, voice, chapter status">
      <Phone><DetailScreen/></Phone>
    </FrameWrap>
    <FrameWrap label="03 Player · word-wipe" sub="Sentence active, words fill in gold">
      <Phone><PlayerScreen mode="word"/></Phone>
    </FrameWrap>
  </>
);

ReactDOM.createRoot(document.getElementById("row-upload")).render(
  <>
    <FrameWrap label="04 Upload" sub="EPUB drop → parse → chapters">
      <Phone><UploadScreen/></Phone>
    </FrameWrap>
    <FrameWrap label="05 Immersive · block" sub="Dimmed neighbors, marker-highlight active line">
      <Phone><ImmersiveScreen/></Phone>
    </FrameWrap>
    <FrameWrap label="06 Player · word-wipe" sub="Alternate timing, same page">
      <Phone><PlayerScreen mode="word"/></Phone>
    </FrameWrap>
  </>
);

// Dark variants — need to style with .dark class via container
function DarkPhone({ children }) {
  return (
    <div style={{
      width: 380, height: 820, borderRadius: 50, overflow: "hidden", position: "relative",
      background: "#000",
      boxShadow: "0 40px 80px -20px rgba(0,0,0,0.5), 0 0 0 2px rgba(0,0,0,0.3), 0 0 0 14px #0d0b08",
    }}>
      <div style={{ position: "absolute", top: 11, left: "50%", transform: "translateX(-50%)",
        width: 120, height: 34, borderRadius: 22, background: "#000", zIndex: 50 }} />
      <StatusBar dark={true}/>
      <div style={{ position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)",
        width: 130, height: 5, borderRadius: 100, background: "rgba(255,255,255,0.7)", zIndex: 60 }} />
      <div className="phone-content">
        <div className="app paper-tex dark" style={{
          // Apply dark tokens directly on the app root since CSS var scoping needs a container class
        }}>{children}</div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("row-dark")).render(
  <>
    <FrameWrap label="07 Library · dark" sub="Warm vellum on near-black; gilt accent holds">
      <DarkPhone><LibraryScreen/></DarkPhone>
    </FrameWrap>
    <FrameWrap label="08 Player · dark · word-wipe" sub="Cream text on ink; words fill warm">
      <DarkPhone><PlayerScreen mode="word" dark/></DarkPhone>
    </FrameWrap>
    <FrameWrap label="09 Immersive · dark · block" sub="Dimmed paragraphs, gilt sentence marker">
      <DarkPhone><ImmersiveScreen dark/></DarkPhone>
    </FrameWrap>
  </>
);
