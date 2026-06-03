/**
 * @vitest-environment jsdom
 */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../../src/components/auth/AuthProvider';
import { AuthButton } from '../../src/components/auth/AuthButton';
import { whopClient } from '../../src/lib/whop';

function findButtonByText(text: string): HTMLButtonElement {
  const buttons = Array.from(document.querySelectorAll('button'));
  const button = buttons.find((candidate) => candidate.textContent?.includes(text));

  if (!button) {
    throw new Error(`Expected button containing "${text}". Body text: ${document.body.textContent}`);
  }

  return button as HTMLButtonElement;
}

async function flushReact(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe('guest auth state refresh', () => {
  let root: Root | null = null;
  let container: HTMLDivElement;

  beforeEach(async () => {
    window.history.replaceState({}, '', '/dashboard');
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ authenticated: false }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )));
    await whopClient.logout();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root?.unmount();
      });
      root = null;
    }

    document.body.innerHTML = '';
    localStorage.clear();
    vi.restoreAllMocks();
    await whopClient.logout();
  });

  it('renders the guest menu immediately after Continue as Guest', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(React.createElement(
        MemoryRouter,
        { initialEntries: ['/dashboard'] },
        React.createElement(
          AuthProvider,
          null,
          React.createElement(AuthButton),
        ),
      ));
    });
    await flushReact();

    findButtonByText('Get Started').click();
    await flushReact();

    findButtonByText('Continue as Guest').click();
    await flushReact();

    expect(document.body.textContent).toContain('Guest');
    expect(document.body.textContent).toContain('free (guest)');
    expect(document.body.textContent).not.toContain('Get Started');
  });
});
