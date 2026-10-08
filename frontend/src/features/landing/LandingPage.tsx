/**
 * LandingPage.tsx — Vaniq Public Experience
 *
 * Features:
 * - Animated SVG world map that pans/zooms to user's detected geolocation
 * - Live location pin drop animation with ripple effect
 * - Commodity cards sorted by popularity (most → least bought)
 * - Floating air hover panels with detailed item info
 * - Auth-free public market radar backed by backend geolocation intelligence
 */

import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import {
  ArrowRight,
  Radio,
  MapPin,
  Search,
  Lock,
  TrendingDown,
  TrendingUp,
  Minus,
  CheckCircle2,
  Sparkles,
  ShoppingBag,
  Zap,
  Users,
  Receipt,
  Navigation,
  Info,
  BarChart2,
  Package,
  Tag,
  Menu,
  X,
} from "lucide-react";
import { intelligenceApi } from "../../shared/api/intelligence";
import type { PublicMarketRadarResponse, PublicMarketCommodity } from "../../shared/types";

const LIME  = "#c3f400";
const CYAN  = "#00dce5";
const MANGO = "#ffb86f";

const PRESET_MARKETS = [
  { name: "Gariahat Bazaar & Lake Market", area: "Kolkata, WB",   lat: 22.518, lng: 88.365 },
  { name: "Okhla Wholesale Mandi & INA",   area: "Delhi NCR",     lat: 28.535, lng: 77.274 },
  { name: "Dadar Wholesale & Crawford",    area: "Mumbai, MH",    lat: 19.018, lng: 72.843 },
  { name: "KR City Market & Russell",      area: "Bangalore, KA", lat: 12.965, lng: 77.576 },
  { name: "Rythu Bazaar",                  area: "Hyderabad, TS", lat: 17.385, lng: 78.486 },
];

/* ─── Map lat/lng → SVG coordinate (Mercator approx, viewBox 1000x500) ─── */
function latLngToSvg(lat: number, lng: number) {
  const x = ((lng + 180) / 360) * 1000;
  const y = ((90 - lat) / 180) * 500;
  return { x, y };
}

/* ─── Simplified continent SVG paths ─── */
const CONTINENT_PATHS = [
  { id: "NA", d: "M120 80 L100 100 L90 150 L110 200 L140 230 L170 240 L200 220 L230 200 L250 170 L240 130 L220 100 L180 80Z" },
  { id: "SA", d: "M190 260 L175 290 L180 340 L195 380 L210 410 L230 420 L250 400 L265 360 L260 310 L245 270 L220 255Z" },
  { id: "EU", d: "M440 60 L420 75 L410 95 L430 115 L460 120 L490 110 L510 90 L500 70 L470 55Z" },
  { id: "AF", d: "M440 140 L420 160 L415 210 L420 270 L440 320 L460 360 L490 370 L520 350 L535 300 L530 240 L520 180 L500 145 L470 130Z" },
  { id: "AS", d: "M510 50 L530 45 L600 55 L680 70 L750 90 L800 110 L820 140 L810 180 L770 200 L720 210 L680 205 L640 185 L600 160 L560 130 L530 110 L510 90Z" },
  { id: "IN", d: "M640 180 L630 200 L625 240 L640 280 L660 290 L680 270 L685 230 L675 190 L660 178Z", highlight: true },
  { id: "AU", d: "M750 280 L730 300 L735 340 L760 365 L800 370 L840 355 L855 320 L845 285 L820 268 L785 265Z" },
];

/* ══════════════════════════════════
   WorldMap component
══════════════════════════════════ */
interface WorldMapProps {
  targetLat: number | null;
  targetLng: number | null;
  isLocating: boolean;
  locationName: string;
}

function WorldMap({ targetLat, targetLng, isLocating, locationName }: WorldMapProps) {
  const [pinVisible, setPinVisible] = useState(false);
  const [pinPos, setPinPos]         = useState<{ x: number; y: number } | null>(null);
  const controls                    = useAnimation();

  useEffect(() => {
    if (targetLat !== null && targetLng !== null) {
      const { x, y } = latLngToSvg(targetLat, targetLng);
      setPinPos({ x, y });
      setPinVisible(false);

      const zoom = 3.8;
      const vw   = 1000 / zoom;
      const vh   = 500  / zoom;
      const vbX  = Math.max(0, Math.min(1000 - vw, x - vw / 2));
      const vbY  = Math.max(0, Math.min(500  - vh, y - vh / 2));

      controls.start({
        viewBox: `${vbX} ${vbY} ${vw} ${vh}`,
        transition: { duration: 1.5, ease: [0.16, 1, 0.3, 1] },
      });
      setTimeout(() => setPinVisible(true), 1000);
    } else {
      controls.start({ viewBox: "0 0 1000 500", transition: { duration: 1.0, ease: "easeInOut" } });
      setPinVisible(false);
    }
  }, [targetLat, targetLng, controls]);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl" style={{ height: 200 }}>
      {/* Vignette */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 55%, #0a0f04 100%)" }}
      />

      <motion.svg
        className="w-full h-full"
        style={{ background: "transparent" }}
        animate={controls}
        initial={{ viewBox: "0 0 1000 500" }}
      >
        <rect width={1000} height={500} fill="#0b1307" />

        {/* Grid lines */}
        {[0, 100, 200, 300, 400, 500].map((y) => (
          <line key={`h${y}`} x1={0} y1={y} x2={1000} y2={y} stroke="#162610" strokeWidth={0.6} />
        ))}
        {[0, 125, 250, 375, 500, 625, 750, 875, 1000].map((x) => (
          <line key={`v${x}`} x1={x} y1={0} x2={x} y2={500} stroke="#162610" strokeWidth={0.6} />
        ))}

        {/* Continents */}
        {CONTINENT_PATHS.map((c) => (
          <path
            key={c.id}
            d={c.d}
            fill={c.highlight ? "#1e3810" : "#152a0c"}
            stroke={c.highlight ? "#c3f40022" : "#1c3d0e"}
            strokeWidth={c.highlight ? 1.5 : 0.8}
          />
        ))}

        {/* Preset market ambient dots */}
        {PRESET_MARKETS.map((m) => {
          const { x, y } = latLngToSvg(m.lat, m.lng);
          return (
            <g key={m.area}>
              <circle cx={x} cy={y} r={3} fill={LIME} opacity={0.25} />
              <circle cx={x} cy={y} r={1.5} fill={LIME} opacity={0.6} />
            </g>
          );
        })}

        {/* Locating scan pulse */}
        {isLocating && (
          <motion.circle
            cx={500} cy={250} r={10}
            fill="none" stroke={CYAN} strokeWidth={1.5}
            animate={{ r: [10, 30, 10], opacity: [0.7, 0, 0.7] }}
            transition={{ repeat: Infinity, duration: 1.4, ease: "easeOut" }}
          />
        )}

        {/* Dropped pin + ripples */}
        {pinVisible && pinPos && (
          <g>
            {[1, 2, 3].map((ring) => (
              <motion.circle
                key={ring}
                cx={pinPos.x} cy={pinPos.y} r={6}
                fill="none" stroke={LIME} strokeWidth={0.9}
                initial={{ r: 6, opacity: 0.9 }}
                animate={{ r: 6 + ring * 16, opacity: 0 }}
                transition={{ repeat: Infinity, duration: 2.5, delay: ring * 0.55, ease: "easeOut" }}
              />
            ))}
            <motion.circle cx={pinPos.x} cy={pinPos.y} r={6} fill={LIME}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.45, ease: [0.16, 1.4, 0.3, 1] }}
            />
            <motion.circle cx={pinPos.x} cy={pinPos.y} r={2.4} fill="#0a0f04"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.4, delay: 0.18 }}
            />
          </g>
        )}
      </motion.svg>

      {/* Location label */}
      <AnimatePresence>
        {pinVisible && locationName && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-3 left-0 right-0 flex justify-center z-20"
          >
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-bold"
              style={{ background: "rgba(10,15,4,0.88)", border: `1px solid ${LIME}50`, color: LIME, backdropFilter: "blur(8px)" }}
            >
              <MapPin className="w-3 h-3" />
              {locationName}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════
   CommodityCard with floating hover panel
══════════════════════════════════ */
interface CommodityCardProps {
  item: PublicMarketCommodity;
  index: number;
  totalItems: number;
}

function CommodityCard({ item, index, totalItems }: CommodityCardProps) {
  const [hovered, setHovered] = useState(false);
  const cardRef               = useRef<HTMLDivElement>(null);
  const [panelSide, setPanelSide] = useState<"left" | "right">("right");

  const isFalling     = item.trend === "falling";
  const isRising      = item.trend === "rising";
  const popularityPct = Math.round(((totalItems - index) / totalItems) * 100);

  const handleMouseEnter = () => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      setPanelSide(rect.right + 272 > window.innerWidth ? "left" : "right");
    }
    setHovered(true);
  };

  const handleToggle = () => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      setPanelSide(rect.right + 272 > window.innerWidth ? "left" : "right");
    }
    setHovered((prev) => !prev);
  };

  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
  const trendColor = isFalling ? LIME : isRising ? "#ff6b6b" : "#8e9379";
  const trendChange =
    item.change_24h > 0
      ? `+₹${item.change_24h}`
      : item.change_24h < 0
      ? `-₹${Math.abs(item.change_24h)}`
      : "STABLE";

  return (
    <motion.div
      ref={cardRef}
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.045 }}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setHovered(false)}
      onClick={handleToggle}
    >
      {/* Card body */}
      <motion.div
        className="p-4 rounded-2xl border cursor-pointer select-none"
        animate={{
          background: hovered ? "rgba(195,244,0,0.035)" : "rgba(255,255,255,0.023)",
          borderColor: hovered ? "rgba(195,244,0,0.18)" : "rgba(255,255,255,0.05)",
          y: hovered ? -4 : 0,
          boxShadow: hovered
            ? "0 14px 44px rgba(0,0,0,0.55), 0 0 0 1px rgba(195,244,0,0.08)"
            : "0 2px 8px rgba(0,0,0,0.18)",
        }}
        transition={{ duration: 0.2 }}
      >
        {/* Top-3 rank badge */}
        {index < 3 && (
          <div
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black z-10"
            style={{ background: index === 0 ? LIME : index === 1 ? CYAN : MANGO, color: "#0a0f04" }}
          >
            #{index + 1}
          </div>
        )}

        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#8e9379] block">{item.category}</span>
            <h4 className="text-sm font-bold text-white mt-0.5">{item.name}</h4>
            <span className="text-[10px] text-[#8e9379]">{item.grade}</span>
          </div>

          <div className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold flex items-center gap-1 shrink-0 border ${
            isFalling ? "bg-lime-400/10 text-lime-400 border-lime-400/20"
            : isRising ? "bg-red-400/10 text-red-400 border-red-400/20"
            : "bg-white/5 text-[#8e9379] border-white/10"
          }`}>
            {isFalling ? <TrendingDown className="w-3 h-3" />
              : isRising ? <TrendingUp className="w-3 h-3" />
              : <Minus className="w-3 h-3" />}
            <span>{trendChange}</span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-white/5 flex items-baseline justify-between">
          <div>
            <span className="text-xl font-black" style={{ color: LIME, fontFamily: "'Syne', sans-serif" }}>
              ₹{item.price}
            </span>
            <span className="text-xs text-[#8e9379] font-mono ml-1">/ {item.unit}</span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] font-mono text-[#8e9379]">{popularityPct}% popular</span>
            <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${LIME}, ${CYAN})` }}
                initial={{ width: 0 }}
                animate={{ width: `${popularityPct}%` }}
                transition={{ duration: 0.9, delay: index * 0.05 }}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Floating Air Panel ── */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: isMobile ? 8 : 0, x: isMobile ? 0 : panelSide === "right" ? 10 : -10 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: isMobile ? 8 : 0, x: isMobile ? 0 : panelSide === "right" ? 10 : -10 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className={`absolute z-50 rounded-2xl p-4 pointer-events-none ${
              isMobile ? "top-full left-0 right-0 mt-2 w-full" : "top-0 w-64"
            }`}
            style={{
              ...(isMobile ? {} : { [panelSide === "right" ? "left" : "right"]: "calc(100% + 12px)" }),
              background: "rgba(14,18,7,0.97)",
              border: `1px solid ${LIME}22`,
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              boxShadow: `0 20px 64px rgba(0,0,0,0.75), 0 0 0 1px rgba(195,244,0,0.06), 0 0 32px rgba(195,244,0,0.04)`,
            }}
          >
            {/* Panel header */}
            <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-white/5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${LIME}14` }}>
                <Package className="w-4 h-4" style={{ color: LIME }} />
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-tight">{item.name}</p>
                <p className="text-[10px] font-mono text-[#8e9379] uppercase">{item.category}</p>
              </div>
            </div>

            {/* Price block */}
            <div className="mb-3 p-2.5 rounded-xl" style={{ background: `${LIME}08` }}>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black" style={{ color: LIME }}>₹{item.price}</span>
                <span className="text-xs font-mono text-[#8e9379]">per {item.unit}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 text-xs font-mono">
                <BarChart2 className="w-3 h-3 text-[#8e9379]" />
                <span className="text-[#8e9379]">Range:</span>
                <span className="text-[#e2e4cf] font-bold">{item.price_range}</span>
              </div>
            </div>

            {/* Detail rows */}
            <div className="flex flex-col gap-2 text-xs">
              {[
                { icon: Tag,          label: "Grade",        value: item.grade,   color: "#e2e4cf" },
                { icon: TrendingDown, label: "24h Change",   value: trendChange,  color: trendColor },
                { icon: Sparkles,     label: "Demand Rank",  value: `#${index + 1} of ${totalItems}`, color: CYAN },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[#8e9379]">
                    <Icon className="w-3 h-3" />
                    <span>{label}</span>
                  </div>
                  <span className="font-bold" style={{ color }}>{value}</span>
                </div>
              ))}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[#8e9379]">
                  <Info className="w-3 h-3" />
                  <span>Trend</span>
                </div>
                <span className="font-bold uppercase text-[10px] px-1.5 py-0.5 rounded"
                  style={{
                    background: isFalling ? `${LIME}18` : isRising ? "rgba(255,107,107,0.14)" : "rgba(255,255,255,0.06)",
                    color: trendColor,
                  }}
                >{item.trend}</span>
              </div>
            </div>

            {/* Auth note */}
            <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center gap-1.5 text-[10px] text-[#525740]">
              <Lock className="w-3 h-3" />
              <span>Sign in to log purchases & track history</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ══════════════════════════════════
   Main LandingPage
══════════════════════════════════ */
interface LandingPageProps {
  onOpenAuth: (initialTab?: "login" | "register") => void;
}

export default function LandingPage({ onOpenAuth }: LandingPageProps) {
  const [radarData,      setRadarData]      = useState<PublicMarketRadarResponse | null>(null);
  const [loadingRadar,   setLoadingRadar]   = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [searchQuery,    setSearchQuery]    = useState("");
  const [locating,       setLocating]       = useState(false);
  const [activeMarketName, setActiveMarketName] = useState("Central City Bazaar");
  const [geoCoords,      setGeoCoords]      = useState<{ lat: number; lng: number } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const loadMarketData = useCallback(async (lat?: number, lng?: number, marketName?: string) => {
    setLoadingRadar(true);
    try {
      const data = await intelligenceApi.getPublicMarketRadar(lat, lng, marketName);
      setRadarData(data);
      if (data.location_name)  setActiveMarketName(data.location_name);
      if (data.coordinates)    setGeoCoords(data.coordinates);
    } catch (err) {
      console.error("Public market fetch failed:", err);
    } finally {
      setLoadingRadar(false);
    }
  }, []);

  useEffect(() => { loadMarketData(); }, [loadMarketData]);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) { alert("Geolocation is not supported."); return; }
    setLocating(true);
    setGeoCoords(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => { loadMarketData(pos.coords.latitude, pos.coords.longitude); setLocating(false); },
      (err) => {
        console.warn("Location denied:", err);
        setLocating(false);
        const m = PRESET_MARKETS[0];
        loadMarketData(m.lat, m.lng, m.name);
      },
      { timeout: 8000 },
    );
  };

  const categories = useMemo(() => {
    if (!radarData?.commodities) return ["ALL"];
    const cats = Array.from(new Set(radarData.commodities.map((c) => c.category)));
    return ["ALL", ...cats];
  }, [radarData]);

  const filteredCommodities = useMemo(() => {
    if (!radarData?.commodities) return [];
    return radarData.commodities.filter((item) => {
      const matchCat    = categoryFilter === "ALL" || item.category.toUpperCase() === categoryFilter.toUpperCase();
      const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [radarData, categoryFilter, searchQuery]);

  return (
    <div className="min-h-screen text-[#e2e4cf] relative overflow-hidden font-sans select-none" style={{ background: "#0a0f04" }}>

      {/* Ambient gradients */}
      <div aria-hidden className="fixed inset-0 pointer-events-none z-0" style={{
        background: `
          radial-gradient(circle at 50% -10%, rgba(195,244,0,0.10) 0%, transparent 55%),
          radial-gradient(circle at 88% 42%,  rgba(0,220,229,0.06) 0%, transparent 45%),
          radial-gradient(circle at 12% 85%,  rgba(195,244,0,0.05) 0%, transparent 40%)
        `,
      }} />

      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-40 px-4 sm:px-6 py-3.5 backdrop-blur-xl border-b border-white/5"
        style={{ background: "rgba(10,15,4,0.92)" }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl font-black tracking-tight" style={{ fontFamily: "'Syne', sans-serif", color: LIME }}>
              VANIQ
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase tracking-wider"
              style={{ background: `${LIME}18`, border: `1px solid ${LIME}45`, color: LIME }}>
              v1.0
            </span>
          </div>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-5">
            <a href="#market-pulse"
              className="text-xs font-mono font-bold uppercase text-[#8e9379] hover:text-[#c3f400] transition-colors tracking-wider">
              Today's Bazaar Pulse
            </a>
            <a href="#features"
              className="text-xs font-mono font-bold uppercase text-[#8e9379] hover:text-[#c3f400] transition-colors tracking-wider">
              Features
            </a>
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => onOpenAuth("login")}
              className="px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5"
              style={{ background: `${LIME}15`, border: `1px solid ${LIME}45`, color: LIME }}>
              <span>Sign In</span><ArrowRight className="w-3.5 h-3.5" />
            </motion.button>
          </div>

          {/* Mobile three-dash collapsible toggle button & quick sign-in */}
          <div className="flex md:hidden items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => onOpenAuth("login")}
              className="px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1"
              style={{ background: `${LIME}15`, border: `1px solid ${LIME}35`, color: LIME }}>
              <span>Sign In</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => setMobileMenuOpen((o) => !o)}
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/[0.06] border border-white/10 text-[#e2e4cf] hover:text-[#c3f400] hover:border-[#c3f400]/40 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </motion.button>
          </div>
        </div>

        {/* Collapsible Mobile Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="md:hidden overflow-hidden border-t border-white/5 mt-3 pt-3 pb-2 space-y-1.5"
            >
              <a
                href="#market-pulse"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-[#e2e4cf] hover:text-[#c3f400] hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Radio className="w-3.5 h-3.5 text-[#00dce5] animate-pulse" />
                  <span>Today's Bazaar Pulse</span>
                </div>
                <ArrowRight className="w-3 h-3 text-[#8e9379]" />
              </a>

              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-[#8e9379] hover:text-[#c3f400] hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#c3f400]" />
                  <span>Features</span>
                </div>
                <ArrowRight className="w-3 h-3 text-[#8e9379]" />
              </a>

              <div className="pt-2 mt-1 border-t border-white/5 flex flex-col gap-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth("register");
                  }}
                  className="w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5"
                  style={{ background: LIME, color: "#0a0f04", fontFamily: "'Syne', sans-serif" }}
                >
                  <span>Get Started Free</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── Body ── */}
      <div className="relative z-10 pt-28 pb-20 px-4 sm:px-6 max-w-7xl mx-auto">

        {/* ── Hero ── */}
        <section className="text-center py-12 md:py-20 flex flex-col items-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-6 bg-white/5 border border-white/10">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: LIME }} />
            <span className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: LIME }}>
              Wet Market & Daily Mandi Intelligence
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.1 }}
            className="text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-tight max-w-4xl leading-[1.05]"
            style={{ fontFamily: "'Syne', sans-serif" }}>
            Don't Guess The Market.{" "}
            <span style={{ background: `linear-gradient(135deg, ${LIME} 0%, ${CYAN} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Master It.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.2 }}
            className="mt-6 text-base sm:text-lg max-w-2xl text-[#8e9379] leading-relaxed">
            Crowdsourced commodity price tracking across regional wet markets, instant receipt OCR extraction, and real-time collaborative shopping list sync.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.3 }}
            className="mt-9 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0 12px 40px rgba(195,244,0,0.45)" }} whileTap={{ scale: 0.97 }}
              onClick={() => onOpenAuth("register")}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2"
              style={{ background: LIME, color: "#0a0f04", boxShadow: "0 8px 30px rgba(195,244,0,0.28)", fontFamily: "'Syne', sans-serif" }}>
              <span>Get Started</span><ArrowRight className="w-4 h-4" />
            </motion.button>
            <motion.a
              href="#market-pulse"
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2.5"
              style={{ background: `${CYAN}10`, border: `1px solid ${CYAN}40`, color: CYAN, fontFamily: "'Space Mono', monospace" }}>
              <Radio className="w-4 h-4 animate-pulse" /><span>Today's Bazaar Pulse</span>
            </motion.a>
          </motion.div>

          {/* Expanded stats strip with rich hover micro-interactions */}
          <motion.div
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.4 }}
            className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5 w-full max-w-5xl">
            {[
              { label: "Commodities Tracked",  value: "48+",    unit: "",    color: LIME, icon: ShoppingBag },
              { label: "Wet Market Locations", value: "5 Hubs",  unit: "+ GPS", color: CYAN, icon: MapPin },
              { label: "Live WebSocket Sync",  value: "< 20ms", unit: "",    color: LIME, icon: Zap },
              { label: "Est. Household Savings", value: "₹2,400", unit: "/mo", color: CYAN, icon: Sparkles },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 + i * 0.07, duration: 0.45 }}
                whileHover={{
                  y: -6,
                  scale: 1.025,
                  boxShadow: `0 18px 38px -10px rgba(0,0,0,0.7), 0 0 24px -2px ${stat.color}35`,
                  borderColor: `${stat.color}50`,
                  backgroundColor: "rgba(255,255,255,0.06)",
                }}
                className="group relative px-5 py-6 sm:px-6 sm:py-7 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col items-center justify-between text-center cursor-pointer transition-colors duration-300 backdrop-blur-md overflow-hidden min-h-[146px]"
              >
                {/* Subtle top spotlight glow on hover */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{
                    background: `radial-gradient(circle at 50% 0%, ${stat.color}20 0%, transparent 70%)`,
                  }}
                />

                <div className="relative z-10 p-2.5 rounded-xl mb-3 bg-white/[0.04] group-hover:bg-white/[0.08] group-hover:scale-110 transition-all duration-300">
                  <stat.icon className="w-5 h-5 transition-transform duration-300 group-hover:rotate-6" style={{ color: stat.color }} />
                </div>

                <div className="relative z-10 w-full flex items-baseline justify-center gap-1 overflow-hidden px-1">
                  <span
                    className="text-2xl sm:text-3xl font-black tracking-tight leading-none truncate"
                    style={{ fontFamily: "'Syne', sans-serif", color: stat.color }}
                  >
                    {stat.value}
                  </span>
                  {stat.unit && (
                    <span
                      className="text-xs sm:text-sm font-bold tracking-tight font-mono opacity-85 shrink-0"
                      style={{ color: stat.color }}
                    >
                      {stat.unit}
                    </span>
                  )}
                </div>

                <span className="relative z-10 text-[10px] sm:text-xs uppercase tracking-wider font-mono text-[#8e9379] mt-2 group-hover:text-[#c5cba9] transition-colors leading-tight">
                  {stat.label}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ── Bazaar Pulse section ── */}
        <section id="market-pulse" className="pt-12 pb-24 scroll-mt-24">
          <div className="rounded-3xl border border-white/8 shadow-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.015)" }}>

            {/* Header */}
            <div className="p-6 sm:p-8 border-b border-white/6">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: LIME }} />
                    <span className="text-[11px] font-mono font-bold uppercase tracking-widest" style={{ color: LIME }}>
                      Authentication-Free Live Feed
                    </span>
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-[#e2e4cf]" style={{ fontFamily: "'Syne', sans-serif" }}>
                    Today's Bazaar Pulse
                  </h2>
                  <p className="text-xs sm:text-sm text-[#8e9379] mt-1">
                    Real-time mandi benchmarks for your location. Hover any card for full details.
                  </p>
                </div>

                {/* Location controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={handleUseMyLocation} disabled={locating}
                    className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50"
                    style={{ background: LIME, color: "#0a0f04" }}>
                    <Navigation className="w-3.5 h-3.5" />
                    <span>{locating ? "Locating..." : "Use My Location"}</span>
                  </motion.button>

                  <div className="flex items-center gap-1 flex-wrap">
                    {PRESET_MARKETS.slice(0, 3).map((m) => (
                      <motion.button
                        key={m.area} whileHover={{ scale: 1.04 }}
                        onClick={() => { setGeoCoords({ lat: m.lat, lng: m.lng }); loadMarketData(m.lat, m.lng, m.name); }}
                        className="px-3 py-1.5 rounded-xl text-[11px] font-mono font-bold transition-all border"
                        style={{
                          background: activeMarketName.includes(m.area.split(",")[0]) ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)",
                          borderColor: activeMarketName.includes(m.area.split(",")[0]) ? `${LIME}50` : "rgba(255,255,255,0.05)",
                          color: activeMarketName.includes(m.area.split(",")[0]) ? LIME : "#8e9379",
                        }}>
                        {m.area.split(",")[0]}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* World Map */}
            <div className="px-6 sm:px-8 pt-6">
              <WorldMap
                targetLat={geoCoords?.lat ?? null}
                targetLng={geoCoords?.lng ?? null}
                isLocating={locating}
                locationName={radarData?.location_name ?? ""}
              />
            </div>

            {/* Active market banner */}
            <div className="px-6 sm:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4" style={{ color: LIME }} />
                <span className="text-sm font-bold text-white">{radarData?.location_name || activeMarketName}</span>
                <span className="text-xs font-mono text-[#8e9379]">({radarData?.location_area || "Live Index"})</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono text-[#8e9379]">
                <span className="inline-flex items-center gap-1" style={{ color: LIME }}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verified Today
                </span>
                <span>Session: Morning Mandi</span>
              </div>
            </div>

            {/* Filters & Search */}
            <div className="px-6 sm:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-white/5">
              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                {categories.map((cat) => (
                  <motion.button
                    key={cat} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                    onClick={() => setCategoryFilter(cat)}
                    className="px-3 py-1 rounded-lg text-xs font-mono font-bold uppercase shrink-0 border"
                    style={{
                      background: categoryFilter === cat ? LIME : "rgba(255,255,255,0.04)",
                      color: categoryFilter === cat ? "#0a0f04" : "#8e9379",
                      borderColor: categoryFilter === cat ? "transparent" : "rgba(255,255,255,0.05)",
                    }}>
                    {cat}
                  </motion.button>
                ))}
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-[#8e9379] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search commodity (e.g. Tomato)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none"
                  style={{ background: "rgba(0,0,0,0.32)", border: "1px solid rgba(255,255,255,0.08)" }}
                />
              </div>
            </div>

            {/* Commodity grid */}
            <div className="px-6 sm:px-8 py-6">
              {loadingRadar ? (
                <div className="py-16 flex flex-col items-center gap-4">
                  <svg className="animate-spin w-10 h-10" viewBox="0 0 24 24" fill="none" stroke={LIME} strokeWidth="2">
                    <circle cx="12" cy="12" r="10" className="opacity-20" />
                    <path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                  <p className="text-sm font-mono text-[#8e9379]">Scanning live regional market rates...</p>
                </div>
              ) : filteredCommodities.length === 0 ? (
                <div className="py-12 text-center text-sm text-[#8e9379]">
                  No commodities found matching "{searchQuery}".
                </div>
              ) : (
                <>
                  <p className="text-[11px] font-mono text-[#525740] uppercase tracking-wider mb-4">
                    Sorted by demand — most popular first · {filteredCommodities.length} items
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {filteredCommodities.map((item, idx) => (
                      <CommodityCard key={item.id} item={item} index={idx} totalItems={filteredCommodities.length} />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Guest CTA */}
            <div className="px-6 sm:px-8 pb-8">
              <div className="p-5 rounded-2xl border border-[#c3f400]/18 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                style={{ background: "linear-gradient(90deg, rgba(195,244,0,0.06) 0%, rgba(0,220,229,0.05) 100%)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${LIME}16`, color: LIME }}>
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white uppercase" style={{ fontFamily: "'Syne', sans-serif" }}>
                      Viewing Public Guest Radar
                    </h4>
                    <p className="text-xs text-[#8e9379]">
                      Sign in to log receipts, track spending, and sync shopping lists with your household live.
                    </p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  onClick={() => onOpenAuth("register")}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 whitespace-nowrap"
                  style={{ background: LIME, color: "#0a0f04" }}>
                  <span>Unlock Full Access</span><ArrowRight className="w-3.5 h-3.5" />
                </motion.button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section id="features" className="py-12 border-t border-white/5">
          <div className="text-center mb-12">
            <h3 className="text-2xl sm:text-3xl font-black uppercase text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
              Engineered For The Wet Market
            </h3>
            <p className="text-sm text-[#8e9379] mt-1">
              Personal finance software that actually understands wrinkled bills and daily bargaining.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Receipt,  title: "Wrinkled Receipt OCR",    desc: "AI vision parser tailored for handwritten chits, thermal rolls, and informal merchant receipts.", color: CYAN },
              { icon: Users,    title: "Household Live Sync",     desc: "8-digit unique user tags for seamless invites. Real-time collaborative shopping list over WebSockets.", color: LIME },
              { icon: Sparkles, title: "Crowdsourced Price Radar",desc: "Anonymized community data tells you whether today's tomato or potato price is lower than yesterday.", color: MANGO },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ y: -4 }}
                className="p-6 rounded-3xl border border-white/5 flex flex-col"
                style={{ background: "rgba(255,255,255,0.02)" }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: `${feature.color}14`, color: feature.color }}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2" style={{ fontFamily: "'Syne', sans-serif" }}>{feature.title}</h4>
                <p className="text-xs sm:text-sm text-[#8e9379] leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="mt-20 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-[#8e9379]">
          <p>© 2026 VANIQ · Hyper-fast Financial Intelligence.</p>
          <div className="flex items-center gap-4">
            <button onClick={() => onOpenAuth("login")} className="hover:text-white transition-colors">Sign In</button>
            <span>·</span>
            <button onClick={() => onOpenAuth("register")} className="hover:text-white transition-colors">Register</button>
          </div>
        </footer>
      </div>
    </div>
  );
}
