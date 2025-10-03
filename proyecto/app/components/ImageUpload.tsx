'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';

interface ImageUploadProps {
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  label: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onFilesChange, label, maxFiles = 1, maxSizeMB = 2 }) => {
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const selectedFiles = Array.from(files);
    
    if (selectedFiles.length > maxFiles) {
      setError(`No puedes subir más de ${maxFiles} archivos.`);
      return;
    }

    const newPreviews: string[] = [];
    const validFiles: File[] = [];

    for (const file of selectedFiles) {
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`El archivo "${file.name}" es demasiado grande (Máx: ${maxSizeMB}MB).`);
        // Limpiamos todo si un archivo es inválido
        setPreviews([]);
        onFilesChange([]);
        return;
      }
      newPreviews.push(URL.createObjectURL(file));
      validFiles.push(file);
    }

    setPreviews(newPreviews);
    onFilesChange(validFiles);

  }, [maxFiles, maxSizeMB, onFilesChange]);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
      <input 
        type="file" 
        accept="image/jpeg,image/png,image/webp"
        multiple={maxFiles > 1}
        onChange={handleFileChange}
        className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-600 file:text-green-300 hover:file:bg-gray-500"
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      {previews.length > 0 && (
        <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
          {previews.map((src, index) => (
            <div key={index} className="relative aspect-square">
              <Image src={src} alt={`Vista previa ${index + 1}`} layout="fill" objectFit="cover" className="rounded-md" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageUpload;