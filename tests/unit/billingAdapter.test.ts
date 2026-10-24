import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PaddleProvider, usePaddle } from '../../src/components/billing/PaddleProvider';
import {
    getBillingAdapter,
    useBilling,
    createCheckout,
    resolveRedirectUrl,
    ManualBillingAdapter,
    WhopBillingAdapter,
    StripeBillingAdapter,
    _setBillingProviderForTests,
    _resolveConfiguredProviderForTests,
    type IBillingAdapter,
} from '../../src/lib/billingAdapter';

afterEach(() => vi.unstubAllGlobals());

// G5: provider selection is deployment-config only; manual mode must never
// start a provider checkout; redirect URLs are same-origin allowlisted.
describe('billing provider semantics (audit G5)', () => {
    beforeEach(() => {
        _setBillingProviderForTests('whop');
    });

    it('manual mode builds a fail-closed adapter that never starts checkout', () => {
        _setBillingProviderForTests('manual');
        const adapter = getBillingAdapter();
        expect(adapter.provider).toBe('manual');
        expect(adapter).toBeInstanceOf(ManualBillingAdapter);
        expect(adapter.getPlans()).toEqual([]);
    });

    it('manual checkout rejects instead of falling through to Whop', async () => {
        _setBillingProviderForTests('manual');
        await expect(createCheckout({ planId: 'whop_basic' })).rejects.toThrow(/[Mm]anual billing mode/);
    });

    it('manual subscription/portal calls fail closed', async () => {
        const adapter: IBillingAdapter = new ManualBillingAdapter();
        await expect(adapter.getSubscription('any')).resolves.toBeNull();
        await expect(adapter.cancelSubscription('any')).rejects.toThrow(/[Mm]anual billing mode/);
        await expect(adapter.getCustomerPortalUrl('any')).rejects.toThrow(/[Mm]anual billing mode/);
    });

    it('useBilling does not expose runtime provider switching', () => {
        const billing = useBilling();
        expect('switchProvider' in billing).toBe(false);
        expect('setBillingProvider' in billing).toBe(false);
    });

    it('configured provider is used on cold start (no runtime switching needed)', () => {
        expect(_resolveConfiguredProviderForTests(undefined)).toBe('manual');
        expect(_resolveConfiguredProviderForTests('invalid')).toBe('manual');
        expect(_resolveConfiguredProviderForTests('stripe')).toBe('manual');
        expect(_resolveConfiguredProviderForTests('whop')).toBe('whop');
    });

    it('does not offer new Whop checkout while retaining the existing account portal', async () => {
        const adapter = new WhopBillingAdapter();
        expect(adapter.getPlans()).toEqual([]);
        expect(adapter.getPlan()).toBeNull();
        await expect(adapter.createCheckoutSession()).rejects.toThrow(
            /new Whop checkout is disabled/i,
        );
        await expect(adapter.getCustomerPortalUrl('existing-customer')).resolves.toContain('whop.com/hub/settings');
    });

    it('disables direct Stripe checkout until the server handler is verified', async () => {
        await expect(new StripeBillingAdapter().createCheckoutSession()).rejects.toThrow(
            /authenticated, price-allowlisted server handler/i,
        );
    });

    it('keeps the Paddle provider in manual fallback mode and routes to sales-assisted inquiry', () => {
        let checkout: (() => void) | undefined;
        let state = '';
        const Probe = () => {
            const context = usePaddle();
            checkout = context.openCheckout;
            state = `${context.paddle === null}:${context.isLoading}:${context.isFallbackMode}`;
            return React.createElement('span', null, 'manual billing');
        };

        renderToStaticMarkup(React.createElement(PaddleProvider, null, React.createElement(Probe)));
        expect(state).toBe('true:false:true');

        const assign = vi.fn();
        vi.stubGlobal('window', { location: { assign } });
        checkout?.();
        expect(assign).toHaveBeenCalledWith('/enterprise?billing=manual');
    });
});

describe('checkout redirect URL allowlist (audit G5)', () => {
    // node env has no window → resolveRedirectUrl falls back to localhost origin.
    const ORIGIN = 'http://localhost';

    it('relative redirect resolves under the app origin', () => {
        expect(resolveRedirectUrl('/billing/success', '/pricing')).toBe(`${ORIGIN}/billing/success`);
    });

    it('absolute cross-origin URL is rejected to the fallback (open-redirect guard)', () => {
        expect(resolveRedirectUrl('https://evil.example/phish', '/billing/success')).toBe(
            `${ORIGIN}/billing/success`,
        );
    });

    it('same-origin absolute URL is preserved', () => {
        expect(resolveRedirectUrl(`${ORIGIN}/billing/success?x=1`, '/pricing')).toBe(
            `${ORIGIN}/billing/success?x=1`,
        );
    });

    it('missing or malformed URLs resolve to the fallback', () => {
        expect(resolveRedirectUrl(undefined, '/billing/success')).toBe(`${ORIGIN}/billing/success`);
        expect(resolveRedirectUrl('::not-a-url', '/billing/success')).toBe(`${ORIGIN}/billing/success`);
    });
});
