import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Predicted Press | Probability Led Press',
  description: 'News backed by prediction markets. Every headline shows the real odds.',
  openGraph: {
    title: 'Predicted Press',
    description: 'Probability led press - News backed by prediction markets',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-stone-50 text-stone-900 antialiased">
        {children}
      </body>
    </html>
  );
}
