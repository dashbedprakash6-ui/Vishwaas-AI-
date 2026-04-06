/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShieldAlert, 
  ShieldCheck, 
  Search, 
  AlertTriangle, 
  Info, 
  Languages, 
  BarChart3, 
  MessageSquareWarning,
  Loader2,
  RefreshCw,
  ArrowRight,
  Volume2,
  VolumeX,
  Play
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { RiskLevel, Decision, MisinformationResult, PanicDetected, PanicType, CredibilityLevel, TrendingRisk, PublicHarmRisk, VoiceTone } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function App() {
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<MisinformationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<string | null>(null); // Track which language is playing

  const analyzeText = async () => {
    if (!inputText.trim()) return;

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze this social media text for misinformation: "${inputText}"`,
        config: {
          systemInstruction: `You are an AI system designed to detect real-time misinformation in regional Indian languages with advanced public-safety intelligence.
          Follow these steps strictly:
          1. Detect Language (Hindi, Odia, Bengali, Telugu, English, etc.)
          2. Clean Text (Remove emojis, symbols, and rewrite clearly)
          3. Extract Main Claim
          4. Panic / Disaster Rumor Detection: Detect if message can create public panic. Return panic_detected (YES/NO), panic_type, and panic_risk (LOW/MEDIUM/HIGH).
          5. Source Credibility Checker: Analyze source reliability. Return source_type, credibility_score (0-100), and credibility_level (LOW/MEDIUM/HIGH).
          6. Trending Rumor Detection: Check if message follows viral rumor pattern. Return trend_probability (0-100) and trending_risk (LOW/MEDIUM/HIGH).
          7. Public Harm Analysis: Determine harm level. Return public_harm_type and public_harm_risk (LOW/MEDIUM/HIGH).
          8. Multilingual AI Voice Alert with Emergency Siren: Based on risk_level and detected language, generate short spoken alerts (Max 12 words, clear spoken style).
             - HIGH risk: Start with "🚨 ALERT 🚨", use strong warning/urgent tone.
             - MEDIUM risk: Start with "⚠️ Warning", use caution tone.
             - SAFE: Start with "✅ Safe", use friendly reassurance/calm tone.
             Generate for English, Hindi, and the detected regional language. Assign voice_tone (ALERT/CAUTION/SAFE) and siren text.
          9. Auto Correction Generator: Generate a safer, neutral corrected message.
          10. Enhanced Risk Score Calculation: Final risk score considering misinformation probability, panic risk, virality score, credibility score, and public harm risk.
          11. Final Risk Level (0-30 = LOW, 31-60 = MEDIUM, 61-100 = HIGH)
          12. Output JSON format only.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              language: { type: Type.STRING },
              clean_text: { type: Type.STRING },
              main_claim: { type: Type.STRING },
              misinformation_probability: { type: Type.NUMBER },
              panic_detected: { type: Type.STRING, enum: Object.values(PanicDetected) },
              panic_type: { type: Type.STRING, enum: Object.values(PanicType) },
              panic_risk: { type: Type.STRING, enum: Object.values(RiskLevel) },
              source_type: { type: Type.STRING },
              credibility_score: { type: Type.NUMBER },
              credibility_level: { type: Type.STRING, enum: Object.values(CredibilityLevel) },
              trend_probability: { type: Type.NUMBER },
              trending_risk: { type: Type.STRING, enum: Object.values(TrendingRisk) },
              public_harm_type: { type: Type.STRING },
              public_harm_risk: { type: Type.STRING, enum: Object.values(PublicHarmRisk) },
              final_risk_score: { type: Type.NUMBER },
              risk_level: { type: Type.STRING, enum: Object.values(RiskLevel) },
              decision: { type: Type.STRING, enum: Object.values(Decision) },
              corrected_message: { type: Type.STRING },
              warning_message: { type: Type.STRING },
              reason: { type: Type.STRING },
              voice_alert: {
                type: Type.OBJECT,
                properties: {
                  english: { type: Type.STRING },
                  hindi: { type: Type.STRING },
                  regional_language: { type: Type.STRING },
                  language_used: { type: Type.STRING },
                  voice_tone: { type: Type.STRING, enum: Object.values(VoiceTone) },
                  siren: { type: Type.STRING }
                },
                required: ["english", "hindi", "regional_language", "language_used", "voice_tone", "siren"]
              }
            },
            required: [
              "language", "clean_text", "main_claim", 
              "misinformation_probability", "panic_detected", "panic_type", "panic_risk",
              "source_type", "credibility_score", "credibility_level",
              "trend_probability", "trending_risk", "public_harm_type", "public_harm_risk",
              "final_risk_score", "risk_level", "decision", "corrected_message", "warning_message", "reason",
              "voice_alert"
            ]
          }
        }
      });

      const data = JSON.parse(response.text || '{}') as MisinformationResult;
      setResult(data);
    } catch (err) {
      console.error(err);
      setError("Failed to analyze text. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const playVoiceAlert = async (text: string, lang: string) => {
    if (isPlaying) return;
    setIsPlaying(lang);

    try {
      const ttsResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Speak this ${lang} alert: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const audioBlob = new Blob([Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0))], { type: 'audio/pcm' });
        
        // Since it's raw PCM 24000Hz, we need to use AudioContext or wrap it in a WAV header.
        // For simplicity, let's use the browser's native SpeechSynthesis as a fallback if TTS fails or for easier implementation,
        // but the prompt asks for "AI Voice Alert Module".
        // Let's try to play the raw PCM using AudioContext.
        
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const arrayBuffer = await audioBlob.arrayBuffer();
        
        // PCM data is usually 16-bit signed integers
        const int16Data = new Int16Array(arrayBuffer);
        const float32Data = new Float32Array(int16Data.length);
        for (let i = 0; i < int16Data.length; i++) {
          float32Data[i] = int16Data[i] / 32768.0;
        }
        
        const audioBuffer = audioContext.createBuffer(1, float32Data.length, 24000);
        audioBuffer.getChannelData(0).set(float32Data);
        
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.onended = () => setIsPlaying(null);
        source.start();
      } else {
        setIsPlaying(null);
      }
    } catch (err) {
      console.error("TTS Error:", err);
      setIsPlaying(null);
      // Fallback to browser TTS if Gemini TTS fails
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => setIsPlaying(null);
      window.speechSynthesis.speak(utterance);
    }
  };

  const getRiskColor = (level: RiskLevel) => {
    switch (level) {
      case RiskLevel.LOW: return "text-emerald-600 bg-emerald-50 border-emerald-200";
      case RiskLevel.MEDIUM: return "text-amber-600 bg-amber-50 border-amber-200";
      case RiskLevel.HIGH: return "text-rose-600 bg-rose-50 border-rose-200";
      default: return "text-slate-600 bg-slate-50 border-slate-200";
    }
  };

  const getRiskBadge = (level: RiskLevel | CredibilityLevel | TrendingRisk | PublicHarmRisk) => {
    switch (level) {
      case RiskLevel.LOW: return "bg-emerald-500";
      case RiskLevel.MEDIUM: return "bg-amber-500";
      case RiskLevel.HIGH: return "bg-rose-500";
      default: return "bg-slate-500";
    }
  };

  const getVoiceToneColor = (tone: VoiceTone) => {
    switch (tone) {
      case VoiceTone.ALERT: return "text-rose-600 bg-rose-50 border-rose-200";
      case VoiceTone.CAUTION: return "text-amber-600 bg-amber-50 border-amber-200";
      case VoiceTone.SAFE: return "text-emerald-600 bg-emerald-50 border-emerald-200";
      default: return "text-slate-600 bg-slate-50 border-slate-200";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <ShieldAlert size={24} />
            </div>
            <h1 className="text-xl font-display font-bold tracking-tight text-slate-900">
              Vishwaas<span className="text-indigo-600">AI</span>
            </h1>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-sm font-medium text-slate-500">
            <span className="flex items-center gap-1.5">
              <Languages size={16} /> Regional Support
            </span>
            <span className="flex items-center gap-1.5">
              <BarChart3 size={16} /> Real-time Analysis
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-8">
        {/* Hero Section */}
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-slate-900 mb-4">
            Detect Regional Misinformation
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Paste social media posts in Hindi, Odia, Bengali, Telugu, and more to verify claims and assess risks instantly.
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider w-full mb-1">Try an example:</span>
            <button 
              onClick={() => setInputText("कल रात से पूरे शहर में इंटरनेट बंद हो जाएगा, सरकार ने आदेश दिया है। जल्दी सबको बताओ! 🚨🚨")}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-lg transition-colors border border-slate-200"
            >
              Hindi Rumor
            </button>
            <button 
              onClick={() => setInputText("ଆସନ୍ତାକାଲି ଠାରୁ ସମସ୍ତ ସ୍କୁଲ କଲେଜ ବନ୍ଦ ରହିବ ବୋଲି ମୁଖ୍ୟମନ୍ତ୍ରୀ ଘୋଷଣା କରିଛନ୍ତି।")}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-lg transition-colors border border-slate-200"
            >
              Odia News
            </button>
            <button 
              onClick={() => setInputText("New study says drinking hot water with lemon cures COVID-19 instantly! Spread the word. 🍋☕")}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-lg transition-colors border border-slate-200"
            >
              Health Myth
            </button>
          </div>
          <div className="relative">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste the social media text here (e.g., WhatsApp forwards, Tweets, Facebook posts)..."
              className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none text-slate-800 placeholder:text-slate-400"
            />
            <div className="absolute bottom-4 right-4 flex items-center gap-2">
              <button
                onClick={() => setInputText('')}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Clear input"
              >
                <RefreshCw size={18} />
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Info size={14} />
              <span>Supports all major Indian regional languages</span>
            </div>
            <button
              onClick={analyzeText}
              disabled={isAnalyzing || !inputText.trim()}
              className={cn(
                "w-full sm:w-auto px-8 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg",
                isAnalyzing || !inputText.trim()
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                  : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200 active:scale-95"
              )}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Analyzing...
                </>
              ) : (
                <>
                  Analyze Now
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-8 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 flex items-center gap-3"
            >
              <AlertTriangle size={20} />
              <p className="font-medium">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Section */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Main Risk Card */}
              <div className={cn(
                "rounded-2xl border p-6 shadow-sm",
                getRiskColor(result.risk_level)
              )}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-3 rounded-xl text-white", getRiskBadge(result.risk_level))}>
                      {result.decision === Decision.FLAG ? <ShieldAlert size={28} /> : <ShieldCheck size={28} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider opacity-70">Risk Level</span>
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase", getRiskBadge(result.risk_level))}>
                          {result.risk_level}
                        </span>
                      </div>
                      <h3 className="text-2xl font-display font-bold">
                        {result.decision === Decision.FLAG ? "Potential Misinformation" : "Likely Safe Content"}
                      </h3>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium opacity-70">Confidence Score</div>
                    <div className="text-3xl font-display font-bold">{result.final_risk_score}%</div>
                  </div>
                </div>

                <div className="p-4 bg-white/50 rounded-xl border border-current/10">
                  <div className="flex items-start gap-3">
                    <MessageSquareWarning className="shrink-0 mt-1" size={20} />
                    <div>
                      <p className="font-bold text-sm uppercase tracking-wide mb-1">Warning Message</p>
                      <p className="text-lg leading-relaxed">{result.warning_message}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Analysis Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Claim & Context */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <h4 className="flex items-center gap-2 text-slate-900 font-bold mb-4">
                    <Search size={18} className="text-indigo-600" />
                    Source & Panic Analysis
                  </h4>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Detected Language</label>
                        <p className="text-slate-800 font-medium capitalize">{result.language}</p>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Source Type</label>
                        <p className="text-slate-800 font-medium text-xs">{result.source_type}</p>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Main Claim</label>
                      <p className="text-slate-800 leading-relaxed text-sm">{result.main_claim}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Panic Detected</label>
                        <p className={cn(
                          "text-xs font-bold px-2 py-0.5 rounded w-fit",
                          result.panic_detected === PanicDetected.YES ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"
                        )}>
                          {result.panic_detected}
                        </p>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Panic Type</label>
                        <p className="text-slate-800 font-medium text-xs">{result.panic_type}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Risk Metrics */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <h4 className="flex items-center gap-2 text-slate-900 font-bold mb-4">
                    <BarChart3 size={18} className="text-indigo-600" />
                    Public Safety Metrics
                  </h4>
                  <div className="space-y-5">
                    <MetricBar label="Misinformation Probability" value={result.misinformation_probability} color="bg-rose-500" />
                    <MetricBar label="Credibility Score" value={result.credibility_score} color="bg-indigo-500" />
                    <MetricBar label="Trend Probability" value={result.trend_probability} color="bg-amber-500" />
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Public Harm Risk</span>
                      <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase", getRiskBadge(result.public_harm_risk))}>
                        {result.public_harm_risk}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Credibility & Harm Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <h4 className="flex items-center gap-2 text-slate-900 font-bold mb-3">
                    <AlertTriangle size={18} className="text-indigo-600" />
                    Credibility & Trending
                  </h4>
                  <div className="space-y-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Credibility Level</span>
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase", getRiskBadge(result.credibility_level))}>
                          {result.credibility_level}
                        </span>
                      </div>
                      <p className="text-slate-800 text-sm font-medium">Source: {result.source_type}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Trending Risk</span>
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase", getRiskBadge(result.trending_risk))}>
                          {result.trending_risk}
                        </span>
                      </div>
                      <p className="text-slate-800 text-sm font-medium">Probability: {result.trend_probability}%</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <h4 className="flex items-center gap-2 text-slate-900 font-bold mb-3">
                    <ShieldAlert size={18} className="text-indigo-600" />
                    Public Harm Analysis
                  </h4>
                  <div className="space-y-3">
                    <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
                      <p className="text-rose-900 font-bold text-xs uppercase mb-1">Harm Type</p>
                      <p className="text-rose-800 font-medium">{result.public_harm_type}</p>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                      <p className="text-amber-900 font-bold text-xs uppercase mb-1">Panic Risk</p>
                      <p className="text-amber-800 font-medium">{result.panic_risk} ({result.panic_type})</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Voice Alerts Card */}
              <div className={cn(
                "rounded-2xl border p-6 shadow-sm",
                getVoiceToneColor(result.voice_alert.voice_tone)
              )}>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="flex items-center gap-2 font-bold">
                    <Volume2 size={20} />
                    Multilingual AI Voice Alerts
                  </h4>
                  {result.voice_alert.siren && (
                    <span className="text-sm font-bold animate-pulse px-3 py-1 bg-white/50 rounded-full border border-current/10">
                      {result.voice_alert.siren}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <VoiceAlertItem 
                    label="English" 
                    text={result.voice_alert.english} 
                    onPlay={() => playVoiceAlert(result.voice_alert.english, 'English')}
                    isPlaying={isPlaying === 'English'}
                  />
                  <VoiceAlertItem 
                    label="Hindi" 
                    text={result.voice_alert.hindi} 
                    onPlay={() => playVoiceAlert(result.voice_alert.hindi, 'Hindi')}
                    isPlaying={isPlaying === 'Hindi'}
                  />
                  <VoiceAlertItem 
                    label={result.voice_alert.language_used || "Regional"} 
                    text={result.voice_alert.regional_language} 
                    onPlay={() => playVoiceAlert(result.voice_alert.regional_language, result.voice_alert.language_used)}
                    isPlaying={isPlaying === result.voice_alert.language_used}
                  />
                </div>
              </div>

              {/* Correction Card */}
              <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-6 shadow-sm">
                <h4 className="flex items-center gap-2 text-emerald-900 font-bold mb-3">
                  <ShieldCheck size={18} className="text-emerald-600" />
                  Auto-Correction Generator
                </h4>
                <p className="text-emerald-800 text-sm leading-relaxed italic">
                  "{result.corrected_message}"
                </p>
                <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-emerald-600 uppercase">
                  <Info size={12} />
                  <span>Safer alternative for sharing</span>
                </div>
              </div>

              {/* Reasoning Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h4 className="flex items-center gap-2 text-slate-900 font-bold mb-3">
                  <Info size={18} className="text-indigo-600" />
                  Fact-Check Reasoning
                </h4>
                <p className="text-slate-700 leading-relaxed">
                  {result.reason}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Info */}
      <footer className="mt-20 border-t border-slate-200 py-10 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-slate-400 text-sm mb-2">
            Vishwaas AI uses advanced language models to analyze content. 
          </p>
          <p className="text-slate-500 text-xs font-medium">
            Always verify critical information with official sources.
          </p>
        </div>
      </footer>
    </div>
  );
}

function VoiceAlertItem({ label, text, onPlay, isPlaying }: { label: string; text: string; onPlay: () => void; isPlaying: boolean }) {
  return (
    <div className="bg-white/40 p-3 rounded-xl border border-current/10 flex flex-col justify-between">
      <div>
        <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1 block">{label}</span>
        <p className="text-sm font-medium leading-tight mb-3">{text}</p>
      </div>
      <button
        onClick={onPlay}
        disabled={isPlaying}
        className={cn(
          "flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-bold transition-all",
          isPlaying 
            ? "bg-indigo-100 text-indigo-600 animate-pulse" 
            : "bg-white hover:bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100"
        )}
      >
        {isPlaying ? <Volume2 size={14} className="animate-bounce" /> : <Play size={14} />}
        {isPlaying ? "Playing..." : "Listen"}
      </button>
    </div>
  );
}

function MetricBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
        <span className="text-sm font-bold text-slate-900">{value}%</span>
      </div>
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={cn("h-full rounded-full", color)}
        />
      </div>
    </div>
  );
}
