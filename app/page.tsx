"use client";

import { useState } from "react";

export default function Home() {
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [modalOpen, setModalOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [b64, setB64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const hi = lang === "hi";

  /* ── file handler ── */
  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPreview(dataUrl);
      setB64(dataUrl.split(",")[1]);
      setResult(null);
    };
    reader.readAsDataURL(file);
  };

  /* ── deep learning analysis ── */
  const runAnalysis = async () => {
    if (!b64) return;
    setLoading(true);
    setResult(null);

    const prompt = hi
      ? `आप एक गन्ना रोग विशेषज्ञ और डीप लर्निंग मॉडल विश्लेषक हैं। इस गन्ने की पत्ती की छवि का विश्लेषण करें:
1. 🌿 रोग का नाम (यदि कोई हो)
2. ⚠️ गंभीरता स्तर (कम / मध्यम / अधिक)
3. 💊 उपचार की सिफारिश
4. 🛡️ बचाव के उपाय
5. 🌾 किसान के लिए सरल सुझाव
हिंदी में सरल भाषा में उत्तर दें।`
      : `You are a sugarcane disease specialist using deep learning model analysis. Analyze this sugarcane leaf image:
1. 🌿 Disease Name (or "Healthy Leaf" if no disease)
2. ⚠️ Severity Level (Low / Medium / High) with confidence
3. 💊 Treatment Recommendation (specific fungicides/pesticides, dosage)
4. 🛡️ Prevention Measures
5. 🌾 Simple Farmer-Friendly Tips
Keep it clear and practical for Indian sugarcane farmers.`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: { type: "base64", media_type: "image/jpeg", data: b64 },
                },
                { type: "text", text: prompt },
              ],
            },
          ],
        }),
      });
      const data = await res.json();
      const text =
        data.content?.map((b: { text?: string }) => b.text || "").join("\n") ||
        "Could not analyze image.";
      setResult(text);
    } catch {
      setResult(hi ? "❌ विश्लेषण विफल। कृपया पुनः प्रयास करें।" : "❌ Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setPreview(null);
    setB64(null);
    setResult(null);
    setLoading(false);
  };

  return (
    <div style={{ fontFamily: "'Inter', 'Noto Sans Devanagari', sans-serif", color: "#1b2e1b", background: "#fff", overflowX: "hidden" }}>

      {/* ══ GOOGLE FONTS ══ */}
      <style>{`
        @import url('https://fonts.googleapis.');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { overflow-x: hidden; }
        .card-hover { transition: transform .22s, box-shadow .22s; }
        .card-hover:hover { transform: translateY(-7px); box-shadow: 0 12px 40px rgba(30,80,30,.18) !important; }
        .btn-upload:hover { background: #1b5e20 !important; transform: translateY(-2px); box-shadow: 0 8px 28px rgba(46,125,50,.45) !important; }
        .nav-link { text-decoration: none; color: #3d5a3d; font-weight: 500; font-size: 14.5px; padding-bottom: 2px; border-bottom: 2px solid transparent; transition: all .2s; }
        .nav-link:hover, .nav-link.active { color: #2e7d32; border-bottom-color: #4caf50; }
        .step-ring { width:86px; height:86px; border-radius:50%; background:#e8f5e9; border:2.5px solid #c8e6c9; display:flex; align-items:center; justify-content:center; font-size:32px; margin:0 auto 14px; position:relative; }
        .overlay { position:fixed; inset:0; background:rgba(0,0,0,.56); z-index:999; display:flex; align-items:center; justify-content:center; }
        .modal-box { background:#fff; border-radius:20px; padding:36px; max-width:500px; width:92%; position:relative; box-shadow:0 24px 64px rgba(0,0,0,.28); animation:pop .22s ease; }
        @keyframes pop { from{transform:scale(.9);opacity:0} to{transform:scale(1);opacity:1} }
        .dropzone { border:2.5px dashed #4caf50; border-radius:12px; padding:36px 16px; text-align:center; cursor:pointer; transition:background .2s; color:#3d5a3d; font-size:14px; margin:16px 0; }
        .dropzone:hover { background:#e8f5e9; }
        .btn-analyze { width:100%; background:#2e7d32; color:#fff; border:none; padding:13px; border-radius:10px; font-size:15px; font-weight:800; cursor:pointer; font-family:inherit; margin-top:12px; transition:background .2s; }
        .btn-analyze:hover { background:#1b5e20; }
        @media(max-width:900px){
          .hero-right { display:none !important; }
          .cards-grid { grid-template-columns:1fr 1fr !important; }
          .hero-h1 { font-size:32px !important; }
        }
        @media(max-width:600px){
          .cards-grid { grid-template-columns:1fr !important; }
          .steps-row { flex-direction:column !important; align-items:center !important; }
          .step-arrow { transform:rotate(90deg); }
          .nav-links-wrap { display:none !important; }
          .hero-left { padding:36px 18px !important; }
          .badges-row { flex-direction:column !important; }
          .badge-item { border-right:none !important; border-bottom:1px solid #d0e8d0 !important; }
        }
      `}</style>

      {/* ══ LANG BAR ══ */}
      <div style={{ background: "#1b5e20", padding: "5px 32px", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
        <span style={{ color: "#a5d6a7", fontSize: 12, fontWeight: 600, marginRight: 6 }}>Language / भाषा:</span>
        <button onClick={() => setLang("en")} style={{ fontFamily: "inherit", fontSize: 12, fontWeight: 700, padding: "3px 14px", borderRadius: 20, border: "1.5px solid #a5d6a7", cursor: "pointer", background: lang === "en" ? "#f9a825" : "transparent", color: lang === "en" ? "#1b5e20" : "#a5d6a7", transition: "all .2s" }}>
          English
        </button>
        <button onClick={() => setLang("hi")} style={{ fontFamily: "'Noto Sans Devanagari', sans-serif", fontSize: 12, fontWeight: 700, padding: "3px 14px", borderRadius: 20, border: "1.5px solid #a5d6a7", cursor: "pointer", background: lang === "hi" ? "#f9a825" : "transparent", color: lang === "hi" ? "#1b5e20" : "#a5d6a7", transition: "all .2s" }}>
          हिन्दी
        </button>
      </div>

      {/* ══ NAV ══ */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 36px", height: 64, background: "#fff", borderBottom: "1px solid #e0ede0", position: "sticky", top: 0, zIndex: 200, boxShadow: "0 2px 12px rgba(30,80,30,.08)" }}>
        <a href="#" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <span style={{ fontSize: 28 }}>🌿</span>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#1b5e20", letterSpacing: "-.5px", lineHeight: 1.1 }}>
              CANE<span style={{ color: "#4caf50" }}>CARE</span>
            </div>
            <div style={{ fontSize: 10.5, color: "#6a8a6a", fontWeight: 500, fontFamily: hi ? "'Noto Sans Devanagari', sans-serif" : "inherit" }}>
              {hi ? "हमेशा स्वस्थ गन्ना" : "Healthy Cane, Always"}
            </div>
          </div>
        </a>

        <ul className="nav-links-wrap" style={{ display: "flex", gap: 28, listStyle: "none" }}>
          {[
            { en: "Home", hi: "होम", href: "#" },
            { en: "About", hi: "परिचय", href: "#about" },
            { en: "Features", hi: "विशेषताएं", href: "#features" },
            { en: "How It Works", hi: "कैसे काम करता है", href: "#how" },
            { en: "Contact", hi: "संपर्क", href: "#contact" },
          ].map((item, i) => (
            <li key={i}>
              <a href={item.href} className={`nav-link${i === 0 ? " active" : ""}`}
                style={{ fontFamily: hi ? "'Noto Sans Devanagari', sans-serif" : "inherit" }}>
                {hi ? item.hi : item.en}
              </a>
            </li>
          ))}
        </ul>

        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ background: "transparent", border: "2px solid #2e7d32", color: "#2e7d32", padding: "7px 18px", borderRadius: 8, fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: hi ? "'Noto Sans Devanagari', sans-serif" : "inherit", display: "flex", alignItems: "center", gap: 6 }}>
            👤 {hi ? "लॉगिन" : "Login"}
          </button>
          <button style={{ background: "#2e7d32", border: "2px solid #2e7d32", color: "#fff", padding: "7px 18px", borderRadius: 8, fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: hi ? "'Noto Sans Devanagari', sans-serif" : "inherit", display: "flex", alignItems: "center", gap: 6 }}>
            👤 {hi ? "साइन अप" : "Sign Up"}
          </button>
        </div>
      </nav>

      {/* ══ HERO ══ */}
      <section style={{ position: "relative", overflow: "hidden", background: "linear-gradient(110deg,#eef7ee 0%,#e3f2e3 45%,#c8e6c9 100%)", minHeight: 500, display: "flex", alignItems: "center" }}>
        {/* Left content */}
        <div className="hero-left" style={{ position: "relative", zIndex: 3, padding: "56px 0 56px 52px", maxWidth: 520, flexShrink: 0 }}>
          {/* Badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#e8f5e9", border: "1px solid #c8e6c9", color: "#1b5e20", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", padding: "4px 12px", borderRadius: 20, marginBottom: 18 }}>
            🌾 {hi ? "डीप लर्निंग फसल स्वास्थ्य" : "Deep Learning Crop Health"}
          </div>

          {/* H1 */}
          <h1 className="hero-h1" style={{ fontSize: 46, fontWeight: 900, lineHeight: 1.08, color: "#1b2e1b", marginBottom: 16, fontFamily: hi ? "'Noto Sans Devanagari', sans-serif" : "inherit" }}>
            {hi ? (
              <>बेहतर फसल के लिए<br /><span style={{ color: "#2e7d32" }}>स्मार्ट देखभाल</span></>
            ) : (
              <>Smart Care for<br />Stronger <span style={{ color: "#2e7d32" }}>Harvests</span></>
            )}
          </h1>

          {/* Description */}
          <p style={{ fontSize: 15.5, color: "#3d5a3d", lineHeight: 1.75, marginBottom: 28, maxWidth: 430, fontFamily: hi ? "'Noto Sans Devanagari', sans-serif" : "inherit" }}>
            {hi
              ? "CANECARE उन्नत डीप लर्निंग तकनीक से गन्ने की बीमारियाँ पहचानता है, गंभीरता का विश्लेषण करता है और विशेषज्ञ उपचार की सलाह देता है।"
              : "CANECARE uses advanced deep learning to detect sugarcane diseases, analyze severity, and provide expert treatment recommendations."}
          </p>

          {/* Upload button */}
          <button className="btn-upload" onClick={() => setModalOpen(true)}
            style={{ background: "#2e7d32", color: "#fff", border: "none", padding: "15px 30px", borderRadius: 12, fontSize: 16, fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 10, fontFamily: hi ? "'Noto Sans Devanagari', sans-serif" : "inherit", boxShadow: "0 4px 20px rgba(46,125,50,.38)", transition: "all .25s" }}>
            ☁️ {hi ? "छवि अपलोड करें" : "Upload Image"}
          </button>
          <p style={{ marginTop: 9, fontSize: 12.5, color: "#6a8a6a", fontFamily: hi ? "'Noto Sans Devanagari', sans-serif" : "inherit" }}>
            {hi ? "शुरू करने के लिए गन्ने की पत्ती की स्पष्ट फोटो अपलोड करें" : "Upload a clear image of sugarcane leaf to get started"}
          </p>

          {/* Badges */}
          <div className="badges-row" style={{ display: "flex", marginTop: 34, border: "1px solid #d0e8d0", borderRadius: 10, overflow: "hidden", background: "rgba(255,255,255,.7)" }}>
            {[
              { ico: "🛡️", en: "Accurate Results", hi: "सटीक परिणाम" },
              { ico: "⚡", en: "Fast Analysis", hi: "तेज़ विश्लेषण" },
              { ico: "🔒", en: "Reliable & Secure", hi: "विश्वसनीय & सुरक्षित" },
            ].map((b, i) => (
              <div key={i} className="badge-item" style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "11px 14px", fontSize: 12.5, fontWeight: 700, color: "#3d5a3d", borderRight: i < 2 ? "1px solid #d0e8d0" : "none", fontFamily: hi ? "'Noto Sans Devanagari', sans-serif" : "inherit" }}>
                <span style={{ fontSize: 17 }}>{b.ico}</span>
                {hi ? b.hi : b.en}
              </div>
            ))}
          </div>
        </div>

        {/* ══ RIGHT IMAGE PANEL ══ */}
        <div className="hero-right" style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "52%", zIndex: 1, overflow: "hidden", borderRadius: "0 0 0 70px" }}>
          {/* ── CHANGE src BELOW TO YOUR OWN IMAGE ── */}
          <img
            src="https://th.bing.com/th/id/OIP.0ws1X9GyIPC1HAmA6KtG6wHaE-?w=271&h=183&c=7&r=0&o=7&dpr=1.3&pid=1.7&rm=3"
            alt="Sugarcane field"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
          {/* Left fade blend */}
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 120, background: "linear-gradient(to right,#e3f2e3,transparent)", pointerEvents: "none" }} />
        </div>
      </section>

      {/* ══ FEATURES ══ */}
      <section id="features" style={{ background: "#f4faf4", padding: "72px 36px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 style={{ fontSize: 32, fontWeight: 900, color: "#1b2e1b", fontFamily: hi ? "'Noto Sans Devanagari', sans-serif" : "inherit" }}>
            {hi ? "हमारी विशेषताएं" : "Our Features"}
          </h2>
          <div style={{ width: 44, height: 4, background: "#4caf50", borderRadius: 2, margin: "10px auto 0" }} />
        </div>

        <div className="cards-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 20, maxWidth: 1100, margin: "0 auto" }}>
          {[
            { ico: "🔬", en: "Disease Detection", hi: "रोग पहचान", desc_en: "Detect sugarcane diseases instantly using advanced deep learning models.", desc_hi: "उन्नत डीप लर्निंग मॉडल से तुरंत गन्ने की बीमारियाँ पहचानें।" },
            { ico: "📊", en: "Severity Analysis", hi: "गंभीरता विश्लेषण", desc_en: "Analyze disease severity and monitor crop health condition.", desc_hi: "बीमारी की गंभीरता का विश्लेषण करें और फसल की स्थिति जानें।" },
            { ico: "💊", en: "Treatment Suggestion", hi: "इलाज की सलाह", desc_en: "Get personalized treatment and prevention recommendations.", desc_hi: "व्यक्तिगत उपचार और बचाव की सलाह पाएं।" },
            { ico: "🌱", en: "Crop Insights", hi: "फसल जानकारी", desc_en: "Gain valuable insights to improve productivity and crop quality.", desc_hi: "उत्पादकता और फसल की गुणवत्ता सुधारने के मूल्यवान सुझाव पाएं।" },
          ].map((card, i) => (
            <div key={i} className="card-hover" style={{ background: "#fff", borderRadius: 14, padding: "28px 22px", border: "1px solid #e0ede0", boxShadow: "0 2px 12px rgba(30,80,30,.08)" }}>
              <div style={{ width: 58, height: 58, borderRadius: "50%", background: "#e8f5e9", border: "2px solid #c8e6c9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 16 }}>
                {card.ico}
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "#2e7d32", marginBottom: 8, fontFamily: hi ? "'Noto Sans Devanagari', sans-serif" : "inherit" }}>
                {hi ? card.hi : card.en}
              </h3>
              <p style={{ fontSize: 13.5, color: "#3d5a3d", lineHeight: 1.65, fontFamily: hi ? "'Noto Sans Devanagari', sans-serif" : "inherit" }}>
                {hi ? card.desc_hi : card.desc_en}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ══ HOW IT WORKS ══ */}
      <section id="how" style={{ background: "#fff", padding: "72px 36px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 style={{ fontSize: 32, fontWeight: 900, color: "#1b2e1b", fontFamily: hi ? "'Noto Sans Devanagari', sans-serif" : "inherit" }}>
            {hi ? "यह कैसे काम करता है" : "How It Works"}
          </h2>
          <div style={{ width: 44, height: 4, background: "#4caf50", borderRadius: 2, margin: "10px auto 0" }} />
        </div>

        <div className="steps-row" style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", maxWidth: 900, margin: "0 auto", gap: 0 }}>
          {[
            { num: 1, ico: "☁️", en: "Upload Image", hi: "फोटो अपलोड करें", desc_en: "Upload a clear image of sugarcane leaf.", desc_hi: "गन्ने की पत्ती की साफ फोटो अपलोड करें।" },
            { num: 2, ico: "🧠", en: "Analysis", hi: "विश्लेषण", desc_en: "Our deep learning model analyzes the image for disease detection and severity.", desc_hi: "हमारा डीप लर्निंग मॉडल छवि से बीमारी और गंभीरता का विश्लेषण करता है।" },
            { num: 3, ico: "📋", en: "Disease Result", hi: "रोग परिणाम", desc_en: "Get accurate disease detection results with confidence score.", desc_hi: "विश्वास स्कोर के साथ सटीक रोग पहचान परिणाम पाएं।" },
            { num: 4, ico: "🛡️", en: "Treatment Advice/Recommendation", hi: "उपचार सलाह", desc_en: "Receive expert treatment advice and prevention measures.", desc_hi: "विशेषज्ञ उपचार सलाह और बचाव के उपाय पाएं।" },
          ].map((step, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start" }}>
              <div style={{ flex: 1, textAlign: "center", padding: "0 8px", minWidth: 140 }}>
                <div className="step-ring" style={{ position: "relative" }}>
                  <span style={{ position: "absolute", top: -4, left: -4, width: 26, height: 26, borderRadius: "50%", background: "#2e7d32", color: "#fff", fontSize: 12, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {step.num}
                  </span>
                  {step.ico}
                </div>
                <h4 style={{ fontSize: 14.5, fontWeight: 800, color: "#1b2e1b", fontFamily: hi ? "'Noto Sans Devanagari', sans-serif" : "inherit" }}>
                  {hi ? step.hi : step.en}
                </h4>
                <p style={{ fontSize: 12.5, color: "#3d5a3d", marginTop: 5, lineHeight: 1.6, maxWidth: 130, marginLeft: "auto", marginRight: "auto", fontFamily: hi ? "'Noto Sans Devanagari', sans-serif" : "inherit" }}>
                  {hi ? step.desc_hi : step.desc_en}
                </p>
              </div>
              {i < 3 && (
                <div className="step-arrow" style={{ color: "#4caf50", fontSize: 26, fontWeight: 900, marginTop: 28, flexShrink: 0, padding: "0 4px" }}>→</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer id="contact" style={{ background: "#1b5e20", color: "#a5d6a7", textAlign: "center", padding: "22px 36px", fontSize: 13.5, fontFamily: hi ? "'Noto Sans Devanagari', sans-serif" : "inherit" }}>
        {hi ? "© 2026 CANECARE. सर्वाधिकार सुरक्षित। | किसानों के लिए बनाया गया 🌾" : "© 2026 CANECARE. All Rights Reserved. | Built for Farmers 🌾"}
      </footer>

      {/* ══ UPLOAD MODAL ══ */}
      {modalOpen && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="modal-box">
            <button onClick={closeModal} style={{ position: "absolute", top: 14, right: 18, background: "none", border: "none", fontSize: 20, color: "#6a8a6a", cursor: "pointer", lineHeight: 1 }}>✕</button>

            <h2 style={{ fontSize: 20, fontWeight: 900, color: "#1b5e20", marginBottom: 4, fontFamily: hi ? "'Noto Sans Devanagari', sans-serif" : "inherit" }}>
              🌿 {hi ? "अपनी फसल की जांच करें" : "Analyze Your Crop"}
            </h2>

            {/* Drop zone */}
            <div className="dropzone"
              onClick={() => document.getElementById("fileInput")?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}>
              <div style={{ fontSize: 38, marginBottom: 8 }}>📷</div>
              <div style={{ fontFamily: hi ? "'Noto Sans Devanagari', sans-serif" : "inherit" }}>
                {hi ? "यहाँ गन्ने की पत्ती की फोटो क्लिक करें या खींचें" : "Click or drag a sugarcane leaf image here"}
              </div>
            </div>
            <input id="fileInput" type="file" accept="image/*" style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

            {/* Preview */}
            {preview && (
              <img src={preview} alt="Preview" style={{ maxWidth: "100%", borderRadius: 10, marginTop: 10, display: "block" }} />
            )}

            {/* Loading */}
            {loading && (
              <div style={{ textAlign: "center", padding: 10, color: "#2e7d32", fontWeight: 700, fontSize: 14, fontFamily: hi ? "'Noto Sans Devanagari', sans-serif" : "inherit" }}>
                🔄 {hi ? "डीप लर्निंग मॉडल से विश्लेषण हो रहा है…" : "Analyzing with deep learning model…"}
              </div>
            )}

            {/* Analyze button */}
            {b64 && !loading && (
              <button className="btn-analyze" onClick={runAnalysis}
                style={{ fontFamily: hi ? "'Noto Sans Devanagari', sans-serif" : "inherit" }}>
                🔍 {hi ? "अभी जांचें" : "Analyze Now"}
              </button>
            )}

            {/* Result */}
            {result && (
              <div style={{ marginTop: 14, padding: 16, borderRadius: 12, background: "#e8f5e9", border: "1px solid #c8e6c9", fontSize: 13.5, color: "#1a3a1a", lineHeight: 1.75, fontFamily: hi ? "'Noto Sans Devanagari', sans-serif" : "inherit" }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: "#1b5e20", marginBottom: 8 }}>
                  🌿 {hi ? "डीप लर्निंग विश्लेषण परिणाम" : "Deep Learning Analysis Result"}
                </h3>
                <div style={{ whiteSpace: "pre-wrap" }}>{result}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}