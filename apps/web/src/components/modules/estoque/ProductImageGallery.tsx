"use client";

import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { uploadProductImage } from '@/lib/api';
import { useToast } from '@/components/ui/toast';

interface ProductImageGalleryProps {
  produtoId: string;
  images?: string[];
  onChange?: (urls: string[]) => void;
  className?: string;
  maxImages?: number;
}

export function ProductImageGallery({
  produtoId,
  images = [],
  onChange,
  className,
  maxImages = 5
}: ProductImageGalleryProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { success, error: toastError } = useToast();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    if (images.length + files.length > maxImages) {
      toastError(`Você só pode enviar até ${maxImages} fotos por produto.`);
      return;
    }

    setIsUploading(true);
    const newUrls = [...images];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) {
          toastError(`O arquivo ${file.name} não é uma imagem válida.`);
          continue;
        }

        // Add visual feedback that it's uploading
        const url = await uploadProductImage(file, produtoId || 'new');
        newUrls.push(url);
      }
      
      if (onChange) onChange(newUrls);
      success('Imagens enviadas com sucesso!');
    } catch (err: any) {
      toastError(err.message || 'Erro ao enviar imagens.');
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  };

  const handleRemove = (indexToRemove: number) => {
    const newUrls = images.filter((_, idx) => idx !== indexToRemove);
    if (onChange) onChange(newUrls);
  };

  return (
    <div className={twMerge("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">Fotos do Produto</h4>
        <span className="text-xs text-muted-foreground">{images.length} / {maxImages}</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {images.map((url, idx) => (
          <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden bg-muted border border-border">
            <img src={url} alt={`Produto ${idx + 1}`} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                title="Remover imagem"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {idx === 0 && (
              <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] uppercase font-bold px-2 py-0.5 rounded-full shadow-sm">
                Principal
              </div>
            )}
          </div>
        ))}

        {images.length < maxImages && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={twMerge(
              "aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors p-4 text-center",
              isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50",
              isUploading ? "opacity-50 pointer-events-none" : ""
            )}
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              multiple
              onChange={(e) => processFiles(e.target.files)}
            />
            {isUploading ? (
              <>
                <Loader2 className="w-6 h-6 text-muted-foreground animate-spin mb-2" />
                <span className="text-xs text-muted-foreground">Enviando...</span>
              </>
            ) : (
              <>
                <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                <span className="text-xs text-muted-foreground font-medium">Adicionar Foto</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
