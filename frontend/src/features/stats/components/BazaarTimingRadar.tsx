import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock } from "lucide-react";

const LIME = "#c3f400";
const MANGO = "#ffb86f";
const SURFACE_CARD = "rgba(22, 27, 12, 0.9)";
const BORDER_COLOR = "rgba(195, 244, 0, 0.16)";

interface DayInsight {
  day: string;
  fullName: string;
  variancePct: number;
  avgBasket: number;
  trafficLevel: "Low" | "Medium" | "Peak";
  bestTime: string;
  isOptimal?: boolean;
  isExpensive?: boolean;
  inference: string;
}

const DAYS_RADAR: DayInsight[] = [
  { day: "Mon", fullName: "Monday", variancePct: 2.1, avgBasket: 410, trafficLevel: "Medium", bestTime: "7:00 AM - 9:00 AM", inference: "Fresh morning mandi arrivals; steady rates" },
  { day: "Tue", fullName: "Tuesday", variancePct: -1.5, avgBasket: 395, trafficLevel: "Low", bestTime: "7:30 AM - 10:00 AM", inference: "Low consumer footfall; vendors open to bargaining" },
  { day: "Wed", fullName: "Wednesday", variancePct: -14.2, avgBasket: 345, trafficLevel: "Medium", bestTime: "6:30 AM - 8:30 AM", isOptimal: true, inference: "Mid-week wholesale clearance; lowest price of the week (-14.2%)" },
  { day: "Thu", fullName: "Thursday", variancePct: -6.8, avgBasket: 375, trafficLevel: "Low", bestTime: "8:00 AM - 10:30 AM", inference: "Stable post-clearance pricing; good variety" },
  { day: "Fri", fullName: "Friday", variancePct: 3.4, avgBasket: 415, trafficLevel: "Medium", bestTime: "7:00 AM - 9:00 AM", inference: "Pre-weekend inventory buildup; prices start firming" },
  { day: "Sat", fullName: "Saturday", variancePct: 16.5, avgBasket: 470, trafficLevel: "Peak", bestTime: "6:00 AM - 7:30 AM", isExpensive: true, inference: "Weekend household rush markup; highest prices (+16.5%)" },
  { day: "Sun", fullName: "Sunday", variancePct: 18.2, avgBasket: 480, trafficLevel: "Peak", bestTime: "6:00 AM - 7:00 AM", isExpensive: true, inference: "Heavy retail demand; premium rates on fish, meat & greens" },
];

export default function BazaarTimingRadar() {
  const [selectedDay, setSelectedDay] = useState<DayInsight>(DAYS_RADAR[2]); // Default Wednesday

  return (
    <div
      className="glass-card p-5 sm:p-6 rounded-2xl relative overflow-hidden mb-8"
      style={{
        background: SURFACE_CARD,
        border: `1px solid ${BORDER_COLOR}`,
        boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
      }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: "18px",
                fontWeight: 800,
                color: "#e2e4cf",
                letterSpacing: "-0.01em",
              }}
            >
              Bazaar Timing Radar & Day-of-Week Price Inferences
            </h3>
            <span
              className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider"
              style={{ background: "rgba(195,244,0,0.12)", color: LIME, border: "1px solid rgba(195,244,0,0.25)" }}
            >
              Wholesale Arbitrage
            </span>
          </div>
          <p style={{ fontSize: "12px", color: "#8e9379" }}>
            Inferred rate variance and mandi supply curves by day of the week
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 self-start sm:self-auto">
          <Calendar className="w-3.5 h-3.5 text-[#c3f400]" />
          <span className="text-xs font-mono font-bold text-[#c3f400]">Optimal Day: Wednesday (-14.2%)</span>
        </div>
      </div>

      {/* 7-DAY BAR RADAR GRID */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-3 mb-6">
        {DAYS_RADAR.map((item) => {
          const isSelected = selectedDay.day === item.day;
          const isCheapest = item.isOptimal;
          const isHighest = item.isExpensive;

          // Normalize height between 25% and 100%
          const hPct = Math.round(35 + ((item.avgBasket - 330) / (490 - 330)) * 65);

          return (
            <motion.div
              key={item.day}
              whileHover={{ y: -3 }}
              onClick={() => setSelectedDay(item)}
              className={`flex flex-col items-center justify-end p-2 sm:p-3 rounded-xl cursor-pointer transition-all ${
                isSelected
                  ? "bg-white/10 border-2 border-[#c3f400] shadow-lg shadow-[#c3f400]/20"
                  : "bg-white/5 border border-white/5 hover:bg-white/8"
              }`}
            >
              {/* Variance tag */}
              <span
                className={`text-[9px] sm:text-[10px] font-mono font-bold mb-1.5 ${
                  isCheapest ? "text-[#c3f400]" : isHighest ? "text-[#ffb86f]" : "text-[#8e9379]"
                }`}
              >
                {item.variancePct > 0 ? `+${item.variancePct}%` : `${item.variancePct}%`}
              </span>

              {/* Bar */}
              <div className="w-full max-w-[28px] sm:max-w-[36px] h-28 sm:h-32 flex items-end justify-center">
                <div
                  className="w-full rounded-t-md transition-all duration-300"
                  style={{
                    height: `${hPct}%`,
                    background: isCheapest
                      ? `linear-gradient(180deg, ${LIME} 0%, rgba(195,244,0,0.3) 100%)`
                      : isHighest
                      ? `linear-gradient(180deg, ${MANGO} 0%, rgba(255,184,111,0.2) 100%)`
                      : `linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.05) 100%)`,
                    boxShadow: isCheapest ? "0 0 12px rgba(195,244,0,0.4)" : "none",
                  }}
                />
              </div>

              {/* Day Label */}
              <span
                className="mt-2 text-xs font-mono font-bold block"
                style={{
                  color: isSelected ? "#e2e4cf" : isCheapest ? LIME : "#8e9379",
                }}
              >
                {item.day}
              </span>

              {/* Badge if optimal */}
              {isCheapest && (
                <span className="text-[8px] font-mono font-extrabold uppercase px-1 py-0.5 rounded bg-[#c3f400] text-black mt-1">
                  BEST
                </span>
              )}
              {isHighest && (
                <span className="text-[8px] font-mono font-extrabold uppercase px-1 py-0.5 rounded bg-[#ffb86f]/20 text-[#ffb86f] mt-1">
                  PEAK
                </span>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* SELECTED DAY INFERENCE DETAIL PANEL */}
      <div
        className="p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="flex items-start sm:items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-base flex-shrink-0"
            style={{
              background: selectedDay.isOptimal ? "rgba(195,244,0,0.15)" : selectedDay.isExpensive ? "rgba(255,184,111,0.15)" : "rgba(255,255,255,0.06)",
              color: selectedDay.isOptimal ? LIME : selectedDay.isExpensive ? MANGO : "#e2e4cf",
              fontFamily: "'Syne', sans-serif",
            }}
          >
            {selectedDay.day}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-[#e2e4cf]" style={{ fontFamily: "'Syne', sans-serif" }}>
                {selectedDay.fullName} Bazaar Behavior
              </h4>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                  selectedDay.isOptimal ? "bg-[#c3f400]/20 text-[#c3f400]" : selectedDay.isExpensive ? "bg-amber-500/20 text-amber-400" : "bg-white/10 text-white"
                }`}
              >
                Avg Basket: ₹{selectedDay.avgBasket}
              </span>
            </div>
            <p className="text-xs text-[#8e9379] mt-0.5">{selectedDay.inference}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono sm:text-right">
          <div>
            <span className="text-[10px] uppercase text-[#8e9379] block">Recommended Window</span>
            <div className="flex items-center gap-1 font-bold text-[#e2e4cf] mt-0.5">
              <Clock className="w-3.5 h-3.5 text-[#00dce5]" />
              <span>{selectedDay.bestTime}</span>
            </div>
          </div>

          <div>
            <span className="text-[10px] uppercase text-[#8e9379] block">Mandi Crowd</span>
            <span
              className={`font-bold mt-0.5 block ${
                selectedDay.trafficLevel === "Peak" ? "text-amber-400" : selectedDay.trafficLevel === "Low" ? "text-emerald-400" : "text-[#e2e4cf]"
              }`}
            >
              {selectedDay.trafficLevel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
