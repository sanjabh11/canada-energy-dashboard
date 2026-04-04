import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { initializePaddle, Paddle } from '@paddle/paddle-js';
import { trackEvent } from '../../lib/analytics';

interface PaddleContextType {
    paddle: Paddle | null;
    isLoading: boolean;
    openCheckout: (priceId: string) => void;
}

const PaddleContext = createContext<PaddleContextType>({
    paddle: null,
    isLoading: true,
    openCheckout: () => { },
});

export const usePaddle = () => useContext(PaddleContext);

interface PaddleProviderProps {
    children: ReactNode;
}

// Paddle Environment: Use sandbox for development
const PADDLE_ENVIRONMENT = import.meta.env.PROD ? 'production' : 'sandbox';

// TODO: Replace with your actual Paddle client token
const PADDLE_CLIENT_TOKEN = import.meta.env.VITE_PADDLE_CLIENT_TOKEN || 'test_paddle_token';
const CHECKOUT_FALLBACK_KEY = 'ceip_checkout_fallback_intent';

function handleCheckoutFallback(priceId: string): void {
    if (typeof window === 'undefined') return;

    localStorage.setItem(CHECKOUT_FALLBACK_KEY, JSON.stringify({
        priceId,
        occurredAt: new Date().toISOString(),
        reason: 'paddle_unavailable'
    }));

    const params = new URLSearchParams({
        checkout: 'fallback',
        priceId
    });
    window.location.href = `/enterprise?${params.toString()}`;
}

export const PaddleProvider: React.FC<PaddleProviderProps> = ({ children }) => {
    const [paddle, setPaddle] = useState<Paddle | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const initPaddle = async () => {
            try {
                if (PADDLE_CLIENT_TOKEN === 'test_paddle_token') {
                    console.warn('[Paddle] Missing VITE_PADDLE_CLIENT_TOKEN. Checkout fallback will be used.');
                }
                const paddleInstance = await initializePaddle({
                    environment: PADDLE_ENVIRONMENT as 'sandbox' | 'production',
                    token: PADDLE_CLIENT_TOKEN,
                    eventCallback: (data) => {
                        // Handle Paddle events
                        if (data.name === 'checkout.completed') {
                            console.log('[Paddle] Checkout completed:', data.data);
                            // Track checkout completion event
                            trackEvent('checkout_complete', {
                                transaction_id: data.data?.transaction_id,
                                provider: 'paddle',
                                items: data.data?.items?.map((item: any) => item.price?.id).join(',') || 'unknown'
                            });
                            // Handle successful checkout (update user subscription status)
                        }
                        if (data.name === 'checkout.closed') {
                            trackEvent('checkout_abandoned', {
                                provider: 'paddle'
                            });
                            console.log('Checkout closed');
                        }
                    },
                });
                setPaddle(paddleInstance || null);
            } catch (error) {
                console.error('Failed to initialize Paddle:', error);
            } finally {
                setIsLoading(false);
            }
        };

        initPaddle();
    }, []);

    const openCheckout = (priceId: string) => {
        if (!paddle || PADDLE_CLIENT_TOKEN === 'test_paddle_token') {
            console.error('Paddle not initialized or using test token');
            trackEvent('checkout_fallback_redirected', {
                provider: 'paddle',
                reason: !paddle ? 'not_initialized' : 'test_token',
                price_id: priceId
            });
            handleCheckoutFallback(priceId);
            return;
        }

        try {
            paddle.Checkout.open({
                items: [{ priceId, quantity: 1 }],
                settings: {
                    displayMode: 'overlay',
                    theme: 'dark',
                    locale: 'en',
                    successUrl: `${window.location.origin}/checkout/success`,
                    allowLogout: true,
                },
            });
        } catch (error) {
            console.error('[Paddle] Checkout open failed:', error);
            trackEvent('checkout_fallback_redirected', {
                provider: 'paddle',
                reason: 'checkout_open_failed',
                price_id: priceId
            });
            handleCheckoutFallback(priceId);
        }
    };

    return (
        <PaddleContext.Provider value={{ paddle, isLoading, openCheckout }}>
            {children}
        </PaddleContext.Provider>
    );
};

export default PaddleProvider;
