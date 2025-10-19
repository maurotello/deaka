'use client';

import { useState } from 'react';
import { useAxiosPrivate } from '../lib/axios';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRouteTest() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const axiosPrivate = useAxiosPrivate();
  const { auth } = useAuth();

  const testProtectedRoute = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await axiosPrivate.get('/protected-test');
      setResult(response.data);
    } catch (err: any) {
      setError(err.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  if (!auth.accessToken) {
    return null; // No mostrar nada si no está logueado
  }

  return (
    <>
      {/* Botón en el Navbar */}
      <button
        onClick={() => setShowModal(true)}
        className="px-3 py-2 rounded-md text-sm font-medium bg-yellow-600 hover:bg-yellow-700 transition"
      >
        🧪 Probar Ruta
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Prueba de Ruta Protegida</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <button
              onClick={testProtectedRoute}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 font-medium"
            >
              {loading ? 'Probando...' : 'Probar GET /protected-test'}
            </button>

            {error && (
              <div className="mt-4 p-4 bg-red-100 border border-red-400 rounded">
                <p className="font-bold text-red-800">❌ Error:</p>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
            )}

            {result && (
              <div className="mt-4 p-4 bg-green-100 border border-green-400 rounded">
                <p className="font-bold text-green-800">✅ Éxito:</p>
                <pre className="text-green-700 mt-2 bg-white p-2 rounded overflow-auto text-xs">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}

            <div className="mt-4 p-3 bg-gray-100 rounded text-xs">
              <p className="text-gray-700">
                <strong>Token:</strong> {auth.accessToken?.substring(0, 15)}...
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}