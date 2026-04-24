import React from 'react';
import { Layers } from 'lucide-react';

export default function Header() {
  return (
    <header className="fixed top-0 left-0 w-full h-[56px] bg-[#0a0a0a] border-b border-gray-800 z-50 flex items-center px-6 justify-between flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="bg-white text-black p-1 rounded-sm">
          <Layers size={18} strokeWidth={2.5} />
        </div>
        <h1 className="font-bebas text-xl tracking-[2px] mt-1 text-white">CAI CANVAS</h1>
        <div className="text-[12px] text-gray-500 font-sans ml-2 border-l border-gray-800 pl-4 hidden sm:block">
          IMAGE TO ELEVATION v7
        </div>
      </div>
      
      <div className="flex items-center gap-3 font-bebas text-white tracking-widest text-sm">
        <button className="px-5 py-1.5 bg-[#121212] border border-gray-700 rounded-full hover:bg-gray-800 transition-colors uppercase cursor-pointer">EXPORT</button>
        <button className="px-5 py-1.5 bg-[#121212] border border-gray-700 rounded-full hover:bg-gray-800 transition-colors uppercase cursor-pointer">LINE ART</button>
      </div>
    </header>
  );
}
