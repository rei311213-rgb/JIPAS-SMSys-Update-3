import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  RefreshCw,
  Check,
  X,
  Crop,
  Eye,
  Grid,
  UserCheck,
  Loader2
} from 'lucide-react';
import { compressImageDataUrl } from '../../lib/imageUtils';

export interface ImageCropperModalProps {
  isOpen: boolean;
  imageSrc: string;
  onCrop: (croppedDataUrl: string) => void;
  onCancel: () => void;
  title?: string;
  initialAspectRatio?: '1:1' | '3:4' | '4:3' | '16:9';
  allowAspectRatioChange?: boolean;
  shape?: 'square' | 'round';
}

export default function ImageCropperModal({
  isOpen,
  imageSrc,
  onCrop,
  onCancel,
  title = 'Crop & Frame Passport Picture',
  initialAspectRatio = '1:1',
  allowAspectRatioChange = true,
  shape = 'square'
}: ImageCropperModalProps) {
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '3:4' | '4:3' | '16:9'>(initialAspectRatio);
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showFaceGuide, setShowFaceGuide] = useState<boolean>(true);
  const [isRoundMask, setIsRoundMask] = useState<boolean>(shape === 'round');
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');

  const cropContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; startOffsetX: number; startOffsetY: number }>({
    x: 0,
    y: 0,
    startOffsetX: 0,
    startOffsetY: 0
  });

  // Calculate box dimensions according to aspect ratio
  // Base width is 320px
  const getBoxDimensions = useCallback(() => {
    const baseW = 320;
    switch (aspectRatio) {
      case '1:1':
        return { width: baseW, height: baseW };
      case '3:4':
        return { width: 270, height: 360 };
      case '4:3':
        return { width: 360, height: 270 };
      case '16:9':
        return { width: 360, height: 202 };
      default:
        return { width: baseW, height: baseW };
    }
  }, [aspectRatio]);

  const { width: cropWidth, height: cropHeight } = getBoxDimensions();

  // Load natural dimensions when imageSrc changes
  useEffect(() => {
    if (!imageSrc) return;
    setImageLoaded(false);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
      setImageLoaded(true);
      // Reset transform
      setZoom(1);
      setRotation(0);
      setFlipH(false);
      setOffsetX(0);
      setOffsetY(0);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Base scale calculation to make the image cover the crop box at zoom = 1
  const getBaseScale = useCallback(() => {
    if (!naturalSize.width || !naturalSize.height) return 1;
    // Cover scale
    return Math.max(cropWidth / naturalSize.width, cropHeight / naturalSize.height);
  }, [naturalSize, cropWidth, cropHeight]);

  const baseScale = getBaseScale();
  const currentDrawWidth = naturalSize.width * baseScale * zoom;
  const currentDrawHeight = naturalSize.height * baseScale * zoom;

  // Render crop to a high-resolution canvas
  const generateCroppedImage = useCallback((exportDimension = 600): string => {
    if (!naturalSize.width || !naturalSize.height) return '';

    const exportWidth = exportDimension;
    const exportHeight = Math.round(exportDimension * (cropHeight / cropWidth));

    const canvas = document.createElement('canvas');
    canvas.width = exportWidth;
    canvas.height = exportHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Clean background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, exportWidth, exportHeight);

    const exportScale = exportWidth / cropWidth;

    ctx.save();
    // Center of canvas + user drag translation
    ctx.translate(exportWidth / 2 + offsetX * exportScale, exportHeight / 2 + offsetY * exportScale);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, 1);

    const drawW = naturalSize.width * baseScale * zoom * exportScale;
    const drawH = naturalSize.height * baseScale * zoom * exportScale;

    // Create an image element to draw
    const img = new Image();
    img.src = imageSrc;
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    return canvas.toDataURL('image/jpeg', 0.92);
  }, [naturalSize, cropWidth, cropHeight, offsetX, offsetY, rotation, flipH, baseScale, zoom, imageSrc]);

  // Update live preview thumbnail debounced
  useEffect(() => {
    if (!imageLoaded) return;
    const timer = setTimeout(() => {
      try {
        const preview = generateCroppedImage(180);
        setPreviewDataUrl(preview);
      } catch (err) {
        console.warn('Failed to generate live preview', err);
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [imageLoaded, generateCroppedImage]);

  // Mouse & Touch Drag Event Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startOffsetX: offsetX,
      startOffsetY: offsetY
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setOffsetX(dragStartRef.current.startOffsetX + dx);
    setOffsetY(dragStartRef.current.startOffsetY + dy);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      isDraggingRef.current = false;
    }
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    setZoom((prev) => Math.min(Math.max(prev + delta, 0.7), 4));
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setFlipH(false);
    setOffsetX(0);
    setOffsetY(0);
  };

  const handleConfirmCrop = async () => {
    setIsCompressing(true);
    try {
      const cropped = generateCroppedImage(800);
      if (cropped) {
        // Compress to ~55kb (0.055MB)
        const compressed = await compressImageDataUrl(cropped, 0.055);
        onCrop(compressed);
      }
    } catch (err) {
      console.error('Failed to crop or compress image:', err);
      // Fallback if everything fails
      const cropped = generateCroppedImage(800);
      if (cropped) onCrop(cropped);
    } finally {
      setIsCompressing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#091124] border border-blue-900/60 rounded-3xl shadow-2xl text-white overflow-hidden flex flex-col my-auto max-h-[95vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-blue-900/40 flex items-center justify-between bg-[#060B18]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl">
              <Crop className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white">{title}</h3>
              <p className="text-[11px] text-blue-300/70">
                Drag to frame, zoom, or rotate. Picture will be cropped to passport resolution.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Cancel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto">
          {/* Aspect Ratio & Display Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            {allowAspectRatioChange && (
              <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-blue-900/40">
                <span className="text-[10px] font-bold text-slate-400 px-2 uppercase tracking-wider">Ratio:</span>
                {(['1:1', '3:4', '4:3', '16:9'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setAspectRatio(r);
                      handleReset();
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      aspectRatio === r
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {r === '1:1' ? '1:1 (Passport)' : r}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-blue-900/40 ml-auto">
              <button
                type="button"
                onClick={() => setShowGrid(!showGrid)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  showGrid ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Toggle Rule of Thirds Grid"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowFaceGuide(!showFaceGuide)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  showFaceGuide ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Toggle Passport Face Framing Guide"
              >
                <UserCheck className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsRoundMask(!isRoundMask)}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                  isRoundMask ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Toggle Circle / Square Frame"
              >
                {isRoundMask ? 'Circle' : 'Square'}
              </button>
            </div>
          </div>

          {/* Interactive Crop Viewport Stage */}
          <div className="flex flex-col lg:flex-row items-center justify-center gap-6">
            <div className="relative flex items-center justify-center p-3 bg-slate-950/70 border-2 border-blue-900/40 rounded-2xl select-none touch-none overflow-hidden shadow-inner">
              {/* Crop Container Box */}
              <div
                ref={cropContainerRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onWheel={handleWheel}
                style={{ width: `${cropWidth}px`, height: `${cropHeight}px` }}
                className={`relative overflow-hidden cursor-grab active:cursor-grabbing select-none bg-[#030712] border-2 border-blue-400 shadow-2xl transition-all ${
                  isRoundMask ? 'rounded-full' : 'rounded-xl'
                }`}
              >
                {/* Target Image being manipulated */}
                {imageLoaded && (
                  <img
                    src={imageSrc}
                    alt="Source to crop"
                    draggable={false}
                    style={{
                      position: 'absolute',
                      left: `${cropWidth / 2 + offsetX}px`,
                      top: `${cropHeight / 2 + offsetY}px`,
                      width: `${currentDrawWidth}px`,
                      height: `${currentDrawHeight}px`,
                      transform: `translate(-50%, -50%) rotate(${rotation}deg) scaleX(${flipH ? -1 : 1})`,
                      transformOrigin: 'center center',
                      userSelect: 'none',
                      pointerEvents: 'none',
                      maxWidth: 'none'
                    }}
                  />
                )}

                {/* Subtle Rule-of-Thirds Grid */}
                {showGrid && (
                  <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-white/20">
                    <div className="border-r border-b border-white/20" />
                    <div className="border-r border-b border-white/20" />
                    <div className="border-b border-white/20" />
                    <div className="border-r border-b border-white/20" />
                    <div className="border-r border-b border-white/20" />
                    <div className="border-b border-white/20" />
                    <div className="border-r border-white/20" />
                    <div className="border-r border-white/20" />
                    <div />
                  </div>
                )}

                {/* Passport Face Position Guide Oval */}
                {showFaceGuide && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                    <div className="w-[60%] h-[72%] rounded-[50%] border-2 border-dashed border-amber-400/70 shadow-[0_0_15px_rgba(251,191,36,0.25)] flex flex-col items-center justify-between py-4">
                      <span className="text-[9px] font-black uppercase text-amber-300/80 bg-slate-900/80 px-1.5 py-0.5 rounded-full tracking-wider">
                        Head & Eyes
                      </span>
                      <div className="w-12 h-0.5 bg-amber-400/50" />
                      <span className="text-[9px] font-black uppercase text-amber-300/80 bg-slate-900/80 px-1.5 py-0.5 rounded-full tracking-wider">
                        Chin
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Live Result Thumbnail Preview Card */}
            <div className="flex flex-col items-center justify-center bg-slate-900/70 border border-blue-900/40 p-4 rounded-2xl w-full sm:w-44 text-center shrink-0 space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase text-blue-400">
                <Eye className="w-3.5 h-3.5" /> Live Preview
              </div>
              <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-blue-500 shadow-lg bg-slate-950 flex items-center justify-center">
                {previewDataUrl ? (
                  <img
                    src={previewDataUrl}
                    alt="Cropped Preview"
                    className={`w-full h-full object-cover ${isRoundMask ? 'rounded-full' : 'rounded-xl'}`}
                  />
                ) : (
                  <div className="text-[10px] text-slate-500">Rendering...</div>
                )}
              </div>
              <div className="text-[10px] text-slate-400 font-medium leading-tight">
                Final output will be standardized for ID card & reports.
              </div>
            </div>
          </div>

          {/* Interactive Tools Panel: Zoom, Rotate, Flip, Reset */}
          <div className="bg-[#050C1B] border border-blue-900/50 p-4 rounded-2xl space-y-3">
            {/* Zoom Slider Control */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setZoom((prev) => Math.max(prev - 0.1, 0.7))}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <input
                type="range"
                min="0.7"
                max="3.5"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 accent-blue-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />

              <button
                type="button"
                onClick={() => setZoom((prev) => Math.min(prev + 0.1, 3.5))}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <span className="text-xs font-mono font-bold text-blue-400 min-w-[42px] text-right">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            {/* Transform Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-blue-950">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setRotation((prev) => (prev - 90) % 360)}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Rotate 90 degrees Left"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-blue-400" /> -90°
                </button>

                <button
                  type="button"
                  onClick={() => setRotation((prev) => (prev + 90) % 360)}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Rotate 90 degrees Right"
                >
                  <RotateCw className="w-3.5 h-3.5 text-blue-400" /> +90°
                </button>

                <button
                  type="button"
                  onClick={() => setFlipH(!flipH)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    flipH ? 'bg-blue-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }`}
                  title="Flip Image Horizontally"
                >
                  <FlipHorizontal className="w-3.5 h-3.5" /> Flip
                </button>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Reset Framing and Zoom"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-400" /> Reset
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-5 py-4 border-t border-blue-900/40 bg-[#060B18] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-confirm-crop-photo"
              onClick={handleConfirmCrop}
              disabled={isCompressing}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCompressing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Optimizing...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" /> Crop & Save Photo
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
