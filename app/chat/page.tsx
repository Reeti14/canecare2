"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface ChatMessage {
  role: "user" | "model";
  content: string;
  error?: boolean;
  category?: string;
}

export default function ChatPage() {
  const [lang, setLang] = useState<"en" | "hi">("en");
  const hi = lang === "hi";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const SUGGESTIONS = hi
    ? [
        { title: "रेड रोट के लक्षण", query: "गन्ने में रेड रोट (लाल सड़न) के मुख्य लक्षण क्या हैं और इसे कैसे पहचानें?" },
        { title: "रस्ट की रोकथाम", query: "गन्ने में रस्ट (गेरुआ रोग) के उपचार के लिए कौन से फफूंदनाशक सबसे प्रभावी हैं?" },
        { title: "उर्वरक प्रबंधन", query: "गन्ने की फसल में यूरिया, डीएपी और पोटाश डालने का सही समय और मात्रा क्या है?" },
        { title: "मोज़ेक वायरस बचाव", query: "मोज़ेक वायरस और रस चूसक कीटों से गन्ने की फसल को कैसे बचाएं?" },
      ]
    : [
        { title: "Red Rot Symptoms", query: "What are the early internal and external symptoms of Red Rot in sugarcane?" },
        { title: "Rust Prevention", query: "What are the recommended fungicides and management steps for sugarcane rust?" },
        { title: "Fertilizer Schedule", query: "What is the optimal NPK fertilization schedule for maximum sugarcane yield?" },
        { title: "Mosaic Virus Control", query: "How do I control aphid vectors and prevent sugarcane mosaic virus spread?" },
      ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleNewChat = () => {
    setMessages([]);
    setInput("");
    inputRef.current?.focus();
  };

  const sendMessage = async (overrideText?: string) => {
    const textToSend = (overrideText || input).trim();
    if (!textToSend || loading) return;

    setInput("");

    // Append user message
    const userMsg: ChatMessage = { role: "user", content: textToSend };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setLoading(true);

    // Placeholder model message for streaming
    const assistantIndex = newHistory.length;
    setMessages((prev) => [...prev, { role: "model", content: "" }]);

    try {
      // Build sanitized messages payload
      const payloadMessages = newHistory
        .filter((m) => m.content && !m.error)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payloadMessages }),
      });

      if (!res.ok) {
        let errorMsg = "";
        let category = "temporary_server_issue";

        try {
          const errJson = await res.json();
          errorMsg = errJson.error;
          category = errJson.category || category;
        } catch {
          // If response is HTML or text (e.g. 404, 502, 504)
          if (res.status === 404) {
            category = "auth_config";
            errorMsg = hi
              ? "सेटअप समस्या: AI चैट एंडपॉइंट (/api/chat) नहीं मिला (404)। सर्वर स्थिति जांचें।"
              : "Setup Issue: Chat API route (/api/chat) returned 404. Please verify Next.js route registration.";
          } else if (res.status === 503 || res.status === 429) {
            category = "temporary_server_issue";
            errorMsg = hi
              ? "अस्थायी समस्या: AI मॉडल व्यस्त है या कोटा सीमा समाप्त है। कृपया कुछ क्षणों में पुनः प्रयास करें।"
              : "Temporary Server Issue: The AI model is currently busy or rate limited. Please retry in a moment.";
          } else {
            category = "server_error";
            errorMsg = hi
              ? `सर्वर त्रुटि (${res.status})। कृपया पुनः प्रयास करें।`
              : `Server Error (${res.status} ${res.statusText || ""}). Please try again.`;
          }
        }

        setMessages((prev) => {
          const copy = [...prev];
          copy[assistantIndex] = {
            role: "model",
            content: errorMsg || (hi ? "अनुरोध विफल हुआ। कृपया पुनः प्रयास करें।" : "Request failed. Please try again."),
            error: true,
            category,
          };
          return copy;
        });
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No response stream available");

      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        const current = accumulated;
        setMessages((prev) => {
          const copy = [...prev];
          copy[assistantIndex] = { role: "model", content: current };
          return copy;
        });
      }
    } catch (err: any) {
      setMessages((prev) => {
        const copy = [...prev];
        copy[assistantIndex] = {
          role: "model",
          content: hi
            ? `❌ नेटवर्क या कनेक्शन त्रुटि: ${err.message || "कृपया इंटरनेट जांचें।"}`
            : `❌ Connection Error: ${err.message || "Please check your network and retry."}`,
          error: true,
          category: "temporary_server_issue",
        };
        return copy;
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "#f8fbf8", fontFamily: "'Inter', 'Noto Sans Devanagari', sans-serif", color: "#1b2e1b", overflow: "hidden" }}>
      {/* ── GOOGLE FONTS & STYLES ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Noto+Sans+Devanagari:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #c8e6c9; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #81c784; }
        
        .sidebar-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 13.5px;
          font-weight: 600;
          color: #2e592e;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid transparent;
          background: transparent;
          width: 100%;
          text-align: left;
          font-family: inherit;
        }
        .sidebar-item:hover {
          background: #e8f5e9;
          color: #1b5e20;
          border-color: #c8e6c9;
        }
        
        .prompt-card {
          background: #ffffff;
          border: 1.5px solid #dceedd;
          border-radius: 16px;
          padding: 18px 20px;
          cursor: pointer;
          transition: all 0.24s cubic-bezier(0.16, 1, 0.3, 1);
          text-align: left;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: 0 4px 16px rgba(30, 80, 30, 0.04);
        }
        .prompt-card:hover {
          transform: translateY(-4px);
          border-color: #4caf50;
          box-shadow: 0 10px 28px rgba(46, 125, 50, 0.12);
          background: #f4faf4;
        }
        
        .send-btn {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          border: none;
          background: linear-gradient(135deg, #2e7d32, #1b5e20);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 14px rgba(46, 125, 50, 0.3);
        }
        .send-btn:hover:not(:disabled) {
          transform: scale(1.05);
          box-shadow: 0 6px 20px rgba(46, 125, 50, 0.45);
        }
        .send-btn:disabled {
          background: #c8e6c9;
          cursor: not-allowed;
          box-shadow: none;
        }

        .typing-pulse {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #4caf50;
          animation: pulse 1.2s infinite ease-in-out;
        }
        .typing-pulse:nth-child(2) { animation-delay: 0.2s; }
        .typing-pulse:nth-child(3) { animation-delay: 0.4s; }
        @keyframes pulse {
          0%, 100% { transform: scale(0.7); opacity: 0.4; }
          50% { transform: scale(1.15); opacity: 1; }
        }

        @media (max-width: 768px) {
          .chat-sidebar {
            position: fixed;
            left: 0;
            top: 0;
            bottom: 0;
            z-index: 100;
            transform: translateX(-100%);
            transition: transform 0.3s ease;
          }
          .chat-sidebar.open {
            transform: translateX(0);
          }
        }
      `}</style>

      {/* ════════ SIDEBAR ════════ */}
      <aside
        className={`chat-sidebar ${sidebarOpen ? "open" : ""}`}
        style={{
          width: sidebarOpen ? 290 : 0,
          background: "#ffffff",
          borderRight: "1px solid #e0ede0",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          transition: "width 0.25s ease",
          overflow: "hidden",
          position: "relative",
          zIndex: 10,
        }}
      >
        {/* Sidebar Header */}
        <div style={{ padding: "20px 18px", borderBottom: "1px solid #edf5ed", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <span style={{ fontSize: 26 }}>🌿</span>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, color: "#1b5e20", letterSpacing: "-0.5px" }}>
                CANE<span style={{ color: "#4caf50" }}>CARE</span>
              </div>
              <div style={{ fontSize: 10.5, color: "#5a805a", fontWeight: 600 }}>
                {hi ? "AI कृषि परामर्श" : "Gemini AI Agricultural Coach"}
              </div>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            title="Collapse Sidebar"
            style={{ background: "transparent", border: "none", color: "#6a8a6a", cursor: "pointer", fontSize: 18, padding: 4 }}
          >
            ◀
          </button>
        </div>

        {/* New Chat Button */}
        <div style={{ padding: "16px 18px" }}>
          <button
            onClick={handleNewChat}
            style={{
              width: "100%",
              padding: "12px 16px",
              background: "linear-gradient(135deg, #e8f5e9, #f1f8e9)",
              border: "1.5px solid #a5d6a7",
              borderRadius: 12,
              color: "#1b5e20",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all 0.2s",
              fontFamily: "inherit",
              boxShadow: "0 2px 8px rgba(46,125,50,0.06)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#2e7d32")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#a5d6a7")}
          >
            <span style={{ fontSize: 18 }}>+</span> {hi ? "नया वार्तालाप" : "New Consultation"}
          </button>
        </div>

        {/* Quick Topics */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 14px" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#7a9b7a", textTransform: "uppercase", letterSpacing: 0.8, padding: "8px 10px 10px" }}>
            {hi ? "परामर्श श्रेणियां" : "Expertise Topics"}
          </div>

          {[
            { ico: "🍂", en: "Red Rot Protocol", hi: "रेड रोट नियंत्रण", q: "What is the recommended treatment protocol for Red Rot?" },
            { ico: "🟠", en: "Rust Management", hi: "रस्ट फफूंद उपचार", q: "How do I diagnose and treat sugarcane rust?" },
            { ico: "🟡", en: "Yellow Leaf Virus", hi: "पीली पत्ती रोग", q: "How to manage sugarcane yellow leaf disease?" },
            { ico: "🦠", en: "Mosaic Vectors", hi: "मोज़ेक वायरस रोकथाम", q: "How to eliminate aphid vectors spreading mosaic?" },
            { ico: "🌱", en: "Soil & Nitrogen NPK", hi: "मृदा व उर्वरक सलाह", q: "What is the best fertilizer dose for sugarcane tillering?" },
            { ico: "💧", en: "Irrigation Scheduling", hi: "सिंचाई प्रबंधन", q: "What is the critical water requirement for sugarcane?" },
          ].map((item, idx) => (
            <button
              key={idx}
              className="sidebar-item"
              onClick={() => sendMessage(item.q)}
            >
              <span style={{ fontSize: 16 }}>{item.ico}</span>
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {hi ? item.hi : item.en}
              </span>
            </button>
          ))}
        </div>

        {/* Sidebar Footer */}
        <div style={{ padding: "16px 18px", borderTop: "1px solid #edf5ed", background: "#fbfdfb" }}>
          {/* Model status pill */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#e8f5e9", padding: "8px 12px", borderRadius: 10, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#2e7d32" }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: "#1b5e20" }}>Gemini 3.7 Flash</span>
            </div>
            <span style={{ fontSize: 10, color: "#4caf50", fontWeight: 700, background: "#fff", padding: "2px 6px", borderRadius: 6 }}>Active</span>
          </div>

          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            <button
              onClick={() => setLang("en")}
              style={{
                flex: 1,
                padding: "6px 0",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                border: "1px solid",
                borderColor: lang === "en" ? "#2e7d32" : "#c8e6c9",
                background: lang === "en" ? "#2e7d32" : "transparent",
                color: lang === "en" ? "#ffffff" : "#2e7d32",
                cursor: "pointer",
              }}
            >
              English
            </button>
            <button
              onClick={() => setLang("hi")}
              style={{
                flex: 1,
                padding: "6px 0",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                border: "1px solid",
                borderColor: lang === "hi" ? "#2e7d32" : "#c8e6c9",
                background: lang === "hi" ? "#2e7d32" : "transparent",
                color: lang === "hi" ? "#ffffff" : "#2e7d32",
                cursor: "pointer",
              }}
            >
              हिन्दी
            </button>
          </div>

          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              fontSize: 13,
              color: "#3d5a3d",
              textDecoration: "none",
              fontWeight: 600,
              padding: "6px 0",
            }}
          >
            ← {hi ? "मुख्य पृष्ठ पर जाएं" : "Back to Home / Scanner"}
          </Link>
        </div>
      </aside>

      {/* ════════ MAIN WORKSPACE ════════ */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", position: "relative", minWidth: 0 }}>
        {/* Top Navbar */}
        <header
          style={{
            height: 62,
            padding: "0 24px",
            background: "#ffffff",
            borderBottom: "1px solid #e0ede0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                title="Open Sidebar"
                style={{
                  background: "#f1f8e9",
                  border: "1px solid #c8e6c9",
                  borderRadius: 8,
                  padding: "6px 10px",
                  fontSize: 14,
                  cursor: "pointer",
                  color: "#1b5e20",
                  fontWeight: 700,
                }}
              >
                ☰ {hi ? "मेनू" : "Topics"}
              </button>
            )}

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 17, fontWeight: 800, color: "#1b2e1b" }}>
                  {hi ? "CANECARE AI कृषि कोच" : "CANECARE AI Coach"}
                </span>
                <span style={{ fontSize: 11, background: "#e8f5e9", color: "#1b5e20", padding: "2px 8px", borderRadius: 12, fontWeight: 700, border: "1px solid #c8e6c9" }}>
                  Powered by Gemini 3.7 Flash
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: "#5d7b5d" }}>
                {hi ? "सटीक गन्ने की बीमारी पहचान, उपचार एवं कृषि मार्गदर्शन" : "Specialized Agronomical Intelligence for Sugarcane Crops"}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {messages.length > 0 && (
              <button
                onClick={handleNewChat}
                style={{
                  background: "transparent",
                  border: "1px solid #c8e6c9",
                  padding: "6px 14px",
                  borderRadius: 8,
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "#2e7d32",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                🗑️ {hi ? "चैट साफ़ करें" : "Clear Chat"}
              </button>
            )}
            <Link
              href="/"
              style={{
                background: "#1b5e20",
                color: "#ffffff",
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              🌿 {hi ? "पत्ती स्कैनर" : "Leaf Scanner"}
            </Link>
          </div>
        </header>

        {/* Chat Stream Canvas */}
        <div style={{ flex: 1, overflowY: "auto", padding: "32px 20px 24px", display: "flex", flexDirection: "column" }}>
          <div style={{ maxWidth: 840, width: "100%", margin: "0 auto", flex: 1, display: "flex", flexDirection: "column" }}>
            {/* Empty State Welcome Screen */}
            {messages.length === 0 && (
              <div style={{ margin: "auto 0", padding: "20px 0 36px", textAlign: "center" }}>
                <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 72, height: 72, borderRadius: 24, background: "linear-gradient(135deg,#e8f5e9,#c8e6c9)", fontSize: 36, marginBottom: 18, boxShadow: "0 8px 24px rgba(46,125,50,0.14)" }}>
                  🌱
                </div>
                <h1 style={{ fontSize: 32, fontWeight: 900, color: "#1b2e1b", marginBottom: 10, letterSpacing: "-0.5px" }}>
                  {hi ? "नमस्ते, किसान साथी!" : "Welcome, Sugarcane Grower!"}
                </h1>
                <p style={{ fontSize: 16, color: "#4d6b4d", maxWidth: 580, margin: "0 auto 36px", lineHeight: 1.6 }}>
                  {hi
                    ? "गन्ने की बीमारियों (रेड रोट, रस्ट, मोज़ेक), उर्वरक योजना या कीट नियंत्रण से जुड़े कोई भी प्रश्न पूछें। हमारा AI कोच वैज्ञानिक सलाह देने के लिए तत्पर है।"
                    : "Ask questions about sugarcane disease symptoms, fungicide dosages, crop nutrition schedules, or field prevention strategies."}
                </p>

                {/* Gemini-like 4 Suggestion Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, textAlign: "left" }}>
                  {SUGGESTIONS.map((sug, i) => (
                    <div
                      key={i}
                      className="prompt-card"
                      onClick={() => sendMessage(sug.query)}
                    >
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#1b5e20", marginBottom: 6 }}>
                          {sug.title}
                        </div>
                        <div style={{ fontSize: 12.5, color: "#4d6b4d", lineHeight: 1.5 }}>
                          {sug.query}
                        </div>
                      </div>
                      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
                        <span style={{ fontSize: 14, color: "#2e7d32", fontWeight: 800 }}>→</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Message Thread */}
            {messages.map((msg, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  gap: 16,
                  marginBottom: 24,
                  alignItems: "flex-start",
                  flexDirection: msg.role === "user" ? "row-reverse" : "row",
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    background: msg.role === "user" ? "#1b5e20" : "#e8f5e9",
                    color: msg.role === "user" ? "#ffffff" : "#1b5e20",
                    border: msg.role === "user" ? "none" : "1.5px solid #c8e6c9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  {msg.role === "user" ? "👤" : "🌿"}
                </div>

                {/* Bubble Container */}
                <div style={{ maxWidth: "80%", width: msg.role === "user" ? "auto" : "100%" }}>
                  {/* Sender label & Timestamp */}
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: "#7a9b7a", marginBottom: 4, textAlign: msg.role === "user" ? "right" : "left" }}>
                    {msg.role === "user" ? (hi ? "आप" : "You") : (hi ? "CANECARE AI कोच" : "CANECARE AI Coach")}
                  </div>

                  {/* Content Box */}
                  <div
                    style={{
                      background: msg.role === "user" ? "#1b5e20" : msg.error ? "#fdf2f2" : "#ffffff",
                      color: msg.role === "user" ? "#ffffff" : msg.error ? "#991b1b" : "#1b2e1b",
                      border: msg.role === "user" ? "none" : msg.error ? "1.5px solid #f87171" : "1px solid #e0ede0",
                      borderRadius: msg.role === "user" ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
                      padding: "16px 20px",
                      fontSize: 14.5,
                      lineHeight: 1.7,
                      boxShadow: msg.role === "user" ? "0 4px 14px rgba(27,94,32,0.18)" : "0 2px 10px rgba(30,80,30,0.04)",
                      wordBreak: "break-word",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {msg.content ? (
                      <div>{msg.content}</div>
                    ) : (
                      /* Live Streaming Pulsing Indicator */
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                        <span className="typing-pulse" />
                        <span className="typing-pulse" />
                        <span className="typing-pulse" />
                        <span style={{ fontSize: 12, color: "#6a8a6a", marginLeft: 4 }}>
                          {hi ? "AI विचार कर रहा है..." : "Analyzing crop data..."}
                        </span>
                      </div>
                    )}

                    {/* Categorized error banner with Retry */}
                    {msg.error && (
                      <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px dashed #fca5a5", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#b91c1c" }}>
                          {msg.category === "auth_config"
                            ? (hi ? "कॉन्फ़िगरेशन त्रुटि" : "Configuration Issue")
                            : msg.category === "invalid_request"
                            ? (hi ? "अमान्य अनुरोध" : "Invalid Request")
                            : (hi ? "अस्थायी सर्वर लोड" : "Temporary Model Issue")}
                        </span>
                        <button
                          onClick={() => {
                            const lastUserMsg = messages.slice(0, index).reverse().find((m) => m.role === "user");
                            if (lastUserMsg) sendMessage(lastUserMsg.content);
                          }}
                          style={{
                            background: "#b91c1c",
                            color: "#fff",
                            border: "none",
                            padding: "4px 12px",
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          🔄 {hi ? "पुनः प्रयास करें" : "Retry"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Actions for AI responses */}
                  {msg.role === "model" && msg.content && !msg.error && (
                    <div style={{ display: "flex", gap: 10, marginTop: 6, marginLeft: 2 }}>
                      <button
                        onClick={() => handleCopy(msg.content, index)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: copiedIndex === index ? "#2e7d32" : "#7a9b7a",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        {copiedIndex === index ? "✓ " + (hi ? "कॉपी हो गया!" : "Copied!") : "📋 " + (hi ? "कॉपी करें" : "Copy advice")}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Bottom Gemini-Style Prompt Composer */}
        <div style={{ padding: "0 24px 20px", background: "#f8fbf8" }}>
          <div style={{ maxWidth: 840, margin: "0 auto", position: "relative" }}>
            {/* Quick chips if in conversation */}
            {messages.length > 0 && !loading && (
              <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10, marginBottom: 4 }}>
                {SUGGESTIONS.map((sug, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(sug.query)}
                    style={{
                      whiteSpace: "nowrap",
                      background: "#ffffff",
                      border: "1px solid #c8e6c9",
                      borderRadius: 20,
                      padding: "6px 14px",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#1b5e20",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#e8f5e9";
                      e.currentTarget.style.borderColor = "#4caf50";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#ffffff";
                      e.currentTarget.style.borderColor = "#c8e6c9";
                    }}
                  >
                    💡 {sug.title}
                  </button>
                ))}
              </div>
            )}

            {/* Input Box */}
            <div
              style={{
                background: "#ffffff",
                border: "2px solid #c8e6c9",
                borderRadius: 20,
                padding: "10px 14px 10px 20px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                boxShadow: "0 8px 30px rgba(30,80,30,0.08)",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
              onFocusCapture={(e) => {
                e.currentTarget.style.borderColor = "#4caf50";
                e.currentTarget.style.boxShadow = "0 8px 32px rgba(46,125,50,0.16)";
              }}
              onBlurCapture={(e) => {
                e.currentTarget.style.borderColor = "#c8e6c9";
                e.currentTarget.style.boxShadow = "0 8px 30px rgba(30,80,30,0.08)";
              }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                rows={1}
                placeholder={
                  hi
                    ? "गन्ने की बीमारी, लक्षण या उपचार के बारे में पूछें... (Enter दबाएं)"
                    : "Ask anything about sugarcane health, diseases, or fertilizer schedules..."
                }
                style={{
                  flex: 1,
                  resize: "none",
                  border: "none",
                  outline: "none",
                  fontSize: 14.5,
                  fontFamily: hi ? "'Noto Sans Devanagari', sans-serif" : "inherit",
                  lineHeight: 1.5,
                  maxHeight: 120,
                  color: "#1b2e1b",
                  background: "transparent",
                }}
              />

              <button
                className="send-btn"
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                title={hi ? "संदेश भेजें" : "Send query"}
              >
                {loading ? (
                  <span style={{ fontSize: 14 }}>⏳</span>
                ) : (
                  <span style={{ fontSize: 17, transform: "rotate(45deg) translate(-1px, 1px)", display: "inline-block" }}>
                    ➤
                  </span>
                )}
              </button>
            </div>

            {/* Disclaimer */}
            <div style={{ fontSize: 11, color: "#7a9b7a", textAlign: "center", marginTop: 8 }}>
              {hi
                ? "CANECARE AI कृषि संबंधी मार्गदर्शन प्रदान करता है। महत्वपूर्ण उपचार से पहले स्थानीय कृषि अधिकारी से पुष्टि करें।"
                : "CANECARE AI provides agronomic guidance powered by Gemini. Verify chemical treatments with local agriculture extension officers."}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
