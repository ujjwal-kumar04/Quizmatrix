import { useState, useEffect, useRef } from "react";
import { Link,useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Instagram,
  Facebook,
  Github,
  Linkedin
} from "lucide-react";
import { useTheme } from '../context/ThemeContext.jsx';
/* ─── DATA ───────────────────────────────────────────────── */


const FEATURES = [
  { emoji: "🧠", title: "Smart Online Quizzes",   color: "#4338ca", tags: ["MCQ","Auto-Eval","Real-time"],      desc: "Real-time MCQ exams with instant auto-evaluation. Zero manual checking — results appear the moment students submit." },
  { emoji: "⏱️", title: "Timer-Based Exams",       color: "#7c3aed", tags: ["Countdown","Auto-Submit","Fair Play"], desc: "Set fixed durations and let the system auto-submit. Creates a fair, stress-tested environment for every student." },
  { emoji: "👨‍🏫", title: "Teacher Dashboard",       color: "#ea580c", tags: ["Create","Edit","Manage"],           desc: "Create quizzes in minutes — add, edit, or delete questions from a single clean management panel." },
  { emoji: "👨‍🎓", title: "Student Dashboard",       color: "#059669", tags: ["Results","Progress","History"],     desc: "Browse available quizzes, see instant results after submission, and track performance over time." },
  { emoji: "🔐", title: "Secure Login System",     color: "#db2777", tags: ["JWT Auth","Role-Based","Encrypted"], desc: "Role-based portals for students and teachers, protected by JWT authentication and encrypted data storage." },
  { emoji: "📊", title: "Instant Analytics",       color: "#d97706", tags: ["Analytics","Insights","History"],   desc: "Real-time score calculation, full result history, and performance insights to help every student improve." },
];





/* ─── CUSTOM HOOKS ───────────────────────────────────────── */
function useScrollReveal(threshold = 0.12) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

function useCountUp(target, duration = 1800) {
  const ref = useRef(null);
  const [display, setDisplay] = useState("0");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStarted(true); obs.disconnect(); } },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    const num = parseInt(target.replace(/[^0-9]/g, ""), 10);
    if (!num) { setDisplay(target); return; }
    const step = num / (duration / 16);
    let cur = 0;
    const timer = setInterval(() => {
      cur = Math.min(cur + step, num);
      const formatted = target.replace(/[0-9,]+/, Math.floor(cur).toLocaleString());
      setDisplay(formatted);
      if (cur >= num) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [started, target, duration]);

  return [ref, display];
}

/* ─── SHARED STYLES (LIGHT/DARK AWARE) ──────────────────── */
function useStyles() {
  const { darkMode } = useTheme();

  return {
    page: {
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      background: darkMode
        ? "linear-gradient(180deg, #0b1220 0%, #0f172a 100%)"
        : "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
      minHeight: "100vh",
      color: darkMode ? "#e6eef8" : "#0f172a",
    },
    nav: {
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      background: darkMode ? "rgba(15,23,42,0.88)" : "rgba(255,255,255,0.88)",
      backdropFilter: "blur(18px)",
      borderBottom: darkMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(148,163,184,0.35)",
      boxShadow: darkMode ? "0 8px 30px rgba(0,0,0,0.25)" : "0 8px 30px rgba(15, 23, 42, 0.04)",
      padding: "0 5%", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between",
    },
    logo: { fontWeight: 800, fontSize: "1.35rem", color: darkMode ? "#f1f5f9" : "#0f172a", letterSpacing: "-0.03em", cursor: "pointer", userSelect: "none" },
    navLink: { color: darkMode ? "#94a3b8" : "#64748b", fontSize: "0.9rem", fontWeight: 500, cursor: "pointer", padding: "4px 0", borderBottom: "2px solid transparent", transition: "all 0.2s" },
    section: {
      padding: "6rem 5%",
      background: darkMode
        ? "linear-gradient(180deg, #0b1220 0%, #0f172a 100%)"
        : "linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)",
    },
    sectionW: { padding: "6rem 5%", background: darkMode ? "#0f172a" : "#ffffff" },
    label: { fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: darkMode ? "#818cf8" : "#4338ca", marginBottom: 8 },
    h2: { fontWeight: 800, fontSize: "clamp(1.8rem,3.5vw,2.6rem)", lineHeight: 1.12, letterSpacing: "-0.03em", margin: "0 0 0.8rem", color: darkMode ? "#f1f5f9" : "#0f172a" },
    sub: { color: darkMode ? "#94a3b8" : "#64748b", fontSize: "1rem", lineHeight: 1.75, maxWidth: 520 },
    card: {
      background: darkMode ? "#111827" : "#fff",
      border: darkMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid #e2e8f0",
      borderRadius: 16, padding: "1.6rem",
      boxShadow: darkMode ? "0 12px 40px rgba(0,0,0,0.35)" : "0 12px 40px rgba(15, 23, 42, 0.06)",
    },
    btnPrimary: { background: "linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)", color: "#fff", padding: "11px 26px", borderRadius: 12, fontWeight: 700, fontSize: "0.92rem", cursor: "pointer", border: "none", display: "inline-flex", alignItems: "center", gap: 8, transition: "transform 0.15s, box-shadow 0.2s" },
    btnOutline: {
      background: darkMode ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.75)",
      color: darkMode ? "#c7d2fe" : "#312e81",
      padding: "11px 26px", borderRadius: 12, fontWeight: 700, fontSize: "0.92rem", cursor: "pointer",
      border: darkMode ? "1.5px solid rgba(129,140,248,0.35)" : "1.5px solid rgba(99,102,241,0.35)",
      display: "inline-flex", alignItems: "center", gap: 8, transition: "all 0.2s",
    },
  };
}

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @media(max-width:768px) { .qm-desktop-nav { display:none !important; } .qm-hamburger { display:flex !important; } }
  @media(min-width:769px) { .qm-mobile-menu { display:none !important; } }
  @keyframes fadeUp { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:translateY(0); } }
  @keyframes progressAnim { from { width:28%; } to { width:80%; } }
  .qm-reveal { opacity:0; transform:translateY(28px); transition: opacity 0.55s ease, transform 0.55s ease; }
  .qm-reveal.vis { opacity:1; transform:translateY(0); }
  .qm-slide-l { opacity:0; transform:translateX(-30px); transition: all 0.65s ease; }
  .qm-slide-l.vis { opacity:1; transform:translateX(0); }
  .qm-slide-r { opacity:0; transform:translateX(30px); transition: all 0.65s ease; }
  .qm-slide-r.vis { opacity:1; transform:translateX(0); }
  .qm-feat-card { transition: transform 0.25s, box-shadow 0.25s !important; }
  .qm-feat-card:hover { transform:translateY(-5px) !important; box-shadow:0 16px 40px rgba(0,0,0,0.10) !important; }
  .dark .qm-feat-card:hover { box-shadow:0 16px 40px rgba(0,0,0,0.45) !important; }
  .qm-test-card:hover { transform:translateY(-3px); box-shadow:0 10px 30px rgba(0,0,0,0.09); }
  .qm-btn-p:hover { transform:translateY(-2px) !important; box-shadow:0 16px 30px rgba(67,56,202,0.25) !important; }
  .qm-btn-o:hover { background:rgba(238,242,255,0.95) !important; color:#312e81 !important; }
  .dark .qm-btn-o:hover { background:rgba(129,140,248,0.16) !important; color:#c7d2fe !important; }
  .qm-progress-bar { animation: progressAnim 2.5s ease-in-out infinite alternate; }
  input:focus, textarea:focus, select:focus { border-color:#4338ca !important; box-shadow:0 0 0 3px rgba(37,99,235,0.12) !important; outline:none; }
  .dark input:focus, .dark textarea:focus, .dark select:focus { border-color:#818cf8 !important; box-shadow:0 0 0 3px rgba(129,140,248,0.18) !important; }
  @media(max-width:800px) { .qm-how-grid { grid-template-columns:1fr !important; } }
  @media(max-width:700px) { .qm-contact-grid { grid-template-columns:1fr !important; } .qm-form-row { grid-template-columns:1fr !important; } }
  @media(max-width:768px) { .qm-footer-grid { grid-template-columns:1fr 1fr !important; } }
  @media(max-width:480px) { .qm-footer-grid { grid-template-columns:1fr !important; } }
`;


/* ─── NAVBAR ─────────────────────────────────────────────── */
function Navbar({ page, setPage }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { darkMode, toggleDarkMode } = useTheme();
  const S = useStyles();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (p) => {
    setPage(p);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollTo = (id) => {
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }, 60);
  };
  const navigate = useNavigate();

  const navItems = [
    { label: "Features",      action: () => { go("home"); scrollTo("features"); } },
    { label: "How it Works",  action: () => { go("home"); scrollTo("how-it-works"); } },
    { label: "Mock Tests",     action: () => navigate("/mock-test") },

    { label: "Contact",       action: () => go("contact") },
  ];

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <button
        onClick={toggleDarkMode}
        style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 999, padding: '10px 14px', borderRadius: 999, border: '1px solid rgba(99,102,241,0.25)', background: darkMode ? 'linear-gradient(135deg, #111827, #1f2937)' : 'linear-gradient(135deg, #ffffff, #eef2ff)', color: darkMode ? '#ffffff' : '#111827', boxShadow: '0 12px 28px rgba(15,23,42,0.18)' }}
      >
        {darkMode ? 'Light mode' : 'Dark mode'}
      </button>
      <nav style={{ ...S.nav, boxShadow: scrolled ? (darkMode ? "0 2px 20px rgba(0,0,0,0.4)" : "0 2px 20px rgba(0,0,0,0.08)") : S.nav.boxShadow }}>
        <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-glow group-hover:scale-110 transition-all duration-300">
                <span className="text-white font-bold text-xl">Q</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 dark:from-primary-400 dark:to-primary-500 bg-clip-text text-transparent">
                QuizMatrix
              </span>
            </Link>
          </div>

        {/* Desktop */}
        <div className="qm-desktop-nav" style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
          {navItems.map(({ label, action }) => (
            <span key={label} onClick={action} style={S.navLink}
              onMouseEnter={e => { e.target.style.color = darkMode ? "#818cf8" : "#4338ca"; e.target.style.borderBottomColor = darkMode ? "#818cf8" : "#4338ca"; }}
              onMouseLeave={e => { e.target.style.color = darkMode ? "#94a3b8" : "#64748b"; e.target.style.borderBottomColor = "transparent"; }}>
              {label}
            </span>
          ))}

          {/* Desktop Mobile App Download Section */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", borderLeft: darkMode ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e2e8f0", paddingLeft: "1.5rem" }}>
            <span style={{ fontSize: "0.85rem", color: darkMode ? "#94a3b8" : "#64748b", fontWeight: 500 }}>
              Get our App:
            </span>
            <a
              href="/app/app-release.apk"
              download="QuizMatrix.apk"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "#10b981",
                color: "#fff",
                padding: "6px 14px",
                borderRadius: "8px",
                fontSize: "0.85rem",
                fontWeight: "600",
                textDecoration: "none",
                boxShadow: "0 2px 4px rgba(16, 185, 129, 0.2)",
                transition: "all 0.2s"
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#059669"}
              onMouseLeave={e => e.currentTarget.style.background = "#10b981"}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                <line x1="12" y1="18" x2="12.01" y2="18"></line>
              </svg>
              Download APK
            </a>
          </div>

          <button
            className="qm-btn-p"
            style={S.btnPrimary}
            onClick={() => navigate("/login")}
          >
            Login Now
          </button>
        </div>

        {/* Hamburger */}
        <button className="qm-hamburger" onClick={() => setMenuOpen(!menuOpen)}
          style={{ display: "none", background: "none", border: "none", cursor: "pointer", padding: 4, flexDirection: "column", gap: 5 }}>
          {[0, 1, 2].map(i => (
            <span key={i} style={{
              width: 22, height: 2, background: darkMode ? "#e6eef8" : "#0f172a", borderRadius: 2, display: "block", transition: "all 0.3s",
              transform: menuOpen ? (i === 0 ? "rotate(45deg) translate(5px,5px)" : i === 2 ? "rotate(-45deg) translate(5px,-5px)" : "none") : "none",
              opacity: menuOpen && i === 1 ? 0 : 1,
            }} />
          ))}
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="qm-mobile-menu" style={{ position: "fixed", top: 64, left: 0, right: 0, background: darkMode ? "#0f172a" : "#fff", borderBottom: darkMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid #e2e8f0", padding: "1rem 5%", zIndex: 99, display: "flex", flexDirection: "column", gap: "0.8rem" }}>
          {navItems.map(({ label, action }) => (
            <span key={label} onClick={() => { action(); setMenuOpen(false); }}
              style={{ color: darkMode ? "#cbd5e1" : "#374151", padding: "0.5rem 0", borderBottom: darkMode ? "1px solid rgba(255,255,255,0.06)" : "1px solid #f1f5f9", cursor: "pointer", fontWeight: 500, fontSize: "0.95rem" }}>
              {label}
            </span>
          ))}

          {/* Mobile Menu App Download Section */}
          <div style={{ padding: "0.5rem 0", borderBottom: darkMode ? "1px solid rgba(255,255,255,0.06)" : "1px solid #f1f5f9", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.85rem", color: darkMode ? "#94a3b8" : "#64748b" }}>
              Try our Mobile App for a better experience!
            </span>
            <a
              href="/app/app-release.apk"
              download="QuizMatrix.apk"
              onClick={() => setMenuOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                background: "#10b981",
                color: "#fff",
                padding: "10px",
                borderRadius: "8px",
                fontSize: "0.9rem",
                fontWeight: "600",
                textDecoration: "none"
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                <line x1="12" y1="18" x2="12.01" y2="18"></line>
              </svg>
              Download Mobile App (APK)
            </a>
          </div>

          <button className="qm-btn-p" style={{ ...S.btnPrimary, justifyContent: "center", marginTop: 4 }} onClick={() => { navigate("/login"); setMenuOpen(false); }}>
            Login Now
          </button>
        </div>
      )}
    </>
  );
}

/* ─── STAT CARD (own component so hook is at top level) ──── */
function StatCard({ stat }) {
  const [ref, display] = useCountUp(stat.value);
  const { darkMode } = useTheme();
  return (
    <div ref={ref} style={{ textAlign: "center" }}>
      <div style={{ fontSize: "1.9rem", fontWeight: 800, color: darkMode ? "#818cf8" : "#4338ca", letterSpacing: "-0.04em", lineHeight: 1 }}>{display}</div>
      <div style={{ fontSize: "0.78rem", color: darkMode ? "#64748b" : "#94a3b8", marginTop: 3, fontWeight: 500 }}>{stat.label}</div>
      <div style={{ fontSize: "0.7rem", color: "#22c55e", marginTop: 2 }}>↑ {stat.trend}</div>
    </div>
  );
}

/* ─── HERO ───────────────────────────────────────────────── */
function Hero({ setPage }) {
  const go = (p) => { setPage(p); window.scrollTo({ top: 0 }); };
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const S = useStyles();
  return (
    <section style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "7rem 5% 5rem", background: darkMode ? "linear-gradient(155deg,#071024 0%,#0b1220 50%,#071024 100%)" : "linear-gradient(155deg,#f0f7ff 0%,#f8fafc 50%,#faf5ff 100%)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "12%", right: "6%", width: 340, height: 340, background: "radial-gradient(circle,rgba(37,99,235,0.08),transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "10%", left: "4%", width: 280, height: 280, background: "radial-gradient(circle,rgba(124,58,237,0.07),transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 760, margin: "0 auto" }}>


        <h1 style={{ fontWeight: 800, fontSize: "clamp(2.6rem,6vw,4.6rem)", lineHeight: 1.06, letterSpacing: "-0.035em", color: darkMode ? '#e6eef8' : '#0f172a', marginBottom: 20, animation: "fadeUp 0.7s ease 0.1s both" }}>
          Ace Every Exam with<br />
          <span style={{ color: darkMode ? "#818cf8" : "#4338ca" }}>QuizMatrix</span>
        </h1>

        <p style={{ color: darkMode ? '#9aa6b8' : '#64748b', fontSize: "1.1rem", lineHeight: 1.75, maxWidth: 560, margin: "0 auto 2.5rem", animation: "fadeUp 0.7s ease 0.2s both" }}>
          The ultimate platform for online MCQ quizzes, timer-based exams, and instant results. Built for students, designed for teachers.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", animation: "fadeUp 0.7s ease 0.3s both" }}>
          <button className="qm-btn-p" style={S.btnPrimary} onClick={() => navigate("/login")}> Start For Free</button>
          <button className="qm-btn-o" style={S.btnOutline} onClick={() => navigate("/mock-test")}>📝 Try a Mock Test</button>
        </div>


      </div>
    </section>
  );
}

/* ─── FEATURE CARD (own component) ──────────────────────── */
function FeatureCard({ feature, delay }) {
  const [ref, vis] = useScrollReveal();
  const { darkMode } = useTheme();
  const S = useStyles();
  return (
    <div ref={ref} className={`qm-feat-card qm-reveal${vis ? " vis" : ""}`}
      style={{ ...S.card, transitionDelay: `${delay}s` }}>
      <div style={{ width: 50, height: 50, borderRadius: 12, background: feature.color + "15", border: `1px solid ${feature.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", marginBottom: 14 }}>
        {feature.emoji}
      </div>
      <h3 style={{ fontWeight: 700, fontSize: "1.05rem", marginBottom: 8, color: darkMode ? "#f1f5f9" : "#0f172a" }}>{feature.title}</h3>
      <p style={{ color: darkMode ? "#94a3b8" : "#64748b", fontSize: "0.875rem", lineHeight: 1.7, marginBottom: 14 }}>{feature.desc}</p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {feature.tags.map(t => (
          <span key={t} style={{ fontSize: "0.72rem", padding: "3px 10px", borderRadius: 100, background: darkMode ? "rgba(255,255,255,0.06)" : "#f1f5f9", color: darkMode ? "#cbd5e1" : "#475569", fontWeight: 600 }}>{t}</span>
        ))}
      </div>
    </div>
  );
}

/* ─── FEATURES SECTION ───────────────────────────────────── */
function Features() {
  const { darkMode } = useTheme();
  const S = useStyles();
  return (
    <section id="features" style={S.sectionW}>
      <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
        <div style={S.label}>What We Offer</div>
        <h2 style={{ ...S.h2, textAlign: "center" }}>Everything You Need to <span style={{ color: darkMode ? "#818cf8" : "#4338ca" }}>Quiz Smarter</span></h2>
        <p style={{ ...S.sub, margin: "0 auto" }}>From creating quizzes to tracking performance — every tool, built right in.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: "1.2rem", maxWidth: 1200, margin: "0 auto" }}>
        {FEATURES.map((f, i) => <FeatureCard key={f.title} feature={f} delay={i * 0.07} />)}
      </div>
    </section>
  );
}

/* ─── HOW IT WORKS ───────────────────────────────────────── */
function HowItWorks() {
  const [leftRef, leftVis] = useScrollReveal();
  const [rightRef, rightVis] = useScrollReveal();
  const { darkMode } = useTheme();
  const S = useStyles();

  const steps = [
    { n: "01", h: "Create Your Account",   p: "Sign up as Teacher or Student. JWT-based authentication keeps your data fully secure and private." },
    { n: "02", h: "Build or Join a Quiz",  p: "Teachers create MCQ quizzes with timers. Students browse available exams and join with one click." },
    { n: "03", h: "Get Instant Results",   p: "Auto-evaluation delivers your score the moment the quiz ends. Review answers and track improvement." },
  ];

  return (
    <section id="how-it-works" style={S.section}>
      <div className="qm-how-grid" style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4rem", alignItems: "center" }}>
        <div ref={leftRef} className={`qm-slide-l${leftVis ? " vis" : ""}`}>
          <div style={S.label}>Simple Process</div>
          <h2 style={S.h2}>Up & Running in <span style={{ color: darkMode ? "#818cf8" : "#4338ca" }}>3 Easy Steps</span></h2>
          <p style={{ ...S.sub, marginBottom: "2.5rem" }}>Whether you're a teacher or student, QuizMatrix gets you going in minutes.</p>
          {steps.map((s, i) => (
            <div key={s.n} style={{ display: "flex", gap: 16, paddingBottom: 28, position: "relative" }}>
              {i < steps.length - 1 && (
                <div style={{ position: "absolute", left: 20, top: 50, width: 2, height: "calc(100% - 20px)", background: darkMode ? "linear-gradient(to bottom,rgba(129,140,248,0.35),transparent)" : "linear-gradient(to bottom,#bfdbfe,transparent)" }} />
              )}
              <div style={{ minWidth: 42, height: 42, borderRadius: 12, background: darkMode ? "#6366f1" : "#4338ca", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: "0.85rem", flexShrink: 0 }}>
                {s.n}
              </div>
              <div>
                <h4 style={{ fontWeight: 700, fontSize: "1rem", color: darkMode ? "#f1f5f9" : "#0f172a", marginBottom: 5 }}>{s.h}</h4>
                <p style={{ color: darkMode ? "#94a3b8" : "#64748b", fontSize: "0.875rem", lineHeight: 1.65 }}>{s.p}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Mock browser */}
        <div ref={rightRef} className={`qm-slide-r${rightVis ? " vis" : ""}`}>
          <div style={{ background: darkMode ? "#111827" : "#fff", border: darkMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid #e2e8f0", borderRadius: 16, overflow: "hidden", boxShadow: darkMode ? "0 20px 60px rgba(0,0,0,0.45)" : "0 20px 60px rgba(0,0,0,0.10)" }}>
            <div style={{ background: darkMode ? "#0b1220" : "#f8fafc", padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, borderBottom: darkMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", gap: 5 }}>
                {["#ef4444","#f59e0b","#22c55e"].map(c => <span key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c, display: "inline-block" }} />)}
              </div>
              <div style={{ flex: 1, background: darkMode ? "rgba(255,255,255,0.06)" : "#e2e8f0", borderRadius: 6, padding: "3px 10px", fontSize: "0.72rem", color: darkMode ? "#94a3b8" : "#64748b" }}>quizmatrix.app/quiz/live</div>
            </div>
            <div style={{ padding: "1.4rem" }}>
              <div style={{ fontWeight: 700, fontSize: "0.95rem", color: darkMode ? "#f1f5f9" : "#0f172a", marginBottom: 6 }}>📘 Computer Science — Data Structures</div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.74rem", color: darkMode ? "#a5b4fc" : "#4338ca", background: darkMode ? "rgba(129,140,248,0.12)" : "#eff6ff", padding: "3px 10px", borderRadius: 100, marginBottom: 14 }}>⏱ 08:42 remaining</div>
              <div style={{ fontSize: "0.84rem", fontWeight: 500, color: darkMode ? "#e2e8f0" : "#1e293b", marginBottom: 12, lineHeight: 1.55 }}>Q3. Which data structure uses LIFO order?</div>
              {[["A","Queue",false],["B","Stack",true],["C","Linked List",false],["D","Tree",false]].map(([l, opt, sel]) => (
                <div key={l} style={{
                  background: sel ? (darkMode ? "rgba(129,140,248,0.12)" : "#eff6ff") : (darkMode ? "rgba(255,255,255,0.03)" : "#f8fafc"),
                  border: `1px solid ${sel ? (darkMode ? "rgba(129,140,248,0.35)" : "#bfdbfe") : (darkMode ? "rgba(255,255,255,0.08)" : "#e2e8f0")}`,
                  borderRadius: 8, padding: "8px 12px", fontSize: "0.8rem", marginBottom: 6,
                  color: sel ? (darkMode ? "#a5b4fc" : "#4338ca") : (darkMode ? "#94a3b8" : "#475569"),
                  fontWeight: sel ? 600 : 400, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 20, height: 20, borderRadius: "50%", background: sel ? (darkMode ? "#6366f1" : "#4338ca") : (darkMode ? "rgba(255,255,255,0.1)" : "#e2e8f0"), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.68rem", color: sel ? "#fff" : (darkMode ? "#94a3b8" : "#64748b"), fontWeight: 700, flexShrink: 0 }}>{l}</span>
                  {opt} {sel && "✓"}
                </div>
              ))}
              <div style={{ height: 5, background: darkMode ? "rgba(255,255,255,0.06)" : "#f1f5f9", borderRadius: 3, marginTop: 14 }}>
                <div className="qm-progress-bar" style={{ height: "100%", background: "linear-gradient(90deg,#4338ca,#7c3aed)", borderRadius: 3 }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontSize: "0.7rem", color: darkMode ? "#64748b" : "#94a3b8" }}>
                <span>3 of 10 questions</span><span>60% complete</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── CTA STRIP ──────────────────────────────────────────── */
function CTAStrip({ setPage }) {
  const [ref, vis] = useScrollReveal();
  const { darkMode } = useTheme();
  const S = useStyles();

  return (
    <>
      {/* 1. Existing Section */}
      <section style={{ background: darkMode ? "linear-gradient(135deg,#0b1220,#111827)" : "linear-gradient(135deg,#eff6ff,#faf5ff)", borderTop: darkMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid #e2e8f0", padding: "5rem 5%", textAlign: "center" }}>
        <div ref={ref} className={`qm-reveal${vis ? " vis" : ""}`}>
          <div style={S.label}>Join Thousands of Learners</div>
          <h2 style={{ ...S.h2, textAlign: "center" }}>Ready to <span style={{ color: darkMode ? "#818cf8" : "#4338ca" }}>Transform</span> How You Learn?</h2>
          <p style={{ ...S.sub, margin: "0 auto 2rem" }}>Sign up free today. No credit card needed. Start quizzing in under 2 minutes.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="qm-btn-p" style={S.btnPrimary} onClick={() => { setPage("home"); window.scrollTo({ top: 0 }); }}>🎓 I'm a Student</button>
            <button className="qm-btn-p" style={{ ...S.btnPrimary, background: "#7c3aed" }} onClick={() => { setPage("home"); window.scrollTo({ top: 0 }); }}>👨‍🏫 I'm a Teacher</button>
          </div>
        </div>
      </section>

      {/* 2. App Section (Theme Matched) */}
      <section style={{ width: "100%", background: darkMode ? "#0f172a" : "#ffffff", borderTop: darkMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid #f1f5f9", padding: "5rem 5%", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "3rem" }}>

          {/* Left Side: Content & Advantages */}
          <div style={{ flex: 1, minWidth: 300, textAlign: "left" }}>
            <span style={{ display: "inline-block", background: darkMode ? "rgba(129,140,248,0.12)" : "#eef2ff", color: darkMode ? "#a5b4fc" : "#4338ca", padding: "4px 12px", borderRadius: 100, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 16 }}>
              ⚡ QuizMatrix Android App
            </span>

            <h2 style={{ ...S.h2, fontSize: "clamp(1.8rem,3.5vw,2.4rem)", marginBottom: 16 }}>
              Prefer Mobile? Get Our <span style={{ color: darkMode ? "#818cf8" : "#4338ca" }}>Official APK</span>
            </h2>

            <p style={{ color: darkMode ? "#94a3b8" : "#64748b", fontSize: "1rem", lineHeight: 1.75, marginBottom: "2rem" }}>
              Website se bhi behtar, fast aur lag-free experience ke liye hamara mobile app install karein.
              Aapko milenge instant real-time updates aur customized quiz dashboards directly aapke phone par.
            </p>

            {/* Advantages List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginBottom: "2rem" }}>
              {[
                { icon: "📱", title: "Optimized Layout", desc: "Mobile screen ke liye perfect fit UI design." },
                { icon: "🚀", title: "Faster Loading", desc: "Kam data aur slow internet me bhi smooth working." },
                { icon: "🔒", title: "Safe & Secure", desc: "Official direct compiled package, completely safe to install." }
              ].map((item, index) => (
                <div key={index} style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                  <span style={{ fontSize: "1.5rem", userSelect: "none" }}>{item.icon}</span>
                  <div>
                    <h4 style={{ fontSize: "1rem", fontWeight: 600, color: darkMode ? "#f1f5f9" : "#1e293b", marginBottom: 2 }}>{item.title}</h4>
                    <p style={{ fontSize: "0.875rem", color: darkMode ? "#94a3b8" : "#64748b", margin: 0 }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <a
              href="/app/app-release.apk"
              download="QuizMatrix.apk"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                background: "#4f46e5",
                color: "#fff",
                padding: "14px 24px",
                borderRadius: 12,
                fontSize: "0.92rem",
                fontWeight: 700,
                textDecoration: "none",
                boxShadow: darkMode ? "0 12px 30px rgba(79,70,229,0.35)" : "0 12px 30px rgba(79,70,229,0.25)",
                transition: "all 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "#4338ca"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#4f46e5"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Download App Now (.apk)
            </a>
          </div>

        </div>
      </section>
    </>
  );
}



/* ─── CONTACT PAGE ───────────────────────────────────────── */
function ContactPage() {
  const [form, setForm] = useState({
    fname: "",
    lname: "",
    email: "",
    role: "",
    subject: "",
    message: "",
  });

  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { darkMode } = useTheme();
  const S = useStyles();

  const inp = {
    width: "100%",
    background: darkMode ? "rgba(255,255,255,0.04)" : "#f8fafc",
    border: darkMode ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e2e8f0",
    borderRadius: 8,
    padding: "10px 14px",
    color: darkMode ? "#e6eef8" : "#0f172a",
    fontSize: "0.9rem",
    transition: "border-color 0.2s, box-shadow 0.2s",
    fontFamily: "'Plus Jakarta Sans',sans-serif",
  };

  const lbl = {
    fontSize: "0.75rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: darkMode ? "#94a3b8" : "#64748b",
    display: "block",
    marginBottom: 5,
  };

  const handleSubmit = async () => {
    if (!form.email || !form.message) {
      toast.error("Please fill in Email and Message.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        "https://quizmatrix.onrender.com/api/contact",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        }
      );

      const data = await response.json();

      if (data.success) {
        setSent(true);

        setForm({
          fname: "",
          lname: "",
          email: "",
          role: "",
          subject: "",
          message: "",
        });

        setTimeout(() => {
          setSent(false);
        }, 5000);
      } else {
        toast.error(data.message || "Failed to send message");
      }
    } catch (error) {
      console.error("Contact Form Error:", error);
      toast.error("Server Error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const contactDetails = [
    { icon: "📧", label: "Email Us", val: "ujjwalku69@gmail.com" },
    { icon: "📱", label: "WhatsApp", val: "+91 7257981450" },
    { icon: "📍", label: "Location", val: "Kolkata, West Bengal, India" },
    { icon: "🕐", label: "Support Hours", val: "Mon–Sat, 9 AM – 7 PM IST" },
  ];

  return (
    <div style={{ paddingTop: 80, minHeight: "100vh", background: darkMode ? "#0b1220" : "#f8fafc" }}>
      <div style={{ padding: "4rem 5% 2rem", textAlign: "center" }}>
        <div style={S.label}>Get In Touch</div>
        <h1 style={{ ...S.h2, textAlign: "center" }}>
          Contact <span style={{ color: darkMode ? "#818cf8" : "#4338ca" }}>QuizMatrix</span>
        </h1>
        <p style={{ ...S.sub, margin: "0 auto" }}>
          Questions, feedback, or partnership enquiries — we're here to help.
        </p>
      </div>

      <div
        className="qm-contact-grid"
        style={{
          maxWidth: 1000,
          margin: "0 auto",
          padding: "2rem 5% 5rem",
          display: "grid",
          gridTemplateColumns: "1fr 1.5fr",
          gap: "2.5rem",
          alignItems: "start",
        }}
      >
        {/* Contact Info */}
        <div>
          <h3
            style={{
              fontWeight: 700,
              fontSize: "1.15rem",
              color: darkMode ? "#f1f5f9" : "#0f172a",
              marginBottom: 12,
            }}
          >
            Let's Talk 👋
          </h3>

          <p
            style={{
              color: darkMode ? "#94a3b8" : "#64748b",
              fontSize: "0.875rem",
              lineHeight: 1.7,
              marginBottom: 20,
            }}
          >
            Whether you're a student, teacher, or institution — our team is
            ready to help you get the most out of QuizMatrix.
          </p>

          {contactDetails.map((d) => (
            <div
              key={d.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: darkMode ? "#111827" : "#fff",
                border: darkMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid #e2e8f0",
                borderRadius: 10,
                padding: "12px 14px",
                marginBottom: 10,
              }}
            >
              <span style={{ fontSize: "1.1rem" }}>{d.icon}</span>

              <div>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: "0.82rem",
                    color: darkMode ? "#f1f5f9" : "#0f172a",
                  }}
                >
                  {d.label}
                </div>

                <div
                  style={{
                    fontSize: "0.82rem",
                    color: darkMode ? "#94a3b8" : "#64748b",
                  }}
                >
                  {d.val}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Contact Form */}
        <div
          style={{
            background: darkMode ? "#111827" : "#fff",
            border: darkMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid #e2e8f0",
            borderRadius: 16,
            padding: "2rem",
          }}
        >
          <h3
            style={{
              fontWeight: 700,
              fontSize: "1.1rem",
              color: darkMode ? "#f1f5f9" : "#0f172a",
              marginBottom: 20,
            }}
          >
            Send Us a Message ✉️
          </h3>

          <div
            className="qm-form-row"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
              marginBottom: "1rem",
            }}
          >
            <div>
              <label style={lbl}>First Name</label>
              <input
                style={inp}
                value={form.fname}
                onChange={(e) =>
                  setForm({ ...form, fname: e.target.value })
                }
              />
            </div>

            <div>
              <label style={lbl}>Last Name</label>
              <input
                style={inp}
                value={form.lname}
                onChange={(e) =>
                  setForm({ ...form, lname: e.target.value })
                }
              />
            </div>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={lbl}>Email Address</label>
            <input
              type="email"
              style={inp}
              value={form.email}
              onChange={(e) =>
                setForm({ ...form, email: e.target.value })
              }
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={lbl}>I Am A</label>
            <select
              style={inp}
              value={form.role}
              onChange={(e) =>
                setForm({ ...form, role: e.target.value })
              }
            >
              <option value="">Select role...</option>
              <option>Student</option>
              <option>Teacher / Educator</option>
              <option>School / Institution</option>
              <option>Other</option>
            </select>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={lbl}>Subject</label>
            <input
              style={inp}
              value={form.subject}
              onChange={(e) =>
                setForm({ ...form, subject: e.target.value })
              }
            />
          </div>

          <div style={{ marginBottom: "1.2rem" }}>
            <label style={lbl}>Message</label>
            <textarea
              style={{ ...inp, minHeight: 110, resize: "vertical" }}
              value={form.message}
              onChange={(e) =>
                setForm({ ...form, message: e.target.value })
              }
            />
          </div>

          <button
            className="qm-btn-p"
            onClick={handleSubmit}
            disabled={loading}
            style={{
              ...S.btnPrimary,
              width: "100%",
              justifyContent: "center",
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Sending..." : "Send Message 🚀"}
          </button>

          {sent && (
            <div
              style={{
                marginTop: 12,
                background: darkMode ? "rgba(16,185,129,0.1)" : "#f0fdf4",
                border: darkMode ? "1px solid rgba(16,185,129,0.3)" : "1px solid #bbf7d0",
                borderRadius: 8,
                padding: "10px 14px",
                color: darkMode ? "#34d399" : "#059669",
                fontSize: "0.875rem",
                textAlign: "center",
              }}
            >
              ✅ Message sent successfully! We'll reply soon.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── FOOTER ─────────────────────────────────────────────── */
function Footer({ setPage }) {
  const navigate = useNavigate();
  const go = (p) => {
    if (typeof p === "string" && p.startsWith("/")) {
      navigate(p);
    } else {
      setPage(p);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const cols = [
    { title: "Quick Links", links: [["Home","home"],["Features","home"],["Mock Test","/mock-test"],["Contact","contact"]] },
    { title: "Platform",    links: [["Student Login","home"],["Teacher Login","home"],["Register Free","home"],["Browse Quizzes","mock-tests"]] },
    { title: "Legal",       links: [["Privacy Policy","home"],["Terms of Service","home"],["Cookie Policy","home"],["Accessibility","home"]] },
  ];

  return (
    <footer style={{ background: "#0f172a", color: "#94a3b8", padding: "4rem 5% 2rem" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div className="qm-footer-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "2.5rem", marginBottom: "2.5rem" }}>
          <div>
            <div className="flex items-center">
                        <Link to="/" className="flex items-center space-x-2 group">
                          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-glow group-hover:scale-110 transition-all duration-300">
                            <span className="text-white font-bold text-xl">Q</span>
                          </div>
                          <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 dark:from-primary-400 dark:to-primary-500 bg-clip-text text-transparent">
                            QuizMatrix
                          </span>
                        </Link>
                      </div>
            <p style={{ fontSize: "0.875rem", lineHeight: 1.75, maxWidth: 260, marginBottom: 20 }}>Smart online quizzes for the modern classroom. Built for students, designed for teachers.</p>
            <div style={{ display: "flex", gap: 8 }}>
  {[
    {
      icon: <Instagram size={18} />,
      name: "Instagram",
      link: "https://instagram.com/your_username",
    },
    {
      icon: <Facebook size={18} />,
      name: "Facebook",
      link: "https://facebook.com/your_username",
    },
    {
      icon: <Github size={18} />,
      name: "GitHub",
      link: "https://github.com/ujjwal-kumar04",
    },
    {
      icon: <Linkedin size={18} />,
      name: "LinkedIn",
      link: "https://linkedin.com/in/your_profile",
    },
  ].map((item) => (
    <a
      key={item.name}
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      title={item.name}
      style={{
        width: 36,
        height: 36,
        borderRadius: 9,
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#94a3b8",
        textDecoration: "none",
        transition: "all 0.2s",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#e2e8f0"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#94a3b8"; }}
    >
      {item.icon}
    </a>
  ))}
</div>
          </div>
          {cols.map(col => (
            <div key={col.title}>
              <h4 style={{ color: "#fff", fontWeight: 700, fontSize: "0.88rem", marginBottom: 14 }}>{col.title}</h4>
              <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                {col.links.map(([label, pg]) => (
                  <li key={label}>
                    <span onClick={() => go(pg)} style={{ color: "#64748b", fontSize: "0.85rem", cursor: "pointer" }}
                      onMouseEnter={e => e.target.style.color = "#94a3b8"}
                      onMouseLeave={e => e.target.style.color = "#64748b"}>
                      {label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <p style={{ fontSize: "0.8rem" }}>© 2026 QuizMatrix. All rights reserved. Built with ❤️ for learners.</p>
          <p style={{ fontSize: "0.75rem", color: "#475569" }}>Secure · Fast · Reliable</p>
        </div>
      </div>
    </footer>
  );
}

/* ─── HOMEPAGE ───────────────────────────────────────────── */
function HomePage({ setPage }) {
  return (
    <>
      <Hero setPage={setPage} />
      <Features />
      <HowItWorks />
      <CTAStrip setPage={setPage} />

      <Footer setPage={setPage} />
    </>
  );
}

/* ─── ROOT APP ───────────────────────────────────────────── */
export default function App() {
  const [page, setPage] = useState("home");
  useEffect(() => { window.scrollTo({ top: 0 }); }, [page]);

  const { darkMode } = useTheme();
  const S = useStyles();

  return (
    <div style={S.page}>
      <Navbar page={page} setPage={setPage} />
      {page === "home"       && <HomePage setPage={setPage} />}
      {page === "contact"    && <><ContactPage /><Footer setPage={setPage} /></>}
    </div>
  );
}