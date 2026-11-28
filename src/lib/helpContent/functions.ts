import { HELP_CONTENT_DATABASE } from './database';
import type { HelpContentItem } from './types';

/**
 * Get help content by ID
 * Falls back to auto-generated content if not found
 */
export function getHelpContent(id: string): HelpContentItem {
  // Check if we have custom content
  if (HELP_CONTENT_DATABASE[id]) {
    return HELP_CONTENT_DATABASE[id];
  }

  // Generate friendly fallback for missing content
  const title = id
    .split('.')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).replace(/_/g, ' '))
    .join(' - ');

  // Escape HTML entities to prevent XSS from crafted IDs
  const safeTitle = title
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  return {
    id,
    title,
    shortText: `Learn about ${title}`,
    difficulty: 'beginner',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">${safeTitle}</h3>
      <p class="mb-4">Detailed help content for this feature is being developed.</p>
      <p class="mb-4">This feature is fully functional and ready to use.</p>
      
      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
        <p class="text-sm"><strong>💡 Need Help?</strong> If you have questions about this feature, please contact your instructor or check the platform documentation.</p>
      </div>
    `,
  };
}

/**
 * Get short tooltip text for quick help
 */
export function getShortHelp(id: string): string {
  const content = HELP_CONTENT_DATABASE[id];
  return content?.shortText || 'Click for more information';
}

/**
 * Search help content
 */
export function searchHelpContent(query: string): HelpContentItem[] {
  const lowerQuery = query.toLowerCase();
  return Object.values(HELP_CONTENT_DATABASE).filter(
    (item) =>
      item.title.toLowerCase().includes(lowerQuery) ||
      item.shortText.toLowerCase().includes(lowerQuery) ||
      item.bodyHtml.toLowerCase().includes(lowerQuery),
  );
}
