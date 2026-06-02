import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: {
    default: 'DevDocs AI — Auto-Generated Developer Documentation',
    template: '%s | DevDocs AI',
  },
  description:
    'AI-powered documentation engine that automatically generates, maintains, and updates developer documentation from your GitHub repositories.',
  keywords: ['documentation', 'AI', 'developer tools', 'GitHub', 'code analysis'],
  openGraph: {
    type: 'website',
    title: 'DevDocs AI',
    description: 'AI-powered developer documentation engine',
    siteName: 'DevDocs AI',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
