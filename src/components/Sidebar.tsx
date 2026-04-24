import React from 'react';
import { ViewState } from '../types';
import { Settings2, Download, TerminalSquare, Layers, ArchiveRestore, Database } from 'lucide-react';

interface SidebarProps {
  viewState: ViewState;
  onGenerate: (prompt: string) => void;
  onReset: () => void;
  isImageUploaded: boolean;
}

export default function Sidebar({ viewState, onGenerate, onReset, isImageUploaded }: SidebarProps) {
  const [prompt, setPrompt] = React.useState('');

  return (
    <aside className="fixed right-0 top-[56px] w-[18rem] h-[calc(100vh-56px)] bg-[#121212] border-l border-gray-800 flex flex-col z-40 p-6 overflow-y-auto">
      
      <div className="flex flex-col gap-6 flex-1">
        
        {/* Status Area */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-bebas text-lg tracking-[1px] text-white">SCHEMA MASTERY</span>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${viewState === 'generating' ? 'bg-white animate-pulse' : 'bg-gray-600'}`}></span>
              <span className="text-[10px] font-sans text-gray-400 uppercase font-semibold">
                {viewState === 'upload' ? 'IDLE' : viewState === 'generating' ? 'COMPILING' : 'LOCKED-ON'}
              </span>
            </div>
          </div>
          
          <div className="w-full bg-[#0a0a0a] rounded-box p-3 border border-gray-800 text-[11px] text-gray-400 font-mono space-y-1.5">
            <div className="flex justify-between items-center mb-1 pb-1 border-b border-gray-800">
              <span className="text-gray-300">1_Geometry_MASTER</span>
              <span className={viewState === 'result' ? 'text-green-500' : 'text-gray-500'}>
                {viewState === 'result' ? 'VALID' : 'PENDING'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">2_Property_SLAVE</span>
              <span className={viewState === 'result' ? 'text-green-500' : 'text-gray-500'}>
                {viewState === 'result' ? 'SYNCED' : 'PENDING'}
              </span>
            </div>
          </div>
        </div>

        {/* Prompt Input */}
        <div className="space-y-2">
           <span className="font-bebas text-lg tracking-[1px] text-white flex items-center gap-2">
             <TerminalSquare size={16} /> LOGIC PROMPT
           </span>
          <textarea 
            className="w-full h-24 bg-[#0a0a0a] border border-gray-800 rounded-box p-3 text-sm text-white focus:outline-none focus:border-gray-500 resize-none font-sans placeholder:text-gray-600"
            placeholder="Define material properties (e.g., Target Albedo: #D3A4...)"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={viewState !== 'upload'}
          />
        </div>

        {/* Global Settings */}
        <div className="space-y-2">
          <span className="font-bebas text-lg tracking-[1px] text-white flex items-center gap-2">
             <Settings2 size={16} /> GLOBAL CONSTANTS
          </span>
          <div className="grid grid-cols-2 gap-2">
             <div className="bg-[#0a0a0a] border border-gray-800 rounded-box p-2.5 text-center">
               <span className="block text-[10px] font-sans text-gray-500 uppercase font-semibold mb-1">ILLUMINATION</span>
               <span className="text-sm text-gray-200 font-medium">DIFFUSE</span>
             </div>
             <div className="bg-[#0a0a0a] border border-gray-800 rounded-box p-2.5 text-center">
               <span className="block text-[10px] font-sans text-gray-500 uppercase font-semibold mb-1">ALPHA BG</span>
               <span className="text-sm text-gray-200 font-medium">100% CUTOUT</span>
             </div>
          </div>
        </div>

        <div className="space-y-3 flex-grow">
          <span className="font-bebas text-lg tracking-[1px] text-white flex items-center gap-2 border-b border-gray-800 pb-2">
            <Database size={16} /> HISTORY
          </span>
          <div className="flex items-center gap-3 py-1">
            <div className="w-8 h-8 bg-[#1e1e1e] border border-gray-800 rounded"></div>
            <div className="text-[11px] text-gray-500 font-sans">
              <div className="text-gray-200 font-semibold text-xs">PROJECT_SEOUL_01</div>
              <div>2026.04.12 14:02</div>
            </div>
          </div>
          <div className="flex items-center gap-3 py-1">
            <div className="w-8 h-8 bg-[#1e1e1e] border border-gray-800 rounded"></div>
            <div className="text-[11px] text-gray-500 font-sans">
              <div className="text-gray-200 font-semibold text-xs">HQ_FAÇADE_RENO</div>
              <div>2026.04.11 09:45</div>
            </div>
          </div>
        </div>

      </div>

      {/* TIER CTAs */}
      <div className="pt-4 mt-auto space-y-3">
        {viewState !== 'result' ? (
          <button 
            onClick={() => onGenerate(prompt)}
            disabled={!isImageUploaded || viewState === 'generating'}
            className={`w-full py-4 rounded-full font-bebas text-xl tracking-widest transition-colors ${
              !isImageUploaded || viewState === 'generating' 
              ? 'bg-[#0a0a0a] text-gray-600 border border-gray-800 cursor-not-allowed' 
              : 'bg-black text-white border border-gray-600 hover:bg-gray-900 cursor-pointer shadow-lg'
            }`}
          >
            {viewState === 'generating' ? 'COMPILING...' : 'GENERATE'}
          </button>
        ) : (
          <>
            <button className="w-full py-3 rounded-full flex justify-center items-center gap-2 bg-[#0a0a0a] text-white border border-gray-700 hover:bg-[#1a1a1a] transition-colors font-bebas text-lg tracking-widest cursor-pointer">
              <Layers size={16} /> LINE ART MODE
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button className="py-2 px-3 rounded-full flex justify-center items-center gap-1.5 bg-[#0a0a0a] text-gray-300 border border-gray-800 hover:text-white hover:bg-gray-900 transition-colors font-bebas text-base tracking-widest cursor-pointer">
                <Download size={14} /> CROSS
              </button>
              <button 
                onClick={onReset}
                className="py-2 px-3 rounded-full flex justify-center items-center gap-1.5 bg-[#0a0a0a] text-gray-300 border border-gray-800 hover:text-white hover:bg-gray-900 transition-colors font-bebas text-base tracking-widest cursor-pointer"
              >
                <ArchiveRestore size={14} /> RESET
              </button>
            </div>
          </>
        )}
      </div>

    </aside>
  );
}
