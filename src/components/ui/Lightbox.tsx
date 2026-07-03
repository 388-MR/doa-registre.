import { useEffect, useCallback, useState } from 'react';
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';

interface LightboxProps {
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

export function Lightbox({ images, initialIndex = 0, onClose }: LightboxProps) {
  const [idx, setIdx] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);

  const prev = useCallback(() => { setIdx(i => (i - 1 + images.length) % images.length); setZoom(1); }, [images.length]);
  const next = useCallback(() => { setIdx(i => (i + 1) % images.length); setZoom(1); }, [images.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, prev, next]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const toggleZoom = () => setZoom(z => z === 1 ? 2 : 1);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.95)' }}
      onClick={onClose}
    >
      {/* Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10" onClick={e => e.stopPropagation()}>
        <button onClick={toggleZoom} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
          {zoom > 1 ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
        </button>
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Counter */}
      {images.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-xs text-white/50 bg-black/40 px-3 py-1 rounded-full">
          {idx + 1} / {images.length}
        </div>
      )}

      {/* Prev / Next */}
      {images.length > 1 && (
        <>
          <button
            onClick={e => { e.stopPropagation(); prev(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); next(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Image */}
      <div
        className="max-w-[90vw] max-h-[90vh] overflow-auto flex items-center justify-center"
        onClick={e => e.stopPropagation()}
        style={{ cursor: zoom > 1 ? 'zoom-out' : 'zoom-in' }}
        onDoubleClick={toggleZoom}
      >
        <img
          src={images[idx]}
          alt={`Image ${idx + 1}`}
          style={{
            transform: `scale(${zoom})`,
            transition: 'transform 0.2s ease',
            transformOrigin: 'center',
            maxWidth: zoom === 1 ? '90vw' : 'none',
            maxHeight: zoom === 1 ? '90vh' : 'none',
            objectFit: 'contain',
            borderRadius: 8,
          }}
        />
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2"
          onClick={e => e.stopPropagation()}
        >
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => { setIdx(i); setZoom(1); }}
              className={`w-10 h-10 rounded-lg overflow-hidden border-2 transition-all ${i === idx ? 'border-cyan-400 opacity-100' : 'border-transparent opacity-50 hover:opacity-75'}`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
