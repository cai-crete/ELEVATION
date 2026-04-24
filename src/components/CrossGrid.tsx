/**
 * src/components/CrossGrid.tsx
 * 5면 정사영 전개도 — Light Theme
 * template-layout.txt 비례 기준 (BASE_SCALE=40, GAP=80)
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Ruler, Box, ZoomIn } from 'lucide-react';
import type { GeneratedImages, AEPLSchema } from '../types';

interface CrossGridProps {
  images: GeneratedImages;
  params: AEPLSchema;
  onViewClick?: (label: string, img: string) => void;
}

const BASE_SCALE = 40;
const GAP        = 80;

export default function CrossGrid({ images, params, onViewClick }: CrossGridProps) {
  const W = params.width  * BASE_SCALE;
  const H = params.height * BASE_SCALE;
  const D = params.depth  * BASE_SCALE;

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gap: `${GAP}px`,
    gridTemplateColumns: `${H}px ${W}px ${H}px`,
    gridTemplateRows:    `${H}px ${D}px ${H}px`,
    gridTemplateAreas: `
      ". rear ."
      "left top right"
      ". front ."
    `,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '160px',
  };

  const ViewPanel = ({
    area, img, label, width, height, rotate, axis,
  }: {
    area: string; img: string; label: string;
    width: number; height: number; rotate: string; axis: string;
  }) => (
    <motion.div
      style={{ gridArea: area }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-center items-center group relative"
    >
      {/* 축 라벨 */}
      <div className="absolute -top-10 left-0 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
        <div className="w-1 h-1 rounded-full bg-black/40" />
        <span className="font-mono text-[0.5rem] text-black/40 tracking-widest uppercase">
          {axis} VALIDATED
        </span>
      </div>

      {/* 이미지 패널 */}
      <div
        onClick={() => onViewClick?.(label, img)}
        style={{
          width,
          height,
          transform: `rotate(${rotate})`,
          transformOrigin: 'center center',
        }}
        className={`relative bg-white border border-black/10 shadow-sm overflow-hidden rounded-[0.75rem] ${
          onViewClick ? 'cursor-zoom-in' : ''
        }`}
      >
        {/* 코너 마커 */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-black/20 rounded-tl-[0.75rem] z-10" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-black/20 rounded-br-[0.75rem] z-10" />

        <img
          src={img}
          alt={label}
          className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-all duration-500 scale-[1.02] group-hover:scale-100"
        />

        {/* 호버 오버레이 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none bg-black/5">
          {/* 치수 */}
          <div className="px-2.5 py-1 bg-white/90 backdrop-blur-sm rounded-full border border-black/10 shadow-sm flex items-center gap-1.5">
            <Ruler size={9} className="text-black/50" />
            <span className="font-mono text-[0.5rem] text-black/70">
              {(width / BASE_SCALE).toFixed(1)} × {(height / BASE_SCALE).toFixed(1)} UNITS
            </span>
          </div>
          {/* 클릭 힌트 */}
          {onViewClick && (
            <div className="px-2.5 py-1 bg-black/80 backdrop-blur-sm rounded-full flex items-center gap-1.5">
              <ZoomIn size={9} className="text-white" />
              <span className="font-mono text-[0.5rem] text-white/80 tracking-widest">CLICK TO INSPECT</span>
            </div>
          )}
        </div>

        {/* 뷰 라벨 */}
        <div className="absolute -bottom-10 left-0 w-full flex justify-center">
          <div className="flex flex-col items-center gap-0.5">
            <span className="font-display font-bold text-[0.625rem] tracking-[0.3em] uppercase text-black/50 leading-none">
              {label}
            </span>
            <div className="w-6 h-px bg-black/20" />
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-visible">
      {/* 축 표시 */}
      <div className="absolute left-16 bottom-16 flex flex-col gap-6 opacity-20 pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-px bg-black" />
          <span className="font-mono text-[0.5rem] tracking-widest uppercase text-black">X-Axis Master</span>
        </div>
        <div className="flex items-center gap-3 -rotate-90 origin-left translate-x-3">
          <div className="w-10 h-px bg-black" />
          <span className="font-mono text-[0.5rem] tracking-widest uppercase text-black">Z-Axis Master</span>
        </div>
      </div>

      {/* 십자형 그리드 */}
      <motion.div
        style={gridStyle}
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <ViewPanel area="top"   img={images.top}   label="TOP (PLAN)" width={W}  height={D}  rotate="0deg"   axis="TOP_Z"   />
        <ViewPanel area="front" img={images.front} label="FRONT"       width={W}  height={H}  rotate="0deg"   axis="FRONT_Y" />
        <ViewPanel area="rear"  img={images.rear}  label="REAR"        width={W}  height={H}  rotate="180deg" axis="REAR_Y"  />
        <ViewPanel area="left"  img={images.left}  label="LEFT"        width={D}  height={H}  rotate="90deg"  axis="LEFT_X"  />
        <ViewPanel area="right" img={images.right} label="RIGHT"       width={D}  height={H}  rotate="-90deg" axis="RIGHT_X" />
      </motion.div>

      {/* Global Spec 패널 */}
      <div
        className="absolute top-16 right-16 p-4 bg-white/80 border border-black/10 backdrop-blur-sm rounded-[0.75rem] shadow-sm flex flex-col gap-2"
        style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
      >
        <div className="flex items-center gap-2">
          <Box size={12} className="text-black/50" />
          <span className="font-mono text-[0.5625rem] text-black/60 font-medium uppercase tracking-widest">
            Global Spec
          </span>
        </div>
        <div className="w-full h-px bg-black/10" />
        <div className="space-y-0.5 font-mono text-[0.5rem] text-gray-400 uppercase">
          <div>W:{params.width}  D:{params.depth}  H:{params.height}</div>
          <div>Ratio: {(params.width / params.height).toFixed(2)}</div>
          <div>Void: {(params.articulation.void_ratio * 100).toFixed(0)}%</div>
          <div>AEPL v{params.aepl_schema_version}</div>
        </div>
      </div>
    </div>
  );
}
