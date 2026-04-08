import { useState, useEffect, useCallback, useRef } from "react";

// ─── Month hero images (Unsplash, free) ───────────────────────────────────────
const MONTH_IMAGES = [
  { url: "https://images.unsplash.com/photo-1418985991508-e47386d96a71?w=900&q=80", credit: "Winter Peaks" },
  { url: "https://images.unsplash.com/photo-1502786129293-79981df4e689?w=900&q=80", credit: "February Frost" },
  { url: "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=900&q=80", credit: "Spring Bloom" },
  { url: "https://images.unsplash.com/photo-1462275646964-a0e3386b89fa?w=900&q=80", credit: "April Rain" },
  { url: "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=1200&q=80", credit: "May Flowers" },
  { url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&q=80", credit: "June Shore" },
  { url: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1200&q=80", credit: "July Summit" },
  { url: "https://images.unsplash.com/photo-1504198266287-1659872e6590?w=900&q=80", credit: "August Light" },
  { url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&q=80", credit: "September Forest" },
  { url: "https://images.unsplash.com/photo-1477414348463-c0eb7f1359b6?w=900&q=80", credit: "October Leaves" },
  { url: "https://images.unsplash.com/photo-1476041800959-2f6bb412c8ce?w=900&q=80", credit: "November Mist" },
  { url: "https://images.unsplash.com/photo-1544511916-0148ccdeb877?w=900&q=80", credit: "December Snow" },
];

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES   = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

// Indian public holidays (month is 0-indexed)
const HOLIDAYS = {
  "2026-0-1":  { name: "New Year", color: "#22c55e", icon: "🎉" },
  "2026-0-14": { name: "Makar Sankranti", color: "#f59e0b", icon: "🪁" },
  "2026-1-19": { name: "Maha Shivratri", color: "#6366f1", icon: "🕉️" },
  "2026-2-14": { name: "Holi", color: "#ec4899", icon: "🎨" },
  "2026-3-14": { name: "Ambedkar Jayanti", color: "#3b82f6", icon: "📘" },
  "2026-3-25": { name: "Good Friday", color: "#64748b", icon: "✝️" },
  "2026-7-15": { name: "Independence Day", color: "#f97316", icon: "🇮🇳" },
  "2026-9-2":  { name: "Gandhi Jayanti", color: "#10b981", icon: "🕊️" },
  "2026-10-14":{ name: "Diwali", color: "#facc15", icon: "🪔" },
  "2026-11-25":{ name: "Christmas", color: "#ef4444", icon: "🎄" },
};

function toKey(y, m, d) { return `${y}-${m}-${d}`; }
function sameDay(a, b)  { return a && b && a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
function dateOnly(d)    { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function isBetween(d, s, e) {
  const dd = dateOnly(d), ss = dateOnly(s), ee = dateOnly(e);
  return dd > ss && dd < ee;
}

export default function WallCalendar() {
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd,   setRangeEnd]   = useState(null);
  const [hovered,    setHovered]    = useState(null);
  const [notes, setNotes]           = useState({});
  const [events, setEvents]         = useState({});
  const [imgLoaded, setImgLoaded]   = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [theme, setTheme]           = useState("blue");
  const notesKey = `notes-${year}-${month}`;
  const prevMonthRef = useRef(month);

  // Load notes from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("wallcal-notes");
      if (stored) setNotes(JSON.parse(stored));
    } catch {}
  }, []);

  const saveNotes = useCallback((key, val) => {
    setNotes(prev => {
      const next = { ...prev, [key]: val };
      try { localStorage.setItem("wallcal-notes", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  // Theme accent per month season
  const THEMES = {
    blue:   { accent: "#1a8fe3", accentDark: "#0d6bbd", accentLight: "#d6edff", ring: "#1a8fe3" },
    amber:  { accent: "#f59e0b", accentDark: "#b45309", accentLight: "#fef3c7", ring: "#f59e0b" },
    rose:   { accent: "#e11d48", accentDark: "#9f1239", accentLight: "#ffe4e6", ring: "#e11d48" },
    emerald:{ accent: "#059669", accentDark: "#065f46", accentLight: "#d1fae5", ring: "#059669" },
  };
  const T = THEMES[theme];

  // Calendar grid computation
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // first day of month: Monday=0 … Sunday=6
  let startDow = new Date(year, month, 1).getDay(); // 0=Sun
  startDow = (startDow + 6) % 7; // shift so Mon=0
  const totalCells = Math.ceil((startDow + daysInMonth) / 7) * 7;

  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startDow + 1;
    cells.push(dayNum >= 1 && dayNum <= daysInMonth ? dayNum : null);
  }

  // Navigation with animation
  const navigate = (dir) => {
    setTransitioning(true);
    setImgLoaded(false);
    setTimeout(() => {
      let m = month + dir, y = year;
      if (m < 0)  { m = 11; y--; }
      if (m > 11) { m = 0;  y++; }
      setMonth(m);
      setYear(y);
      setRangeStart(null);
      setRangeEnd(null);
      setHovered(null);
      setTransitioning(false);
    }, 280);
  };

  // Date click handler
  // const handleDay = (day) => {
  //   if (!day) return;
  //   const clicked = new Date(year, month, day);
  //   if (!rangeStart || (rangeStart && rangeEnd)) {
  //     setRangeStart(clicked);
  //     setRangeEnd(null);
  //   } else {
  //     if (clicked < rangeStart) {
  //       setRangeEnd(rangeStart);
  //       setRangeStart(clicked);
  //     } else if (sameDay(clicked, rangeStart)) {
  //       setRangeStart(null);
  //     } else {
  //       setRangeEnd(clicked);
  //     }
  //   }
  // };

      const handleDay = (day) => {
      if (!day) return;

      const key = toKey(year, month, day);

      const eventText = prompt("Enter event for this day:");

      if (eventText) {
        setEvents(prev => ({
          ...prev,
          [key]: eventText
        }));
      }
    };

  const getDayState = (day) => {
    if (!day) return "empty";
    const d = new Date(year, month, day);
    if (sameDay(d, rangeStart)) return "start";
    if (sameDay(d, rangeEnd))   return "end";
    if (rangeStart && rangeEnd  && isBetween(d, rangeStart, rangeEnd)) return "between";
    if (rangeStart && !rangeEnd && hovered && isBetween(d, rangeStart, hovered)) return "preview";
    if (sameDay(d, today)) return "today";
    return "normal";
  };

  const isWeekend = (cellIdx) => {
    const dow = cellIdx % 7; // 0=Mon … 5=Sat, 6=Sun
    return dow === 5 || dow === 6;
  };

  const heroImg = MONTH_IMAGES[month];

  // Formatted range label
  const rangeLabel = (() => {
    if (!rangeStart) return null;
    const fmt = d => `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0,3)} ${d.getFullYear()}`;
    if (!rangeEnd) return `From ${fmt(rangeStart)}`;
    const diff = Math.round((dateOnly(rangeEnd) - dateOnly(rangeStart)) / 86400000);
    return `${fmt(rangeStart)} → ${fmt(rangeEnd)}  (${diff} day${diff !== 1 ? "s" : ""})`;
  })();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body { background: #e8eaf0; min-height: 100vh; display: flex; align-items: center; justify-content: center; font-family: 'DM Sans', sans-serif; }

        .cal-wrap {
          width: min(900px, 98vw);
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 32px 80px rgba(0,0,0,.18), 0 2px 8px rgba(0,0,0,.08);
          overflow: hidden;
          position: relative;
          transition: opacity .28s, transform .28s;
        }
        .cal-wrap.fade { opacity: 0; transform: translateY(10px); }

        /* Spiral holes at top */
        .spiral-bar {
          height: 22px;
          background: #d0d4dc;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          position: relative;
          z-index: 10;
        }
        .spiral-hole {
          width: 14px; height: 14px;
          border-radius: 50%;
          background: #fff;
          border: 2px solid #b0b5bf;
          box-shadow: inset 0 1px 3px rgba(0,0,0,.2);
        }

        /* Hero image */
        .hero {
          position: relative;
          height: 300px;              /* 👈 increased height */
          overflow: hidden;
          background: #000;           /* 👈 darker base (optional cleaner look) */
        }
        @media(max-width:600px){ .hero { height: 180px; } }

        .hero img {
          width: 100%;
          height: 100%;
          object-fit: cover;          /* 👈 back to cover */
          object-position: center;    /* 👈 keeps focus center */
          transition: opacity .5s;
        }
        .hero img.hidden { opacity: 0; }

        /* Diagonal blue shape overlay */
        .hero-overlay {
          position: absolute;
          bottom: 0; right: 0;
          width: 52%;
          height: 100%;
          clip-path: polygon(30% 0%, 100% 0%, 100% 100%, 0% 100%);
          background: var(--accent);
          opacity: .88;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          justify-content: flex-end;
          padding: 24px 28px;
        }
        @media(max-width:600px){
          .hero-overlay { width: 65%; padding: 14px 18px; }
        }
        .hero-year  { font-family: 'Playfair Display', serif; font-size: 2.2rem; color: rgba(255,255,255,.75); line-height: 1; }
        .hero-month { font-family: 'Playfair Display', serif; font-size: 2.8rem; font-weight: 900; color: #fff; line-height: 1; }
        @media(max-width:600px){
          .hero-year  { font-size: 1.4rem; }
          .hero-month { font-size: 1.8rem; }
        }
        .hero-credit { font-size: .65rem; color: rgba(255,255,255,.5); margin-top: 6px; letter-spacing: .04em; }

        /* Nav arrows */
        .nav-btn {
          position: absolute;
          top: 50%; transform: translateY(-50%);
          z-index: 20;
          width: 34px; height: 34px;
          border-radius: 50%;
          border: none;
          background: rgba(255,255,255,.85);
          color: #333;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 1rem;
          box-shadow: 0 2px 8px rgba(0,0,0,.2);
          transition: background .15s, transform .15s;
        }
        .nav-btn:hover { background: #fff; transform: translateY(-50%) scale(1.08); }
        .nav-btn.prev { left: 12px; }
        .nav-btn.next { right: 12px; }

        /* Body */
        .cal-body {
          display: grid;
          grid-template-columns: 180px 1fr;
          min-height: 360px;
        }
        @media(max-width:640px){
          .cal-body { grid-template-columns: 1fr; }
        }

        /* Notes panel */
        .notes-panel {
          border-right: 1px solid #e8eaef;
          padding: 20px 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: #fafbfc;
        }
        @media(max-width:640px){
          .notes-panel { border-right: none; border-bottom: 1px solid #e8eaef; }
        }
        .notes-label {
          font-size: .68rem;
          font-weight: 600;
          letter-spacing: .1em;
          text-transform: uppercase;
          color: #9aa0ad;
        }
        .notes-textarea {
          flex: 1;
          min-height: 180px;
          border: none;
          outline: none;
          resize: none;
          font-family: 'DM Sans', sans-serif;
          font-size: .82rem;
          line-height: 1.9;
          color: #3d4452;
          background: transparent;
          /* lined paper effect */
          background-image: repeating-linear-gradient(
            to bottom,
            transparent,
            transparent 28px,
            #e4e8ef 28px,
            #e4e8ef 29px
          );
          background-attachment: local;
          padding-top: 6px;
        }
        .range-badge {
          font-size: .7rem;
          color: #fff;
          background: var(--accent);
          padding: 4px 8px;
          border-radius: 6px;
          line-height: 1.4;
          word-break: break-word;
        }
        .clear-btn {
          font-size: .7rem;
          color: var(--accent);
          background: none;
          border: 1px solid var(--accent);
          border-radius: 6px;
          padding: 3px 8px;
          cursor: pointer;
          align-self: flex-start;
          transition: background .15s, color .15s;
        }
        .clear-btn:hover { background: var(--accent); color: #fff; }

        /* Calendar grid */
        .grid-panel {
          padding: 18px 20px 20px;
        }
        .day-headers {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          margin-bottom: 6px;
        }
        .day-header {
          text-align: center;
          font-size: .68rem;
          font-weight: 600;
          letter-spacing: .06em;
          text-transform: uppercase;
          padding: 4px 0;
        }
        .day-header.weekend { color: var(--accent); }
        .day-header.weekday { color: #9aa0ad; }

        .day-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 2px;
        }
        .day-cell {
          position: relative;
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: .82rem;
          font-weight: 500;
          cursor: pointer;
          border-radius: 8px;
          transition: background .12s, color .12s;
          user-select: none;
          min-width: 0;
        }
        .day-cell:hover:not(.empty):not(.start):not(.end) {
          background: var(--accent-light);
        }
        .day-cell.empty { cursor: default; }
        .day-cell.other-month { color: #ccc; cursor: default; }

        .day-cell.start,
        .day-cell.end {
          background: var(--accent) !important;
          color: #fff !important;
          border-radius: 50%;
          font-weight: 700;
        }
        .day-cell.between {
          background: var(--accent-light);
          color: var(--accent-dark);
          border-radius: 0;
        }
        .day-cell.between:first-child,
        .day-cell.between-left  { border-radius: 8px 0 0 8px; }
        .day-cell.between-right { border-radius: 0 8px 8px 0; }

        .day-cell.preview {
          background: color-mix(in srgb, var(--accent) 15%, transparent);
          color: var(--accent-dark);
          border-radius: 0;
        }
        .day-cell.today::after {
          content: '';
          position: absolute;
          bottom: 3px; left: 50%; transform: translateX(-50%);
          width: 4px; height: 4px;
          border-radius: 50%;
          background: var(--accent);
        }
        .day-cell.today.start::after,
        .day-cell.today.end::after { background: #fff; }

        .day-cell.weekend { color: var(--accent); }
        .day-cell.start.weekend,
        .day-cell.end.weekend   { color: #fff; }

        /* Holiday dot */
        .holiday-dot {
          position: absolute;
          top: 3px; right: 4px;
          width: 4px; height: 4px;
          border-radius: 50%;
          background: #f97316;
        }
        .day-cell.start .holiday-dot,
        .day-cell.end   .holiday-dot { background: rgba(255,255,255,.7); }

        /* Theme switcher */
        .theme-bar {
          display: flex;
          gap: 8px;
          align-items: center;
          padding: 10px 20px;
          border-top: 1px solid #e8eaef;
          background: #fafbfc;
          justify-content: flex-end;
        }
        .theme-label { font-size: .68rem; color: #9aa0ad; letter-spacing: .06em; text-transform: uppercase; margin-right: 4px; }
        .theme-dot {
          width: 18px; height: 18px;
          border-radius: 50%;
          border: 2px solid transparent;
          cursor: pointer;
          transition: transform .15s, border-color .15s;
        }
        .theme-dot:hover { transform: scale(1.2); }
        .theme-dot.active { border-color: #333; transform: scale(1.15); }

        .holiday-label {
          position: absolute;
          bottom: 2px;
          left: 2px;
          right: 2px;
          font-size: 0.55rem;
          line-height: 1;
          text-align: center;
          color: #333;
          background: rgba(255,255,255,0.85);
          border-radius: 4px;
          padding: 1px 2px;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .event-label {
          position: absolute;
          top: 2px;
          left: 2px;
          right: 2px;
          font-size: 0.55rem;
          background: rgba(59, 130, 246, 0.15);
          color: #1e3a8a;
          border-radius: 4px;
          padding: 1px 2px;
          text-align: center;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }
      `}</style>

      <div
        style={{ "--accent": T.accent, "--accent-dark": T.accentDark, "--accent-light": T.accentLight }}
        className={`cal-wrap${transitioning ? " fade" : ""}`}
      >
        {/* Spiral */}
        <div className="spiral-bar">
          {Array.from({ length: 17 }).map((_, i) => <div key={i} className="spiral-hole" />)}
        </div>

        {/* Hero */}
        <div className="hero">
          <img
            src={heroImg.url}
            alt={heroImg.credit}
            className={imgLoaded ? "" : "hidden"}
            onLoad={() => setImgLoaded(true)}
          />
          {!imgLoaded && <div style={{ position:"absolute",inset:0,background:"#1a1a2e" }} />}

          {/* Nav */}
          <button className="nav-btn prev" onClick={() => navigate(-1)} aria-label="Previous month">&#8592;</button>
          <button className="nav-btn next" onClick={() => navigate(1)}  aria-label="Next month">&#8594;</button>

          {/* Month overlay */}
          <div className="hero-overlay">
            <div className="hero-year">{year}</div>
            <div className="hero-month">{MONTH_NAMES[month].toUpperCase()}</div>
            <div className="hero-credit">{heroImg.credit}</div>
          </div>
        </div>

        {/* Body */}
        <div className="cal-body">

          {/* Notes */}
          <div className="notes-panel">
            <span className="notes-label">Notes</span>
            {rangeLabel && <div className="range-badge">{rangeLabel}</div>}
            {(rangeStart || rangeEnd) && (
              <button className="clear-btn" onClick={() => { setRangeStart(null); setRangeEnd(null); setHovered(null); }}>
                Clear selection
              </button>
            )}
            <textarea
              className="notes-textarea"
              placeholder="Add a note for this month…"
              value={notes[notesKey] || ""}
              onChange={e => saveNotes(notesKey, e.target.value)}
            />
          </div>

          {/* Grid */}
          <div className="grid-panel">
            <div className="day-headers">
              {DAY_NAMES.map((d, i) => (
                <div key={d} className={`day-header ${i >= 5 ? "weekend" : "weekday"}`}>{d}</div>
              ))}
            </div>
            <div className="day-grid">
              {cells.map((day, idx) => {
                const state    = getDayState(day);
                const weekend  = isWeekend(idx);
                const holiday  = day ? HOLIDAYS[toKey(year, month, day)] : null;

                // Between-edge rounding
                const prevDay  = cells[idx - 1];
                const nextDay  = cells[idx + 1];
                const leftEdge  = state === "between" && (!prevDay || getDayState(prevDay) !== "between");
                const rightEdge = state === "between" && (!nextDay || getDayState(nextDay) !== "between");

                let cls = "day-cell";
                if (!day)                        cls += " empty";
                else if (state === "start")      cls += " start";
                else if (state === "end")        cls += " end";
                else if (state === "between")    cls += " between" + (leftEdge ? " between-left" : "") + (rightEdge ? " between-right" : "");
                else if (state === "preview")    cls += " preview";
                else if (state === "today")      cls += " today";
                if (weekend && day)              cls += " weekend";

                return (
                  <div
                    key={idx}
                    className={cls}

                    onClick={() => handleDay(day)}

                    onContextMenu={(e) => {
                      e.preventDefault();

                      if (!day) return;

                      const key = toKey(year, month, day);

                      if (events[key]) {
                        const confirmDelete = confirm("Delete this event?");
                        if (confirmDelete) {
                          setEvents(prev => {
                            const updated = { ...prev };
                            delete updated[key];
                            return updated;
                          });
                        }
                      }
                    }}

                    onMouseEnter={() => {
                      if (day && rangeStart && !rangeEnd)
                        setHovered(new Date(year, month, day));
                    }}

                    onMouseLeave={() => setHovered(null)}

                    title={holiday ? holiday.name : undefined}
                  >
                    {day}

                    {/* ✅ EVENT DISPLAY */}
                    {day && events[toKey(year, month, day)] && (
                      <div className="event-label">
                        {events[toKey(year, month, day)]}
                      </div>
                    )}

                    {/* ✅ HOLIDAY DISPLAY */}
                    {holiday && (
                      <>
                        <span
                          className="holiday-dot"
                          style={{ background: holiday.color }}
                          title={holiday.name}
                        />
                        <div className="holiday-label">
                          {holiday.icon} {holiday.name}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Theme bar */}
        <div className="theme-bar">
          <span className="theme-label">Theme</span>
          {Object.keys(THEMES).map(t => (
            <div
              key={t}
              className={`theme-dot${theme === t ? " active" : ""}`}
              style={{ background: THEMES[t].accent }}
              onClick={() => setTheme(t)}
              title={t}
            />
          ))}
        </div>
      </div>
    </>
  );
}
