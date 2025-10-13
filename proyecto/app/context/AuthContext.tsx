'use client';

import { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import axios from 'axios'; // Necesitaremos axios aquí

// La instancia pública de axios que creamos en axios.ts
const axiosPublic = axios.create({
    baseURL: 'http://localhost:3001/api',
    headers: { 'Content-Type': 'application/json' },
});


interface AuthState {
  user: { 
    id: string; 
    email: string; 
    role: string; // <-- AÑADIDO: El rol del usuario
  } | null;
  accessToken: string | null;
}

interface AuthContextType {
  auth: AuthState;
  setAuth: React.Dispatch<React.SetStateAction<AuthState>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  //const [auth, setAuth] = useState<AuthState>({ user: null, accessToken: null });
  const [loading, setLoading] = useState(true); // 1. Añadimos un estado de carga

  const initialAuthState: AuthState = {
    user: null,
    accessToken: null,
  };
  
  const [auth, setAuth] = useState<AuthState>(initialAuthState);

  // 2. Este useEffect se ejecutará una sola vez cuando la app cargue
  useEffect(() => {
    const restoreSession = async () => {
      try {
        // Hacemos la petición al endpoint de refresh para obtener un nuevo accessToken
        const response = await axiosPublic.get('/auth/refresh', {
          withCredentials: true, // ¡Muy importante para que envíe la cookie!
        });

        // Si la petición es exitosa, el backend nos devuelve el nuevo token
        const newAccessToken = response.data.accessToken;
        // También necesitamos los datos del usuario, que podemos decodificar del token
        // o, mejor aún, modificar el endpoint /refresh para que también devuelva el usuario.
        // Por ahora, asumamos que el backend nos devuelve el usuario también.
        
        // (Nota: Necesitarás actualizar tu endpoint /refresh en el backend para que devuelva el objeto 'user' además del 'accessToken')
        const user = response.data.user; // Asumiendo que el backend lo envía

        setAuth({ user: user, accessToken: newAccessToken });

      } catch (error) {
        console.log('No se pudo restaurar la sesión. Probablemente no hay un refresh token válido.');
        // Si hay un error, significa que no hay sesión activa, el estado se queda en null.
        setAuth({ user: null, accessToken: null });
      } finally {
        // En cualquier caso, terminamos de cargar
        setLoading(false);
      }
    };

    restoreSession();
  }, []); // El array vacío [] asegura que se ejecute solo al montar el componente

  // Mientras carga la sesión, podemos mostrar un loader o nada para evitar parpadeos
  if (loading) {
    return <p>Cargando aplicación...</p>; // O un componente de Spinner/Loader
  }

  return (
    <AuthContext.Provider value={{ auth, setAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};