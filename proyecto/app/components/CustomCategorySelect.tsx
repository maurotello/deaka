// app/components/CustomCategorySelect.tsx
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDownIcon, CheckIcon } from '@heroicons/react/20/solid';

// Definición de tipo para la categoría
interface Category {
  id: number;
  name: string;
  marker_icon_slug: string | null;
  parent_id: number | null;
}

interface CustomCategorySelectProps {
  categories: Category[];
  categoryId: string; // ID de la categoría seleccionada (como string)
  setCategoryId: (id: string) => void;
}

export default function CustomCategorySelect({ categories, categoryId, setCategoryId }: CustomCategorySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  // Encontrar el nombre de la categoría seleccionada para mostrar en el botón
  const selectedCat = categories.find(c => c.id.toString() === categoryId);
  const buttonLabel = selectedCat ? selectedCat.name : 'Selecciona una categoría...';

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClickOutside]);

  const handleSelect = (id: number) => {
    setCategoryId(id.toString());
    setIsOpen(false);
  };

  // Filtrar solo las categorías principales (parent_id es null o 0)
  const mainCategories = categories.filter(c => !c.parent_id);

  return (
    <div className="relative w-full" ref={wrapperRef}>
      {/* Botón de Selección (Simula el SELECT) */}
      <button
        type="button"
        className="flex items-center justify-between w-full rounded-md bg-gray-700 border border-gray-600 focus:border-green-500 focus:ring focus:ring-green-500 focus:ring-opacity-50 text-white px-3 py-2 text-left transition-colors duration-150"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span>{buttonLabel}</span>
        <ChevronDownIcon className={`h-5 w-5 ml-2 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
      </button>

      {/* Dropdown (Simula el Menú de Opciones) */}
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
          <ul role="listbox" className="py-1">
            {mainCategories.map(mainCat => {
              const subcats = categories.filter(c => c.parent_id === mainCat.id);
              const isMainSelected = mainCat.id.toString() === categoryId;

              return (
                <React.Fragment key={mainCat.id}>
                  {/* Opción de Categoría Principal (Ahora con estilo negrita real) */}
                  <li
                    role="option"
                    aria-selected={isMainSelected}
                    onClick={() => handleSelect(mainCat.id)}
                    className={`cursor-pointer px-3 py-2 text-sm transition-colors duration-100 ${isMainSelected ? 'bg-green-600 text-white font-bold' : 'text-gray-200 hover:bg-gray-700'}`}
                  >
                    <span className="font-bold">{mainCat.name}</span>
                    {isMainSelected && <CheckIcon className="h-4 w-4 inline-block ml-2" />}
                  </li>
                  
                  {/* Subcategorías (Indentación y estilo normal) */}
                  {subcats.map(subCat => {
                    const isSubSelected = subCat.id.toString() === categoryId;
                    return (
                      <li
                        key={subCat.id}
                        role="option"
                        aria-selected={isSubSelected}
                        onClick={() => handleSelect(subCat.id)}
                        className={`cursor-pointer px-3 py-2 text-sm transition-colors duration-100 pl-8 ${isSubSelected ? 'bg-green-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                      >
                        {subCat.name}
                        {isSubSelected && <CheckIcon className="h-4 w-4 inline-block ml-2" />}
                      </li>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}