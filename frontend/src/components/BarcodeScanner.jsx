import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import axios from 'axios';
import { useFit } from '../context/FitContext';
import { X, ScanBarcode, Loader2, CheckCircle2, Plus, Minus, RotateCcw } from 'lucide-react';

const OFF_API = 'https://world.openfoodfacts.org/api/v2/product';

export default function BarcodeScanner({ open, onClose }) {
  const { logNutritionManual } = useFit();
  const [phase, setPhase] = useState('scanning'); // scanning | loading | found | notfound | logged
  const [product, setProduct] = useState(null);
  const [servings, setServings] = useState(1);
  const [barcode, setBarcode] = useState('');
  const [error, setError] = useState('');
  const scannerRef = useRef(null);
  const readerId = 'barcode-reader';

  const stopScanner = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
      try { scannerRef.current.clear(); } catch {}
      scannerRef.current = null;
    }
  };

  const lookupBarcode = async (code) => {
    setPhase('loading');
    setError('');
    try {
      const { data } = await axios.get(`${OFF_API}/${code}.json?fields=product_name,brands,nutriments,image_thumb_url,serving_size,quantity`);
      if (data.status === 0 || !data.product) {
        setPhase('notfound');
        setBarcode(code);
        return;
      }
      const p = data.product;
      const n = p.nutriments || {};
      const per100 = {
        calories: Math.round(n['energy-kcal_100g'] || (n.energy_100g ? n.energy_100g / 4.184 : 0) || 0),
        protein: Math.round((n.proteins_100g || 0) * 10) / 10,
        carbs: Math.round((n.carbohydrates_100g || 0) * 10) / 10,
        fat: Math.round((n.fat_100g || 0) * 10) / 10,
      };
      const servingSize = p.serving_size ? parseFloat(p.serving_size) : 100;
      setProduct({
        name: p.product_name || 'Unknown product',
        brand: p.brands || '',
        image: p.image_thumb_url || null,
        per100,
        servingSize: servingSize || 100,
        barcode: code,
      });
      setPhase('found');
    } catch (e) {
      setPhase('notfound');
      setBarcode(code);
    }
  };

  useEffect(() => {
    if (!open) { stopScanner(); return; }
    setPhase('scanning');
    setProduct(null);
    setServings(1);
    const t = setTimeout(async () => {
      try {
        const el = document.getElementById(readerId);
        if (!el) return;
        const html5QrCode = new Html5Qrcode(readerId);
        scannerRef.current = html5QrCode;
        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 260, height: 160 } },
          async (decoded) => {
            await stopScanner();
            lookupBarcode(decoded);
          },
          () => {}
        );
      } catch (e) {
        setError('Camera access denied. Enter barcode manually below.');
      }
    }, 300);
    return () => { clearTimeout(t); stopScanner(); };
    // eslint-disable-next-line
  }, [open]);

  const handleLog = async () => {
    if (!product) return;
    const factor = (product.servingSize / 100) * servings;
    const meal = {
      calories: Math.round(product.per100.calories * factor),
      carbs: Math.round(product.per100.carbs * factor * 10) / 10,
      protein: Math.round(product.per100.protein * factor * 10) / 10,
      fat: Math.round(product.per100.fat * factor * 10) / 10,
    };
    try {
      // Log as macros (backend calc: c*4 + p*4 + f*9)
      await logNutritionManual({ mode: 'macros', ...meal });
      setPhase('logged');
      setTimeout(() => { onClose(); }, 1400);
    } catch (e) {
      setError('Failed to log — try again.');
    }
  };

  const rescan = async () => {
    setProduct(null);
    setPhase('scanning');
    setError('');
    setTimeout(async () => {
      try {
        const el = document.getElementById(readerId);
        if (!el) return;
        const html5QrCode = new Html5Qrcode(readerId);
        scannerRef.current = html5QrCode;
        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 260, height: 160 } },
          async (decoded) => { await stopScanner(); lookupBarcode(decoded); },
          () => {}
        );
      } catch (e) { setError('Camera access denied.'); }
    }, 100);
  };

  const manualLookup = () => { if (barcode.trim()) lookupBarcode(barcode.trim()); };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} data-testid="barcode-modal">
      <div className="w-full max-w-sm rounded-2xl p-5 relative" style={{ background: 'linear-gradient(160deg, #FFF8F0 0%, #FFE0C0 100%)', border: '1px solid rgba(199,82,42,0.15)' }}>
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/40 transition-colors" style={{ color: 'rgba(61,31,10,0.55)' }} data-testid="barcode-close">
          <X size={16} />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-lg" style={{ background: 'rgba(199,82,42,0.12)' }}>
            <ScanBarcode size={16} style={{ color: '#C7522A' }} strokeWidth={2.2} />
          </div>
          <h2 className="text-base font-bold" style={{ fontFamily: 'Outfit, sans-serif', color: '#3D1F0A' }}>Scan Food</h2>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(15,118,110,0.12)', color: '#0F766E' }}>Open Food Facts</span>
        </div>

        {/* Scanning */}
        {phase === 'scanning' && (
          <>
            <div id={readerId} className="rounded-xl overflow-hidden mb-3" style={{ background: '#000', minHeight: '260px' }} />
            <p className="text-xs text-center mb-3" style={{ color: 'rgba(61,31,10,0.6)' }}>
              Point camera at a barcode
            </p>
            {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                placeholder="Or enter barcode..."
                value={barcode}
                onChange={e => setBarcode(e.target.value)}
                className="input-dark flex-1 text-sm"
                data-testid="barcode-manual-input"
              />
              <button onClick={manualLookup} className="px-4 rounded-xl text-sm font-semibold text-white" style={{ background: '#C7522A' }} data-testid="barcode-manual-lookup">
                Look up
              </button>
            </div>
          </>
        )}

        {/* Loading */}
        {phase === 'loading' && (
          <div className="py-10 flex flex-col items-center gap-3">
            <Loader2 size={28} className="animate-spin" style={{ color: '#C7522A' }} />
            <p className="text-sm" style={{ color: 'rgba(61,31,10,0.6)' }}>Looking up product...</p>
          </div>
        )}

        {/* Found */}
        {phase === 'found' && product && (
          <div>
            <div className="flex gap-3 mb-4">
              {product.image && <img src={product.image} alt="" className="w-16 h-16 rounded-xl object-cover" style={{ border: '1px solid rgba(199,82,42,0.15)' }} />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold" style={{ color: '#3D1F0A' }}>{product.name}</p>
                {product.brand && <p className="text-xs" style={{ color: 'rgba(61,31,10,0.6)' }}>{product.brand}</p>}
                <p className="text-[10px] mt-0.5" style={{ color: 'rgba(61,31,10,0.45)' }}>per 100g: {product.per100.calories} cal</p>
              </div>
            </div>

            {/* Servings */}
            <div className="mb-4">
              <label className="text-xs mb-2 block" style={{ color: 'rgba(61,31,10,0.6)' }}>
                Servings (1 serving = {product.servingSize}g)
              </label>
              <div className="flex items-center gap-3">
                <button onClick={() => setServings(s => Math.max(0.25, s - 0.25))} className="w-9 h-9 rounded-lg flex items-center justify-center font-bold" style={{ background: 'rgba(199,82,42,0.12)', color: '#C7522A' }} data-testid="barcode-serving-minus">
                  <Minus size={14} />
                </button>
                <span className="flex-1 text-center text-lg font-bold" style={{ fontFamily: 'Outfit, sans-serif', color: '#3D1F0A' }} data-testid="barcode-servings">{servings}</span>
                <button onClick={() => setServings(s => s + 0.25)} className="w-9 h-9 rounded-lg flex items-center justify-center font-bold" style={{ background: 'rgba(199,82,42,0.12)', color: '#C7522A' }} data-testid="barcode-serving-plus">
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Preview */}
            {(() => {
              const factor = (product.servingSize / 100) * servings;
              const cal = Math.round(product.per100.calories * factor);
              const c = Math.round(product.per100.carbs * factor * 10) / 10;
              const p = Math.round(product.per100.protein * factor * 10) / 10;
              const f = Math.round(product.per100.fat * factor * 10) / 10;
              return (
                <div className="grid grid-cols-4 gap-2 mb-4 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(199,82,42,0.12)' }}>
                  <div className="text-center">
                    <p className="text-xs" style={{ color: 'rgba(61,31,10,0.5)' }}>Cal</p>
                    <p className="text-sm font-bold" style={{ color: '#C7522A' }}>{cal}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs" style={{ color: 'rgba(61,31,10,0.5)' }}>C</p>
                    <p className="text-sm font-bold" style={{ color: '#3D1F0A' }}>{c}g</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs" style={{ color: 'rgba(61,31,10,0.5)' }}>P</p>
                    <p className="text-sm font-bold" style={{ color: '#0F766E' }}>{p}g</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs" style={{ color: 'rgba(61,31,10,0.5)' }}>F</p>
                    <p className="text-sm font-bold" style={{ color: '#D97706' }}>{f}g</p>
                  </div>
                </div>
              );
            })()}

            <div className="flex gap-2">
              <button onClick={rescan} className="px-3 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-1.5" style={{ background: 'rgba(199,82,42,0.12)', color: '#C7522A' }} data-testid="barcode-rescan">
                <RotateCcw size={13} />
              </button>
              <button onClick={handleLog} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: '#C7522A' }} data-testid="barcode-log">
                Add to today
              </button>
            </div>
          </div>
        )}

        {/* Not found */}
        {phase === 'notfound' && (
          <div className="py-6 text-center">
            <p className="text-sm font-semibold mb-1" style={{ color: '#3D1F0A' }}>Product not found</p>
            <p className="text-xs mb-4" style={{ color: 'rgba(61,31,10,0.6)' }}>Barcode: {barcode}. This item isn't in Open Food Facts yet.</p>
            <button onClick={rescan} className="w-full py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: '#C7522A' }} data-testid="barcode-try-again">
              Try another
            </button>
          </div>
        )}

        {/* Logged */}
        {phase === 'logged' && (
          <div className="py-8 text-center">
            <CheckCircle2 size={40} className="mx-auto mb-2" style={{ color: '#0F766E' }} />
            <p className="text-lg font-bold" style={{ fontFamily: 'Outfit, sans-serif', color: '#3D1F0A' }}>Logged!</p>
            <p className="text-xs mt-1" style={{ color: 'rgba(61,31,10,0.6)' }}>Nutrition updated for today</p>
          </div>
        )}
      </div>
    </div>
  );
}
