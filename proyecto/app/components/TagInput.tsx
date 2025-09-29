'use client';

import { useState } from 'react';

interface TagInputProps {
  onChange: (tags: string[]) => void;
}

const TagInput: React.FC<TagInputProps> = ({ onChange }) => {
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === 'Tab' || e.key === ',') && currentTag) {
      e.preventDefault();
      if (!tags.includes(currentTag.trim()) && currentTag.trim() !== '') {
        const newTags = [...tags, currentTag.trim()];
        setTags(newTags);
        onChange(newTags); // Notificamos al padre
      }
      setCurrentTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = tags.filter(tag => tag !== tagToRemove);
    setTags(newTags);
    onChange(newTags); // Notificamos al padre
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
        className="block w-full rounded-md bg-gray-700 border-gray-500"
      />
    </div>
  );
};

export default TagInput;