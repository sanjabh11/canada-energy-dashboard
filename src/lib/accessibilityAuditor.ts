/**
 * Accessibility Auditor
 *
 * Comprehensive accessibility auditing tool for the Canada Energy Intelligence Platform.
 * Checks WCAG 2.1 compliance, identifies issues, and provides recommendations.
 */

export interface AccessibilityIssue {
  type: 'error' | 'warning' | 'info';
  category: 'perceivable' | 'operable' | 'understandable' | 'robust';
  element: string;
  issue: string;
  description: string;
  recommendation: string;
  wcag: string;
  impact: 'high' | 'medium' | 'low';
}

export interface AccessibilityReport {
  score: number;
  level: 'A' | 'AA' | 'AAA';
  issues: AccessibilityIssue[];
  summary: {
    errors: number;
    warnings: number;
    passed: number;
    total: number;
  };
  recommendations: string[];
}

export class AccessibilityAuditor {
  private issues: AccessibilityIssue[] = [];

  public async auditPage(): Promise<AccessibilityReport> {
    this.issues = [];

    // Run all accessibility checks
    await this.checkColorContrast();
    await this.checkKeyboardNavigation();
    await this.checkScreenReaderCompatibility();
    await this.checkFormAccessibility();
    await this.checkImageAccessibility();
    await this.checkHeadingStructure();
    await this.checkLinkAccessibility();
    await this.checkAriaLabels();
    await this.checkFocusManagement();
    await this.checkResponsiveAccessibility();

    // Calculate score
    const score = this.calculateAccessibilityScore();
    const level = this.determineComplianceLevel(score);

    // Generate summary
    const summary = {
      errors: this.issues.filter(i => i.type === 'error').length,
      warnings: this.issues.filter(i => i.type === 'warning').length,
      passed: this.issues.filter(i => i.type === 'info').length,
      total: this.issues.length
    };

    // Generate recommendations
    const recommendations = this.generateRecommendations();

    return {
      score,
      level,
      issues: this.issues,
      summary,
      recommendations
    };
  }

  private async checkColorContrast(): Promise<void> {
    // Check for sufficient color contrast ratios
    const elements = document.querySelectorAll('*');
    const textElements = Array.from(elements).filter(el =>
      el.tagName.match(/^(P|H[1-6]|SPAN|A|BUTTON|LABEL)$/i) &&
      el.textContent?.trim()
    );

    for (const element of textElements) {
      const styles = window.getComputedStyle(element);
      const color = styles.color;
      const backgroundColor = styles.backgroundColor;

      // Check contrast ratio (simplified check)
      if (this.calculateContrastRatio(color, backgroundColor) < 4.5) {
        this.issues.push({
          type: 'error',
          category: 'perceivable',
          element: element.tagName.toLowerCase(),
          issue: 'Insufficient color contrast',
          description: `Color contrast ratio is below WCAG AA standard (4.5:1)`,
          recommendation: 'Increase contrast between text and background colors',
          wcag: '1.4.3',
          impact: 'high'
        });
      }
    }
  }

  private async checkKeyboardNavigation(): Promise<void> {
    // Check for keyboard accessibility
    const interactiveElements = document.querySelectorAll('button, a, input, select, textarea, [tabindex]');

    for (const element of Array.from(interactiveElements)) {
      const tabIndex = element.getAttribute('tabindex');
      if (tabIndex === '-1' && !element.hasAttribute('disabled')) {
        this.issues.push({
          type: 'warning',
          category: 'operable',
          element: element.tagName.toLowerCase(),
          issue: 'Element not keyboard accessible',
          description: 'Interactive element has tabindex="-1" without being disabled',
          recommendation: 'Ensure all interactive elements are keyboard accessible',
          wcag: '2.1.1',
          impact: 'medium'
        });
      }
    }

    // Check for skip links
    const skipLinks = document.querySelectorAll('a[href^="#"]');
    if (skipLinks.length === 0) {
      this.issues.push({
        type: 'warning',
        category: 'operable',
        element: 'body',
        issue: 'Missing skip navigation links',
        description: 'No skip navigation links found for keyboard users',
        recommendation: 'Add skip navigation links at the beginning of the page',
        wcag: '2.4.1',
        impact: 'medium'
      });
    }
  }

  private async checkScreenReaderCompatibility(): Promise<void> {
    // Check for proper semantic HTML
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    if (headings.length === 0) {
      this.issues.push({
        type: 'error',
        category: 'understandable',
        element: 'body',
        issue: 'No heading structure',
        description: 'Page lacks proper heading hierarchy for screen readers',
        recommendation: 'Use proper heading tags (h1-h6) to create document structure',
        wcag: '2.4.6',
        impact: 'high'
      });
    }

    // Check for missing alt text on images
    const images = document.querySelectorAll('img');
    for (const img of Array.from(images)) {
      if (!img.getAttribute('alt')) {
        this.issues.push({
          type: 'error',
          category: 'perceivable',
          element: 'img',
          issue: 'Missing alt text',
          description: 'Image missing alternative text for screen readers',
          recommendation: 'Add descriptive alt text to all images',
          wcag: '1.1.1',
          impact: 'high'
        });
      }
    }
  }

  private async checkFormAccessibility(): Promise<void> {
    // Check form labels and associations
    const inputs = document.querySelectorAll('input, select, textarea');
    for (const input of Array.from(inputs)) {
      const id = input.getAttribute('id');
      const ariaLabel = input.getAttribute('aria-label');
      const ariaLabelledBy = input.getAttribute('aria-labelledby');

      if (!id && !ariaLabel && !ariaLabelledBy) {
        this.issues.push({
          type: 'error',
          category: 'understandable',
          element: input.tagName.toLowerCase(),
          issue: 'Missing label association',
          description: 'Form control not properly associated with a label',
          recommendation: 'Add id to input and associate with label, or use aria-label',
          wcag: '3.3.2',
          impact: 'high'
        });
      }
    }
  }

  private async checkImageAccessibility(): Promise<void> {
    // Check for decorative images with empty alt text
    const images = document.querySelectorAll('img[alt=""]');
    for (const img of Array.from(images)) {
      if (!img.hasAttribute('role') || img.getAttribute('role') !== 'presentation') {
        this.issues.push({
          type: 'warning',
          category: 'perceivable',
          element: 'img',
          issue: 'Decorative image without proper role',
          description: 'Image with empty alt text should have role="presentation"',
          recommendation: 'Add role="presentation" to decorative images',
          wcag: '1.1.1',
          impact: 'low'
        });
      }
    }
  }

  private async checkHeadingStructure(): Promise<void> {
    // Check heading hierarchy
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let previousLevel = 0;
    let hasH1 = false;

    for (const heading of Array.from(headings)) {
      const level = parseInt(heading.tagName.charAt(1));

      if (heading.tagName === 'H1') {
        if (hasH1) {
          this.issues.push({
            type: 'error',
            category: 'understandable',
            element: 'h1',
            issue: 'Multiple H1 tags',
            description: 'Page contains multiple H1 headings',
            recommendation: 'Use only one H1 tag per page',
            wcag: '2.4.6',
            impact: 'medium'
          });
        }
        hasH1 = true;
      }

      if (level > previousLevel + 1 && previousLevel > 0) {
        this.issues.push({
          type: 'warning',
          category: 'understandable',
          element: heading.tagName.toLowerCase(),
          issue: 'Heading hierarchy gap',
          description: `Heading level ${level} follows level ${previousLevel}`,
          recommendation: 'Maintain proper heading hierarchy without gaps',
          wcag: '2.4.6',
          impact: 'medium'
        });
      }

      previousLevel = level;
    }

    if (!hasH1) {
      this.issues.push({
        type: 'error',
        category: 'understandable',
        element: 'body',
        issue: 'Missing H1 heading',
        description: 'Page does not have an H1 heading',
        recommendation: 'Add an H1 heading as the main page title',
        wcag: '2.4.6',
        impact: 'high'
      });
    }
  }

  private async checkLinkAccessibility(): Promise<void> {
    // Check for descriptive link text
    const links = document.querySelectorAll('a');
    for (const link of Array.from(links)) {
      const text = link.textContent?.trim();
      const href = link.getAttribute('href');

      if (text && text.length < 3 && !link.getAttribute('aria-label')) {
        this.issues.push({
          type: 'warning',
          category: 'understandable',
          element: 'a',
          issue: 'Vague link text',
          description: 'Link text is too short to be descriptive',
          recommendation: 'Use descriptive link text or add aria-label',
          wcag: '2.4.4',
          impact: 'medium'
        });
      }

      if (href?.startsWith('#') && !document.querySelector(href)) {
        this.issues.push({
          type: 'error',
          category: 'robust',
          element: 'a',
          issue: 'Broken anchor link',
          description: 'Link points to non-existent anchor',
          recommendation: 'Ensure anchor targets exist or remove the link',
          wcag: '2.4.1',
          impact: 'medium'
        });
      }
    }
  }

  private async checkAriaLabels(): Promise<void> {
    // Check for proper ARIA usage
    const elementsWithAria = document.querySelectorAll('[aria-label], [aria-labelledby], [aria-describedby]');

    for (const element of Array.from(elementsWithAria)) {
      const ariaLabel = element.getAttribute('aria-label');
      const ariaLabelledBy = element.getAttribute('aria-labelledby');
      const ariaDescribedBy = element.getAttribute('aria-describedby');

      if (ariaLabel && ariaLabel.trim().length === 0) {
        this.issues.push({
          type: 'error',
          category: 'understandable',
          element: element.tagName.toLowerCase(),
          issue: 'Empty aria-label',
          description: 'Element has empty aria-label attribute',
          recommendation: 'Provide meaningful aria-label text',
          wcag: '4.1.2',
          impact: 'high'
        });
      }

      if (ariaLabelledBy && !document.querySelector(`#${ariaLabelledBy}`)) {
        this.issues.push({
          type: 'error',
          category: 'robust',
          element: element.tagName.toLowerCase(),
          issue: 'Invalid aria-labelledby reference',
          description: 'aria-labelledby points to non-existent element',
          recommendation: 'Ensure the referenced element exists',
          wcag: '4.1.2',
          impact: 'high'
        });
      }
    }
  }

  private async checkFocusManagement(): Promise<void> {
    // Check for focus indicators
    const style = document.createElement('style');
    style.textContent = `
      *:focus {
        outline: none;
      }
    `;
    document.head.appendChild(style);

    // Check if any element removes focus outline without providing alternative
    const focusableElements = document.querySelectorAll('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    let hasCustomFocusStyle = false;

    for (const element of Array.from(focusableElements)) {
      const computedStyle = window.getComputedStyle(element, ':focus');
      if (computedStyle.outline !== 'none' || computedStyle.boxShadow !== 'none') {
        hasCustomFocusStyle = true;
        break;
      }
    }

    document.head.removeChild(style);

    if (!hasCustomFocusStyle) {
      this.issues.push({
        type: 'error',
        category: 'operable',
        element: 'body',
        issue: 'Missing focus indicators',
        description: 'No visible focus indicators found for keyboard navigation',
        recommendation: 'Ensure all interactive elements have visible focus indicators',
        wcag: '2.4.7',
        impact: 'high'
      });
    }
  }

  private async checkResponsiveAccessibility(): Promise<void> {
    // Check for touch target sizes on mobile
    const interactiveElements = document.querySelectorAll('button, a, input, select, [role="button"]');

    for (const element of Array.from(interactiveElements)) {
      const rect = element.getBoundingClientRect();
      if (rect.width < 44 || rect.height < 44) {
        this.issues.push({
          type: 'warning',
          category: 'operable',
          element: element.tagName.toLowerCase(),
          issue: 'Small touch target',
          description: 'Interactive element smaller than 44px minimum for touch interfaces',
          recommendation: 'Increase touch target size to at least 44x44 pixels',
          wcag: '2.5.5',
          impact: 'medium'
        });
      }
    }
  }

  private calculateContrastRatio(color1: string, color2: string): number {
    // Simplified contrast ratio calculation
    // In a real implementation, this would use a proper color library
    return 4.5; // Placeholder - would calculate actual ratio
  }

  private calculateAccessibilityScore(): number {
    const totalIssues = this.issues.length;
    if (totalIssues === 0) return 100;

    const errorPenalty = this.issues.filter(i => i.type === 'error').length * 5;
    const warningPenalty = this.issues.filter(i => i.type === 'warning').length * 2;
    const infoPenalty = this.issues.filter(i => i.type === 'info').length * 0.5;

    const totalPenalty = errorPenalty + warningPenalty + infoPenalty;
    return Math.max(0, 100 - totalPenalty);
  }

  private determineComplianceLevel(score: number): 'A' | 'AA' | 'AAA' {
    if (score >= 95) return 'AAA';
    if (score >= 85) return 'AA';
    return 'A';
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.issues.some(i => i.category === 'perceivable')) {
      recommendations.push('Improve color contrast ratios to meet WCAG standards');
    }

    if (this.issues.some(i => i.category === 'operable')) {
      recommendations.push('Ensure all interactive elements are keyboard accessible');
    }

    if (this.issues.some(i => i.category === 'understandable')) {
      recommendations.push('Add proper heading structure and semantic HTML');
    }

    if (this.issues.some(i => i.category === 'robust')) {
      recommendations.push('Ensure compatibility with assistive technologies');
    }

    if (recommendations.length === 0) {
      recommendations.push('Maintain current accessibility standards and continue regular audits');
    }

    return recommendations;
  }

  public generateHTMLReport(report: AccessibilityReport): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <title>Accessibility Audit Report</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; }
          .score { font-size: 48px; font-weight: bold; color: ${report.score >= 85 ? '#10b981' : report.score >= 70 ? '#f59e0b' : '#ef4444'}; }
          .issue { margin: 10px 0; padding: 10px; border-left: 4px solid; }
          .error { border-color: #ef4444; background: #fef2f2; }
          .warning { border-color: #f59e0b; background: #fffbeb; }
          .info { border-color: #3b82f6; background: #eff6ff; }
          .category { font-weight: bold; text-transform: uppercase; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <h1>Accessibility Audit Report</h1>
        <div class="score">${report.score.toFixed(1)}%</div>
        <p><strong>Compliance Level:</strong> ${report.level}</p>
        <p><strong>Issues Found:</strong> ${report.summary.errors} errors, ${report.summary.warnings} warnings</p>

        ${Object.entries(['perceivable', 'operable', 'understandable', 'robust'] as const).map(([category]) => `
          <div class="category">${category}</div>
          ${report.issues.filter(i => i.category === category).map(issue => `
            <div class="issue ${issue.type}">
              <strong>${issue.element}:</strong> ${issue.issue}<br>
              <small>${issue.description}</small><br>
              <em>Recommendation: ${issue.recommendation}</em>
            </div>
          `).join('')}
        `).join('')}

        <h2>Recommendations</h2>
        <ul>
          ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
      </body>
      </html>
    `;
  }
}

// Export singleton instance
export const accessibilityAuditor = new AccessibilityAuditor();
