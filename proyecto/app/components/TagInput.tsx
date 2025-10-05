'use client';

import { useState, useEffect } from 'react';

interface TagInputProps {
  initialTags?: string[];
  onChange: (tags: string[]) => void;
}

const TagInput: React.FC<TagInputProps> = ({ initialTags = [], onChange }) => {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [currentTag, setCurrentTag] = useState('');

  // ▼▼▼ EFECTO CORREGIDO PARA EVITAR BUCLES INFINITOS ▼▼▼
  useEffect(() => {
    // Comparamos el contenido de los arrays. Si son idénticos, no hacemos nada.
    // Usar JSON.stringify es una forma sencilla y efectiva de comparar arrays de strings.
    if (JSON.stringify(initialTags) !== JSON.stringify(tags)) {
      setTags(initialTags);
    }
  }, [initialTags, tags]); // Añadimos 'tags' a las dependencias para una comparación segura

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === 'Tab' || e.key === ',') && currentTag) {
      e.preventDefault();
      const trimmedTag = currentTag.trim();
      if (!tags.includes(trimmedTag) && trimmedTag !== '') {
        const newTags = [...tags, trimmedTag];
        setTags(newTags);
        onChange(newTags);
      }
      setCurrentTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = tags.filter(tag => tag !== tagToRemove);
    setTags(newTags);
    onChange(newTags);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map(tag => (
          <div key={tag} className="flex items-center bg-green-700 text-white text-sm font-medium px-2 py-1 rounded-full">
            <span>{tag}</span>
            <button type="button" onClick={() => removeTag(tag)} className="ml-2 text-green-200 hover:text-white">&times;</button>
          </div>
        ))}
      </div>
      <input
        type="text"
        value={currentTag}
        onChange={e => setCurrentTag(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Añade una etiqueta y presiona Enter..."
        className="block w-full rounded-md bg-gray-700 border-gray-500 px-3 py-2"
      />
    </div>
  );
};

export default TagInput;