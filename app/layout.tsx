import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Tender Package Builder',
  description: 'Bilingual, browser-local tender document compiler and validator. Verify requirements, detect duplicate PDFs, check expiry dates, and build clean submission-ready tender packages.',
  openGraph: {
    title: 'Tender Package Builder',
    description: 'Bilingual, browser-local tender document compiler and validator. Verify requirements, detect duplicate PDFs, check expiry dates, and build clean submission-ready tender packages.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tender Package Builder',
    description: 'Bilingual, browser-local tender document compiler and validator. Verify requirements, detect duplicate PDFs, check expiry dates, and build clean submission-ready tender packages.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
