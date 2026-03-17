import { useState, useRef, useCallback } from "react";
import Icon from "@/components/ui/icon";

interface PhotoPin {
  id: string;
  lat: number;
  lng: number;
  address: string;
  originalName: string;
  renamedName: string;
  date: string;
  thumb: string;
}

const MOCK_PINS: PhotoPin[] = [
  {
    id: "1",
    lat: 55.751,
    lng: 37.618,
    address: "ул. Тверская, 1, Москва",
    originalName: "IMG_0042.jpg",
    renamedName: "Тверская_1_Москва_2024-03-10.jpg",
    date: "2024-03-10",
    thumb: "https://images.unsplash.com/photo-1513326738677-b964603b136d?w=200&q=80",
  },
  {
    id: "2",
    lat: 55.756,
    lng: 37.621,
    address: "Красная площадь, 1, Москва",
    originalName: "DSC_1201.jpg",
    renamedName: "Красная_площадь_1_Москва_2024-03-11.jpg",
    date: "2024-03-11",
    thumb: "https://images.unsplash.com/photo-1529154166925-574a0236a4f4?w=200&q=80",
  },
  {
    id: "3",
    lat: 55.745,
    lng: 37.609,
    address: "Арбат, 24, Москва",
    originalName: "PHOTO_003.jpg",
    renamedName: "Арбат_24_Москва_2024-03-12.jpg",
    date: "2024-03-12",
    thumb: "https://images.unsplash.com/photo-1520106212299-d99c443e4568?w=200&q=80",
  },
  {
    id: "4",
    lat: 55.762,
    lng: 37.632,
    address: "Чистые пруды, 6, Москва",
    originalName: "IMG_4411.jpg",
    renamedName: "Чистые_пруды_6_Москва_2024-03-14.jpg",
    date: "2024-03-14",
    thumb: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=200&q=80",
  },
  {
    id: "5",
    lat: 55.758,
    lng: 37.601,
    address: "Новый Арбат, 15, Москва",
    originalName: "RAW_0077.jpg",
    renamedName: "Новый_Арбат_15_Москва_2024-03-15.jpg",
    date: "2024-03-15",
    thumb: "https://images.unsplash.com/photo-1486299267070-83823f5448dd?w=200&q=80",
  },
];

const PIN_POSITIONS = [
  { top: "44%", left: "52%" },
  { top: "36%", left: "56%" },
  { top: "55%", left: "46%" },
  { top: "30%", left: "60%" },
  { top: "40%", left: "44%" },
];

function reverseGeocode(): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const streets = ["ул. Ленина", "пр. Мира", "ул. Садовая", "ул. Центральная", "пр. Победы"];
      const cities = ["Москва", "Санкт-Петербург", "Новосибирск"];
      const num = Math.floor(Math.random() * 50) + 1;
      const street = streets[Math.floor(Math.random() * streets.length)];
      const city = cities[Math.floor(Math.random() * cities.length)];
      resolve(`${street}, ${num}, ${city}`);
    }, 900);
  });
}

function formatRenamedFile(address: string, date: string, ext: string): string {
  const clean = address
    .replace(/,/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^а-яёА-ЯЁa-zA-Z0-9_]/g, "");
  return `${clean}_${date}${ext}`;
}

export default function Index() {
  const [pins, setPins] = useState<PhotoPin[]>(MOCK_PINS);
  const [selectedPin, setSelectedPin] = useState<PhotoPin | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filterDate, setFilterDate] = useState({ from: "", to: "" });
  const [filterRadius, setFilterRadius] = useState(50);
  const [filterAddress, setFilterAddress] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const filteredPins = pins.filter((p) => {
    if (filterDate.from && p.date < filterDate.from) return false;
    if (filterDate.to && p.date > filterDate.to) return false;
    if (filterAddress && !p.address.toLowerCase().includes(filterAddress.toLowerCase())) return false;
    return true;
  });

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const newPins: PhotoPin[] = [];
    for (const file of Array.from(files)) {
      const lat = 55.74 + Math.random() * 0.04;
      const lng = 37.59 + Math.random() * 0.06;
      const address = await reverseGeocode();
      const today = new Date().toISOString().split("T")[0];
      const ext = file.name.includes(".") ? "." + file.name.split(".").pop() : "";
      const renamedName = formatRenamedFile(address, today, ext);
      const thumb = URL.createObjectURL(file);
      newPins.push({ id: Date.now() + "_" + file.name, lat, lng, address, originalName: file.name, renamedName, date: today, thumb });
    }
    setPins((prev) => [...prev, ...newPins]);
    setUploading(false);
    setUploadOpen(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden font-golos" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b shrink-0 z-10" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--accent)" }}>
            <Icon name="MapPin" size={15} className="text-white" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight" style={{ color: "var(--text)" }}>GeoPhoto</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-full border" style={{ color: "var(--muted)", background: "var(--bg)", borderColor: "var(--border)" }}>
            {filteredPins.length} фото
          </span>
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={filterOpen
              ? { background: "var(--accent)", color: "white" }
              : { background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }
            }
          >
            <Icon name="SlidersHorizontal" size={13} />
            Фильтры
          </button>
          <button
            onClick={() => setUploadOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90"
            style={{ background: "var(--accent)", color: "white" }}
          >
            <Icon name="Upload" size={13} />
            Загрузить
          </button>
        </div>
      </header>

      {/* Filter bar */}
      {filterOpen && (
        <div className="border-b px-6 py-4 shrink-0 animate-fade-in" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>Дата от</label>
              <input type="date" value={filterDate.from} onChange={(e) => setFilterDate(f => ({ ...f, from: e.target.value }))} className="geo-input" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>Дата до</label>
              <input type="date" value={filterDate.to} onChange={(e) => setFilterDate(f => ({ ...f, to: e.target.value }))} className="geo-input" />
            </div>
            <div className="flex flex-col gap-1 min-w-[200px]">
              <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>Адрес содержит</label>
              <input type="text" placeholder="Тверская, Арбат..." value={filterAddress} onChange={(e) => setFilterAddress(e.target.value)} className="geo-input" />
            </div>
            <div className="flex flex-col gap-1 min-w-[180px]">
              <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>
                Радиус: <span style={{ color: "var(--accent)", fontWeight: 600 }}>{filterRadius} км</span>
              </label>
              <input type="range" min={1} max={200} value={filterRadius} onChange={(e) => setFilterRadius(Number(e.target.value))} className="w-full" style={{ accentColor: "var(--accent)" }} />
            </div>
            <button
              onClick={() => { setFilterDate({ from: "", to: "" }); setFilterAddress(""); setFilterRadius(50); }}
              className="flex items-center gap-1 text-xs transition-colors pb-0.5"
              style={{ color: "var(--muted)" }}
            >
              <Icon name="X" size={12} />
              Сбросить
            </button>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Map */}
        <div className="relative flex-1 overflow-hidden" style={{ background: "#111827" }}>
          {/* Grid */}
          <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.15 }}>
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#3b82f6" strokeWidth="0.6" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* Roads */}
          <svg className="absolute inset-0 w-full h-full">
            <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#1e2533" strokeWidth="22" />
            <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#1e2533" strokeWidth="22" />
            <line x1="15%" y1="0" x2="85%" y2="100%" stroke="#1a2030" strokeWidth="12" />
            <line x1="85%" y1="0" x2="15%" y2="100%" stroke="#1a2030" strokeWidth="12" />
            <line x1="0" y1="28%" x2="100%" y2="28%" stroke="#1a2030" strokeWidth="8" />
            <line x1="0" y1="72%" x2="100%" y2="72%" stroke="#1a2030" strokeWidth="8" />
            <circle cx="50%" cy="50%" r="140" fill="none" stroke="#1e2533" strokeWidth="18" />
            <circle cx="50%" cy="50%" r="70" fill="none" stroke="#1c2230" strokeWidth="10" />
            <rect x="38%" y="38%" width="24%" height="24%" rx="6" fill="#161c28" />
          </svg>

          {/* Map badge */}
          <div className="absolute top-4 left-4 text-xs px-3 py-1.5 rounded-lg border flex items-center gap-1.5" style={{ background: "rgba(13,17,23,0.75)", backdropFilter: "blur(8px)", color: "var(--muted)", borderColor: "var(--border)" }}>
            <Icon name="Map" size={11} />
            Москва и окрестности
          </div>

          {/* Zoom */}
          <div className="absolute bottom-6 right-4 flex flex-col gap-1">
            {["Plus", "Minus"].map((name) => (
              <button key={name} className="w-8 h-8 rounded-lg border flex items-center justify-center transition-all hover:opacity-80" style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}>
                <Icon name={name} size={14} />
              </button>
            ))}
          </div>

          {/* Locate */}
          <button className="absolute bottom-6 left-4 w-8 h-8 rounded-lg border flex items-center justify-center transition-all hover:opacity-80" style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--muted)" }}>
            <Icon name="LocateFixed" size={14} />
          </button>

          {/* Pins */}
          {filteredPins.map((pin, i) => {
            const pos = PIN_POSITIONS[i % PIN_POSITIONS.length];
            const sel = selectedPin?.id === pin.id;
            return (
              <button
                key={pin.id}
                onClick={() => setSelectedPin(sel ? null : pin)}
                style={{ top: pos.top, left: pos.left, transform: "translate(-50%,-100%)", position: "absolute", zIndex: sel ? 20 : 10 }}
                className={`transition-all duration-200 ${sel ? "scale-110" : "hover:scale-105"}`}
              >
                <div className="w-11 h-11 rounded-xl overflow-hidden border-2 shadow-lg transition-all"
                  style={{
                    borderColor: sel ? "var(--accent)" : "rgba(255,255,255,0.25)",
                    boxShadow: sel ? "0 0 18px rgba(59,130,246,0.5)" : undefined,
                  }}
                >
                  <img src={pin.thumb} alt={pin.address} className="w-full h-full object-cover" />
                </div>
                <div className="w-2 h-2 rounded-full mx-auto -mt-0.5" style={{ background: sel ? "var(--accent)" : "rgba(255,255,255,0.5)" }} />
              </button>
            );
          })}

          {/* Pin popup */}
          {selectedPin && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 rounded-2xl p-4 shadow-2xl w-72 z-30 animate-fade-in border"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <button onClick={() => setSelectedPin(null)} className="absolute top-3 right-3" style={{ color: "var(--muted)" }}>
                <Icon name="X" size={14} />
              </button>
              <div className="flex gap-3">
                <img src={selectedPin.thumb} alt={selectedPin.address} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                <div className="flex flex-col gap-1 min-w-0">
                  <p className="text-xs font-semibold leading-tight" style={{ color: "var(--text)" }}>{selectedPin.address}</p>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>{selectedPin.date}</p>
                  <div className="mt-1 flex flex-col gap-0.5">
                    <div className="flex items-center gap-1 text-[10px]" style={{ color: "var(--muted)" }}>
                      <Icon name="FileImage" size={10} />
                      <span className="truncate">{selectedPin.originalName}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-medium" style={{ color: "var(--accent)" }}>
                      <Icon name="Tag" size={10} />
                      <span className="truncate">{selectedPin.renamedName}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[10px] flex items-center gap-1" style={{ color: "var(--muted)" }}>
                  <Icon name="Navigation" size={10} />
                  {selectedPin.lat.toFixed(4)}, {selectedPin.lng.toFixed(4)}
                </span>
                <button className="text-[10px] font-medium flex items-center gap-0.5 hover:underline" style={{ color: "var(--accent)" }}>
                  <Icon name="Download" size={10} />
                  Скачать
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-72 border-l flex flex-col overflow-hidden shrink-0" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
            <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>Фотографии</span>
            <span className="text-xs" style={{ color: "var(--muted)" }}>{filteredPins.length} / {pins.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredPins.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center" style={{ color: "var(--muted)" }}>
                <Icon name="ImageOff" size={30} className="opacity-40" />
                <p className="text-xs">Нет фото по фильтрам</p>
              </div>
            ) : (
              filteredPins.map((pin) => {
                const sel = selectedPin?.id === pin.id;
                return (
                  <button
                    key={pin.id}
                    onClick={() => setSelectedPin(sel ? null : pin)}
                    className="w-full flex gap-3 p-3 border-b transition-colors text-left hover:opacity-90"
                    style={{
                      borderColor: "var(--border)",
                      background: sel ? "var(--bg)" : "transparent",
                      borderLeft: sel ? "2px solid var(--accent)" : "2px solid transparent",
                    }}
                  >
                    <img src={pin.thumb} alt={pin.address} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <p className="text-xs font-medium leading-tight truncate" style={{ color: "var(--text)" }}>{pin.address}</p>
                      <p className="text-[10px]" style={{ color: "var(--muted)" }}>{pin.date}</p>
                      <div className="flex items-center gap-1 text-[10px] mt-0.5" style={{ color: "var(--accent)" }}>
                        <Icon name="Tag" size={9} />
                        <span className="truncate">{pin.renamedName}</span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <div className="px-4 py-3 border-t" style={{ borderColor: "var(--border)" }}>
            <button
              onClick={() => setUploadOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity text-white"
              style={{ background: "var(--accent)" }}
            >
              <Icon name="Plus" size={14} />
              Добавить фото
            </button>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {uploadOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
          onClick={(e) => e.target === e.currentTarget && setUploadOpen(false)}
        >
          <div className="rounded-2xl p-6 w-full max-w-md shadow-2xl border animate-scale-in"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Загрузить фотографии</h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>Адрес определяется автоматически по GPS-координатам</p>
              </div>
              <button onClick={() => setUploadOpen(false)} style={{ color: "var(--muted)" }}>
                <Icon name="X" size={16} />
              </button>
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all"
              style={{
                borderColor: isDragging ? "var(--accent)" : "var(--border)",
                background: isDragging ? "rgba(59,130,246,0.07)" : "var(--bg)",
              }}
            >
              <div className="flex flex-col items-center gap-3">
                {uploading ? (
                  <>
                    <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
                    <p className="text-xs" style={{ color: "var(--muted)" }}>Определяю адреса по координатам...</p>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-xl border flex items-center justify-center" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
                      <Icon name="ImagePlus" size={22} style={{ color: "var(--accent)" }} />
                    </div>
                    <div>
                      <p className="text-xs font-medium" style={{ color: "var(--text)" }}>Перетащите фото или нажмите для выбора</p>
                      <p className="text-[10px] mt-1" style={{ color: "var(--muted)" }}>JPG, PNG, HEIC · до 20 МБ</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />

            <div className="mt-5 grid grid-cols-3 gap-3">
              {[
                { icon: "Upload", label: "Загрузка фото", num: "01" },
                { icon: "MapPin", label: "GPS → адрес", num: "02" },
                { icon: "Tag", label: "Переименование", num: "03" },
              ].map((s) => (
                <div key={s.num} className="flex flex-col items-center gap-2 p-3 rounded-xl border" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
                  <span className="text-[9px] font-bold" style={{ color: "var(--accent)" }}>{s.num}</span>
                  <Icon name={s.icon} size={16} style={{ color: "var(--muted)" }} />
                  <span className="text-[9px] text-center leading-tight font-medium" style={{ color: "var(--muted)" }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}