import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sun, Plus, Minus, PanelRight,
  Cpu, ShieldCheck, Activity, Layers,
  Box, Terminal, Info, RefreshCcw, LayoutGrid, Undo2,
  X, ChevronLeft, ChevronRight, Maximize2
} from 'lucide-react';
import { ViewState, GeneratedImages, AEPLSchema } from './types';
import { analyzeElevation } from './services/aiService';
import { generateElevationImages } from './services/imageGenService';
import UploadArea from './components/UploadArea';
import CrossGrid from './components/CrossGrid';

// ── Design Tokens (레퍼런스 사이트 동일) ────────────────────────────────────
// bg-white / bg-[#f0f0f0] canvas / border-black/10 / text-black / text-gray-600

// ── View Labels (라이트박스 순환용) ──────────────────────────────────────────
const VIEW_KEYS = ['front', 'rear', 'left', 'right', 'top'] as const;
const VIEW_LABELS: Record<string, string> = {
  front: 'FRONT',
  rear:  'REAR',
  left:  'LEFT',
  right: 'RIGHT',
  top:   'TOP (PLAN)',
};

// ── Image Lightbox ────────────────────────────────────────────────────────────
const ImageLightbox = ({
  label, img, images,
  onClose, onPrev, onNext,
}: {
  label: string; img: string; images: GeneratedImages;
  onClose: () => void; onPrev: () => void; onNext: () => void;
}) => {
  const currentKey = Object.entries(VIEW_LABELS).find(([, v]) => v === label)?.[0] ?? 'front';
  const currentIdx = VIEW_KEYS.indexOf(currentKey as typeof VIEW_KEYS[number]);

  // 키보드 단축키
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape')      onClose();
      else if (e.key === 'ArrowLeft')  onPrev();
      else if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, onPrev, onNext]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[500] bg-black/70 backdrop-blur-sm flex items-center justify-center"
      onClick={onClose}
    >
      {/* 패널 */}
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white rounded-[1.25rem] border border-black/10 shadow-2xl overflow-hidden flex flex-col"
        style={{ maxWidth: '88vw', maxHeight: '88vh' }}
      >
        {/* 상단 바 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-black/10 shrink-0">
          <div className="flex items-center gap-3">
            <Maximize2 size={13} className="text-black/40" />
            <span className="font-display font-bold text-sm tracking-[0.2em] uppercase text-black">
              {label}
            </span>
            <span className="font-mono text-[0.5rem] text-gray-400 tracking-widest uppercase">
              {currentIdx + 1} / {VIEW_KEYS.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-black/10 transition-colors"
          >
            <X size={14} className="text-black/60" />
          </button>
        </div>

        {/* 이미지 */}
        <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-[#f8f8f8] min-h-0">
          <AnimatePresence mode="wait">
            <motion.img
              key={img}
              src={img}
              alt={label}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18 }}
              className="max-w-full max-h-full object-contain"
              style={{ maxHeight: 'calc(88vh - 8rem)' }}
            />
          </AnimatePresence>

          {/* 좌우 네비게이션 */}
          <button
            onClick={onPrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-white/90 border border-black/10 shadow-sm hover:bg-white transition-colors"
          >
            <ChevronLeft size={16} className="text-black/60" />
          </button>
          <button
            onClick={onNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-white/90 border border-black/10 shadow-sm hover:bg-white transition-colors"
          >
            <ChevronRight size={16} className="text-black/60" />
          </button>
        </div>

        {/* 썸네일 바 */}
        <div className="flex items-center justify-center gap-2 px-5 py-3 border-t border-black/10 shrink-0">
          {VIEW_KEYS.map((key) => {
            const thumbLabel = VIEW_LABELS[key];
            const thumbImg   = images[key as keyof GeneratedImages];
            const isActive   = key === currentKey;
            return (
              <button
                key={key}
                onClick={() => {
                  /* label 변경은 부모에서 처리 — noop, 부모가 key 기준으로 관리 */
                  const idx = VIEW_KEYS.indexOf(key);
                  const diff = idx - currentIdx;
                  if (diff > 0) for (let i = 0; i < diff; i++) onNext();
                  else if (diff < 0) for (let i = 0; i < -diff; i++) onPrev();
                }}
                className={`relative w-14 h-10 rounded-[0.5rem] overflow-hidden border transition-all ${
                  isActive ? 'border-black shadow-sm' : 'border-black/10 opacity-50 hover:opacity-80'
                }`}
              >
                <img src={thumbImg} alt={thumbLabel} className="w-full h-full object-cover" />
                <span className="absolute bottom-0 left-0 right-0 text-center font-mono text-[0.4rem] bg-black/50 text-white py-0.5 tracking-widest uppercase">
                  {key}
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ── BIM Badge (light theme) ──────────────────────────────────────────────────
const BIMBadge = ({
  label, value, status,
}: { label: string; value: string | number; status?: 'locked' | 'active' | 'pending' }) => (
  <div className="flex flex-col gap-1 p-3 bg-black/5 border border-black/10 rounded-[0.75rem]">
    <div className="flex justify-between items-center">
      <span className="font-mono text-[10px] text-gray-400 uppercase tracking-widest">{label}</span>
      {status && (
        <div className={`w-1.5 h-1.5 rounded-full ${
          status === 'locked' ? 'bg-black' :
          status === 'active' ? 'bg-black animate-pulse' : 'bg-black/20'
        }`} />
      )}
    </div>
    <span className="font-sans text-sm font-medium text-black truncate">{value}</span>
  </div>
);

// ── Console Log (light theme) ─────────────────────────────────────────────────
const ConsoleLog = ({ logs }: { logs: string[] }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [logs]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto font-mono text-[10px] space-y-1.5 scrollbar-hide p-4 bg-white/80 rounded-[0.75rem] border border-black/10 shadow-sm backdrop-blur-sm"
    >
      {logs.map((log, i) => (
        <motion.div
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          key={i}
          className={`${
            log.startsWith('!') ? 'text-red-500' :
            log.startsWith('>') ? 'text-black font-medium' :
            'text-gray-500'
          }`}
        >
          <span className="mr-2 text-gray-300">
            [{new Date().toLocaleTimeString([], { hour12: false })}]
          </span>
          {log}
        </motion.div>
      ))}
    </div>
  );
};

// ── Toolbar Button ─────────────────────────────────────────────────────────────
const ToolBtn = ({
  onClick, active = false, disabled = false, children, title,
}: {
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
}) => (
  <button
    title={title}
    onClick={onClick}
    disabled={disabled}
    className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
      active
        ? 'bg-black text-white'
        : 'hover:bg-black/10 text-black/60 hover:text-black'
    }`}
  >
    {children}
  </button>
);

// ── SSE 구독 훅 ───────────────────────────────────────────────────────────────
const useSSELogs = (onLog: (msg: string) => void) => {
  useEffect(() => {
    const es = new EventSource('/api/stream');
    es.addEventListener('connected', () => {
      onLog('> SERVER STREAM CONNECTED');
    });
    es.addEventListener('log', (e) => {
      try {
        const { message } = JSON.parse(e.data) as { phase: string; message: string };
        onLog(message);
      } catch { /* ignore */ }
    });
    es.addEventListener('error', (e) => {
      try {
        const { message } = JSON.parse((e as MessageEvent).data ?? '{}') as { message: string };
        onLog(`! ${message}`);
      } catch { /* ignore */ }
    });
    return () => es.close();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [viewState, setViewState]           = useState<ViewState>('upload');
  const [uploadedImage, setUploadedImage]   = useState<string | null>(null);
  const [uploadedFile, setUploadedFile]     = useState<File | null>(null);
  const [prompt, setPrompt]                 = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<AEPLSchema | null>(null);
  const [logs, setLogs]                     = useState<string[]>(['SYSTEM READY. AWAITING INPUT IMAGE...']);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImages | null>(null);
  const [zoom, setZoom]                     = useState<number>(100);
  const [isSidebarOpen, setIsSidebarOpen]   = useState<boolean>(true);
  const [activeTab, setActiveTab]           = useState<'params' | 'materials' | 'inferred'>('params');
  const [lightboxKey, setLightboxKey]       = useState<typeof VIEW_KEYS[number] | null>(null);

  const addLog = (msg: string) => setLogs((prev: string[]) => [...prev, msg]);

  useSSELogs(addLog);

  const handleUpload = (file: File) => {
    setUploadedFile(file);
    setUploadedImage(URL.createObjectURL(file));
    addLog(`> IMAGE LOADED: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
  };

  const handleGenerate = async () => {
    if (!uploadedFile) return;
    setViewState('generating');
    setLogs(['INITIATING DETERMINISTIC BIM COMPILER V7...']);
    try {
      addLog('> CONNECTING TO PROTOCOL A ENGINE...');
      const result = await analyzeElevation(uploadedFile, prompt);
      setAnalysisResult(result);
      addLog('> HANDOVER TO PROTOCOL B: ENSEMBLE-PAIR SYNCHRONIZATION...');
      const images = await generateElevationImages(result, uploadedImage ?? '');
      setGeneratedImages(images);
      setTimeout(() => {
        addLog('> 5-VIEW SYNCHRONIZED OUTPUT COMPLETED.');
        setViewState('result');
      }, 800);
    } catch (error) {
      addLog(`! FATAL ERROR: ${error instanceof Error ? error.message : 'Unknown failure'}`);
      setTimeout(() => setViewState('upload'), 2500);
    }
  };

  const handleReset = () => {
    setViewState('upload');
    setUploadedImage(null);
    setUploadedFile(null);
    setAnalysisResult(null);
    setGeneratedImages(null);
    setLogs(['SYSTEM READY. AWAITING INPUT IMAGE...']);
  };

  return (
    <div className="w-screen h-dvh flex flex-col overflow-hidden bg-[#f0f0f0] text-black select-none">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="h-[3.375rem] shrink-0 flex items-center justify-between px-4 bg-white/90 border-b border-black/10 backdrop-blur-sm z-[200]">
        {/* 로고 + 타이틀 */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-black rounded-[0.75rem] flex items-center justify-center">
            <Cpu size={16} className="text-white" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-display font-bold text-[0.9375rem] tracking-tighter text-black leading-none">
              CAI ELEVATION
            </span>
            <span className="font-mono text-[0.5625rem] text-gray-400 uppercase tracking-widest">
              Deterministic BIM Compiler · V7.0.4
            </span>
          </div>
        </div>

        {/* 우측 상태 + 버튼 */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-4 font-mono text-[0.625rem] tracking-widest text-gray-400 uppercase">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
              API: STABLE
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-black inline-block" />
              PROTOCOL: AEPS-v4
            </span>
          </div>
          <div className="w-px h-4 bg-black/10" />
          {/* 줌 표시 */}
          <div className="flex items-center gap-1">
            <ToolBtn onClick={() => setZoom((z: number) => Math.max(10, z - 10))} title="Zoom Out">
              <Minus size={14} />
            </ToolBtn>
            <span className="font-mono text-[0.625rem] text-gray-500 w-9 text-center">{zoom}%</span>
            <ToolBtn onClick={() => setZoom((z: number) => Math.min(300, z + 10))} title="Zoom In">
              <Plus size={14} />
            </ToolBtn>
          </div>
          <div className="w-px h-4 bg-black/10" />
          <ToolBtn onClick={handleReset} title="Reset">
            <Undo2 size={16} />
          </ToolBtn>
          <ToolBtn title="Theme">
            <Sun size={16} />
          </ToolBtn>
        </div>
      </header>

      <main className="flex-1 flex relative overflow-hidden">

        {/* ── Left Floating Toolbar ─────────────────────────────────────────── */}
        <div
          className="absolute left-3 top-1/2 -translate-y-1/2 z-[150]"
          style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
        >
          <nav className="flex flex-col items-center gap-1 p-2 bg-white/80 border border-black/10 rounded-full backdrop-blur-sm">
            <ToolBtn
              onClick={() => setViewState('upload')}
              active={viewState === 'upload'}
              title="Upload"
            >
              <Layers size={18} />
            </ToolBtn>
            <div className="w-5 h-px bg-black/10 my-1" />
            <ToolBtn title="Layers">
              <Box size={18} />
            </ToolBtn>
            <ToolBtn title="Info">
              <Info size={18} />
            </ToolBtn>
          </nav>
        </div>

        {/* ── Canvas Area ───────────────────────────────────────────────────── */}
        <section className="flex-1 relative bg-[#f0f0f0] overflow-auto scrollbar-hide">
          <div className="fixed inset-0 canvas-grid-light opacity-60 pointer-events-none" />

          <AnimatePresence mode="wait">
            <motion.div
              key={viewState}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.01 }}
              transition={{ duration: 0.2 }}
              className="min-w-full min-h-full flex items-center justify-center"
              style={{ zoom: zoom / 100 }}
            >
              {viewState === 'upload' ? (
                <UploadArea onUpload={handleUpload} uploadedImage={uploadedImage} />
              ) : viewState === 'generating' ? (
                /* ── 생성 중 화면 ─── */
                <div className="flex flex-col items-center gap-8 w-full max-w-xl px-8">
                  {/* 스피너 */}
                  <div className="relative w-20 h-20">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      className="absolute inset-0 rounded-full border-2 border-black/10 border-t-black"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Cpu size={28} className="text-black" />
                    </div>
                  </div>
                  {/* 콘솔 */}
                  <div className="w-full h-[200px] flex flex-col">
                    <ConsoleLog logs={logs} />
                  </div>
                </div>
              ) : (
                generatedImages && analysisResult && (
                  <CrossGrid
                    images={generatedImages}
                    params={analysisResult}
                    onViewClick={(label) => {
                      const key = VIEW_KEYS.find((k) => VIEW_LABELS[k] === label) ?? 'front';
                      setLightboxKey(key);
                    }}
                  />
                )
              )}
            </motion.div>
          </AnimatePresence>

          {/* 하단 좌표 표시 */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-6 font-mono text-[0.5625rem] tracking-widest text-black/20 uppercase pointer-events-none">
            <span>Lat 37.5665° N</span>
            <span>Lon 126.9780° E</span>
            <span>Mode {viewState.toUpperCase()}</span>
          </div>
        </section>

        {/* ── Right Sidebar ─────────────────────────────────────────────────── */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 240 }}
              className="w-[17.75rem] shrink-0 bg-white border-l border-black/10 flex flex-col z-[160] overflow-hidden"
            >
              {/* 사이드바 헤더 */}
              <div className="h-[2.75rem] flex items-center gap-[0.75rem] px-4 border-b border-black/10 mb-[0.75rem]">
                <ShieldCheck size={14} className="text-black/40" />
                <span className="font-mono text-[0.625rem] font-medium tracking-widest text-gray-400 uppercase">
                  BIM Analysis Panel
                </span>
                <div className={`ml-auto w-1.5 h-1.5 rounded-full ${
                  viewState === 'result' ? 'bg-black' : viewState === 'generating' ? 'bg-black animate-pulse' : 'bg-black/20'
                }`} />
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-hide px-4 space-y-6 pb-4">

                {/* 시스템 상태 배지 */}
                <div className="grid grid-cols-2 gap-2">
                  <BIMBadge label="Mode" value="Deterministic" status={viewState === 'result' ? 'locked' : 'pending'} />
                  <BIMBadge label="Protocol" value="AEPS-v4" status={viewState === 'result' ? 'locked' : 'pending'} />
                </div>

                {/* 탭 */}
                <div className="flex border-b border-black/10">
                  {(['params', 'materials', 'inferred'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-2.5 font-mono text-[0.5625rem] uppercase tracking-widest transition-colors ${
                        activeTab === tab
                          ? 'text-black border-b-2 border-black'
                          : 'text-gray-400 hover:text-black'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* 탭 콘텐츠 */}
                <div className="min-h-[240px]">
                  {!analysisResult ? (
                    <div className="flex flex-col items-center justify-center h-full py-16 text-center space-y-3">
                      <Terminal size={32} className="text-black/10" />
                      <p className="font-mono text-[0.5625rem] uppercase tracking-widest text-gray-300">
                        Awaiting Analysis Data
                      </p>
                    </div>
                  ) : (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                      {activeTab === 'params' && (
                        <>
                          <BIMBadge label="Width (X)" value={`${analysisResult.width} Units`} />
                          <BIMBadge label="Height (Z)" value={`${analysisResult.height} Units`} />
                          <BIMBadge label="Depth (Y)" value={`${analysisResult.depth} Units`} />
                          <BIMBadge label="Void Ratio" value={`${(analysisResult.articulation.void_ratio * 100).toFixed(1)}%`} />
                        </>
                      )}
                      {activeTab === 'materials' && (
                        <>
                          <BIMBadge label="Main Facade" value={analysisResult.materials.base} />
                          <BIMBadge label="Glazing" value={analysisResult.materials.glass} />
                          <div className="p-3 bg-black/5 border border-black/10 rounded-[0.75rem] space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="font-mono text-[0.5625rem] text-gray-400 uppercase tracking-widest">PBR Properties</span>
                              <Activity size={10} className="text-black/40" />
                            </div>
                            {Object.entries(analysisResult.materials.pbr).map(([key, val]) => (
                              <div key={key} className="space-y-1">
                                <div className="flex justify-between font-mono text-[0.5625rem] text-gray-600 uppercase">
                                  <span>{key}</span>
                                  <span>{(val as number).toFixed(2)}</span>
                                </div>
                                <div className="w-full h-[3px] bg-black/10 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(val as number) * 100}%` }}
                                    className="h-full bg-black"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                      {activeTab === 'inferred' && (
                        <>
                          <BIMBadge label="Right Inferred" value={analysisResult.inferred_views.right} />
                          <BIMBadge label="Rear Logic" value={analysisResult.inferred_views.rear} />
                        </>
                      )}
                    </motion.div>
                  )}
                </div>

                {/* 프롬프트 입력 */}
                <div className="space-y-2">
                  <span className="font-mono text-[0.5625rem] text-gray-400 uppercase tracking-widest block">
                    Architectural Prompt
                  </span>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Inject additional architectural constraints..."
                    className="w-full h-[9.375rem] resize-none bg-white border border-black/10 rounded-[0.75rem] p-3 font-mono text-[0.75rem] text-black placeholder:text-gray-300 focus:outline-none focus:border-black/30 transition-colors"
                  />
                </div>
              </div>

              {/* Generate 버튼 */}
              <div className="p-4 border-t border-black/10 bg-white">
                <button
                  onClick={handleGenerate}
                  disabled={!uploadedFile || viewState === 'generating'}
                  className="w-full h-11 font-display font-medium tracking-widest uppercase text-[0.875rem] rounded-[0.75rem] transition-colors flex items-center justify-center gap-2 enabled:bg-black enabled:text-white disabled:bg-black/10 disabled:text-black/30 disabled:cursor-not-allowed hover:enabled:bg-neutral-800"
                >
                  {viewState === 'generating'
                    ? <><RefreshCcw className="animate-spin" size={16} /> COMPILING...</>
                    : <><LayoutGrid size={16} /> EXECUTE COMPILER</>
                  }
                </button>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* 사이드바 토글 버튼 */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
          className={`absolute top-1/2 -translate-y-1/2 z-[170] w-7 h-16 bg-white/80 hover:bg-white border border-black/10 rounded-full flex items-center justify-center backdrop-blur-sm transition-all duration-300 ${
            isSidebarOpen ? 'right-[17.75rem]' : 'right-3'
          }`}
        >
          <PanelRight size={14} className={`text-black/40 transition-transform ${isSidebarOpen ? '' : 'rotate-180'}`} />
        </button>

      </main>

      {/* ── Lightbox ───────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {lightboxKey && generatedImages && (
          <ImageLightbox
            label={VIEW_LABELS[lightboxKey]}
            img={generatedImages[lightboxKey]}
            images={generatedImages}
            onClose={() => setLightboxKey(null)}
            onPrev={() => {
              const idx = VIEW_KEYS.indexOf(lightboxKey);
              setLightboxKey(VIEW_KEYS[(idx - 1 + VIEW_KEYS.length) % VIEW_KEYS.length]);
            }}
            onNext={() => {
              const idx = VIEW_KEYS.indexOf(lightboxKey);
              setLightboxKey(VIEW_KEYS[(idx + 1) % VIEW_KEYS.length]);
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="h-8 shrink-0 bg-white border-t border-black/10 flex items-center px-4 justify-between">
        <div className="flex items-center gap-5 font-mono text-[0.5625rem] text-gray-400 uppercase tracking-widest">
          <span className="flex items-center gap-1.5">
            <Activity size={9} className="text-green-500" />
            Core: Online
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={9} className="text-black/40" />
            AEPL-Schema v7.0.4
          </span>
        </div>
        <span className="font-mono text-[0.5625rem] text-gray-300">
          © CRETE CO.,LTD. 2026. ALL RIGHTS RESERVED.
        </span>
      </footer>

    </div>
  );
}
