'use client';

// Definimos la forma de los resultados que esperamos recibir
interface SearchResult {
    id: string;
    title: string;
}

interface SearchBarProps {
    searchTerm: string;
    onSearchChange: (term: string) => void;
    results: SearchResult[]; // Nueva prop para recibir los resultados
    onResultClick: (id: string) => void; // Nueva prop para manejar el clic en un resultado
}

const SearchBar: React.FC<SearchBarProps> = ({ searchTerm, onSearchChange, results, onResultClick }) => {
    return (
        <div className="w-full relative"> {/* Añadimos 'relative' para posicionar el dropdown */}
            <input
                type="text"
                placeholder="Buscar por nombre de negocio..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full px-4 py-2 text-gray-800 bg-white border-2 border-gray-300 rounded-full shadow-lg focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
            />
            {/* Si hay resultados y texto en la barra, mostramos la lista */}
            {results.length > 0 && searchTerm.length > 2 && (
                <ul className="absolute mt-2 w-full bg-white border border-gray-300 rounded-lg shadow-xl z-20 overflow-hidden">
                    {results.map((result) => (
                        <li
                            key={result.id}
                            onClick={() => onResultClick(result.id)}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-100 cursor-pointer"
                        >
                            {result.title}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default SearchBar;