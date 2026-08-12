"use client";

import { useState, useRef, useCallback } from "react";
import * as tf from "@tensorflow/tfjs";

// ── Class names (must match training order exactly) ──────────
const CLASS_NAMES = ["Healthy", "Mosaic", "RedRot", "Rust", "Yellow"];

// ── Severity thresholds (based on confidence score) ──────────
const LOW_THRESH = 0.50;
const MODERATE_THRESH = 0.75;

// ── All recommendations for every disease + severity ─────────
const RECOMMENDATIONS: Record<string, Record<string, { severity_label: string; action: string; message: string; emoji: string; color: string }>> = {
  Healthy: {
    none: {
      severity_label: "Healthy",
      action: "Keep & Maintain",
      message: "Your crop looks perfectly healthy! Continue regular watering, balanced fertilization, and routine inspection every 2 weeks.",
      emoji: "✅",
      color: "#2e7d32",
    },
  },
  Yellow: {
    Low: {
      severity_label: "Early Stage",
      action: "Treat Soon",
      message: "Early yellowing detected. Check soil nitrogen levels and apply urea fertilizer. Ensure proper drainage to avoid waterlogging.",
      emoji: "🟡",
      color: "#f9a825",
    },
    Moderate: {
      severity_label: "Moderate Stage",
      action: "Treat Urgently",
      message: "Significant yellowing spreading across the leaf. Apply foliar nitrogen spray immediately. Improve drainage and reduce water stress. Monitor daily.",
      emoji: "🟠",
      color: "#e65100",
    },
    Severe: {
      severity_label: "Severe Stage",
      action: "Consult Expert / Consider Removal",
      message: "Severe yellowing detected. Crop recovery is unlikely without immediate intervention. Consult an agronomist. If neighbouring plants are affected, consider removing this plant to prevent spread.",
      emoji: "🔴",
      color: "#b71c1c",
    },
  },
  Mosaic: {
    Low: {
      severity_label: "Early Stage",
      action: "Remove Infected Leaves",
      message: "Early mosaic virus detected (patchy discoloration). Remove infected leaves immediately. Control aphids and whiteflies which spread the virus. Apply insecticide.",
      emoji: "🟡",
      color: "#f9a825",
    },
    Moderate: {
      severity_label: "Moderate Stage",
      action: "Isolate & Treat Urgently",
      message: "Mosaic virus is spreading. Isolate affected plants from healthy ones. Apply systemic insecticide and remove all visibly infected leaves. Disinfect tools after use.",
      emoji: "🟠",
      color: "#e65100",
    },
    Severe: {
      severity_label: "Severe Stage",
      action: "Remove Plant Immediately",
      message: "Severe mosaic infection. This plant is beyond recovery and is a source of infection for neighbouring crops. Remove and destroy the plant immediately. Do not compost infected material.",
      emoji: "🔴",
      color: "#b71c1c",
    },
  },
  RedRot: {
    Low: {
      severity_label: "Early Stage",
      action: "Apply Fungicide Now",
      message: "Early red rot signs detected. Apply copper-based fungicide immediately. Avoid waterlogging as the Colletotrichum fungus thrives in wet conditions. Remove visibly infected stalks.",
      emoji: "🟡",
      color: "#f9a825",
    },
    Moderate: {
      severity_label: "Moderate Stage",
      action: "Remove Infected Stalks",
      message: "Moderate red rot infection. Remove and destroy all infected stalks. Treat remaining plants with carbendazim or copper oxychloride fungicide. Improve field drainage urgently.",
      emoji: "🟠",
      color: "#e65100",
    },
    Severe: {
      severity_label: "Severe Stage",
      action: "Remove & Replant",
      message: "Severe red rot detected. The plant is beyond recovery. Remove and destroy it immediately — do NOT leave infected material in the field. Treat soil before replanting. Use disease-resistant varieties.",
      emoji: "🔴",
      color: "#b71c1c",
    },
  },
  Rust: {
    Low: {
      severity_label: "Early Stage",
      action: "Apply Fungicide",
      message: "Early rust infection detected (small orange pustules). Apply triazole-based or mancozeb fungicide. Improve air circulation around plants. Remove heavily infected lower leaves.",
      emoji: "🟡",
      color: "#f9a825",
    },
    Moderate: {
      severity_label: "Moderate Stage",
      action: "Spray Urgently",
      message: "Rust is spreading across the leaf. Spray with propiconazole or tebuconazole fungicide immediately. Repeat treatment after 10-14 days. Avoid overhead irrigation which spreads spores.",
      emoji: "🟠",
      color: "#e65100",
    },
    Severe: {
      severity_label: "Severe Stage",
      action: "Treat or Replant",
      message: "Severe rust infection. Significant yield loss expected. Apply emergency fungicide treatment. If more than 60% of leaves are affected, consider removing the plant and replanting with a rust-resistant variety.",
      emoji: "🔴",
      color: "#b71c1c",
    },
  },
};

// ── Severity logic ────────────────────────────────────────────
function getSeverity(disease: string, confidence: number): string {
  if (disease === "Healthy") return "none";
  if (confidence >= MODERATE_THRESH) return "Severe";
  if (confidence >= LOW_THRESH) return "Moderate";
  return "Low";
}

// ── Model loader (singleton) ──────────────────────────────────
let cachedModel: tf.GraphModel | null = null;

async function loadModel(): Promise<tf.GraphModel> {
  if (!cachedModel) {
    cachedModel = await tf.loadGraphModel("/model/model.json");
  }
  return cachedModel;
}

// ── Preprocess image for MobileNetV2 ─────────────────────────
// MobileNetV2 needs pixels in [-1, 1] range (not [0, 1])
function preprocessImage(imgElement: HTMLImageElement): tf.Tensor4D {
  return tf.tidy(() => {
    const tensor = tf.browser
      .fromPixels(imgElement)
      .resizeBilinear([224, 224])
      .toFloat();
    // MobileNetV2 preprocessing: [0,255] → [-1, 1]
    const normalized = tensor.div(127.5).sub(1);
    return normalized.expandDims(0) as tf.Tensor4D;
  });
}

// ── Main prediction function ──────────────────────────────────
async function predict(imgElement: HTMLImageElement) {
  const model = await loadModel();
  const tensor = preprocessImage(imgElement);

  const output = model.predict(tensor) as tf.Tensor;
  const probsArray = Array.from(await output.data());

  // Clean up GPU memory
  tensor.dispose();
  output.dispose();

  const maxIdx = probsArray.indexOf(Math.max(...probsArray));
  const disease = CLASS_NAMES[maxIdx];
  const confidence = probsArray[maxIdx];
  const severity = getSeverity(disease, confidence);
  const rec = RECOMMENDATIONS[disease][severity];

  return {
    disease,
    confidence: Math.round(confidence * 10000) / 100,
    severity,
    rec,
    allProbs: Object.fromEntries(
      CLASS_NAMES.map((c, i) => [c, Math.round(probsArray[i] * 10000) / 100])
    ),
  };
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
export default function Home() {
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"upload" | "camera">("upload");
  const [preview, setPreview] = useState<string | null>(null);
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<typeof predict>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Camera refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const hi = lang === "hi";

  // ── Load image into an HTMLImageElement (needed for TF.js) ──
  const loadImageElement = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.src = src;
    });

  // ── Handle file upload ───────────────────────────────────────
  const handleFile = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setPreview(dataUrl);
      setResult(null);
      setError(null);
      const img = await loadImageElement(dataUrl);
      setImgEl(img);
    };
    reader.readAsDataURL(file);
  };

  // ── Start camera ─────────────────────────────────────────────
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, // use back camera on phones
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      setError(hi ? "कैमरा एक्सेस नहीं मिला।" : "Camera access denied. Please allow camera permission.");
    }
  };

  // ── Stop camera ──────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  // ── Capture from camera ──────────────────────────────────────
  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg");
    setPreview(dataUrl);
    setResult(null);
    setError(null);
    const img = await loadImageElement(dataUrl);
    setImgEl(img);
    stopCamera();
  };

  // ── Run model prediction ─────────────────────────────────────
  const runAnalysis = async () => {
    if (!imgEl) return;
    setLoading(true);
    setModelLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await predict(imgEl);
      setResult(res);
    } catch (e) {
      console.error(e);
      setError(
        hi
          ? "❌ विश्लेषण विफल। कृपया पुनः प्रयास करें।"
          : "❌ Analysis failed. Make sure model files are in /public/model/ and try again."
      );
    } finally {
      setLoading(false);
      setModelLoading(false);
    }
  };

  // ── Close modal ──────────────────────────────────────────────
  const closeModal = () => {
    setModalOpen(false);
    setPreview(null);
    setImgEl(null);
    setResult(null);
    setError(null);
    setLoading(false);
    stopCamera();
    setActiveTab("upload");
  };

  return (
    <div style={{ fontFamily: "'Inter', 'Noto Sans Devanagari', sans-serif", color: "#1b2e1b", background: "#fff", overflowX: "hidden" }}>

      {/* ══ GOOGLE FONTS ══ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&family=Noto+Sans+Devanagari:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { overflow-x: hidden; }
        .card-hover { transition: transform .22s, box-shadow .22s; }
        .card-hover:hover { transform: translateY(-7px); box-shadow: 0 12px 40px rgba(30,80,30,.18) !important; }
        .btn-upload:hover { background: #1b5e20 !important; transform: translateY(-2px); box-shadow: 0 8px 28px rgba(46,125,50,.45) !important; }
        .nav-link { text-decoration: none; color: #3d5a3d; font-weight: 500; font-size: 14.5px; padding-bottom: 2px; border-bottom: 2px solid transparent; transition: all .2s; }
        .nav-link:hover, .nav-link.active { color: #2e7d32; border-bottom-color: #4caf50; }
        .step-ring { width:86px; height:86px; border-radius:50%; background:#e8f5e9; border:2.5px solid #c8e6c9; display:flex; align-items:center; justify-content:center; font-size:32px; margin:0 auto 14px; position:relative; }
        .overlay { position:fixed; inset:0; background:rgba(0,0,0,.56); z-index:999; display:flex; align-items:center; justify-content:center; padding: 16px; }
        .modal-box { background:#fff; border-radius:20px; padding:32px; max-width:520px; width:100%; position:relative; box-shadow:0 24px 64px rgba(0,0,0,.28); animation:pop .22s ease; max-height:90vh; overflow-y:auto; }
        @keyframes pop { from{transform:scale(.9);opacity:0} to{transform:scale(1);opacity:1} }
        .dropzone { border:2.5px dashed #4caf50; border-radius:12px; padding:36px 16px; text-align:center; cursor:pointer; transition:background .2s; color:#3d5a3d; font-size:14px; margin:16px 0; }
        .dropzone:hover { background:#e8f5e9; }
        .tab-btn { flex:1; padding:10px; border:none; cursor:pointer; font-size:14px; font-weight:700; border-bottom:2.5px solid transparent; background:transparent; color:#6a8a6a; transition:all .2s; font-family:inherit; }
        .tab-btn.active { color:#2e7d32; border-bottom-color:#4caf50; }
        .btn-analyze { width:100%; background:#2e7d32; color:#fff; border:none; padding:13px; border-radius:10px; font-size:15px; font-weight:800; cursor:pointer; font-family:inherit; margin-top:12px; transition:background .2s; }
        .btn-analyze:hover { background:#1b5e20; }
        .btn-analyze:disabled { background:#a5d6a7; cursor:not-allowed; }
        .prob-bar-bg { background:#e8f5e9; border-radius:6px; height:10px; flex:1; overflow:hidden; }
        .prob-bar-fill { height:100%; border-radius:6px; transition:width .6s ease; }
        @media(max-width:900px){ .hero-right{display:none !important;} .cards-grid{grid-template-columns:1fr 1fr !important;} .hero-h1{font-size:32px !important;} }
        @media(max-width:600px){ .cards-grid{grid-template-columns:1fr !important;} .steps-row{flex-direction:column !important;align-items:center !important;} .step-arrow{transform:rotate(90deg);} .nav-links-wrap{display:none !important;} .hero-left{padding:36px 18px !important;} .badges-row{flex-direction:column !important;} .badge-item{border-right:none !important;border-bottom:1px solid #d0e8d0 !important;} }
      `}</style>

      {/* ══ LANG BAR ══ */}
      <div style={{ background: "#1b5e20", padding: "5px 32px", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
        <span style={{ color: "#a5d6a7", fontSize: 12, fontWeight: 600, marginRight: 6 }}>Language / भाषा:</span>
        <button onClick={() => setLang("en")} style={{ fontFamily: "inherit", fontSize: 12, fontWeight: 700, padding: "3px 14px", borderRadius: 20, border: "1.5px solid #a5d6a7", cursor: "pointer", background: lang === "en" ? "#f9a825" : "transparent", color: lang === "en" ? "#1b5e20" : "#a5d6a7", transition: "all .2s" }}>English</button>
        <button onClick={() => setLang("hi")} style={{ fontFamily: "'Noto Sans Devanagari', sans-serif", fontSize: 12, fontWeight: 700, padding: "3px 14px", borderRadius: 20, border: "1.5px solid #a5d6a7", cursor: "pointer", background: lang === "hi" ? "#f9a825" : "transparent", color: lang === "hi" ? "#1b5e20" : "#a5d6a7", transition: "all .2s" }}>हिन्दी</button>
      </div>

      {/* ══ NAV ══ */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 36px", height: 64, background: "#fff", borderBottom: "1px solid #e0ede0", position: "sticky", top: 0, zIndex: 200, boxShadow: "0 2px 12px rgba(30,80,30,.08)" }}>
        <a href="#" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <span style={{ fontSize: 28 }}>🌿</span>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#1b5e20", letterSpacing: "-.5px", lineHeight: 1.1 }}>CANE<span style={{ color: "#4caf50" }}>CARE</span></div>
            <div style={{ fontSize: 10.5, color: "#6a8a6a", fontWeight: 500 }}>{hi ? "हमेशा स्वस्थ गन्ना" : "Healthy Cane, Always"}</div>
          </div>
        </a>
        <ul className="nav-links-wrap" style={{ display: "flex", gap: 28, listStyle: "none" }}>
          {[{ en: "Home", hi: "होम", href: "#" }, { en: "About", hi: "परिचय", href: "#about" }, { en: "Features", hi: "विशेषताएं", href: "#features" }, { en: "How It Works", hi: "कैसे काम करता है", href: "#how" }, { en: "Contact", hi: "संपर्क", href: "#contact" }].map((item, i) => (
            <li key={i}><a href={item.href} className={`nav-link${i === 0 ? " active" : ""}`} style={{ fontFamily: hi ? "'Noto Sans Devanagari', sans-serif" : "inherit" }}>{hi ? item.hi : item.en}</a></li>
          ))}
        </ul>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ background: "transparent", border: "2px solid #2e7d32", color: "#2e7d32", padding: "7px 18px", borderRadius: 8, fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>👤 {hi ? "लॉगिन" : "Login"}</button>
          <button style={{ background: "#2e7d32", border: "2px solid #2e7d32", color: "#fff", padding: "7px 18px", borderRadius: 8, fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>👤 {hi ? "साइन अप" : "Sign Up"}</button>
        </div>
      </nav>

      {/* ══ HERO ══ */}
      <section style={{ position: "relative", overflow: "hidden", background: "linear-gradient(110deg,#eef7ee 0%,#e3f2e3 45%,#c8e6c9 100%)", minHeight: 500, display: "flex", alignItems: "center" }}>
        <div className="hero-left" style={{ position: "relative", zIndex: 3, padding: "56px 0 56px 52px", maxWidth: 520, flexShrink: 0 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#e8f5e9", border: "1px solid #c8e6c9", color: "#1b5e20", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", padding: "4px 12px", borderRadius: 20, marginBottom: 18 }}>
            🌾 {hi ? "डीप लर्निंग फसल स्वास्थ्य" : "Deep Learning Crop Health"}
          </div>
          <h1 className="hero-h1" style={{ fontSize: 46, fontWeight: 900, lineHeight: 1.08, color: "#1b2e1b", marginBottom: 16, fontFamily: hi ? "'Noto Sans Devanagari', sans-serif" : "inherit" }}>
            {hi ? <><span>बेहतर फसल के लिए</span><br /><span style={{ color: "#2e7d32" }}>स्मार्ट देखभाल</span></> : <>Smart Care for<br />Stronger <span style={{ color: "#2e7d32" }}>Harvests</span></>}
          </h1>
          <p style={{ fontSize: 15.5, color: "#3d5a3d", lineHeight: 1.75, marginBottom: 28, maxWidth: 430, fontFamily: hi ? "'Noto Sans Devanagari', sans-serif" : "inherit" }}>
            {hi ? "CANECARE उन्नत डीप लर्निंग तकनीक से गन्ने की बीमारियाँ पहचानता है, गंभीरता का विश्लेषण करता है और विशेषज्ञ उपचार की सलाह देता है।" : "CANECARE uses advanced deep learning to detect sugarcane diseases, analyze severity, and provide expert treatment recommendations."}
          </p>
          <button className="btn-upload" onClick={() => setModalOpen(true)} style={{ background: "#2e7d32", color: "#fff", border: "none", padding: "15px 30px", borderRadius: 12, fontSize: 16, fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 10, fontFamily: hi ? "'Noto Sans Devanagari', sans-serif" : "inherit", boxShadow: "0 4px 20px rgba(46,125,50,.38)", transition: "all .25s" }}>
            ☁️ {hi ? "छवि अपलोड करें" : "Upload Image"}
          </button>
          <p style={{ marginTop: 9, fontSize: 12.5, color: "#6a8a6a", fontFamily: hi ? "'Noto Sans Devanagari', sans-serif" : "inherit" }}>
            {hi ? "शुरू करने के लिए गन्ने की पत्ती की स्पष्ट फोटो अपलोड करें" : "Upload a clear photo of a sugarcane leaf to get started"}
          </p>
          <div className="badges-row" style={{ display: "flex", marginTop: 34, border: "1px solid #d0e8d0", borderRadius: 10, overflow: "hidden", background: "rgba(255,255,255,.7)" }}>
            {[{ ico: "🛡️", en: "Accurate Results", hi: "सटीक परिणाम" }, { ico: "⚡", en: "Fast Analysis", hi: "तेज़ विश्लेषण" }, { ico: "🔒", en: "Reliable & Secure", hi: "विश्वसनीय & सुरक्षित" }].map((b, i) => (
              <div key={i} className="badge-item" style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "11px 14px", fontSize: 12.5, fontWeight: 700, color: "#3d5a3d", borderRight: i < 2 ? "1px solid #d0e8d0" : "none", fontFamily: hi ? "'Noto Sans Devanagari', sans-serif" : "inherit" }}>
                <span style={{ fontSize: 17 }}>{b.ico}</span>{hi ? b.hi : b.en}
              </div>
            ))}
          </div>
        </div>
        <div className="hero-right" style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "52%", zIndex: 1, overflow: "hidden", borderRadius: "0 0 0 70px" }}>
          <img src="https://th.bing.com/th/id/OIP.0ws1X9GyIPC1HAmA6KtG6wHaE-?w=271&h=183&c=7&r=0&o=7&dpr=1.3&pid=1.7&rm=3" alt="Sugarcane field" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 120, background: "linear-gradient(to right,#e3f2e3,transparent)", pointerEvents: "none" }} />
        </div>
      </section>

      {/* ══ FEATURES ══ */}
      <section id="features" style={{ background: "#f4faf4", padding: "72px 36px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 style={{ fontSize: 32, fontWeight: 900, color: "#1b2e1b", fontFamily: hi ? "'Noto Sans Devanagari', sans-serif" : "inherit" }}>{hi ? "हमारी विशेषताएं" : "Our Features"}</h2>
          <div style={{ width: 44, height: 4, background: "#4caf50", borderRadius: 2, margin: "10px auto 0" }} />
        </div>
        <div className="cards-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 20, maxWidth: 1100, margin: "0 auto" }}>
          {[{ ico: "🔬", en: "Disease Detection", hi: "रोग पहचान", desc_en: "Detect sugarcane diseases instantly using advanced deep learning models.", desc_hi: "उन्नत डीप लर्निंग मॉडल से तुरंत गन्ने की बीमारियाँ पहचानें।" }, { ico: "📊", en: "Severity Analysis", hi: "गंभीरता विश्लेषण", desc_en: "Analyze disease severity and monitor crop health condition.", desc_hi: "बीमारी की गंभीरता का विश्लेषण करें और फसल की स्थिति जानें।" }, { ico: "💊", en: "Treatment Suggestion", hi: "इलाज की सलाह", desc_en: "Get personalized treatment and prevention recommendations.", desc_hi: "व्यक्तिगत उपचार और बचाव की सलाह पाएं।" }, { ico: "🌱", en: "Crop Insights", hi: "फसल जानकारी", desc_en: "Gain valuable insights to improve productivity and crop quality.", desc_hi: "उत्पादकता और फसल की गुणवत्ता सुधारने के मूल्यवान सुझाव पाएं।" }].map((card, i) => (
            <div key={i} className="card-hover" style={{ background: "#fff", borderRadius: 14, padding: "28px 22px", border: "1px solid #e0ede0", boxShadow: "0 2px 12px rgba(30,80,30,.08)" }}>
              <div style={{ width: 58, height: 58, borderRadius: "50%", background: "#e8f5e9", border: "2px solid #c8e6c9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 16 }}>{card.ico}</div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "#2e7d32", marginBottom: 8, fontFamily: hi ? "'Noto Sans Devanagari', sans-serif" : "inherit" }}>{hi ? card.hi : card.en}</h3>
              <p style={{ fontSize: 13.5, color: "#3d5a3d", lineHeight: 1.65, fontFamily: hi ? "'Noto Sans Devanagari', sans-serif" : "inherit" }}>{hi ? card.desc_hi : card.desc_en}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══ HOW IT WORKS ══ */}
      <section id="how" style={{ background: "#fff", padding: "72px 36px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 style={{ fontSize: 32, fontWeight: 900, color: "#1b2e1b", fontFamily: hi ? "'Noto Sans Devanagari', sans-serif" : "inherit" }}>{hi ? "यह कैसे काम करता है" : "How It Works"}</h2>
          <div style={{ width: 44, height: 4, background: "#4caf50", borderRadius: 2, margin: "10px auto 0" }} />
        </div>
        <div className="steps-row" style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", maxWidth: 900, margin: "0 auto", gap: 0 }}>
          {[{ num: 1, ico: "☁️", en: "Upload Image", hi: "फोटो अपलोड करें", desc_en: "Upload a clear image of sugarcane leaf.", desc_hi: "गन्ने की पत्ती की साफ फोटो अपलोड करें।" }, { num: 2, ico: "🧠", en: "Analysis", hi: "विश्लेषण", desc_en: "Our deep learning model analyzes the image.", desc_hi: "हमारा डीप लर्निंग मॉडल छवि का विश्लेषण करता है।" }, { num: 3, ico: "📋", en: "Disease Result", hi: "रोग परिणाम", desc_en: "Get accurate disease detection results.", desc_hi: "सटीक रोग पहचान परिणाम पाएं।" }, { num: 4, ico: "🛡️", en: "Treatment Advice", hi: "उपचार सलाह", desc_en: "Receive expert treatment advice.", desc_hi: "विशेषज्ञ उपचार सलाह पाएं।" }].map((step, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start" }}>
              <div style={{ flex: 1, textAlign: "center", padding: "0 8px", minWidth: 140 }}>
                <div className="step-ring" style={{ position: "relative" }}>
                  <span style={{ position: "absolute", top: -4, left: -4, width: 26, height: 26, borderRadius: "50%", background: "#2e7d32", color: "#fff", fontSize: 12, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>{step.num}</span>
                  {step.ico}
                </div>
                <h4 style={{ fontSize: 14.5, fontWeight: 800, color: "#1b2e1b", fontFamily: hi ? "'Noto Sans Devanagari', sans-serif" : "inherit" }}>{hi ? step.hi : step.en}</h4>
                <p style={{ fontSize: 12.5, color: "#3d5a3d", marginTop: 5, lineHeight: 1.6, maxWidth: 130, marginLeft: "auto", marginRight: "auto", fontFamily: hi ? "'Noto Sans Devanagari', sans-serif" : "inherit" }}>{hi ? step.desc_hi : step.desc_en}</p>
              </div>
              {i < 3 && <div className="step-arrow" style={{ color: "#4caf50", fontSize: 26, fontWeight: 900, marginTop: 28, flexShrink: 0, padding: "0 4px" }}>→</div>}
            </div>
          ))}
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer id="contact" style={{ background: "#1b5e20", color: "#a5d6a7", textAlign: "center", padding: "22px 36px", fontSize: 13.5, fontFamily: hi ? "'Noto Sans Devanagari', sans-serif" : "inherit" }}>
        {hi ? "© 2026 CANECARE. सर्वाधिकार सुरक्षित। | किसानों के लिए बनाया गया 🌾" : "© 2026 CANECARE. All Rights Reserved. | Built for Farmers 🌾"}
      </footer>

      {/* ══ MODAL ══ */}
      {modalOpen && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="modal-box">
            <button onClick={closeModal} style={{ position: "absolute", top: 14, right: 18, background: "none", border: "none", fontSize: 20, color: "#6a8a6a", cursor: "pointer" }}>✕</button>

            <h2 style={{ fontSize: 20, fontWeight: 900, color: "#1b5e20", marginBottom: 4, fontFamily: hi ? "'Noto Sans Devanagari', sans-serif" : "inherit" }}>
              🌿 {hi ? "अपनी फसल की जांच करें" : "Analyze Your Crop"}
            </h2>
            <p style={{ fontSize: 12.5, color: "#6a8a6a", marginBottom: 12, fontFamily: hi ? "'Noto Sans Devanagari', sans-serif" : "inherit" }}>
              {hi ? "केवल गन्ने की पत्ती की फोटो अपलोड करें" : "Upload a close-up photo of a sugarcane leaf only"}
            </p>

            {/* ── Tabs ── */}
            <div style={{ display: "flex", borderBottom: "1.5px solid #e0ede0", marginBottom: 4 }}>
              <button className={`tab-btn${activeTab === "upload" ? " active" : ""}`} onClick={() => { setActiveTab("upload"); stopCamera(); }}>
                📁 {hi ? "अपलोड करें" : "Upload"}
              </button>
              <button className={`tab-btn${activeTab === "camera" ? " active" : ""}`} onClick={() => { setActiveTab("camera"); setPreview(null); setResult(null); }}>
                📷 {hi ? "कैमरा" : "Camera"}
              </button>
            </div>

            {/* ── Upload tab ── */}
            {activeTab === "upload" && (
              <>
                <div className="dropzone"
                  onClick={() => document.getElementById("fileInput")?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}>
                  <div style={{ fontSize: 38, marginBottom: 8 }}>📷</div>
                  <div style={{ fontFamily: hi ? "'Noto Sans Devanagari', sans-serif" : "inherit" }}>
                    {hi ? "यहाँ फोटो क्लिक करें या खींचें" : "Click or drag a sugarcane leaf image here"}
                  </div>
                </div>
                <input id="fileInput" type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              </>
            )}

            {/* ── Camera tab ── */}
            {activeTab === "camera" && (
              <div style={{ margin: "16px 0", textAlign: "center" }}>
                {!cameraActive && !preview && (
                  <button onClick={startCamera} style={{ background: "#2e7d32", color: "#fff", border: "none", padding: "12px 28px", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    📷 {hi ? "कैमरा शुरू करें" : "Start Camera"}
                  </button>
                )}
                {cameraActive && (
                  <>
                    <video ref={videoRef} style={{ width: "100%", borderRadius: 10, marginBottom: 10 }} autoPlay playsInline muted />
                    <canvas ref={canvasRef} style={{ display: "none" }} />
                    <button onClick={capturePhoto} style={{ background: "#2e7d32", color: "#fff", border: "none", padding: "12px 28px", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                      📸 {hi ? "फोटो लें" : "Capture Photo"}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* ── Preview ── */}
            {preview && (
              <img src={preview} alt="Preview" style={{ maxWidth: "100%", maxHeight: 220, objectFit: "contain", borderRadius: 10, marginTop: 10, display: "block", margin: "10px auto" }} />
            )}

            {/* ── Loading ── */}
            {loading && (
              <div style={{ textAlign: "center", padding: 12, color: "#2e7d32", fontWeight: 700, fontSize: 14, fontFamily: hi ? "'Noto Sans Devanagari', sans-serif" : "inherit" }}>
                {modelLoading ? (hi ? "🔄 मॉडल लोड हो रहा है…" : "🔄 Loading model for first time… (takes ~5 sec)") : (hi ? "🔬 विश्लेषण हो रहा है…" : "🔬 Analyzing image…")}
              </div>
            )}

            {/* ── Error ── */}
            {error && (
              <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: "#ffebee", border: "1px solid #ef9a9a", color: "#b71c1c", fontSize: 13.5 }}>
                {error}
              </div>
            )}

            {/* ── Analyze button ── */}
            {imgEl && !loading && !result && (
              <button className="btn-analyze" onClick={runAnalysis} style={{ fontFamily: hi ? "'Noto Sans Devanagari', sans-serif" : "inherit" }}>
                🔍 {hi ? "अभी जांचें" : "Analyze Now"}
              </button>
            )}

            {/* ── Result ── */}
            {result && (
              <div style={{ marginTop: 16 }}>
                {/* Disease + Severity header */}
                <div style={{ background: result.rec.color, borderRadius: 12, padding: "16px 18px", color: "#fff", marginBottom: 14 }}>
                  <div style={{ fontSize: 22, fontWeight: 900 }}>{result.rec.emoji} {result.disease}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, opacity: 0.9, marginTop: 2 }}>{result.rec.severity_label} — {result.confidence}% confidence</div>
                  <div style={{ fontSize: 13, marginTop: 4, background: "rgba(255,255,255,0.2)", display: "inline-block", padding: "3px 10px", borderRadius: 20, fontWeight: 700 }}>
                    {result.rec.action}
                  </div>
                </div>

                {/* Recommendation */}
                <div style={{ background: "#e8f5e9", border: "1px solid #c8e6c9", borderRadius: 12, padding: "14px 16px", marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#1b5e20", marginBottom: 6 }}>💊 {hi ? "सिफारिश" : "Recommendation"}</div>
                  <div style={{ fontSize: 13, color: "#1a3a1a", lineHeight: 1.7 }}>{result.rec.message}</div>
                </div>

                {/* Probability bars */}
                <div style={{ background: "#f4faf4", borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#1b5e20", marginBottom: 10 }}>📊 {hi ? "सभी वर्ग की संभावनाएं" : "All Class Probabilities"}</div>
                  {CLASS_NAMES.map((cls) => (
                    <div key={cls} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#3d5a3d", width: 60, flexShrink: 0 }}>{cls}</div>
                      <div className="prob-bar-bg">
                        <div className="prob-bar-fill" style={{ width: `${result.allProbs[cls]}%`, background: cls === result.disease ? result.rec.color : "#a5d6a7" }} />
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#3d5a3d", width: 42, textAlign: "right", flexShrink: 0 }}>{result.allProbs[cls]}%</div>
                    </div>
                  ))}
                </div>

                {/* Try again */}
                <button onClick={() => { setPreview(null); setImgEl(null); setResult(null); }} style={{ width: "100%", marginTop: 12, background: "transparent", border: "2px solid #2e7d32", color: "#2e7d32", padding: "10px", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  🔄 {hi ? "दूसरी फोटो जांचें" : "Try Another Image"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}