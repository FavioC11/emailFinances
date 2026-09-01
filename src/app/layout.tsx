import type { Metadata } from "next";
import "./globals.css";
import GlobalLoadingOverlay from "@/components/GlobalLoadingOverlay";

export const metadata: Metadata = {
  title: "Finanzas por Correo",
  description:
    "Tracker personal de finanzas: lee tus notificaciones bancarias (Yape, BCP), las categoriza y las analiza con IA.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">
        <GlobalLoadingOverlay />
        {children}
      </body>
    </html>
  );
}
