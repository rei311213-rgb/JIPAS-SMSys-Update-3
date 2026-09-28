import React, { useState, useRef } from 'react';
import { Upload, Camera, RefreshCw, X, Check, Image as ImageIcon, Sparkles, User, Crop } from 'lucide-react';
import ImageCropperModal from './ImageCropperModal';

export interface PhotoUploaderProps {
  currentPhoto?: string;
  onPhotoChange: (newPhotoUrl: string) => void;
  entityType?: 'student' | 'teacher';
  gender?: 'Male' | 'Female';
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  aspectRatio?: '1:1' | '3:4' | '4:3' | '16:9';
  shape?: 'square' | 'round';
}

const PRESET_STUDENT_AVATARS_BOYS = [
  'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
];

const PRESET_STUDENT_AVATARS_GIRLS = [
  'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
];

const PRESET_TEACHER_AVATARS_MEN = [
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&auto=format&fit=crop&q=80',
];

const PRESET_TEACHER_AVATARS_WOMEN = [
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580894732454-def9397669d5?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=200&auto=format&fit=crop&q=80',
];

export default function PhotoUploader({
  currentPhoto,
  onPhotoChange,
  entityType = 'student',
  gender = 'Male',
  label = 'Passport Photograph',
  size = 'md',
  aspectRatio = '1:1',
  shape = 'square'
}: PhotoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string>('');
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const presets = entityType === 'teacher'
    ? (gender === 'Female' ? PRESET_TEACHER_AVATARS_WOMEN : PRESET_TEACHER_AVATARS_MEN)
    : (gender === 'Female' ? PRESET_STUDENT_AVATARS_GIRLS : PRESET_STUDENT_AVATARS_BOYS);

  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

  const handleFile = (file: File) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      alert('Security Policy: Only JPG, PNG, or WEBP image formats are permitted. Executable, SVG, or unknown file types are rejected.');
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      alert(`File size limit exceeded: Selected file is ${(file.size / (1024 * 1024)).toFixed(1)}MB. Maximum allowed image size is 5MB.`);
      return;
    }
    
    // Use createObjectURL for lightweight initial handling
    const objectUrl = URL.createObjectURL(file);
    setImageToCrop(objectUrl);
    setIsCropperOpen(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleApplyUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (customUrl.trim()) {
      setImageToCrop(customUrl.trim());
      setIsCropperOpen(true);
      setCustomUrl('');
      setShowUrlInput(false);
    }
  };

  const handleOpenCropperForCurrent = () => {
    if (currentPhoto) {
      setImageToCrop(currentPhoto);
      setIsCropperOpen(true);
    } else {
      fileInputRef.current?.click();
    }
  };

  const compressImage = (dataUrl: string, targetSizeKb: number = 55): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(dataUrl);

        // Resize if too large to save memory/space
        let width = img.width;
        let height = img.height;
        const maxDim = 800;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height *= maxDim / width;
            width = maxDim;
          } else {
            width *= maxDim / height;
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.9;
        let compressed = canvas.toDataURL('image/jpeg', quality);
        
        // Iteratively compress until below target size
        while (compressed.length > targetSizeKb * 1024 && quality > 0.1) {
          quality -= 0.1;
          compressed = canvas.toDataURL('image/jpeg', quality);
        }
        
        resolve(compressed);
      };
      img.src = dataUrl;
    });
  };

  const handleCropComplete = async (croppedDataUrl: string) => {
    // Compress image to ~55kb for lightweight uploads
    const compressedUrl = await compressImage(croppedDataUrl, 55);
    onPhotoChange(compressedUrl);
    setIsCropperOpen(false);
    
    // Cleanup object URL if it was used
    if (imageToCrop.startsWith('blob:')) {
      URL.revokeObjectURL(imageToCrop);
    }
    setImageToCrop('');
  };

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  };

  return (
    <div className="space-y-3">
      {label && (
        <div className="flex justify-between items-center">
          <label className="block text-xs font-bold text-slate-700">
            {label}
          </label>
          <span className="text-[10px] text-slate-400 font-medium">Passport 2x2 Format</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Photo Preview Frame */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleOpenCropperForCurrent}
          className={`relative ${sizeClasses[size]} rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer overflow-hidden group shrink-0 ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50 scale-105 ring-4 ring-indigo-100'
              : currentPhoto
              ? 'border-indigo-300 hover:border-indigo-500 shadow-sm bg-slate-50'
              : 'border-slate-300 hover:border-indigo-400 bg-slate-50'
          }`}
        >
          {currentPhoto ? (
            <img
              src={currentPhoto}
              alt="Passport Photo"
              className="w-full h-full object-cover rounded-xl"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-2 text-center">
              <User className="w-7 h-7 mb-1 opacity-70 group-hover:scale-110 transition-transform" />
              <span className="text-[9px] font-bold text-slate-500">Upload & Crop</span>
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1 p-1">
            {currentPhoto ? (
              <>
                <Crop className="w-4 h-4 text-blue-300" />
                <span className="text-[9px] font-bold">Crop / Edit</span>
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                <span className="text-[9px] font-bold">Choose</span>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons & Helpers */}
        <div className="flex-1 space-y-2 text-xs">
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFile(e.target.files[0]);
                // Reset input value so same file can be re-selected if needed
                e.target.value = '';
              }
            }}
            accept="image/*"
            className="hidden"
          />

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" /> Upload & Crop
            </button>

            {currentPhoto && (
              <button
                type="button"
                onClick={handleOpenCropperForCurrent}
                className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Adjust Crop Framing"
              >
                <Crop className="w-3.5 h-3.5 text-blue-600" /> Adjust Crop
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowPresets(!showPresets)}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Choose Preset
            </button>

            <button
              type="button"
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ImageIcon className="w-3.5 h-3.5 text-blue-500" /> Image URL
            </button>

            {currentPhoto && (
              <button
                type="button"
                onClick={() => onPhotoChange('')}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="Remove Photo"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <p className="text-[10px] text-slate-500 leading-tight">
            Upload picture to open the interactive cropper. Drag to frame, zoom, rotate, and align with passport guides.
          </p>

          {/* URL Input Bar */}
          {showUrlInput && (
            <div className="flex items-center gap-1.5 pt-1">
              <input
                type="url"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="Paste direct image link (https://...)"
                className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 font-medium"
              />
              <button
                type="button"
                onClick={handleApplyUrl}
                className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Crop URL
              </button>
            </div>
          )}

          {/* Quick Preset Avatars Picker */}
          {showPresets && (
            <div className="pt-2">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Verified {entityType === 'teacher' ? 'Faculty' : 'Student'} Portraits
              </div>
              <div className="flex items-center gap-2">
                {presets.map((presetUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      onPhotoChange(presetUrl);
                      setShowPresets(false);
                    }}
                    className={`relative w-10 h-10 rounded-xl overflow-hidden border-2 transition-all cursor-pointer hover:scale-105 ${
                      currentPhoto === presetUrl ? 'border-indigo-600 ring-2 ring-indigo-400' : 'border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    <img src={presetUrl} alt="Avatar Preset" className="w-full h-full object-cover" />
                    {currentPhoto === presetUrl && (
                      <div className="absolute inset-0 bg-indigo-600/40 flex items-center justify-center text-white">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Image Cropper Modal */}
      <ImageCropperModal
        isOpen={isCropperOpen}
        imageSrc={imageToCrop}
        title={`Crop & Frame ${entityType === 'teacher' ? 'Staff' : 'Student'} Picture`}
        initialAspectRatio={aspectRatio}
        shape={shape}
        onCrop={handleCropComplete}
        onCancel={() => {
          setIsCropperOpen(false);
          if (imageToCrop.startsWith('blob:')) {
            URL.revokeObjectURL(imageToCrop);
          }
          setImageToCrop('');
        }}
      />
    </div>
  );
}
