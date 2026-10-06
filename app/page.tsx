'use client';

import { LanguageProvider } from '../lib/i18n';
import { Workspace } from '../components/Workspace';

export default function HomePage() {
  return (
    <LanguageProvider>
      <Workspace />
    </LanguageProvider>
  );
}
