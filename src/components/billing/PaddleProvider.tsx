import React, { createContext, useContext, ReactNode } from 'react';
import type { Paddle } from '@paddle/paddle-js';

interface PaddleContextType {
  paddle: Paddle | null;
  isLoading: boolean;
  isFallbackMode: boolean;
  openCheckout: () => void;
}

const PaddleContext = createContext<PaddleContextType>({
  paddle: null,
  isLoading: false,
  isFallbackMode: true,
  openCheckout: () => {
    if (typeof window !== 'undefined') {
      window.location.assign('/enterprise?billing=manual');
    }
  },
});

export const usePaddle = () => useContext(PaddleContext);

interface PaddleProviderProps {
  children: ReactNode;
}

/**
 * Checkout remains sales-assisted until an authenticated server-side billing
 * handler is implemented and verified. Do not initialize a client checkout
 * SDK or persist checkout intent from the browser.
 */
export const PaddleProvider: React.FC<PaddleProviderProps> = ({ children }) => (
  <PaddleContext.Provider
    value={{
      paddle: null,
      isLoading: false,
      isFallbackMode: true,
      openCheckout: () => {
        if (typeof window !== 'undefined') {
          window.location.assign('/enterprise?billing=manual');
        }
      },
    }}
  >
    {children}
  </PaddleContext.Provider>
);

export default PaddleProvider;
