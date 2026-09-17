import type {Metadata, Viewport} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Mapa de Concessionárias',
  description: 'Sistema para localizar e filtrar concessionárias credenciadas por categoria de veículo',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR">
      <body className="antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
