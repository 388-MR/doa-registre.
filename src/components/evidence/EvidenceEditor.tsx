import { useState, useRef } from 'react';
import { Plus, Trash2, Image, Video, Type, ChevronUp, ChevronDown, Camera } from 'lucide-react';
import { Lightbox } from '../ui/Lightbox';

export interface ContentBlock {
  id: string;
  type: 'text' | 'photo' | 'video';
  content: string;
  caption?: string;
}

interface EvidenceEditorProps {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
  readonly?: boolean;
}

function uid() {
  return Math.random().toString(36).slice(2);
}

export function EvidenceEditor({ blocks, onChange, readonly = false }: EvidenceEditorProps) {
  const [lightbox, setLightbox] = useState<{ imgs: string[]; idx: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingInsertIdx, setPendingInsertIdx] = useState<number | null>(null);

  const add = (type: ContentBlock['type'], atIdx?: number) => {
    const block: ContentBlock = { id: uid(), type, content: '' };
    const next = [...blocks];
    if (atIdx !== undefined) next.splice(atIdx + 1, 0, block);
    else next.push(block);
    onChange(next);
  };

  const update = (id: string, patch: Partial<ContentBlock>) => {
    onChange(blocks.map(b => b.id === id ? { ...b, ...patch } : b));
  };

  const remove = (id: string) => onChange(blocks.filter(b => b.id !== id));

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...blocks];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };

  const handlePhotoFile = (file: File, blockId?: string) => {
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target?.result as string;
      if (blockId) {
        update(blockId, { content: dataUrl });
      } else {
        const idx = pendingInsertIdx;
        const block: ContentBlock = { id: uid(), type: 'photo', content: dataUrl };
        const next = [...blocks];
        if (idx !== null) next.splice(idx + 1, 0, block);
        else next.push(block);
        onChange(next);
        setPendingInsertIdx(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const photoBlocks = blocks.filter(b => b.type === 'photo' && b.content).map(b => b.content);

  const openLightbox = (photoUrl: string) => {
    const idx = photoBlocks.indexOf(photoUrl);
    setLightbox({ imgs: photoBlocks, idx: Math.max(0, idx) });
  };

  if (readonly) {
    return (
      <div className="space-y-5">
        {blocks.map(block => (
          <div key={block.id}>
            {block.type === 'text' && block.content && (
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{block.content}</p>
            )}
            {block.type === 'photo' && block.content && (
              <div>
                <button onClick={() => openLightbox(block.content)} className="block rounded-xl overflow-hidden border border-gray-800 hover:border-cyan-700 transition-colors w-full">
                  <img
                    src={block.content}
                    alt=""
                    className="w-full object-contain rounded-xl"
                    style={{ maxHeight: '24rem', background: '#0a0c10' }}
                  />
                </button>
                {block.caption && <p className="text-xs text-gray-600 text-center mt-1.5 italic">{block.caption}</p>}
              </div>
            )}
            {block.type === 'video' && block.content && (
              <div>
                <video
                  src={block.content}
                  controls
                  className="w-full rounded-xl border border-gray-800"
                  style={{ maxHeight: '24rem', background: '#0a0c10' }}
                />
                {block.caption && <p className="text-xs text-gray-600 text-center mt-1.5 italic">{block.caption}</p>}
              </div>
            )}
          </div>
        ))}
        {lightbox && <Lightbox images={lightbox.imgs} initialIndex={lightbox.idx} onClose={() => setLightbox(null)} />}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {blocks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 rounded-xl border border-dashed border-gray-800 text-center">
          <Camera className="w-8 h-8 text-gray-700 mb-2" />
          <p className="text-xs text-gray-600 mb-3">Ajoutez du contenu à cette preuve</p>
          <div className="flex gap-2">
            <AddBlockBtn icon={<Type className="w-3.5 h-3.5" />} label="Texte" onClick={() => add('text')} />
            <AddBlockBtn icon={<Image className="w-3.5 h-3.5" />} label="Photo" onClick={() => { setPendingInsertIdx(null); fileRef.current?.click(); }} />
            <AddBlockBtn icon={<Video className="w-3.5 h-3.5" />} label="Vidéo" onClick={() => add('video')} />
          </div>
        </div>
      )}

      {blocks.map((block, idx) => (
        <div key={block.id} className="group relative">
          <div className="rounded-xl border border-gray-800/60 bg-gray-900/30 p-3">
            {/* Block controls */}
            <div className="flex items-center gap-1 mb-2 justify-between">
              <span className="text-[10px] uppercase tracking-wider text-gray-700">
                {block.type === 'text' ? 'Texte' : block.type === 'photo' ? 'Photo' : 'Vidéo'}
              </span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => move(idx, -1)} disabled={idx === 0} className="p-1 text-gray-700 hover:text-gray-400 disabled:opacity-30 transition-colors"><ChevronUp className="w-3.5 h-3.5" /></button>
                <button onClick={() => move(idx, 1)} disabled={idx === blocks.length - 1} className="p-1 text-gray-700 hover:text-gray-400 disabled:opacity-30 transition-colors"><ChevronDown className="w-3.5 h-3.5" /></button>
                <button onClick={() => remove(block.id)} className="p-1 text-gray-700 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>

            {/* Block content */}
            {block.type === 'text' && (
              <textarea
                value={block.content}
                onChange={e => update(block.id, { content: e.target.value })}
                placeholder="Rédigez votre texte explicatif ici..."
                rows={3}
                className="w-full bg-transparent text-sm text-gray-200 placeholder-gray-700 focus:outline-none resize-none leading-relaxed"
              />
            )}

            {block.type === 'photo' && (
              <div>
                {block.content ? (
                  <div>
                    <button onClick={() => openLightbox(block.content)} className="block w-full rounded-lg overflow-hidden border border-gray-800 hover:border-cyan-700 transition-colors mb-2">
                      <img
                        src={block.content}
                        alt=""
                        className="w-full object-contain rounded-lg"
                        style={{ maxHeight: '20rem', background: '#0a0c10' }}
                      />
                    </button>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={block.caption || ''}
                        onChange={e => update(block.id, { caption: e.target.value })}
                        placeholder="Légende (optionnel)..."
                        className="flex-1 bg-transparent text-xs text-gray-500 placeholder-gray-700 focus:outline-none border-b border-gray-800 focus:border-gray-600 py-1 transition-colors"
                      />
                      <button
                        onClick={() => { setPendingInsertIdx(null); fileRef.current?.dataset && (fileRef.current.dataset.blockId = block.id); fileRef.current?.click(); }}
                        className="text-xs text-gray-700 hover:text-gray-400 transition-colors"
                      >
                        Changer
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setPendingInsertIdx(idx - 1); fileRef.current?.click(); }}
                    className="w-full flex flex-col items-center justify-center gap-2 py-6 rounded-lg border border-dashed border-gray-700 hover:border-cyan-700 text-gray-600 hover:text-gray-400 transition-colors"
                  >
                    <Image className="w-5 h-5" />
                    <span className="text-xs">Cliquez pour importer une photo</span>
                  </button>
                )}
              </div>
            )}

            {block.type === 'video' && (
              <div>
                {block.content ? (
                  <div>
                    <video src={block.content} controls className="w-full rounded-lg border border-gray-800 mb-2" style={{ maxHeight: '20rem' }} />
                    <input
                      type="text"
                      value={block.caption || ''}
                      onChange={e => update(block.id, { caption: e.target.value })}
                      placeholder="Légende (optionnel)..."
                      className="w-full bg-transparent text-xs text-gray-500 placeholder-gray-700 focus:outline-none border-b border-gray-800 focus:border-gray-600 py-1 transition-colors"
                    />
                  </div>
                ) : (
                  <input
                    type="url"
                    value={block.content}
                    onChange={e => update(block.id, { content: e.target.value })}
                    placeholder="URL de la vidéo (mp4, webm)..."
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-700 focus:outline-none focus:border-cyan-700 transition-colors"
                  />
                )}
              </div>
            )}
          </div>

          {/* Add block after */}
          <div className="flex justify-center py-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-1.5 bg-gray-900 border border-gray-800 rounded-full px-2 py-0.5">
              <span className="text-[10px] text-gray-700">Insérer</span>
              <button onClick={() => add('text', idx)} className="p-0.5 text-gray-600 hover:text-gray-300 transition-colors"><Type className="w-3 h-3" /></button>
              <button onClick={() => { setPendingInsertIdx(idx); fileRef.current?.click(); }} className="p-0.5 text-gray-600 hover:text-gray-300 transition-colors"><Image className="w-3 h-3" /></button>
              <button onClick={() => add('video', idx)} className="p-0.5 text-gray-600 hover:text-gray-300 transition-colors"><Video className="w-3 h-3" /></button>
            </div>
          </div>
        </div>
      ))}

      {blocks.length > 0 && (
        <div className="flex gap-2 pt-1">
          <AddBlockBtn icon={<Type className="w-3.5 h-3.5" />} label="Texte" onClick={() => add('text')} />
          <AddBlockBtn icon={<Image className="w-3.5 h-3.5" />} label="Photo" onClick={() => { setPendingInsertIdx(null); fileRef.current?.click(); }} />
          <AddBlockBtn icon={<Video className="w-3.5 h-3.5" />} label="Vidéo" onClick={() => add('video')} />
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (!file) return;
          const blockId = fileRef.current?.dataset?.blockId;
          handlePhotoFile(file, blockId || undefined);
          if (fileRef.current) delete fileRef.current.dataset.blockId;
          e.target.value = '';
        }}
      />

      {lightbox && <Lightbox images={lightbox.imgs} initialIndex={lightbox.idx} onClose={() => setLightbox(null)} />}
    </div>
  );
}

function AddBlockBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-800 text-xs text-gray-500 hover:text-gray-200 hover:border-gray-700 transition-colors"
    >
      {icon}{label}
    </button>
  );
}
