// src/app/components/FilterPanel.tsx
'use client';

import React from 'react';
import SearchBar from './SearchBar'; 

// 🚨 DEFINIR TIPO PARA LOS RESULTADOS DE BÚSQUEDA (Debe tener 'id' y 'title')
interface SearchResult {
    id: string;
    title: string;
}

// 🚨 DEFINIR TIPO PARA LOS ITEMS DE FILTRO (Debe tener 'id' y 'name')
interface FilterItem {
    id: string;
    name: string;
}


interface FilterPanelProps {
    // Props de SearchBar
    searchTerm: string;
    onSearchChange: (term: string) => void;
    // 🚨 CAMBIAMOS el tipo de searchResults a SearchResult[]
    searchResults: SearchResult[]; 
    onResultClick: (id: string) => void;
    
    // Props de Filtros (usan FilterItem[])
    categories: FilterItem[];
    listingTypes: FilterItem[];
    selectedCategory: string | null;
    setSelectedCategory: (id: string | null) => void;
    selectedType: string | null;
    setSelectedType: (id: string | null) => void;
}

const selectClasses = "w-full p-2 text-sm text-gray-800 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:border-green-500";


const FilterPanel: React.FC<FilterPanelProps> = ({
    searchTerm,
    onSearchChange,
    searchResults,
    onResultClick,
    categories,
    listingTypes,
    selectedCategory,
    setSelectedCategory,
    selectedType,
    setSelectedType,
}) => {
    return (
        <div className="flex flex-col gap-3 p-4 bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-700">
            
            {/* 1. Barra de Búsqueda (SearchBar) */}
            <SearchBar 
                searchTerm={searchTerm} 
                onSearchChange={onSearchChange}
                // 🚨 CORRECCIÓN FINAL: Pasar searchResults al prop 'results'
                results={searchResults} 
                onResultClick={onResultClick}
            />

            {/* 2. Filtros Adicionales */}
            {/* ... (resto del código sin cambios) ... */}
            
        </div>
    );
};

export default FilterPanel;