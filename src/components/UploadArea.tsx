import React from 'react';
import { Upload, Focus } from 'lucide-react';

interface UploadAreaProps {
  onUpload: (file: File) => void;
  uploadedImage: string | null;
}

export default function UploadArea({ onUpload, uploadedImage }: UploadAreaProps) {
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files[0]);
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center pointer-events-none">
      <div 
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="w-[600px] aspect-[4/3] rounded-[1.25rem] border border-dashed border-black/20 bg-white/50 hover:bg-white/80 backdrop-blur-sm transition-colors flex flex-col items-center justify-center relative group cursor-pointer overflow-hidden pointer-events-auto"
      >
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleChange} 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
        />
        
        <div className="absolute top-4 left-4 flex gap-1.5 opacity-50">
          <div className="w-2 h-2 border-t border-l border-black/50"></div>
        </div>
        <div className="absolute top-4 right-4 flex gap-1.5 opacity-50">
          <div className="w-2 h-2 border-t border-r border-black/50"></div>
        </div>
        <div className="absolute bottom-4 left-4 flex gap-1.5 opacity-50">
          <div className="w-2 h-2 border-b border-l border-black/50"></div>
        </div>
        <div className="absolute bottom-4 right-4 flex gap-1.5 opacity-50">
          <div className="w-2 h-2 border-b border-r border-black/50"></div>
        </div>

        {uploadedImage ? (
          <div className="w-full h-full relative">
            <img src={uploadedImage} alt="Uploaded architecture" className="w-full h-full object-contain grayscale" />
            <div className="absolute inset-0 bg-white/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
               <span className="font-display tracking-[0.1em] font-medium text-[1rem] z-10 flex items-center gap-2 pt-1 border border-black/20 rounded-full px-6 py-2 bg-black/10 backdrop-blur-sm text-black">
                 <Upload size={16} /> REPLACE TARGET
               </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-4 text-black/40 group-hover:text-black/70 transition-colors">
            <Focus size={40} className="mb-2 opacity-50 group-hover:opacity-100 transition-opacity" strokeWidth={1} />
            <div className="text-center space-y-1">
              <p className="font-display text-2xl tracking-[0.05em] uppercase">AWAITING 2D IMAGE</p>
              <p className="font-mono text-[0.65rem] opacity-70 uppercase tracking-widest text-[#555]">Master Extrusion Target required</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
