import { useState, useRef, useCallback, useEffect } from "react";
import Icon from "@/components/ui/icon";
import * as exifr from "exifr";

declare global {
  interface Window {
     
    ymaps: Record<string, unknown>;
  }
}

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
    id: "1", lat: 55.751, lng: 37.618,
    address: "ул. Тверская, 1, Москва",
    originalName: "IMG_0042.jpg",
    renamedName: "Тверская_1_Москва_2024-03-10.jpg",
    date: "2024-03-10",
    thumb: "https://images.unsplash.com/photo-1513326738677-b964603b136d?w=200&q=80",
  },
  {
    id: "2", lat: 55.756, lng: 37.621,
    address: "Красная площадь, 1, Москва",
    originalName: "DSC_1201.jpg",
    renamedName: "Красная_площадь_1_Москва_2024-03-11.jpg",
    date: "2024-03-11",
    thumb: "https://images.unsplash.com/photo-1529154166925-574a0236a4f4?w=200&q=80",
  },
  {
    id: "3", lat: 55.745, lng: 37.609,
    address: "Арбат, 24, Москва",
    originalName: "PHOTO_003.jpg",
    renamedName: "Арбат_24_Москва_2024-03-12.jpg",
    date: "2024-03-12",
    thumb: "https://images.unsplash.com/photo-1520106212299-d99c443e4568?w=200&q=80",
  },
  {
    id: "4", lat: 55.762, lng: 37.632,
    address: "Чистые пруды, 6, Москва",
    originalName: "IMG_4411.jpg",
    renamedName: "Чистые_пруды_6_Москва_2024-03-14.jpg",
    date: "2024-03-14",
    thumb: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=200&q=80",
  },
  {
    id: "5", lat: 55.758, lng: 37.601,
    address: "Новый Арбат, 15, Москва",
    originalName: "RAW_0077.jpg",
    renamedName: "Новый_Арбат_15_Москва_2024-03-15.jpg",
    date: "2024-03-15",
    thumb: "https://images.unsplash.com/photo-1486299267070-83823f5448dd?w=200&q=80",
  },
];

const GEOCODE_URL = "https://functions.poehali.dev/ba6f0fe7-873d-4bfc-92a7-6ca157f095d2";
const CONFIG_URL = "https://functions.poehali.dev/53cb4bf6-b695-4882-b4d6-e5ab077dc104";

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(`${GEOCODE_URL}?lat=${lat}&lng=${lng}`);
    const data = await res.json();
    return data.address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

async function getGpsFromExif(file: File): Promise<{ lat: number; lng: number } | null> {
  try {
    const gps = await exifr.gps(file);
    if (gps?.latitude && gps?.longitude) return { lat: gps.latitude, lng: gps.longitude };
    return null;
  } catch {
    return null;
  }
}

function formatRenamedFile(address: string, date: string, ext: string): string {
  const clean = address.replace(/,/g, "").replace(/\s+/g, "_").replace(/[^а-яёА-ЯЁa-zA-Z0-9_]/g, "");
  return `${clean}_${date}${ext}`;
}

function loadYandexMaps(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.ymaps) { resolve(); return; }
    const script = document.createElement("script");
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU`;
    script.onload = () => window.ymaps.ready(resolve);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function Index() {
  const [pins, setPins] = useState<PhotoPin[]>(MOCK_PINS);
  const [selectedPin, setSelectedPin] = useState<PhotoPin | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [filterDate, setFilterDate] = useState({ from: "", to: "" });
  const [filterRadius, setFilterRadius] = useState(50);
  const [filterAddress, setFilterAddress] = useState("");
  const [sortByPostal, setSortByPostal] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
   
  const ymapRef = useRef<Record<string, unknown> | null>(null);
   
  const markersRef = useRef<Map<string, Record<string, unknown>>>(new Map());

  const extractPostalCode = (address: string): string => {
    const match = address.match(/\b\d{6}\b/);
    return match ? match[0] : "000000";
  };

  const filteredPins = pins
    .filter((p) => {
      if (filterDate.from && p.date < filterDate.from) return false;
      if (filterDate.to && p.date > filterDate.to) return false;
      if (filterAddress && !p.address.toLowerCase().includes(filterAddress.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (!sortByPostal) return 0;
      return extractPostalCode(a.address).localeCompare(extractPostalCode(b.address));
    });

  // Инициализация карты
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(CONFIG_URL);
        const cfg = await res.json();
        if (!cfg.yandexMapsApiKey) { setMapError(true); return; }
        await loadYandexMaps(cfg.yandexMapsApiKey);
        if (cancelled || !mapRef.current) return;
        const map = new window.ymaps.Map(mapRef.current, {
          center: [55.751, 37.618],
          zoom: 12,
          controls: ["zoomControl", "geolocationControl"],
        }, {
          suppressMapOpenBlock: true,
        });
        ymapRef.current = map;
        setMapReady(true);
      } catch {
        setMapError(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Синхронизация пинов на карте
  useEffect(() => {
    if (!mapReady || !ymapRef.current) return;
    const map = ymapRef.current;

    // Удаляем старые маркеры которых нет в filteredPins
    const filteredIds = new Set(filteredPins.map((p) => p.id));
    markersRef.current.forEach((marker, id) => {
      if (!filteredIds.has(id)) {
        map.geoObjects.remove(marker);
        markersRef.current.delete(id);
      }
    });

    // Добавляем новые
    filteredPins.forEach((pin) => {
      if (markersRef.current.has(pin.id)) return;

      const placemark = new window.ymaps.Placemark(
        [pin.lat, pin.lng],
        {
          hintContent: pin.address,
          balloonContent: `
            <div style="font-family:'Golos Text',sans-serif;padding:4px;min-width:200px">
              <div style="position:relative;display:inline-block;width:100%">
                <img src="${pin.thumb}" style="width:100%;height:100px;object-fit:cover;border-radius:8px;margin-bottom:8px"/>
                <div style="position:absolute;bottom:12px;right:4px;font-size:28px;animation:dogDance 0.5s ease-in-out infinite alternate;">🐕</div>
              </div>
              <style>@keyframes dogDance{0%{transform:rotate(-15deg) translateY(0);}100%{transform:rotate(15deg) translateY(-6px);}}</style>
              <div style="font-size:12px;font-weight:600;color:#111;margin-bottom:2px">${pin.address}</div>
              <div style="font-size:11px;color:#888;margin-bottom:4px">${pin.date}</div>
              <div style="font-size:10px;color:#3b82f6;word-break:break-all">${pin.renamedName}</div>
            </div>
          `,
        },
        {
          iconLayout: "default#image",
          iconImageHref: pin.thumb,
          iconImageSize: [44, 44],
          iconImageOffset: [-22, -44],
          iconShape: { type: "Circle", coordinates: [0, 0], radius: 22 },
        }
      );

      placemark.events.add("click", () => {
        setSelectedPin((prev) => (prev?.id === pin.id ? null : pin));
      });

      map.geoObjects.add(placemark);
      markersRef.current.set(pin.id, placemark);
    });
  }, [filteredPins, mapReady]);

  // Центрирование на выбранном пине
  useEffect(() => {
    if (selectedPin && ymapRef.current) {
      ymapRef.current.panTo([selectedPin.lat, selectedPin.lng], { flying: true, duration: 500 });
    }
  }, [selectedPin]);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const newPins: PhotoPin[] = [];
    const fileArr = Array.from(files);

    for (let i = 0; i < fileArr.length; i++) {
      const file = fileArr[i];
      setUploadStatus(`Обрабатываю ${i + 1} из ${fileArr.length}: ${file.name}`);

      let lat: number;
      let lng: number;
      const exifGps = await getGpsFromExif(file);

      if (exifGps) {
        lat = exifGps.lat;
        lng = exifGps.lng;
      } else {
        // Если EXIF нет — используем центр Москвы + небольшой разброс
        lat = 55.74 + Math.random() * 0.04;
        lng = 37.59 + Math.random() * 0.06;
      }

      setUploadStatus(`Определяю адрес для ${file.name}...`);
      const address = await reverseGeocode(lat, lng);
      const today = new Date().toISOString().split("T")[0];
      const ext = file.name.includes(".") ? "." + file.name.split(".").pop() : "";
      const renamedName = formatRenamedFile(address, today, ext);
      const thumb = URL.createObjectURL(file);

      newPins.push({ id: `${Date.now()}_${i}`, lat, lng, address, originalName: file.name, renamedName, date: today, thumb });
    }

    setPins((prev) => [...prev, ...newPins]);
    setUploading(false);
    setUploadStatus("");
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
              className="flex items-center gap-1 text-xs transition-colors pb-0.5 hover:opacity-80"
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
        <div className="relative flex-1 overflow-hidden">
          {/* Яндекс.Карта */}
          <div ref={mapRef} className="w-full h-full" />

          {/* Загрузка карты */}
          {!mapReady && !mapError && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: "#111827" }}>
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
                <p className="text-xs" style={{ color: "var(--muted)" }}>Загружаю карту...</p>
              </div>
            </div>
          )}

          {/* Ошибка карты */}
          {mapError && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: "#111827" }}>
              <div className="flex flex-col items-center gap-3 text-center px-8">
                <Icon name="MapOff" size={32} style={{ color: "var(--muted)" }} />
                <p className="text-xs" style={{ color: "var(--muted)" }}>Не удалось загрузить карту.<br/>Проверьте API-ключ Яндекс.Карт.</p>
              </div>
            </div>
          )}

          {/* Инфобейдж */}
          {mapReady && (
            <div className="absolute top-4 left-4 text-xs px-3 py-1.5 rounded-lg border flex items-center gap-1.5 pointer-events-none"
              style={{ background: "rgba(13,17,23,0.75)", backdropFilter: "blur(8px)", color: "var(--muted)", borderColor: "var(--border)" }}
            >
              <Icon name="Map" size={11} />
              Яндекс.Карты · {filteredPins.length} точек
            </div>
          )}

          {/* Попап выбранного пина */}
          {selectedPin && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-2xl p-4 shadow-2xl w-80 z-30 animate-fade-in border"
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
                  {selectedPin.lat.toFixed(5)}, {selectedPin.lng.toFixed(5)}
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
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSortByPostal(v => !v)}
                title="Сортировка по почтовому индексу"
                className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg transition-colors"
                style={{
                  background: sortByPostal ? "var(--accent)" : "var(--bg)",
                  color: sortByPostal ? "#fff" : "var(--muted)",
                  border: "1px solid var(--border)",
                }}
              >
                <Icon name="ArrowUpDown" size={10} />
                Индекс
              </button>
              <span className="text-xs" style={{ color: "var(--muted)" }}>{filteredPins.length} / {pins.length}</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredPins.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center" style={{ color: "var(--muted)" }}>
                <Icon name="ImageOff" size={30} className="opacity-40" />
                <p className="text-xs">Нет фото по фильтрам</p>
              </div>
            ) : sortByPostal ? (
              (() => {
                const groups = filteredPins.reduce<Record<string, typeof filteredPins>>((acc, pin) => {
                  const code = extractPostalCode(pin.address);
                  const key = code === "000000" ? "Без индекса" : code;
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(pin);
                  return acc;
                }, {});
                return Object.entries(groups).map(([code, groupPins]) => (
                  <div key={code}>
                    <div className="px-4 py-1.5 flex items-center gap-2 sticky top-0 z-10" style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
                      <Icon name="MailOpen" size={11} style={{ color: "var(--accent)" }} />
                      <span className="text-[11px] font-semibold font-mono" style={{ color: "var(--accent)" }}>{code}</span>
                      <span className="text-[10px] ml-auto" style={{ color: "var(--muted)" }}>{groupPins.length} фото</span>
                    </div>
                    {groupPins.map((pin) => {
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
                    })}
                  </div>
                ));
              })()
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
                      <div className="flex items-center gap-2">
                        <p className="text-[10px]" style={{ color: "var(--muted)" }}>{pin.date}</p>
                        {extractPostalCode(pin.address) !== "000000" && (
                          <span className="text-[10px] font-mono px-1 rounded" style={{ background: "var(--bg)", color: "var(--muted)" }}>
                            {extractPostalCode(pin.address)}
                          </span>
                        )}
                      </div>
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
          onClick={(e) => e.target === e.currentTarget && !uploading && setUploadOpen(false)}
        >
          <div className="rounded-2xl p-6 w-full max-w-md shadow-2xl border animate-scale-in"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Загрузить фотографии</h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                  {uploading ? uploadStatus : "Адрес определяется автоматически по GPS из EXIF"}
                </p>
              </div>
              {!uploading && (
                <button onClick={() => setUploadOpen(false)} style={{ color: "var(--muted)" }}>
                  <Icon name="X" size={16} />
                </button>
              )}
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); if (!uploading) setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={!uploading ? handleDrop : undefined}
              onClick={() => !uploading && fileRef.current?.click()}
              className="border-2 border-dashed rounded-xl p-8 text-center transition-all"
              style={{
                borderColor: isDragging ? "var(--accent)" : "var(--border)",
                background: isDragging ? "rgba(59,130,246,0.07)" : "var(--bg)",
                cursor: uploading ? "default" : "pointer",
              }}
            >
              <div className="flex flex-col items-center gap-3">
                {uploading ? (
                  <>
                    <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
                      style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
                    />
                    <p className="text-xs" style={{ color: "var(--muted)" }}>{uploadStatus || "Обрабатываю..."}</p>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-xl border flex items-center justify-center" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
                      <Icon name="ImagePlus" size={22} style={{ color: "var(--accent)" }} />
                    </div>
                    <div>
                      <p className="text-xs font-medium" style={{ color: "var(--text)" }}>Перетащите фото или нажмите для выбора</p>
                      <p className="text-[10px] mt-1" style={{ color: "var(--muted)" }}>JPG, PNG, HEIC · GPS из EXIF читается автоматически</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />

            <div className="mt-5 grid grid-cols-3 gap-3">
              {[
                { icon: "Upload", label: "Загрузка фото", num: "01" },
                { icon: "MapPin", label: "GPS из EXIF", num: "02" },
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