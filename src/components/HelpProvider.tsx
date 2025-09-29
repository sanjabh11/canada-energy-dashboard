import React, { createContext, useContext, useEffect, useState } from 'react';
import { fetchHelpManifest, type HelpManifestItem } from '../lib/helpApi';

interface HelpContextType {
  manifest: HelpManifestItem[];
  loading: boolean;
  error: string | null;
  refreshManifest: () => Promise<void>;
}

const HelpContext = createContext<HelpContextType | null>(null);

export function useHelp() {
  const context = useContext(HelpContext);
  if (!context) {
    throw new Error('useHelp must be used within a HelpProvider');
  }
  return context;
}

interface HelpProviderProps {
  children: React.ReactNode;
}

export function HelpProvider({ children }: HelpProviderProps) {
  const [manifest, setManifest] = useState<HelpManifestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadManifest = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchHelpManifest();
      setManifest(data);
    } catch (err) {
      console.error('Failed to load help manifest:', err);
      setError(err instanceof Error ? err.message : 'Failed to load help content');
      // Don't throw - gracefully degrade to empty manifest
      setManifest([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadManifest();
  }, []);

  const refreshManifest = async () => {
    await loadManifest();
  };

  return (
    <HelpContext.Provider value={{ manifest, loading, error, refreshManifest }}>
      {children}
    </HelpContext.Provider>
  );
}

// Hook to get help text for a specific ID without loading full content
export function useHelpText(id: string): string {
  const { manifest } = useHelp();
  const item = manifest.find(item => item.id === id);
  return item?.short_text || 'Help';
}
