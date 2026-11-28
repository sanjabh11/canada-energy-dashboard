/**
 * Content-split parity guard (audit G19a).
 *
 * src/lib/helpContent.ts was split from a single ~5,727-line file into
 * per-domain modules under src/lib/helpContent/ re-exported through the
 * helpContent.ts barrel, and src/lib/moduleContent.ts was split the same way
 * under src/lib/moduleContent/. This suite pins the public API surface and
 * the total entry counts so a future refactor cannot silently drop content.
 *
 * The expected public surface is derived from actual consumers:
 *  - helpContent: HELP_CONTENT_DATABASE / getHelpContent / getShortHelp /
 *    searchHelpContent / type HelpContentItem
 *    (src/components/HelpButton.tsx dynamically imports getHelpContent)
 *  - moduleContent: RESIDENTIAL_MODULES / GRID_OPS_MODULES / POLICY_MODULES /
 *    ALL_MODULES / getModulesByTrack / getModuleById / getNextModule /
 *    getPreviousModule plus types ContentType, VideoContent, ReadingContent,
 *    QuizQuestion, QuizContent, InteractiveContent, Module
 *    (src/components/modules/*.tsx, src/lib/certificateService.ts)
 */
import { describe, expect, it } from 'vitest';
import {
  HELP_CONTENT_DATABASE,
  getHelpContent,
  getShortHelp,
  searchHelpContent,
} from '../../src/lib/helpContent';
import type { HelpContentItem } from '../../src/lib/helpContent';
import {
  ALL_MODULES,
  GRID_OPS_MODULES,
  POLICY_MODULES,
  RESIDENTIAL_MODULES,
  getModuleById,
  getModulesByTrack,
  getNextModule,
  getPreviousModule,
} from '../../src/lib/moduleContent';
import type {
  ContentType,
  InteractiveContent,
  Module,
  QuizContent,
  QuizQuestion,
  ReadingContent,
  VideoContent,
} from '../../src/lib/moduleContent';

// Entry counts locked on 2026-10-05 — parity guard, update only if content
// intentionally changes.
const EXPECTED_HELP_ENTRY_COUNT = 105;
const EXPECTED_MODULE_COUNT = 15;
const EXPECTED_MODULES_PER_TRACK = 5;
const TRACK_SLUGS = ['residential-energy', 'grid-operations', 'policy-regulatory'] as const;

describe('helpContent barrel parity', () => {
  it('re-exports the full public API surface', () => {
    expect(HELP_CONTENT_DATABASE).toBeDefined();
    expect(typeof HELP_CONTENT_DATABASE).toBe('object');
    expect(typeof getHelpContent).toBe('function');
    expect(typeof getShortHelp).toBe('function');
    expect(typeof searchHelpContent).toBe('function');
    // Compile-time check that the HelpContentItem type export still exists.
    const typeCheck: HelpContentItem | undefined = undefined;
    expect(typeCheck).toBeUndefined();
  });

  it(`contains exactly ${EXPECTED_HELP_ENTRY_COUNT} help entries`, () => {
    // locked at 105 on 2026-10-05 — parity guard, update only if content
    // intentionally changes.
    expect(Object.keys(HELP_CONTENT_DATABASE)).toHaveLength(EXPECTED_HELP_ENTRY_COUNT);
  });

  it('every help entry matches the HelpContentItem shape and its key', () => {
    const ids = new Set<string>();
    for (const [key, item] of Object.entries(HELP_CONTENT_DATABASE)) {
      expect(typeof item.id).toBe('string');
      expect(item.id.length).toBeGreaterThan(0);
      expect(typeof item.title).toBe('string');
      expect(item.title.length).toBeGreaterThan(0);
      expect(typeof item.shortText).toBe('string');
      expect(item.shortText.length).toBeGreaterThan(0);
      expect(typeof item.bodyHtml).toBe('string');
      expect(item.bodyHtml.length).toBeGreaterThan(0);
      // The original literal keyed each record by its id; the split must
      // preserve that invariant.
      expect(item.id).toBe(key);
      if (item.relatedTopics !== undefined) {
        expect(Array.isArray(item.relatedTopics)).toBe(true);
      }
      if (item.difficulty !== undefined) {
        expect(['beginner', 'intermediate', 'advanced']).toContain(item.difficulty);
      }
      ids.add(item.id);
    }
    expect(ids.size).toBe(EXPECTED_HELP_ENTRY_COUNT);
  });

  it('lookup helpers still resolve real entries and fall back gracefully', () => {
    const [firstKey, firstItem] = Object.entries(HELP_CONTENT_DATABASE)[0];

    expect(getHelpContent(firstKey)).toEqual(firstItem);
    expect(getShortHelp(firstKey)).toBe(firstItem.shortText);

    const fallback = getHelpContent('__missing__.topic');
    expect(fallback.id).toBe('__missing__.topic');
    expect(getShortHelp('__missing__.topic')).toBe('Click for more information');

    // Searching a real title must return at least that item.
    const results = searchHelpContent(firstItem.title);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.map((r) => r.id)).toContain(firstItem.id);
  });
});

describe('moduleContent barrel parity', () => {
  it('re-exports the full public API surface', () => {
    for (const modules of [RESIDENTIAL_MODULES, GRID_OPS_MODULES, POLICY_MODULES, ALL_MODULES]) {
      expect(Array.isArray(modules)).toBe(true);
    }
    expect(typeof getModulesByTrack).toBe('function');
    expect(typeof getModuleById).toBe('function');
    expect(typeof getNextModule).toBe('function');
    expect(typeof getPreviousModule).toBe('function');
    // Compile-time checks that the public type exports still exist.
    const moduleTypeCheck: Module | undefined = undefined;
    const contentTypeCheck: ContentType | undefined = undefined;
    const videoCheck: VideoContent | undefined = undefined;
    const readingCheck: ReadingContent | undefined = undefined;
    const quizQuestionCheck: QuizQuestion | undefined = undefined;
    const quizCheck: QuizContent | undefined = undefined;
    const interactiveCheck: InteractiveContent | undefined = undefined;
    expect(moduleTypeCheck).toBeUndefined();
    expect(contentTypeCheck).toBeUndefined();
    expect(videoCheck).toBeUndefined();
    expect(readingCheck).toBeUndefined();
    expect(quizQuestionCheck).toBeUndefined();
    expect(quizCheck).toBeUndefined();
    expect(interactiveCheck).toBeUndefined();
  });

  it(`contains exactly ${EXPECTED_MODULE_COUNT} modules (${EXPECTED_MODULES_PER_TRACK} per track)`, () => {
    // locked at 15 on 2026-10-05 — parity guard, update only if content
    // intentionally changes.
    expect(ALL_MODULES).toHaveLength(EXPECTED_MODULE_COUNT);
    expect(RESIDENTIAL_MODULES).toHaveLength(EXPECTED_MODULES_PER_TRACK);
    expect(GRID_OPS_MODULES).toHaveLength(EXPECTED_MODULES_PER_TRACK);
    expect(POLICY_MODULES).toHaveLength(EXPECTED_MODULES_PER_TRACK);
  });

  it('ALL_MODULES is the concatenation of the three track arrays', () => {
    expect(ALL_MODULES).toEqual([
      ...RESIDENTIAL_MODULES,
      ...GRID_OPS_MODULES,
      ...POLICY_MODULES,
    ]);
  });

  it('every module matches the Module shape and ids are unique', () => {
    const ids = new Set<string>();
    for (const m of ALL_MODULES) {
      expect(typeof m.id).toBe('string');
      expect(m.id.length).toBeGreaterThan(0);
      expect(typeof m.track_id).toBe('string');
      expect(TRACK_SLUGS).toContain(m.track_slug);
      expect(typeof m.title).toBe('string');
      expect(typeof m.description).toBe('string');
      expect(typeof m.sequence_number).toBe('number');
      expect(typeof m.duration_minutes).toBe('number');
      expect(['video', 'reading', 'quiz', 'interactive']).toContain(m.content_type);
      expect(m.content_data).toBeDefined();
      expect(typeof m.content_data).toBe('object');
      expect(Array.isArray(m.learning_objectives)).toBe(true);
      ids.add(m.id);
    }
    expect(ids.size).toBe(EXPECTED_MODULE_COUNT);
  });

  it('per-track arrays match their canonical track_slug buckets', () => {
    expect(getModulesByTrack('residential-energy')).toEqual(RESIDENTIAL_MODULES);
    expect(getModulesByTrack('grid-operations')).toEqual(GRID_OPS_MODULES);
    expect(getModulesByTrack('policy-regulatory')).toEqual(POLICY_MODULES);
    expect(getModulesByTrack('__missing__')).toEqual([]);
  });

  it('lookup and sequencing helpers still work across the split', () => {
    const first = RESIDENTIAL_MODULES[0];
    const second = RESIDENTIAL_MODULES[1];
    const last = RESIDENTIAL_MODULES[RESIDENTIAL_MODULES.length - 1];

    expect(getModuleById(first.id)).toEqual(first);
    expect(getModuleById('__missing__')).toBeUndefined();

    // Sequencing stays inside the same track and respects order.
    expect(getNextModule(first.id)).toEqual(second);
    expect(getPreviousModule(first.id)).toBeUndefined();
    expect(getPreviousModule(second.id)).toEqual(first);
    expect(getNextModule(last.id)).toBeUndefined();
  });
});

// Exact-content parity (audit G19): pins a SHA-256 of the serialized content
// so any silent text drift in the migrated modules is caught — not just
// counts, IDs, or shape. Update the hash ONLY alongside an intentional
// content change; a drift failure means a refactor altered user-facing copy.
describe('exact content parity (hash-pinned)', () => {
  const stableSerialize = (value: unknown): string =>
    JSON.stringify(value, (_key, val) => (typeof val === 'function' ? `[fn ${val.name}]` : val));

  it('helpContent serialized text matches the pinned hash', async () => {
    const { createHash } = await import('node:crypto');
    const digest = createHash('sha256')
      .update(stableSerialize(HELP_CONTENT_DATABASE))
      .digest('hex');
    expect(digest).toBe('4c4e8e28f75dbaa00f310d1b0c91cccc5b4c028804b0dfa79fcdedefdcf9688c');
  });

  it('moduleContent serialized text matches the pinned hash', async () => {
    const { createHash } = await import('node:crypto');
    const digest = createHash('sha256')
      .update(stableSerialize(ALL_MODULES))
      .digest('hex');
    expect(digest).toBe('6af8374b5ff80493b283f1b30f67f21cd0faa6391d9158900d8a3290eafa3203');
  });
});
