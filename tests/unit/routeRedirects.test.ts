/**
 * Legacy-route redirect coverage (audit G19b).
 *
 * src/App.tsx builds its route table inline inside createBrowserRouter and
 * does not export it, and App.tsx must not be modified to accommodate tests.
 * This suite therefore does two things:
 *
 *  1. Parses every `{ path: '...', element: ... }` entry out of App.tsx and
 *     records which ones render `<Navigate to="..." replace />`.
 *  2. Rebuilds those entries as real RouteObjects (preserving declaration
 *     order) and resolves each legacy path through react-router's
 *     `matchRoutes`, asserting the matched leaf element is a <Navigate> to
 *     the canonical destination. This proves the legacy path actually
 *     resolves to a redirect rather than merely appearing in the file.
 */
import React from 'react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { matchRoutes, Navigate, type RouteObject } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

const APP_TSX_PATH = path.join(process.cwd(), 'src/App.tsx');

/**
 * Retired/orphaned paths and the canonical destination each must redirect to.
 * Derived from src/App.tsx "Beachhead consolidation" and legacy-alias routes.
 */
const EXPECTED_REDIRECTS: ReadonlyArray<readonly [string, string]> = [
  ['/tier-calculator', '/roi-calculator'],
  ['/solar-wizard', '/solutions'],
  ['/micro-gen', '/solutions'],
  ['/rate-alerts', '/rro'],
  ['/whop-quiz', '/whop/quiz'],
  ['/whop/watchdog', '/pricing'],
  ['/watchdog', '/pricing'],
  ['/rate-watchdog', '/pricing'],
  ['/legal', '/privacy'],
  ['/features', '/solutions'],
];

interface ParsedRouteEntry {
  path: string;
  navigateTo?: string;
  replace?: boolean;
}

/**
 * Extract route entries in declaration order. App.tsx declares every route as
 * `{ path: '<x>', element: ... }`; each entry's text runs to the next entry.
 */
function parseRouteEntries(source: string): ParsedRouteEntry[] {
  const entryStart = /\{\s*path:\s*'([^']+)'/g;
  const matches = [...source.matchAll(entryStart)];

  return matches.map((match, index) => {
    const bodyEnd = index + 1 < matches.length ? matches[index + 1].index! : source.length;
    const body = source.slice(match.index!, bodyEnd);
    const navigate = body.match(/<Navigate\s+to="([^"]+)"([^>]*)\/>/);
    return {
      path: match[1],
      navigateTo: navigate?.[1],
      replace: navigate ? /\breplace\b/.test(navigate[2]) : undefined,
    };
  });
}

const source = readFileSync(APP_TSX_PATH, 'utf8');
const entries = parseRouteEntries(source);
const redirectsByPath = new Map(
  entries.filter((e) => e.navigateTo !== undefined).map((e) => [e.path, e]),
);
const declaredPaths = new Set(entries.map((e) => e.path));

/** Rebuild the parsed table (order preserved) so matchRoutes can resolve it. */
function buildRouteObjects(list: ParsedRouteEntry[]): RouteObject[] {
  return [
    {
      element: React.createElement('div'),
      children: list.map((entry) => ({
        path: entry.path,
        element: entry.navigateTo
          ? React.createElement(Navigate, { to: entry.navigateTo, replace: entry.replace })
          : React.createElement('div'),
      })),
    },
  ];
}

function resolvedLeafElement(location: string): React.ReactNode {
  const matches = matchRoutes(buildRouteObjects(entries), location);
  expect(matches, `expected ${location} to match a route`).not.toBeNull();
  return matches![matches!.length - 1].route.element;
}

describe('legacy route redirects (src/App.tsx)', () => {
  it('parses a non-trivial route table out of App.tsx', () => {
    // Sanity check that the parser sees the whole table, not a fragment.
    expect(entries.length).toBeGreaterThan(50);
    expect(declaredPaths.has('/')).toBe(true);
    expect(declaredPaths.has('*')).toBe(true);
  });

  it.each(EXPECTED_REDIRECTS)(
    '%s is declared as <Navigate to="%s" replace />',
    (from, to) => {
      const entry = redirectsByPath.get(from);
      expect(entry, `expected ${from} to be a Navigate route in App.tsx`).toBeDefined();
      expect(entry!.navigateTo).toBe(to);
      expect(entry!.replace).toBe(true);
    },
  );

  it.each(EXPECTED_REDIRECTS)(
    'matchRoutes resolves %s to a Navigate element targeting %s',
    (from, to) => {
      const element = resolvedLeafElement(from);
      expect(React.isValidElement(element)).toBe(true);
      const el = element as React.ReactElement<{ to: string; replace?: boolean }>;
      expect(el.type).toBe(Navigate);
      expect(el.props.to).toBe(to);
      expect(el.props.replace).toBe(true);
    },
  );

  it('every redirect destination is itself a declared canonical route', () => {
    for (const [from, to] of EXPECTED_REDIRECTS) {
      expect(declaredPaths.has(to), `${from} redirects to undeclared route ${to}`).toBe(true);
      // The destination must be a real page, not another redirect or catch-all.
      expect(redirectsByPath.has(to), `${to} is itself a redirect — chain detected`).toBe(false);
    }
  });

  it('no redirect entry appears after the wildcard catch-all', () => {
    const wildcardIndex = entries.findIndex((e) => e.path === '*');
    expect(wildcardIndex).toBeGreaterThan(-1);
    const afterWildcard = entries.slice(wildcardIndex);
    expect(afterWildcard.filter((e) => e.navigateTo !== undefined)).toHaveLength(0);
  });
});
