import { useRef, useState } from 'react';
import { Upload, X, ImageIcon } from 'lucide-react';
import { Lightbox } from './Lightbox';

interface ImageUploadProps {
  value: string | null | undefined;
  onChange: (dataUrl: string | null) => void;
  label?: string;
  placeholder?: string;
}

export function ImageUpload({ value, onChange, label, placeholder = 'Importer une image' }: ImageUploadProps) {
  const [lightbox, setLightbox] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const result = e.target?.result;
      if (typeof result === 'string') onChange(result);
    };
    reader.readAsDataURL(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) handleFile(file);
  };

  return (
    <div>
      {label && <label className="block text-xs text-gray-500 mb-1">{label}</label>}

      {value ? (
        <div className="relative group inline-block">
          <button
            type="button"
            onClick={() => setLightbox(true)}
            className="block rounded-lg overflow-hidden border border-gray-700 hover:border-cyan-700 transition-colors focus:outline-none"
            style={{ background: '#111' }}
          >
            <img
              src={value}
              alt="Aperçu"
              className="object-contain rounded-lg"
              style={{ maxWidth: '100%', maxHeight: '10rem', width: 'auto', height: '10rem', display: 'block' }}
            />
          </button>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-700 hover:bg-red-600 flex items-center justify-center text-white transition-colors z-10 shadow"
          >
            <X className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute bottom-2 right-2 px-2 py-1 rounded text-xs bg-black/60 text-gray-300 hover:bg-black/80 transition-colors opacity-0 group-hover:opacity-100"
          >
            Changer
          </button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg border border-dashed border-gray-700 hover:border-cyan-700 cursor-pointer transition-colors"
          style={{ minHeight: '6rem' }}
        >
          <ImageIcon className="w-6 h-6 text-gray-600" />
          <span className="text-xs text-gray-600">{placeholder}</span>
          <span className="text-[10px] text-gray-700">Cliquez ou glissez une image</span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />

      {lightbox && value && (
        <Lightbox images={[value]} onClose={() => setLightbox(false)} />
      )}
    </div>
  );
}

interface MultiImageUploadProps {
  value: string[];
  onChange: (images: string[]) => void;
  label?: string;
  max?: number;
}

export function MultiImageUpload({ value, onChange, label, max = 10 }: MultiImageUploadProps) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList) => {
    const toAdd = Array.from(files).slice(0, max - value.length);
    let loaded = 0;
    const results: string[] = [];
    if (toAdd.length === 0) return;
    toAdd.forEach((file, i) => {
      const reader = new FileReader();
      reader.onload = e => {
        const res = e.target?.result;
        if (typeof res === 'string') results[i] = res;
        loaded++;
        if (loaded === toAdd.length) onChange([...value, ...results.filter(Boolean)]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  };

  const remove = (idx: number) => onChange(value.filter((_, i) => i !== idx));

  return (
    <div>
      {label && <label className="block text-xs text-gray-500 mb-2">{label}</label>}

      <div className="flex flex-wrap gap-2">
        {value.map((img, i) => (
          <div key={i} className="relative group">
            <button
              type="button"
              onClick={() => setLightboxIdx(i)}
              className="block rounded-lg overflow-hidden border border-gray-700 hover:border-cyan-700 transition-colors"
            >
              <img
                src={img}
                alt={`Photo ${i + 1}`}
                className="object-cover rounded-lg"
                style={{ width: '5rem', height: '5rem' }}
              />
            </button>
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-700 hover:bg-red-600 flex items-center justify-center text-white transition-colors z-10 shadow opacity-0 group-hover:opacity-100"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}

        {value.length < max && (
          <div
            onClick={() => inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gray-700 hover:border-cyan-700 cursor-pointer transition-colors"
            style={{ width: '5rem', height: '5rem' }}
          >
            <Upload className="w-4 h-4 text-gray-600" />
            <span className="text-[10px] text-gray-700">Ajouter</span>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleChange}
      />

      {lightboxIdx !== null && (
        <Lightbox images={value} initialIndex={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}
    </div>
  );
}
