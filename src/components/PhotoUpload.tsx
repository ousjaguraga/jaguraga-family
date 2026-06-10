import { useEffect, useRef, useState } from 'react';
import { uploadData, getUrl } from 'aws-amplify/storage';
import { Camera, Loader2 } from 'lucide-react';

interface Props {
  currentKey?: string | null;
  personId:    string;
  onUploaded:  (key: string) => void;
}

export default function PhotoUpload({ currentKey, personId, onUploaded }: Props) {
  const [preview,    setPreview]    = useState<string | null>(null);
  const [uploading,  setUploading]  = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load existing photo (useState's initializer is not a side-effect slot —
  // this must be an effect, and it must react to currentKey changes)
  useEffect(() => {
    let cancelled = false;
    if (!currentKey) return;
    getUrl({ path: currentKey })
      .then(({ url }) => { if (!cancelled) setPreview(url.toString()); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [currentKey]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (file.size > 10 * 1024 * 1024) {
      setError('Photo is larger than 10 MB — please pick a smaller one.');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : 'jpg';
    const key = `photos/${personId}.${ext}`;
    setUploading(true);
    try {
      await uploadData({ path: key, data: file, options: { contentType: file.type } }).result;
      onUploaded(key);
    } catch (err) {
      console.error('Photo upload failed:', err);
      const detail = err instanceof Error ? err.message : String(err);
      setError(`Upload failed: ${detail}`);
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="w-24 h-24 rounded-full bg-burgundy-100 border-2 border-burgundy-200
                   flex items-center justify-center overflow-hidden cursor-pointer
                   hover:border-burgundy-400 transition-colors relative group"
        onClick={() => inputRef.current?.click()}
      >
        {preview
          ? <img src={preview} alt="Profile" className="w-full h-full object-cover" />
          : <Camera className="w-8 h-8 text-burgundy-400" />
        }
        {uploading && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/20 rounded-full opacity-0 group-hover:opacity-100
                        transition-opacity flex items-center justify-center">
          <Camera className="w-5 h-5 text-white" />
        </div>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="text-sm text-burgundy-700 hover:text-burgundy-900 underline"
        disabled={uploading}
      >
        {preview ? 'Change photo' : 'Upload photo'}
      </button>

      {error && <p className="text-red-600 text-xs">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
