import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { initializePaddle, Paddle } from '@paddle/paddle-js';

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

export const PaddleProvider: React.FC<PaddleProviderProps> = ({ children }) => {
    const [paddle, setPaddle] = useState<Paddle | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const initPaddle = async () => {
            try {
                const paddleInstance = await initializePaddle({
                    environment: PADDLE_ENVIRONMENT as 'sandbox' | 'production',
                    token: PADDLE_CLIENT_TOKEN,
                    eventCallback: (event) => {
                        // Handle Paddle events
                        if (event.name === 'checkout.completed') {
                            console.log('Checkout completed:', event.data);
                            // TODO: Handle successful checkout (update user subscription status)
                        }
                        if (event.name === 'checkout.closed') {
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
        if (!paddle) {
            console.error('Paddle not initialized');
            return;
        }

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
    };

    return (
        <PaddleContext.Provider value={{ paddle, isLoading, openCheckout }}>
            {children}
        </PaddleContext.Provider>
    );
};

export default PaddleProvider;
