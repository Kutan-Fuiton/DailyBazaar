import { useState, useEffect, useRef } from "react";
import { formatCurrency } from "../../../shared/utils";

export interface VoiceParsedItem {
  id: string;
  name: string;
  qty: number;
  unit: string;
  price: number;
}

interface VoiceLoggerProps {
  onAddItems: (items: VoiceParsedItem[]) => void;
}

// Convert common spoken numbers
const WORD_TO_NUMBER: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  half: 0.5,
  quarter: 0.25,
  dozen: 1,
};

function parseVoiceTranscript(text: string): VoiceParsedItem[] {
  if (!text.trim()) return [];

  // Split by connectors or punctuation
  const segments = text
    .toLowerCase()
    .replace(/\b(and|then|also|plus)\b/g, ",")
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const parsed: VoiceParsedItem[] = [];

  for (const segment of segments) {
    let clean = segment
      .replace(/\brupees\b|\brs\.?|\bbucks\b|\binr\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Look for price at the end or marked by price indicators: e.g. "for 50", "cost 50", or trailing number
    let price = 0;
    const priceMatch = clean.match(/(?:for|at|costs?|worth|rate)?\s*(\d+(?:\.\d+)?)\s*$/);
    if (priceMatch) {
      price = parseFloat(priceMatch[1]);
      clean = clean.substring(0, priceMatch.index).trim();
    }

    // Look for quantity and unit: e.g. "2 kg", "500 grams", "half kilo", "1 liter"
    let qty = 1;
    let unit = "piece";

    const qtyUnitMatch = clean.match(
      /^(\d+(?:\.\d+)?|half|quarter|one|two|three|four|five|six|seven|eight|nine|ten)?\s*(kg|kgs|kilo|kilos|gram|grams|g|gm|liter|liters|litre|litres|l|ml|piece|pieces|packet|packets|dozen|dozens)?\s*(.*)$/
    );

    let name = clean;
    if (qtyUnitMatch) {
      const rawQty = qtyUnitMatch[1];
      const rawUnit = qtyUnitMatch[2];
      const rest = qtyUnitMatch[3];

      if (rawQty) {
        qty = WORD_TO_NUMBER[rawQty] !== undefined ? WORD_TO_NUMBER[rawQty] : parseFloat(rawQty) || 1;
      }

      if (rawUnit) {
        if (/^(kg|kgs|kilo|kilos)$/.test(rawUnit)) unit = "kg";
        else if (/^(gram|grams|g|gm)$/.test(rawUnit)) unit = "g";
        else if (/^(liter|liters|litre|litres|l)$/.test(rawUnit)) unit = "L";
        else if (/^ml$/.test(rawUnit)) unit = "ml";
        else if (/^(dozen|dozens)$/.test(rawUnit)) unit = "dozen";
        else if (/^(packet|packets)$/.test(rawUnit)) unit = "packet";
        else unit = "piece";
      }

      if (rest && rest.trim()) {
        name = rest.trim();
      }
    }

    // Capitalize name
    name = name
      .replace(/^(of|for)\s+/, "")
      .split(" ")
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
      .join(" ")
      .trim();

    if (name) {
      parsed.push({
        id: `voice-${Date.now()}-${Math.random()}`,
        name,
        qty,
        unit,
        price,
      });
    }
  }

  return parsed;
}

export default function VoiceLogger({ onAddItems }: VoiceLoggerProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [parsedItems, setParsedItems] = useState<VoiceParsedItem[]>([]);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN"; // English (India) works great for Hinglish / Indian grocery items

    recognition.onresult = (event: any) => {
      let currentTranscript = "";
      for (let i = 0; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript + " ";
      }
      setTranscript(currentTranscript);
      const parsed = parseVoiceTranscript(currentTranscript);
      setParsedItems(parsed);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setTranscript("");
      setParsedItems([]);
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error("Failed to start speech recognition", err);
      }
    }
  };

  const handleCommit = () => {
    if (parsedItems.length === 0) return;
    onAddItems(parsedItems);
    setTranscript("");
    setParsedItems([]);
  };

  if (!isSupported) {
    return (
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-mono">
        <p className="font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-base">mic_off</span>
          Voice Recognition Not Supported
        </p>
        <p className="mt-1 text-white/60">
          Your browser does not support the Web Speech API. For speech dictation, please use Chrome,
          Edge, or Safari on desktop/mobile.
        </p>
      </div>
    );
  }

  return (
    <div
      className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/10"
      style={{
        background: "rgba(24,28,14,0.85)",
        backdropFilter: "blur(16px)",
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`material-symbols-outlined text-xl ${
                isListening ? "text-red-400 animate-pulse" : "text-lime-400"
              }`}
            >
              mic
            </span>
            <h3
              className="text-base font-black uppercase text-white tracking-wide"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Voice Expense Logger
            </h3>
          </div>
          <p className="text-xs text-[#8e9379] mt-0.5">
            Say: &quot;2 kg potato 50 rupees, 1 liter milk 62 rupees, 6 eggs 40&quot;
          </p>
        </div>

        <button
          onClick={toggleListening}
          className={`px-5 py-2.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
            isListening
              ? "bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse"
              : "bg-lime-400 text-[#111508] hover:brightness-110 shadow-lg shadow-lime-400/20"
          }`}
        >
          <span className="material-symbols-outlined text-base">
            {isListening ? "stop" : "mic"}
          </span>
          {isListening ? "Listening… Stop" : "Start Speaking"}
        </button>
      </div>

      {/* Live Audio Visualizer / Transcript */}
      <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 mb-4 min-h-[60px] flex flex-col justify-center">
        {transcript ? (
          <p className="text-sm text-lime-300 font-mono italic">
            &quot;{transcript}&quot;
          </p>
        ) : (
          <p className="text-xs text-white/30 font-mono">
            {isListening ? "Listening for groceries and prices…" : "Mic is off. Tap &apos;Start Speaking&apos; to dictate your haul."}
          </p>
        )}
      </div>

      {/* Parsed Preview Table */}
      {parsedItems.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] font-mono uppercase text-[#8e9379]">
            Recognized Items ({parsedItems.length})
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {parsedItems.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between"
              >
                <div>
                  <span className="text-xs font-bold text-white block">{item.name}</span>
                  <span className="text-[10px] font-mono text-white/50">
                    {item.qty} {item.unit}
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-lime-400">
                  {formatCurrency(item.price)}
                </span>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleCommit}
              className="px-5 py-2 rounded-xl bg-lime-400 text-[#111508] text-xs font-mono font-bold uppercase tracking-wider hover:brightness-110 flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">add_shopping_cart</span>
              Add {parsedItems.length} Items to Haul
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
