import React, { useState, useEffect, useRef } from 'react';
import { useFit } from '../context/FitContext';
import { Camera, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ProgressPhotos() {
  const { uploadProgressPhoto, getProgressPhotos, deleteProgressPhoto } = useFit();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [compareIdx, setCompareIdx] = useState(0);
  const fileRef = useRef(null);
  const API = process.env.REACT_APP_BACKEND_URL || '';

  useEffect(() => {
    getProgressPhotos().then(data => {
      setPhotos(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [getProgressPhotos]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadProgressPhoto(file);
      setPhotos(prev => [...prev, result]);
    } catch (err) {
      console.error('Photo upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteProgressPhoto(id);
      setPhotos(prev => prev.filter(p => p.id !== id));
      if (compareIdx > 0) setCompareIdx(prev => prev - 1);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const getPhotoUrl = (photo) => {
    if (photo.url?.startsWith('http')) return photo.url;
    return `${API}${photo.url}`;
  };

  const hasComparison = photos.length >= 2;
  const firstPhoto = photos[0];
  const comparePhoto = hasComparison ? photos[Math.min(compareIdx + 1, photos.length - 1)] : null;

  return (
    <section className="px-4 md:px-6 py-4 anim-slide-up delay-600" data-testid="progress-photos-section">
      <div className="max-w-5xl mx-auto">
        <div className="glass-card p-4 md:p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl" style={{ background: 'rgba(7,80,86,0.15)' }}>
                <Camera size={18} style={{ color: '#075056' }} strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }} data-testid="progress-photos-title">
                  Progress Photos
                </h2>
                <p className="text-xs" style={{ color: 'rgba(228,238,240,0.4)' }}>
                  {photos.length} photo{photos.length !== 1 ? 's' : ''} · Track your transformation
                </p>
              </div>
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="btn-glow px-4 py-2 rounded-xl text-xs font-semibold text-white flex items-center gap-2 disabled:opacity-50"
              style={{ background: '#FF5B04' }}
              data-testid="upload-progress-photo"
            >
              <Camera size={14} />
              {uploading ? 'Uploading...' : 'Add Photo'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </div>

          {loading ? (
            <div className="text-center py-8" style={{ color: 'rgba(228,238,240,0.3)' }}>Loading photos...</div>
          ) : photos.length === 0 ? (
            <div className="text-center py-12" data-testid="no-photos-message">
              <Camera size={40} className="mx-auto mb-3" style={{ color: 'rgba(228,238,240,0.15)' }} />
              <p className="text-sm" style={{ color: 'rgba(228,238,240,0.3)' }}>
                No progress photos yet. Upload your first to start tracking your transformation.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Before/After Comparison */}
              {hasComparison && (
                <div className="mb-4" data-testid="before-after-comparison">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold" style={{ color: 'rgba(228,238,240,0.5)' }}>Before &amp; After</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setCompareIdx(prev => Math.max(prev - 1, 0))} disabled={compareIdx === 0}
                        className="p-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30" data-testid="compare-prev">
                        <ChevronLeft size={14} style={{ color: '#E4EEF0' }} />
                      </button>
                      <button onClick={() => setCompareIdx(prev => Math.min(prev + 1, photos.length - 2))} disabled={compareIdx >= photos.length - 2}
                        className="p-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30" data-testid="compare-next">
                        <ChevronRight size={14} style={{ color: '#E4EEF0' }} />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative rounded-xl overflow-hidden" style={{ border: '1px solid rgba(228,238,240,0.08)' }}>
                      <img src={getPhotoUrl(firstPhoto)} alt="Before" className="w-full h-[200px] md:h-[280px] object-cover" data-testid="before-photo" />
                      <div className="absolute bottom-0 left-0 right-0 p-2" style={{ background: 'linear-gradient(transparent, rgba(22,35,42,0.9))' }}>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(228,238,240,0.1)', color: '#E4EEF0' }}>
                          Before · {firstPhoto.date}
                        </span>
                      </div>
                    </div>
                    <div className="relative rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,91,4,0.15)' }}>
                      <img src={getPhotoUrl(comparePhoto)} alt="After" className="w-full h-[200px] md:h-[280px] object-cover" data-testid="after-photo" />
                      <div className="absolute bottom-0 left-0 right-0 p-2" style={{ background: 'linear-gradient(transparent, rgba(22,35,42,0.9))' }}>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,91,4,0.15)', color: '#FF5B04' }}>
                          After · {comparePhoto.date}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Photo Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {photos.map((photo) => (
                  <div key={photo.id} className="relative group rounded-xl overflow-hidden aspect-square" style={{ border: '1px solid rgba(228,238,240,0.06)' }} data-testid={`progress-photo-${photo.id}`}>
                    <img src={getPhotoUrl(photo)} alt={`Progress ${photo.date}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button onClick={() => handleDelete(photo.id)} className="p-2 rounded-full bg-red-500/20 hover:bg-red-500/40 transition-colors" data-testid={`delete-photo-${photo.id}`}>
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-1" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.6))' }}>
                      <span className="text-[9px]" style={{ color: 'rgba(228,238,240,0.6)' }}>{photo.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
