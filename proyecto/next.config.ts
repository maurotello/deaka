/** @type {import('next').NextConfig} */
const nextConfig = {
  // Esta función configura las redirecciones del proxy
  async rewrites() {
    return [
      {
        // Intercepta cualquier ruta que comience con /api/
        source: '/api/:path*',
        // Y la redirige a nuestro servidor backend en el puerto 3001
        destination: 'http://localhost:3001/api/:path*',
      },
    ];
  },
};

export default nextConfig;