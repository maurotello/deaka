import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const BASE_URL = 'http://localhost:3001/api';

// Creamos una instancia de axios normal para las rutas públicas (como el refresh)
const axiosPublic = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true,
});

// Creamos la instancia "privada" que usaremos para las peticiones seguras
const axiosPrivate = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true, // ¡Importante para que envíe la cookie del refresh token!
});


// ============================================================================
// HOOK PARA INYECTAR INTERCEPTORES EN LA INSTANCIA PRIVADA
// ============================================================================
// Usamos un hook para poder acceder al estado de autenticación de React (useAuth)
// fuera de un componente, que es donde se configuran los interceptores.
export const useAxiosPrivate = () => {
    const { auth, setAuth } = useAuth();

    // -- INTERCEPTOR DE PETICIÓN (REQUEST) --
    // Se ejecuta ANTES de que cada petición sea enviada.
    axiosPrivate.interceptors.request.use(
        (config) => {
            // Si el header de autorización no está puesto, lo ponemos.
            // Esto asegura que cada petición a la API lleve el accessToken.
            if (!config.headers['Authorization']) {
                config.headers['Authorization'] = `Bearer ${auth?.accessToken}`;
            }
            return config;
        },
        (error) => Promise.reject(error)
    );

    // -- INTERCEPTOR DE RESPUESTA (RESPONSE) --
    // Se ejecuta DESPUÉS de recibir una respuesta de la API, especialmente si hay un error.
    axiosPrivate.interceptors.response.use(
        // Si la respuesta es exitosa (2xx), simplemente la devolvemos.
        (response) => response,
        // Si la respuesta es un error...
        async (error) => {
            const prevRequest = error?.config;

            // Verificamos si el error es un 403 (Forbidden), que enviamos cuando el token expira,
            // y nos aseguramos de no haber reintentado ya esta petición (para evitar bucles infinitos).
            if (error?.response?.status === 403 && !prevRequest?.sent) {
                prevRequest.sent = true; // Marcamos la petición para no reintentarla de nuevo.
                
                try {
                    // 1. Llamamos a nuestra API para refrescar el token
                    const refreshResponse = await axiosPublic.get('/auth/refresh', {
                        withCredentials: true,
                    });
                    const newAccessToken = refreshResponse.data.accessToken;

                    // 2. Actualizamos nuestro estado global de autenticación
                    setAuth(prev => ({ ...prev, accessToken: newAccessToken }));

                    // 3. Actualizamos el header de la petición original que falló
                    prevRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

                    // 4. Reintentamos la petición original con el nuevo token
                    return axiosPrivate(prevRequest);

                } catch (refreshError) {
                    console.error("No se pudo refrescar el token", refreshError);
                    // Si el refresh falla, limpiamos la sesión y redirigimos (opcional)
                    setAuth({ user: null, accessToken: null });
                    // Aquí podrías usar router.push('/login') si tuvieras acceso al router
                    return Promise.reject(refreshError);
                }
            }
            return Promise.reject(error);
        }
    );

    return axiosPrivate;
};

export default axiosPrivate;