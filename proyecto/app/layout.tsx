import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";
import { Inter } from "next/font/google";
import { AuthProvider } from './context/AuthContext';


const inter = Inter({ subsets: ["latin"] });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Deaka Directorio",
  description: "El Directorio local de tu ciudad",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-900`}>
        <AuthProvider>
          <Navbar /> {/* <-- El Navbar AHORA SÍ está dentro */}
          {children} {/* <-- Las páginas también están dentro */}
        </AuthProvider>
      </body>
    </html>
  );
}
