"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";

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
      action: "Maintain & Monitor",
      message: "Your crop looks vigorous and healthy! Continue balanced NPK fertilization, routine field scouting every 14 days, and maintain proper furrow drainage.",
      emoji: "✅",
      color: "#2e7d32",
    },
  },
  Yellow: {
    Low: {
      severity_label: "Early Stage",
      action: "Treat Soon",
      message: "Early midrib yellowing detected. Check soil nitrogen and apply urea or foliar micronutrient spray. Ensure root drainage to avoid standing water.",
      emoji: "🟡",
      color: "#f9a825",
    },
    Moderate: {
      severity_label: "Moderate Stage",
      action: "Treat Urgently",
      message: "Yellow leaf discoloration spreading across cane canopy. Apply foliar nitrogen spray immediately. Inspect for aphid vectors and relieve moisture stress.",
      emoji: "🟠",
      color: "#e65100",
    },
    Severe: {
      severity_label: "Severe Stage",
      action: "Agronomist Consultation",
      message: "Extensive yellow leaf syndrome. Sucrose synthesis is severely impeded. Isolate affected clump to prevent vector transmission to adjacent rows.",
      emoji: "🔴",
      color: "#b71c1c",
    },
  },
  Mosaic: {
    Low: {
      severity_label: "Early Stage",
      action: "Prune Infected Leaves",
      message: "Early mosaic mottling detected. Rogue out visibly infected shoots. Spray imidacloprid or neem oil to suppress aphid and whitefly insect vectors.",
      emoji: "🟡",
      color: "#f9a825",
    },
    Moderate: {
      severity_label: "Moderate Stage",
      action: "Isolate & Vector Control",
      message: "Mosaic pattern has spread across multiple tillers. Disinfect harvesting cutters with bleach. Apply systemic insecticide immediately.",
      emoji: "🟠",
      color: "#e65100",
    },
    Severe: {
      severity_label: "Severe Stage",
      action: "Eradicate Plant Immediately",
      message: "Severe mosaic infection. Plant cannot recover and will infect neighboring fields. Uproot and burn plant material; do not compost.",
      emoji: "🔴",
      color: "#b71c1c",
    },
  },
  RedRot: {
    Low: {
      severity_label: "Early Stage",
      action: "Apply Copper Fungicide",
      message: "Early red rot symptoms on midrib. Spray copper oxychloride or thiophanate methyl immediately. Drain waterlogged furrows to check Colletotrichum spores.",
      emoji: "🟡",
      color: "#f9a825",
    },
    Moderate: {
      severity_label: "Moderate Stage",
      action: "Remove Stalks & Treat",
      message: "Moderate red rot infection. Remove all visibly withered stalks and burn them. Drench soil base with carbendazim (0.1%) and aerate root zones.",
      emoji: "🟠",
      color: "#e65100",
    },
    Severe: {
      severity_label: "Severe Stage",
      action: "Uproot, Burn & Crop Rotation",
      message: "Severe red rot ('cancer of cane'). Internal pith is completely damaged with fermented odor. Destroy affected clumps and rotate field with legumes.",
      emoji: "🔴",
      color: "#b71c1c",
    },
  },
  Rust: {
    Low: {
      severity_label: "Early Stage",
      action: "Apply Mancozeb Spray",
      message: "Early rust pustules (Puccinia) on lower foliage. Spray mancozeb or propiconazole. Thin out dry trash to improve airflow in the lower canopy.",
      emoji: "🟡",
      color: "#f9a825",
    },
    Moderate: {
      severity_label: "Moderate Stage",
      action: "Systemic Triazole Treatment",
      message: "Pustules expanding and erupting spores. Spray systemic triazole fungicide (e.g., tebuconazole). Avoid overhead sprinkler irrigation that spreads spores.",
      emoji: "🟠",
      color: "#e65100",
    },
    Severe: {
      severity_label: "Severe Stage",
      action: "Canopy Pruning & Rescue Spray",
      message: "Heavy pustule coverage causing premature leaf desiccation. Strip severely infected lower leaves, safely dispose of debris, and re-spray after 10 days.",
      emoji: "🔴",
      color: "#b71c1c",
    },
  },
};

function getSeverity(disease: string, confidence: number): string {
  if (disease === "Healthy") return "none";
  if (confidence < LOW_THRESH) return "Low";
  if (confidence < MODERATE_THRESH) return "Moderate";
  return "Severe";
}

export default function HomePage() {
  const [lang, setLang] = useState<"en" | "hi">("en");
  const hi = lang === "hi";

  // Modal & Camera states
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"upload" | "camera">("upload");
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    disease: string;
    confidence: number;
    severity: string;
    rec: { severity_label: string; action: string; message: string; emoji: string; color: string };
    allProbs: Record<string, number>;
  } | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handleFile = (file: File) => {
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    setResult(null);
    setError(null);
  };

  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      setError(hi ? "कैमरा एक्सेस नहीं मिला। कृपया अनुमति दें।" : "Could not access camera. Please grant camera permission.");
    }
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        setSelectedFile(blob);
        const dataUrl = canvas.toDataURL("image/jpeg");
        setPreview(dataUrl);
        setResult(null);
        setError(null);
      }
    }, "image/jpeg", 0.95);

    stopCamera();
  };

  const runAnalysis = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", selectedFile, "leaf.jpg");

      const response = await fetch("/api/predict", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();
      const topPred = data.top;
      const disease = topPred.label;
      const confidenceVal = topPred.probability;
      const confidence = Math.round(confidenceVal * 10000) / 100;
      const severity = getSeverity(disease, confidenceVal);
      const rec = RECOMMENDATIONS[disease]?.[severity] || RECOMMENDATIONS[disease]?.["Low"] || RECOMMENDATIONS["Healthy"]["none"];

      const allProbs: Record<string, number> = {};
      CLASS_NAMES.forEach((cls) => {
        const item = data.predictions.find((p: any) => p.label === cls);
        allProbs[cls] = item ? Math.round(item.probability * 10000) / 100 : 0;
      });

      setResult({ disease, confidence, severity, rec, allProbs });
    } catch (e: any) {
      console.error(e);
      setError(hi ? "❌ विश्लेषण विफल। कृपया पुनः प्रयास करें।" : `❌ Analysis failed: ${e.message || "Please check server logs and try again."}`);
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setPreview(null);
    setSelectedFile(null);
    setResult(null);
    setError(null);
    setLoading(false);
    stopCamera();
    setActiveTab("upload");
  };

  return (
    <div style={{ fontFamily: "'Inter', 'Noto Sans Devanagari', sans-serif", color: "#1b2e1b", background: "#ffffff", overflowX: "hidden" }}>
      {/* ── STYLES ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Noto+Sans+Devanagari:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        
        @keyframes scanLaser {
          0% { top: 0%; opacity: 0.8; }
          50% { top: 96%; opacity: 1; }
          100% { top: 0%; opacity: 0.8; }
        }
        .scan-laser-line {
          position: absolute;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, transparent, #4caf50, #a5d6a7, #4caf50, transparent);
          box-shadow: 0 0 14px #4caf50, 0 0 4px #81c784;
          animation: scanLaser 1.8s infinite ease-in-out;
          z-index: 2;
        }

        .hero-btn-primary {
          background: linear-gradient(135deg, #1b5e20, #2e7d32);
          color: #ffffff;
          padding: 16px 32px;
          border-radius: 14px;
          font-weight: 800;
          font-size: 16px;
          border: none;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          transition: all 0.25s ease;
          box-shadow: 0 6px 24px rgba(27, 94, 32, 0.35);
          text-decoration: none;
        }
        .hero-btn-primary:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 32px rgba(27, 94, 32, 0.5);
          background: linear-gradient(135deg, #144718, #236527);
        }

        .hero-btn-secondary {
          background: #ffffff;
          color: #1b5e20;
          padding: 16px 28px;
          border-radius: 14px;
          font-weight: 800;
          font-size: 16px;
          border: 2px solid #a5d6a7;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          transition: all 0.25s ease;
          text-decoration: none;
        }
        .hero-btn-secondary:hover {
          transform: translateY(-3px);
          border-color: #2e7d32;
          background: #f1f8e9;
          box-shadow: 0 6px 20px rgba(46, 125, 50, 0.15);
        }

        .disease-card {
          background: #ffffff;
          border-radius: 18px;
          padding: 24px;
          border: 1.5px solid #e0ede0;
          transition: all 0.26s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .disease-card:hover {
          transform: translateY(-6px);
          border-color: #81c784;
          box-shadow: 0 14px 36px rgba(30, 80, 30, 0.12);
        }

        .workflow-card {
          background: #ffffff;
          border: 1.5px solid #e8f5e9;
          border-radius: 18px;
          padding: 28px 22px;
          text-align: center;
          position: relative;
          transition: all 0.25s;
          box-shadow: 0 4px 16px rgba(30, 80, 30, 0.04);
        }
        .workflow-card:hover {
          transform: translateY(-4px);
          border-color: #a5d6a7;
          box-shadow: 0 10px 28px rgba(46, 125, 50, 0.1);
        }

        .advisory-card {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #e0ede0;
          padding: 26px;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .advisory-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(30, 80, 30, 0.08);
        }

        .dropzone {
          border: 2px dashed #4caf50;
          border-radius: 14px;
          padding: 40px 20px;
          text-align: center;
          cursor: pointer;
          transition: background 0.2s;
          background: #fbfdfb;
        }
        .dropzone:hover {
          background: #eef7ee;
        }

        .tab-btn {
          flex: 1;
          padding: 12px;
          border: none;
          cursor: pointer;
          font-size: 14px;
          font-weight: 700;
          border-bottom: 3px solid transparent;
          background: transparent;
          color: #6a8a6a;
          transition: all 0.2s;
          font-family: inherit;
        }
        .tab-btn.active {
          color: #1b5e20;
          border-bottom-color: #2e7d32;
        }

        .prob-bar-bg {
          background: #e8f5e9;
          border-radius: 6px;
          height: 10px;
          flex: 1;
          overflow: hidden;
        }
        .prob-bar-fill {
          height: 100%;
          border-radius: 6px;
          transition: width 0.6s ease;
        }

        @media (max-width: 960px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .hero-interactive-card { display: none; }
          .disease-grid { grid-template-columns: 1fr 1fr !important; }
          .workflow-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 640px) {
          .disease-grid { grid-template-columns: 1fr !important; }
          .workflow-grid { grid-template-columns: 1fr !important; }
          .hero-cta-wrap { flex-direction: column !important; }
          .nav-menu { display: none !important; }
        }
      `}</style>

      {/* ════════ TOP LANGUAGE BAR ════════ */}
      <div style={{ background: "#144718", padding: "6px 36px", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10 }}>
        <span style={{ color: "#a5d6a7", fontSize: 12, fontWeight: 600 }}>Language / भाषा:</span>
        <button
          onClick={() => setLang("en")}
          style={{
            fontFamily: "inherit",
            fontSize: 12,
            fontWeight: 700,
            padding: "3px 14px",
            borderRadius: 20,
            border: "1.5px solid",
            borderColor: lang === "en" ? "#f9a825" : "#a5d6a7",
            cursor: "pointer",
            background: lang === "en" ? "#f9a825" : "transparent",
            color: lang === "en" ? "#144718" : "#a5d6a7",
            transition: "all 0.2s",
          }}
        >
          English
        </button>
        <button
          onClick={() => setLang("hi")}
          style={{
            fontFamily: "'Noto Sans Devanagari', sans-serif",
            fontSize: 12,
            fontWeight: 700,
            padding: "3px 14px",
            borderRadius: 20,
            border: "1.5px solid",
            borderColor: lang === "hi" ? "#f9a825" : "#a5d6a7",
            cursor: "pointer",
            background: lang === "hi" ? "#f9a825" : "transparent",
            color: lang === "hi" ? "#144718" : "#a5d6a7",
            transition: "all 0.2s",
          }}
        >
          हिन्दी
        </button>
      </div>

      {/* ════════ NAVBAR ════════ */}
      <header style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid #e0ede0", boxShadow: "0 2px 14px rgba(30,80,30,0.06)" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 28px", height: 72, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Brand */}
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #1b5e20, #4caf50)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, boxShadow: "0 4px 12px rgba(46,125,50,0.25)" }}>
              🌿
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#1b5e20", letterSpacing: "-0.5px" }}>
                CANE<span style={{ color: "#4caf50" }}>CARE</span>
              </div>
              <div style={{ fontSize: 11, color: "#5a805a", fontWeight: 600 }}>
                {hi ? "गन्ना स्वास्थ्य एवं निदान" : "Smart Sugarcane Pathology"}
              </div>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="nav-menu" style={{ display: "flex", alignItems: "center", gap: 32 }}>
            <Link href="#features" style={{ textDecoration: "none", color: "#2e592e", fontWeight: 600, fontSize: 14.5 }}>
              {hi ? "विशेषताएं" : "Features"}
            </Link>
            <Link href="#diseases" style={{ textDecoration: "none", color: "#2e592e", fontWeight: 600, fontSize: 14.5 }}>
              {hi ? "रोग पहचान सूची" : "Disease Hub"}
            </Link>
            <Link href="#how" style={{ textDecoration: "none", color: "#2e592e", fontWeight: 600, fontSize: 14.5 }}>
              {hi ? "कार्यप्रणाली" : "Workflow"}
            </Link>
            <Link href="#advisory" style={{ textDecoration: "none", color: "#2e592e", fontWeight: 600, fontSize: 14.5 }}>
              {hi ? "कृषि सलाह" : "Advisory"}
            </Link>
          </nav>

          {/* CTA Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => setModalOpen(true)}
              style={{
                background: "transparent",
                border: "2px solid #2e7d32",
                color: "#1b5e20",
                padding: "8px 18px",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              📷 {hi ? "पत्ती स्कैन" : "Scan Leaf"}
            </button>

            <Link
              href="/chat"
              style={{
                background: "linear-gradient(135deg, #1b5e20, #2e7d32)",
                color: "#ffffff",
                padding: "10px 20px",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 700,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                boxShadow: "0 4px 14px rgba(27,94,32,0.25)",
              }}
            >
              🤖 {hi ? "AI कोच (नया)" : "AI Coach ✦"}
            </Link>
          </div>
        </div>
      </header>

      {/* ════════ HERO SECTION ════════ */}
      <section style={{ background: "linear-gradient(135deg, #f3faf3 0%, #e8f5e9 50%, #dceedd 100%)", padding: "70px 28px 80px", position: "relative", overflow: "hidden" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <div className="hero-grid" style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 48, alignItems: "center" }}>
            {/* Left Content */}
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#ffffff", border: "1.5px solid #a5d6a7", padding: "6px 14px", borderRadius: 30, color: "#1b5e20", fontSize: 12.5, fontWeight: 700, marginBottom: 20, boxShadow: "0 2px 8px rgba(30,80,30,0.06)" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4caf50" }} />
                🌾 {hi ? "उन्नत डीप लर्निंग + जेमिनी AI द्वारा संचालित" : "Deep Learning SavedModel + Gemini 3.7 AI"}
              </div>

              <h1 style={{ fontSize: "clamp(34px, 4.5vw, 50px)", fontWeight: 900, lineHeight: 1.12, color: "#1b2e1b", marginBottom: 20, letterSpacing: "-0.8px" }}>
                {hi ? (
                  <>
                    गन्ने की फसल के लिए <br />
                    <span style={{ color: "#2e7d32" }}>सटीक रोग पहचान</span> एवं विशेषज्ञ समाधान
                  </>
                ) : (
                  <>
                    Precision Disease Detection <br />
                    for Healthier, <span style={{ color: "#2e7d32" }}>Richer Cane Yields</span>
                  </>
                )}
              </h1>

              <p style={{ fontSize: 16.5, color: "#3d5a3d", lineHeight: 1.75, marginBottom: 32, maxWidth: 540 }}>
                {hi
                  ? "CANECARE उन्नत मोबाइलनेटवी2 मॉडल से सेकंडों में गन्ने की पत्तियों के रोगों (रेड रोट, रस्ट, मोज़ेक, पीली पत्ती) की पहचान करता है और जेमिनी AI कोच से उपचार सलाह प्रदान करता है।"
                  : "Upload or capture a sugarcane leaf photo. Our dedicated MobileNetV2 neural model delivers instant sub-second diagnostic classification, paired with full-page Gemini AI agronomical guidance."}
              </p>

              {/* Action Buttons */}
              <div className="hero-cta-wrap" style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 40 }}>
                <button className="hero-btn-primary" onClick={() => setModalOpen(true)}>
                  ☁️ {hi ? "पत्ती की फोटो जांचें" : "Diagnose Leaf Photo"}
                </button>
                <Link href="/chat" className="hero-btn-secondary">
                  🤖 {hi ? "पूर्ण AI कोच खोलें →" : "Open Full AI Coach →"}
                </Link>
              </div>

              {/* Metrics Bar */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, maxWidth: 520, borderTop: "1px solid #c8e6c9", paddingTop: 24 }}>
                <div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: "#1b5e20" }}>98.4%</div>
                  <div style={{ fontSize: 12.5, color: "#5a805a", fontWeight: 600 }}>{hi ? "सत्यापित सटीकता" : "Model Accuracy"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: "#1b5e20" }}>5 Classes</div>
                  <div style={{ fontSize: 12.5, color: "#5a805a", fontWeight: 600 }}>{hi ? "प्रमुख रोग श्रेणियां" : "Disease Signatures"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: "#1b5e20" }}>&lt; 0.5s</div>
                  <div style={{ fontSize: 12.5, color: "#5a805a", fontWeight: 600 }}>{hi ? "सर्वर इन्फरेंस समय" : "Inference Latency"}</div>
                </div>
              </div>
            </div>

            {/* Right Interactive Visual Simulation */}
            <div className="hero-interactive-card" style={{ position: "relative" }}>
              <div style={{ background: "#ffffff", borderRadius: 24, padding: "24px", border: "2px solid #c8e6c9", boxShadow: "0 20px 60px rgba(30,80,30,0.14)" }}>
                {/* Visual Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid #edf5ed" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 18 }}>🔬</span>
                    <span style={{ fontWeight: 800, fontSize: 14, color: "#1b5e20" }}>Live Neural Diagnostics</span>
                  </div>
                  <span style={{ fontSize: 11, background: "#e8f5e9", color: "#2e7d32", padding: "3px 8px", borderRadius: 10, fontWeight: 700 }}>
                    TensorFlow SavedModel
                  </span>
                </div>

                {/* Simulated Leaf Scan View */}
                <div style={{ position: "relative", height: 230, borderRadius: 16, overflow: "hidden", background: "#1b2e1b", marginBottom: 18 }}>
                  <img
                    src="https://th.bing.com/th/id/OIP.0ws1X9GyIPC1HAmA6KtG6wHaE-?w=271&h=183&c=7&r=0&o=7&dpr=1.3&pid=1.7&rm=3"
                    alt="Sugarcane Leaf Inspection"
                    style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }}
                  />
                  {/* Scanner overlay line & crosshairs */}
                  <div style={{ position: "absolute", top: 20, left: 20, right: 20, bottom: 20, border: "2px dashed rgba(76,175,80,0.8)", borderRadius: 12, pointerEvents: "none" }} />
                  <div style={{ position: "absolute", bottom: 12, left: 16, background: "rgba(0,0,0,0.75)", color: "#a5d6a7", padding: "4px 10px", borderRadius: 8, fontSize: 11.5, fontWeight: 600 }}>
                    Target: Sugarcane Midrib • 224x224 RGB
                  </div>
                </div>

                {/* Disease Distribution Preview */}
                <div style={{ background: "#f8fbf8", borderRadius: 14, padding: "16px", border: "1px solid #e0ede0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "#1b5e20" }}>Class Distribution</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#2e7d32" }}>98.9% Confidence</span>
                  </div>
                  {[
                    { name: "Red Rot", prob: 98.9, color: "#b71c1c" },
                    { name: "Rust", prob: 0.6, color: "#e65100" },
                    { name: "Healthy", prob: 0.3, color: "#2e7d32" },
                    { name: "Yellow", prob: 0.1, color: "#f9a825" },
                    { name: "Mosaic", prob: 0.1, color: "#f9a825" },
                  ].map((item, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: "#3d5a3d", width: 60 }}>{item.name}</span>
                      <div style={{ flex: 1, background: "#e8f5e9", height: 7, borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ width: `${item.prob}%`, background: item.color, height: "100%", borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#5a805a", width: 38, textAlign: "right" }}>{item.prob}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════ FEATURES SECTION ════════ */}
      <section id="features" style={{ padding: "84px 28px", background: "#ffffff" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <div style={{ textAlign: "center", maxWidth: 660, margin: "0 auto 54px" }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#2e7d32", textTransform: "uppercase", letterSpacing: 1.2 }}>
              {hi ? "शक्तिशाली तकनीक" : "Engineered for Agriculture"}
            </span>
            <h2 style={{ fontSize: 34, fontWeight: 900, color: "#1b2e1b", marginTop: 8, letterSpacing: "-0.5px" }}>
              {hi ? "CANECARE की प्रमुख विशेषताएं" : "Intelligent Features for Modern Cane Farming"}
            </h2>
            <div style={{ width: 48, height: 4, background: "#4caf50", borderRadius: 2, margin: "14px auto 0" }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24 }}>
            {[
              {
                ico: "🔬",
                title_en: "Sub-Second Inference",
                title_hi: "त्वरित मॉडल जांच",
                desc_en: "Dedicated Python SavedModel runtime evaluates input photos in under 500ms directly on the server.",
                desc_hi: "समर्पित सर्वर-साइड मॉडल 500ms से भी कम समय में पत्ती का सटीक विश्लेषण करता है।",
              },
              {
                ico: "📊",
                title_en: "Confidence Matrix",
                title_hi: "गंभीरता विश्लेषण",
                desc_en: "Full 5-class probability distribution prevents misdiagnoses and categorizes infection severity.",
                desc_hi: "5-स्तरीय संभावना वितरण गलत पहचान से बचाता है और बीमारी की तीव्रता स्पष्ट करता है।",
              },
              {
                ico: "🤖",
                title_en: "Gemini 3.7 AI Coach",
                title_hi: "जेमिनी AI कृषि कोच",
                desc_en: "Interactive full-page agronomist dialogue powered by Gemini 3.7 with automated model fallback.",
                desc_hi: "जेमिनी 3.7 द्वारा संचालित संपूर्ण कृषि संवाद जो तुरंत सटीक रासायनिक व प्राकृतिक समाधान देता है।",
              },
              {
                ico: "🇮🇳",
                title_en: "Bilingual Precision",
                title_hi: "द्विभाषी सहायता",
                desc_en: "Complete native Hindi & English translation for recommendations, severity guides, and interactive advice.",
                desc_hi: "किसानों की सुविधा के लिए सभी रिपोर्ट, सिफारिशें और AI चैट हिंदी और अंग्रेजी दोनों में उपलब्ध।",
              },
            ].map((f, i) => (
              <div key={i} className="workflow-card">
                <div style={{ width: 56, height: 56, borderRadius: 16, background: "#e8f5e9", border: "1.5px solid #c8e6c9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 18px" }}>
                  {f.ico}
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: "#1b5e20", marginBottom: 10 }}>
                  {hi ? f.title_hi : f.title_en}
                </h3>
                <p style={{ fontSize: 13.5, color: "#4d6b4d", lineHeight: 1.65 }}>
                  {hi ? f.desc_hi : f.desc_en}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ DISEASE INTELLIGENCE HUB ════════ */}
      <section id="diseases" style={{ padding: "84px 28px", background: "#f5faf5", borderTop: "1px solid #e0ede0", borderBottom: "1px solid #e0ede0" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 20, marginBottom: 48 }}>
            <div>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#2e7d32", textTransform: "uppercase", letterSpacing: 1.2 }}>
                {hi ? "रोग संदर्भ कोष" : "Pathology Encyclopedia"}
              </span>
              <h2 style={{ fontSize: 34, fontWeight: 900, color: "#1b2e1b", marginTop: 8, letterSpacing: "-0.5px" }}>
                {hi ? "5 प्रमुख गन्ने के स्वास्थ्य वर्गीकरण" : "5 Core Sugarcane Pathological Classes"}
              </h2>
            </div>
            <Link
              href="/chat"
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#1b5e20",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "#ffffff",
                padding: "8px 16px",
                borderRadius: 10,
                border: "1px solid #c8e6c9",
              }}
            >
              💬 {hi ? "AI कोच से किसी भी रोग पर चर्चा करें →" : "Discuss any disease with AI Coach →"}
            </Link>
          </div>

          <div className="disease-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            {[
              {
                id: "RedRot",
                name_en: "Red Rot (Colletotrichum falcatum)",
                name_hi: "रेड रोट (लाल सड़न)",
                tag: "High Risk • Fungus",
                tagColor: "#b71c1c",
                symptoms_en: "Dull red internal discoloration with white transverse bands. Alcoholic fermentation odor on split cane.",
                symptoms_hi: "गन्ना चीरने पर अंदर लाल रंग और सफेद आड़ी पट्टियां। सड़े हुए गन्ने से सिरके जैसी गंध।",
                treatment_en: "Carbendazim or Copper Oxychloride spray. Immediate rogueing of infected stalks.",
                treatment_hi: "कॉपर ऑक्सीक्लोराइड का छिड़काव। संक्रमित पौधों को तुरंत उखाड़कर नष्ट करें।",
              },
              {
                id: "Rust",
                name_en: "Sugarcane Rust (Puccinia melanocephala)",
                name_hi: "रस्ट (गेरुआ रोग)",
                tag: "Airborne • Spores",
                tagColor: "#e65100",
                symptoms_en: "Small elongate chlorotic spots on leaves erupting into powdery orange-brown pustules.",
                symptoms_hi: "पत्तियों की निचली सतह पर नारंगी-भूरे रंग के उभरे हुए फफोले और धब्बे।",
                treatment_en: "Mancozeb (0.2%) or Propiconazole spray. Improve row spacing for air circulation.",
                treatment_hi: "मैंकोजेब या प्रोपिकोनाजोल का छिड़काव। कतारों के बीच हवा का आवागमन सुधारें।",
              },
              {
                id: "Mosaic",
                name_en: "Sugarcane Mosaic Virus (SCMV)",
                name_hi: "मोज़ेक वायरस",
                tag: "Viral • Vector Borne",
                tagColor: "#f9a825",
                symptoms_en: "Contrasting dark and light green patchy mottling on young leaf blades; stunted cane growth.",
                symptoms_hi: "कोमल पत्तियों पर हल्के और गहरे हरे रंग के चितकबरे धब्बे और पौधे का बौनापन।",
                treatment_en: "Insecticide for aphids/whiteflies. Disinfect seed cutters with heat treatment.",
                treatment_hi: "माहू और रस चूसक कीटों का नियंत्रण। केवल रोगमुक्त बीजों का ही रोपण करें।",
              },
              {
                id: "Yellow",
                name_en: "Yellow Leaf Disease (SCYLV)",
                name_hi: "पीली पत्ती रोग",
                tag: "Luteovirus • Foliar",
                tagColor: "#f57f17",
                symptoms_en: "Intense yellowing of the midrib on 3rd-5th leaves, gradually spreading across the lamina.",
                symptoms_hi: "तीसरी से पांचवीं पत्ती की मुख्य नस का चमकीला पीला होना और बाद में सूखना।",
                treatment_en: "Foliar micronutrient & nitrogen spray. Systemic insecticide against cane aphids.",
                treatment_hi: "सूक्ष्म पोषक तत्वों और यूरिया का पर्णीय छिड़काव। एफिड्स पर कीटनाशक नियंत्रण।",
              },
              {
                id: "Healthy",
                name_en: "Healthy Sugarcane",
                name_hi: "स्वस्थ गन्ना",
                tag: "Optimal Crop State",
                tagColor: "#2e7d32",
                symptoms_en: "Vibrant dark green canopy, robust upright tillers, smooth leaf margins with zero necrotic lesions.",
                symptoms_hi: "चमकदार हरी पत्तियां, मजबूत कल्ले और बिना किसी दाग-धब्बे के सामान्य वानस्पतिक विकास।",
                treatment_en: "Maintain balanced NPK fertilization, clean weeding, and fortnightly scouting.",
                treatment_hi: "संतुलित पोषण, समय पर सिंचाई और प्रत्येक 14 दिनों में खेत की नियमित निगरानी।",
              },
            ].map((d) => (
              <div key={d.id} className="disease-card">
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: "#ffffff", background: d.tagColor, padding: "3px 10px", borderRadius: 20 }}>
                      {d.tag}
                    </span>
                    <span style={{ fontSize: 20 }}>
                      {d.id === "Healthy" ? "🌿" : d.id === "RedRot" ? "🛑" : d.id === "Rust" ? "🟠" : "🟡"}
                    </span>
                  </div>

                  <h3 style={{ fontSize: 16.5, fontWeight: 800, color: "#1b2e1b", marginBottom: 10 }}>
                    {hi ? d.name_hi : d.name_en}
                  </h3>

                  <div style={{ fontSize: 12.5, color: "#3d5a3d", lineHeight: 1.6, marginBottom: 14 }}>
                    <strong style={{ color: "#1b5e20" }}>{hi ? "लक्षण:" : "Symptoms:"} </strong>
                    {hi ? d.symptoms_hi : d.symptoms_en}
                  </div>
                </div>

                <div style={{ borderTop: "1px solid #edf5ed", paddingTop: 12, marginTop: 8 }}>
                  <div style={{ fontSize: 12, color: "#5a805a", lineHeight: 1.5, marginBottom: 12 }}>
                    <strong style={{ color: "#2e7d32" }}>{hi ? "उपचार:" : "Action:"} </strong>
                    {hi ? d.treatment_hi : d.treatment_en}
                  </div>

                  <button
                    onClick={() => setModalOpen(true)}
                    style={{
                      width: "100%",
                      padding: "8px 0",
                      background: "#f1f8e9",
                      border: "1px solid #c8e6c9",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#1b5e20",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    🔍 {hi ? "इस रोग के लिए पत्ती जांचें" : "Scan Leaf For This"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ HOW IT WORKS (WORKFLOW PIPELINE) ════════ */}
      <section id="how" style={{ padding: "84px 28px", background: "#ffffff" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <div style={{ textAlign: "center", maxWidth: 600, margin: "0 auto 56px" }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#2e7d32", textTransform: "uppercase", letterSpacing: 1.2 }}>
              {hi ? "निदान प्रक्रिया" : "Workflow Pipeline"}
            </span>
            <h2 style={{ fontSize: 34, fontWeight: 900, color: "#1b2e1b", marginTop: 8, letterSpacing: "-0.5px" }}>
              {hi ? "सीधी और सटीक 4-चरणीय कार्यप्रणाली" : "4-Step Precision Diagnosis Workflow"}
            </h2>
            <div style={{ width: 48, height: 4, background: "#4caf50", borderRadius: 2, margin: "14px auto 0" }} />
          </div>

          <div className="workflow-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24, position: "relative" }}>
            {[
              {
                step: "01",
                ico: "📸",
                title_en: "Capture or Upload",
                title_hi: "पत्ती की फोटो लें",
                desc_en: "Take a clear, well-lit close-up photo of the affected sugarcane leaf surface or midrib.",
                desc_hi: "गन्ने की प्रभावित पत्ती या मुख्य नस की साफ फोटो खींचें या गैलरी से अपलोड करें।",
              },
              {
                step: "02",
                ico: "⚙️",
                title_en: "Neural Preprocessing",
                title_hi: "मॉडल प्री-प्रोसेसिंग",
                desc_en: "Image is scaled to 224x224 RGB float32 pixels and passed to our trained MobileNetV2 backend.",
                desc_hi: "इमेज का 224x224 पिक्सल पर स्केलिंग होकर डीप लर्निंग मॉडल में स्वतः विश्लेषण होता है।",
              },
              {
                step: "03",
                ico: "📊",
                title_en: "Multiclass Probability",
                title_hi: "संभावना व गंभीरता",
                desc_en: "The system identifies the exact disease, confidence score, and categorizes severity (Low/Mod/Severe).",
                desc_hi: "सटीक रोग, प्रतिशत विश्वास स्कोर और बीमारी की गंभीरता की तुरंत रिपोर्ट तैयार होती है।",
              },
              {
                step: "04",
                ico: "🤖",
                title_en: "Gemini AI Treatment",
                title_hi: "AI उपचार व परामर्श",
                desc_en: "Get instant dosage recommendations or open full-page Gemini AI Coach for customized guidance.",
                desc_hi: "तुरंत दवा व मात्रा की सलाह पाएं या पूरे AI कोच में विशेषज्ञ से विस्तृत चर्चा करें।",
              },
            ].map((step, i) => (
              <div key={i} className="workflow-card">
                <div style={{ position: "absolute", top: 14, right: 16, fontSize: 22, fontWeight: 900, color: "#e0ede0" }}>
                  {step.step}
                </div>
                <div style={{ width: 62, height: 62, borderRadius: 20, background: "#e8f5e9", border: "2px solid #c8e6c9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 16px" }}>
                  {step.ico}
                </div>
                <h3 style={{ fontSize: 16.5, fontWeight: 800, color: "#1b5e20", marginBottom: 8 }}>
                  {hi ? step.title_hi : step.title_en}
                </h3>
                <p style={{ fontSize: 13, color: "#4d6b4d", lineHeight: 1.6 }}>
                  {hi ? step.desc_hi : step.desc_en}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ AI COACH SHOWCASE BANNER ════════ */}
      <section style={{ padding: "0 28px 84px", background: "#ffffff" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <div
            style={{
              background: "linear-gradient(135deg, #144718 0%, #1b5e20 45%, #2e7d32 100%)",
              borderRadius: 28,
              padding: "54px 44px",
              color: "#ffffff",
              boxShadow: "0 24px 64px rgba(20, 71, 24, 0.35)",
              display: "grid",
              gridTemplateColumns: "1.2fr 0.8fr",
              gap: 40,
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.15)", padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, marginBottom: 18 }}>
                ✨ {hi ? "नया पूर्ण पृष्ठ अनुभव" : "Gemini 3.7 Flash Intelligence"}
              </div>

              <h2 style={{ fontSize: "clamp(28px, 3.5vw, 42px)", fontWeight: 900, lineHeight: 1.15, marginBottom: 16, letterSpacing: "-0.5px" }}>
                {hi ? (
                  <>
                    अपनी पूरी फसल के लिए <br />
                    <span style={{ color: "#f9a825" }}>AI कृषि विशेषज्ञ</span> से बात करें
                  </>
                ) : (
                  <>
                    Consult the Dedicated <br />
                    <span style={{ color: "#f9a825" }}>Gemini AI Agronomist</span>
                  </>
                )}
              </h2>

              <p style={{ fontSize: 16, color: "#d0e8d0", lineHeight: 1.7, marginBottom: 28, maxWidth: 520 }}>
                {hi
                  ? "अब किसी छोटे विंडो की जगह पूरे पेज का समर्पित जेमिनी इंटरफ़ेस उपलब्ध है। रासायनिक फफूंदनाशक, यूरिया शेड्यूलिंग या मौसम संबंधी जोखिमों पर खुलकर बात करें।"
                  : "Experience our full-page Gemini interface designed specifically for crop pathology. Ask complex multiline questions, query fertilizer schedules, and receive instant scientific treatment protocols."}
              </p>

              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
                <Link
                  href="/chat"
                  style={{
                    background: "#f9a825",
                    color: "#144718",
                    padding: "15px 32px",
                    borderRadius: 12,
                    fontSize: 16,
                    fontWeight: 900,
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    boxShadow: "0 6px 20px rgba(249,168,37,0.35)",
                  }}
                >
                  🚀 {hi ? "AI कोच अभी खोलें →" : "Launch Full AI Coach →"}
                </Link>
                <button
                  onClick={() => setModalOpen(true)}
                  style={{
                    background: "rgba(255,255,255,0.12)",
                    border: "1.5px solid rgba(255,255,255,0.35)",
                    color: "#ffffff",
                    padding: "14px 24px",
                    borderRadius: 12,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  📷 {hi ? "या पत्ती स्कैन करें" : "Or Scan Leaf First"}
                </button>
              </div>
            </div>

            {/* Visual Chat Preview Card */}
            <div style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(14px)", border: "1.5px solid rgba(255,255,255,0.2)", borderRadius: 20, padding: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.15)" }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#f9a825", color: "#144718", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900 }}>
                  🤖
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>CANECARE AI Coach</div>
                  <div style={{ fontSize: 11, color: "#a5d6a7" }}>Online • Gemini 3.7 Flash</div>
                </div>
              </div>

              <div style={{ background: "rgba(255,255,255,0.14)", borderRadius: 12, padding: "12px 16px", fontSize: 13, marginBottom: 12, color: "#ffffff", maxWidth: "85%", marginLeft: "auto" }}>
                {hi ? "गन्ने में रेड रोट रोकने के लिए कौन सी दवा स्प्रे करें?" : "What fungicide prevents red rot spread?"}
              </div>

              <div style={{ background: "rgba(255,255,255,0.92)", color: "#1b2e1b", borderRadius: 12, padding: "14px 16px", fontSize: 13, lineHeight: 1.6, maxWidth: "95%" }}>
                <div style={{ fontWeight: 800, color: "#1b5e20", marginBottom: 4 }}>
                  🌾 {hi ? "विशेषज्ञ सिफारिश:" : "Expert Protocol:"}
                </div>
                {hi
                  ? "कॉपर ऑक्सीक्लोराइड 50 WP (2.5 ग्राम/लीटर) या कार्बेन्डाजिम (1 ग्राम/लीटर) का तुरंत पर्णीय छिड़काव करें। जलभराव रोकें।"
                  : "Apply Copper Oxychloride 50% WP (2.5g/L) or Carbendazim. Rogue out infected clumps and maintain field furrow drainage."}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════ AGRONOMY ADVISORY SECTION ════════ */}
      <section id="advisory" style={{ padding: "84px 28px", background: "#f9fcf9", borderTop: "1px solid #e0ede0" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <div style={{ textAlign: "center", maxWidth: 660, margin: "0 auto 54px" }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#2e7d32", textTransform: "uppercase", letterSpacing: 1.2 }}>
              {hi ? "मौसम व फसल प्रबंधन" : "Field Advisory"}
            </span>
            <h2 style={{ fontSize: 34, fontWeight: 900, color: "#1b2e1b", marginTop: 8, letterSpacing: "-0.5px" }}>
              {hi ? "गन्ने की उच्च पैदावार हेतु सर्वश्रेष्ठ प्रथाएं" : "Agronomic Best Practices for Cane Health"}
            </h2>
            <div style={{ width: 48, height: 4, background: "#4caf50", borderRadius: 2, margin: "14px auto 0" }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
            {[
              {
                ico: "🌱",
                title_en: "Certified Sett Disinfection",
                title_hi: "बीज शोधन व उपचार",
                desc_en: "Treat setts in hot water (52°C for 30 mins) or dip in Carbendazim solution (0.1%) before planting to eliminate latent seed-borne spores.",
                desc_hi: "बुवाई से पूर्व गन्ने के टुकड़ों को 0.1% कार्बेन्डाजिम घोल या 52°C गर्म पानी में 30 मिनट उपचारित करें।",
              },
              {
                ico: "💧",
                title_en: "Furrow Drainage Engineering",
                title_hi: "उचित जल निकासी प्रबंधन",
                desc_en: "Red Rot and fungal root rot thrive in stagnant water. Construct deep drainage channels to prevent root asphyxiation during monsoons.",
                desc_hi: "जलभराव से फफूंद तेजी से फैलती है। बरसात के मौसम में खेत से अतिरिक्त पानी निकालने के लिए गहरी नालियां बनाएं।",
              },
              {
                ico: "🧪",
                title_en: "Split Nitrogen Application",
                title_hi: "संतुलित यूरिया व पोटाश",
                desc_en: "Apply nitrogen in 3 split doses (at planting, 45 days, and 90 days). Top-dress with muriate of potash to build cell wall resistance.",
                desc_hi: "यूरिया को 3 बार में दें (बुवाई, 45 दिन व 90 दिन)। पोटाश का प्रयोग पत्तियों की प्रतिरोधक क्षमता बढ़ाता है।",
              },
            ].map((tip, i) => (
              <div key={i} className="advisory-card">
                <div style={{ fontSize: 32, marginBottom: 14 }}>{tip.ico}</div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "#1b5e20", marginBottom: 10 }}>
                  {hi ? tip.title_hi : tip.title_en}
                </h3>
                <p style={{ fontSize: 14, color: "#4d6b4d", lineHeight: 1.7 }}>
                  {hi ? tip.desc_hi : tip.desc_en}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ FOOTER ════════ */}
      <footer style={{ background: "#144718", color: "#a5d6a7", padding: "48px 28px 32px", borderTop: "1px solid #1b5e20" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20, marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 30 }}>🌿</span>
              <div>
                <div style={{ fontSize: 20, fontWeight: 900, color: "#ffffff" }}>
                  CANE<span style={{ color: "#4caf50" }}>CARE</span>
                </div>
                <div style={{ fontSize: 12, color: "#a5d6a7" }}>
                  {hi ? "किसानों के लिए उन्नत AI फसल स्वास्थ्य प्रणाली" : "Deep Learning Sugarcane Pathology System"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 24, fontSize: 14, fontWeight: 600 }}>
              <Link href="/" style={{ color: "#a5d6a7", textDecoration: "none" }}>{hi ? "होम" : "Home"}</Link>
              <Link href="#diseases" style={{ color: "#a5d6a7", textDecoration: "none" }}>{hi ? "रोग संदर्भ" : "Disease Catalog"}</Link>
              <Link href="/chat" style={{ color: "#f9a825", textDecoration: "none", fontWeight: 700 }}>{hi ? "AI कोच" : "AI Coach"}</Link>
            </div>
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 24, textAlign: "center", fontSize: 13, color: "#81c784" }}>
            {hi
              ? "© 2026 CANECARE. सर्वाधिकार सुरक्षित। किसानों और कृषि वैज्ञानिकों के सहयोग से निर्मित 🌾"
              : "© 2026 CANECARE. All Rights Reserved. Engineered for Farmers & Agricultural Scientists 🌾"}
          </div>
        </div>
      </footer>

      {/* ════════ DIAGNOSTIC MODAL ════════ */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            backdropFilter: "blur(4px)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 24,
              padding: 32,
              maxWidth: 540,
              width: "100%",
              position: "relative",
              boxShadow: "0 24px 64px rgba(0,0,0,0.3)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <button
              onClick={closeModal}
              style={{
                position: "absolute",
                top: 18,
                right: 20,
                background: "#f1f8e9",
                border: "none",
                fontSize: 18,
                width: 34,
                height: 34,
                borderRadius: "50%",
                color: "#2e7d32",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✕
            </button>

            <h2 style={{ fontSize: 22, fontWeight: 900, color: "#1b5e20", marginBottom: 4 }}>
              🌿 {hi ? "अपनी गन्ने की पत्ती जांचें" : "Analyze Sugarcane Leaf"}
            </h2>
            <p style={{ fontSize: 13, color: "#5a805a", marginBottom: 16 }}>
              {hi
                ? "गन्ने की पत्ती की स्पष्ट फोटो अपलोड करें या सीधे कैमरे से फोटो खींचें"
                : "Upload a close-up photo of the affected sugarcane leaf for instant neural inference"}
            </p>

            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: "1.5px solid #e0ede0", marginBottom: 14 }}>
              <button
                className={`tab-btn ${activeTab === "upload" ? "active" : ""}`}
                onClick={() => {
                  setActiveTab("upload");
                  stopCamera();
                }}
              >
                📁 {hi ? "फ़ाइल अपलोड" : "File Upload"}
              </button>
              <button
                className={`tab-btn ${activeTab === "camera" ? "active" : ""}`}
                onClick={() => {
                  setActiveTab("camera");
                  setPreview(null);
                  setSelectedFile(null);
                  setResult(null);
                }}
              >
                📷 {hi ? "कैमरा कैप्चर" : "Live Camera"}
              </button>
            </div>

            {/* Upload Tab */}
            {activeTab === "upload" && (
              <>
                <div
                  className="dropzone"
                  onClick={() => document.getElementById("leafFileInput")?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files[0];
                    if (f) handleFile(f);
                  }}
                >
                  <div style={{ fontSize: 44, marginBottom: 10 }}>🍃</div>
                  <div style={{ fontWeight: 700, color: "#1b5e20", fontSize: 14.5, marginBottom: 4 }}>
                    {hi ? "यहाँ फोटो खींच कर लाएं या क्लिक करें" : "Click to select or drag & drop leaf photo here"}
                  </div>
                  <div style={{ fontSize: 12, color: "#6a8a6a" }}>
                    PNG, JPG, WEBP • Max 10MB
                  </div>
                </div>
                <input
                  id="leafFileInput"
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
              </>
            )}

            {/* Camera Tab */}
            {activeTab === "camera" && (
              <div style={{ margin: "16px 0", textAlign: "center" }}>
                {!cameraActive && !preview && (
                  <button
                    onClick={startCamera}
                    style={{
                      background: "#1b5e20",
                      color: "#fff",
                      border: "none",
                      padding: "14px 28px",
                      borderRadius: 12,
                      fontSize: 14.5,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    📷 {hi ? "कैमरा चालू करें" : "Activate Camera"}
                  </button>
                )}
                {cameraActive && (
                  <>
                    <video ref={videoRef} style={{ width: "100%", borderRadius: 12, marginBottom: 12 }} autoPlay playsInline muted />
                    <canvas ref={canvasRef} style={{ display: "none" }} />
                    <button
                      onClick={capturePhoto}
                      style={{
                        background: "#1b5e20",
                        color: "#fff",
                        border: "none",
                        padding: "12px 28px",
                        borderRadius: 12,
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      📸 {hi ? "फोटो खींचें" : "Take Snapshot"}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Preview Image with Scanning Laser */}
            {preview && (
              <div style={{ textAlign: "center", margin: "14px 0", position: "relative", display: "inline-block", width: "100%" }}>
                <div style={{ position: "relative", display: "inline-block", maxWidth: "100%", borderRadius: 14, overflow: "hidden", border: "2px solid #a5d6a7" }}>
                  <img
                    src={preview}
                    alt="Leaf Preview"
                    style={{ maxWidth: "100%", maxHeight: 240, objectFit: "contain", display: "block" }}
                  />
                  {loading && (
                    <>
                      <div className="scan-laser-line" />
                      <div style={{ position: "absolute", inset: 0, background: "rgba(46,125,50,0.12)", pointerEvents: "none" }} />
                    </>
                  )}
                </div>
              </div>
            )}

            {/* High-Tech Loading State */}
            {loading && (
              <div style={{ textAlign: "center", padding: "16px 20px", background: "#f1f8e9", borderRadius: 14, border: "1.5px solid #c8e6c9", margin: "12px 0" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "#1b5e20", fontWeight: 800, fontSize: 14.5, marginBottom: 6 }}>
                  <span className="typing-pulse" />
                  <span>{hi ? "पत्ती का डीप लर्निंग विश्लेषण प्रगति पर है..." : "Neural Network Analyzing Leaf Features..."}</span>
                </div>
                <div style={{ fontSize: 12, color: "#5a805a" }}>
                  {hi ? "MobileNetV2 मॉडल • 5 रोग श्रेणियों में मिलान हो रहा है" : "Running MobileNetV2 • Matching 5 Sugarcane Disease Signatures"}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ margin: "12px 0", padding: 12, borderRadius: 10, background: "#ffebee", border: "1px solid #ef9a9a", color: "#b71c1c", fontSize: 13.5 }}>
                {error}
              </div>
            )}

            {/* Analyze Button */}
            {selectedFile && !loading && !result && (
              <button
                onClick={runAnalysis}
                style={{
                  width: "100%",
                  background: "linear-gradient(135deg, #1b5e20, #2e7d32)",
                  color: "#fff",
                  border: "none",
                  padding: 14,
                  borderRadius: 12,
                  fontSize: 15.5,
                  fontWeight: 800,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  marginTop: 8,
                }}
              >
                🔍 {hi ? "अभी विश्लेषण करें" : "Run Neural Analysis"}
              </button>
            )}

            {/* Results Display */}
            {result && (
              <div style={{ marginTop: 18 }}>
                <div style={{ background: result.rec.color, borderRadius: 14, padding: "18px 20px", color: "#ffffff", marginBottom: 16 }}>
                  <div style={{ fontSize: 24, fontWeight: 900 }}>
                    {result.rec.emoji} {result.disease}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, opacity: 0.95, marginTop: 4 }}>
                    {result.rec.severity_label} • {result.confidence}% Confidence
                  </div>
                  <div style={{ fontSize: 12.5, marginTop: 6, background: "rgba(255,255,255,0.22)", display: "inline-block", padding: "3px 12px", borderRadius: 20, fontWeight: 700 }}>
                    {result.rec.action}
                  </div>
                </div>

                {/* Recommendation */}
                <div style={{ background: "#e8f5e9", border: "1.5px solid #c8e6c9", borderRadius: 14, padding: "16px 18px", marginBottom: 16 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: "#1b5e20", marginBottom: 6 }}>
                    💊 {hi ? "अनुशंसित कार्रवाई:" : "Treatment Protocol:"}
                  </div>
                  <div style={{ fontSize: 13.5, color: "#1a3a1a", lineHeight: 1.65 }}>
                    {result.rec.message}
                  </div>
                </div>

                {/* Probability Distribution */}
                <div style={{ background: "#f8fbf8", borderRadius: 14, padding: "16px 18px", border: "1px solid #e0ede0", marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#1b5e20", marginBottom: 10 }}>
                    📊 {hi ? "रोग संभावना विवरण" : "Full Probability Distribution"}
                  </div>
                  {CLASS_NAMES.map((cls) => (
                    <div key={cls} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#3d5a3d", width: 62 }}>{cls}</div>
                      <div className="prob-bar-bg">
                        <div
                          className="prob-bar-fill"
                          style={{
                            width: `${result.allProbs[cls] || 0}%`,
                            background: cls === result.disease ? result.rec.color : "#a5d6a7",
                          }}
                        />
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#3d5a3d", width: 44, textAlign: "right" }}>
                        {result.allProbs[cls] || 0}%
                      </div>
                    </div>
                  ))}
                </div>

                {/* Direct Link to AI Coach */}
                <Link
                  href="/chat"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    width: "100%",
                    background: "linear-gradient(135deg, #1b5e20, #2e7d32)",
                    color: "#ffffff",
                    padding: "12px",
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 800,
                    textDecoration: "none",
                    marginBottom: 10,
                  }}
                >
                  🤖 {hi ? "इस निदान पर AI कोच से सलाह लें →" : "Discuss this Diagnosis with AI Coach →"}
                </Link>

                <button
                  onClick={() => {
                    setPreview(null);
                    setSelectedFile(null);
                    setResult(null);
                  }}
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "2px solid #2e7d32",
                    color: "#1b5e20",
                    padding: "10px",
                    borderRadius: 10,
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  🔄 {hi ? "दूसरी पत्ती की जांच करें" : "Test Another Image"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}