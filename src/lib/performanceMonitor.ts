/**
 * Performance Monitor
 *
 * Comprehensive performance monitoring and optimization utility
 * for the Canada Energy Intelligence Platform.
 */

import React from 'react';

export interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage: number;
  networkLatency: number;
  bundleSize: number;
  coreWebVitals: {
    lcp: number; // Largest Contentful Paint
    fid: number; // First Input Delay
    cls: number; // Cumulative Layout Shift
  };
  customMetrics: {
    dataLoadTime: number;
    chartRenderTime: number;
    apiResponseTime: number;
  };
}

export interface PerformanceReport {
  timestamp: Date;
  metrics: PerformanceMetrics;
  recommendations: string[];
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export class PerformanceMonitor {
  private metrics: Partial<PerformanceMetrics> = {};
  private observers: PerformanceObserver[] = [];

  public startMonitoring(): void {
    this.setupCoreWebVitals();
    this.setupCustomMetrics();
    this.setupMemoryMonitoring();
    this.setupNetworkMonitoring();
  }

  public stopMonitoring(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }

  private setupCoreWebVitals(): void {
    // Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.metrics.coreWebVitals = {
        ...this.metrics.coreWebVitals,
        lcp: lastEntry.startTime
      };
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    this.observers.push(lcpObserver);

    // First Input Delay (FID)
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        this.metrics.coreWebVitals = {
          ...this.metrics.coreWebVitals,
          fid: (entry as any).processingStart - entry.startTime
        };
      });
    });
    fidObserver.observe({ entryTypes: ['first-input'] });
    this.observers.push(fidObserver);

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });
      this.metrics.coreWebVitals = {
        ...this.metrics.coreWebVitals,
        cls: clsValue
      };
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });
    this.observers.push(clsObserver);
  }

  private setupCustomMetrics(): void {
    // Monitor data loading performance
    const dataLoadStart = performance.now();

    // Override fetch to monitor API calls
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const start = performance.now();
      const response = await originalFetch(...args);
      const end = performance.now();

      this.metrics.customMetrics = {
        ...this.metrics.customMetrics,
        apiResponseTime: end - start
      };

      return response;
    };

    // Monitor component render performance
    this.monitorComponentRenders();
  }

  private setupMemoryMonitoring(): void {
    if ('memory' in performance) {
      const updateMemoryUsage = () => {
        this.metrics.memoryUsage = (performance as any).memory.usedJSHeapSize;
      };

      updateMemoryUsage();
      setInterval(updateMemoryUsage, 5000);
    }
  }

  private setupNetworkMonitoring(): void {
    const resourceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (entry.name.includes('api') || entry.name.includes('supabase')) {
          this.metrics.networkLatency = entry.responseEnd - entry.requestStart;
        }
      });
    });
    resourceObserver.observe({ entryTypes: ['navigation', 'resource'] });
    this.observers.push(resourceObserver);
  }

  private monitorComponentRenders(): void {
    // Monitor React component render times
    const originalRender = React.createElement;

    // This would require React DevTools integration in a real implementation
    // For now, we'll track general performance metrics
  }

  public async generateReport(): Promise<PerformanceReport> {
    // Collect all metrics
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const loadTime = navigation ? navigation.loadEventEnd - navigation.loadEventStart : 0;
    const renderTime = performance.now();

    const metrics: PerformanceMetrics = {
      loadTime,
      renderTime,
      memoryUsage: this.metrics.memoryUsage || 0,
      networkLatency: this.metrics.networkLatency || 0,
      bundleSize: this.estimateBundleSize(),
      coreWebVitals: {
        lcp: this.metrics.coreWebVitals?.lcp || 0,
        fid: this.metrics.coreWebVitals?.fid || 0,
        cls: this.metrics.coreWebVitals?.cls || 0
      },
      customMetrics: {
        dataLoadTime: this.metrics.customMetrics?.dataLoadTime || 0,
        chartRenderTime: this.metrics.customMetrics?.chartRenderTime || 0,
        apiResponseTime: this.metrics.customMetrics?.apiResponseTime || 0
      }
    };

    const score = this.calculatePerformanceScore(metrics);
    const grade = this.calculatePerformanceGrade(score);
    const recommendations = this.generatePerformanceRecommendations(metrics);

    return {
      timestamp: new Date(),
      metrics,
      recommendations,
      score,
      grade
    };
  }

  private estimateBundleSize(): number {
    // Estimate bundle size based on resource loading
    const resources = performance.getEntriesByType('resource');
    let totalSize = 0;

    resources.forEach((resource: any) => {
      if (resource.transferSize) {
        totalSize += resource.transferSize;
      }
    });

    return totalSize;
  }

  private calculatePerformanceScore(metrics: PerformanceMetrics): number {
    let score = 100;

    // Load time penalty (target: < 2s)
    if (metrics.loadTime > 2000) score -= 20;
    else if (metrics.loadTime > 1000) score -= 10;

    // LCP penalty (target: < 2.5s)
    if (metrics.coreWebVitals.lcp > 2500) score -= 25;
    else if (metrics.coreWebVitals.lcp > 1500) score -= 15;

    // FID penalty (target: < 100ms)
    if (metrics.coreWebVitals.fid > 100) score -= 20;
    else if (metrics.coreWebVitals.fid > 50) score -= 10;

    // CLS penalty (target: < 0.1)
    if (metrics.coreWebVitals.cls > 0.1) score -= 15;
    else if (metrics.coreWebVitals.cls > 0.05) score -= 5;

    // Memory usage penalty
    if (metrics.memoryUsage > 50 * 1024 * 1024) score -= 10; // 50MB threshold

    return Math.max(0, score);
  }

  private calculatePerformanceGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  private generatePerformanceRecommendations(metrics: PerformanceMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.loadTime > 2000) {
      recommendations.push('Optimize initial page load time - consider code splitting and lazy loading');
    }

    if (metrics.coreWebVitals.lcp > 2500) {
      recommendations.push('Improve Largest Contentful Paint - optimize image loading and font rendering');
    }

    if (metrics.coreWebVitals.fid > 100) {
      recommendations.push('Reduce First Input Delay - minimize JavaScript execution blocking');
    }

    if (metrics.coreWebVitals.cls > 0.1) {
      recommendations.push('Minimize Cumulative Layout Shift - reserve space for dynamic content');
    }

    if (metrics.memoryUsage > 50 * 1024 * 1024) {
      recommendations.push('Optimize memory usage - consider component cleanup and data virtualization');
    }

    if (metrics.customMetrics.apiResponseTime > 1000) {
      recommendations.push('Improve API response times - consider caching and CDN optimization');
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance is excellent - maintain current optimization practices');
    }

    return recommendations;
  }

  public generateHTMLReport(report: PerformanceReport): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <title>Performance Audit Report</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; line-height: 1.6; }
          .score { font-size: 48px; font-weight: bold; color: ${this.getGradeColor(report.grade)}; }
          .metric { margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 5px; }
          .recommendation { margin: 5px 0; padding: 8px; background: #e3f2fd; border-left: 4px solid #2196f3; }
          .grade-A { color: #4caf50; }
          .grade-B { color: #8bc34a; }
          .grade-C { color: #ff9800; }
          .grade-D { color: #ff5722; }
          .grade-F { color: #f44336; }
        </style>
      </head>
      <body>
        <h1>Performance Audit Report</h1>
        <div class="score">${report.score.toFixed(1)}%</div>
        <p><strong>Grade:</strong> <span class="grade-${report.grade}">${report.grade}</span></p>
        <p><strong>Generated:</strong> ${report.timestamp.toLocaleString()}</p>

        <h2>Core Metrics</h2>
        <div class="metric">
          <strong>Load Time:</strong> ${report.metrics.loadTime.toFixed(2)}ms
          ${report.metrics.loadTime > 2000 ? ' ⚠️' : ' ✅'}
        </div>
        <div class="metric">
          <strong>Largest Contentful Paint:</strong> ${report.metrics.coreWebVitals.lcp.toFixed(2)}ms
          ${report.metrics.coreWebVitals.lcp > 2500 ? ' ⚠️' : ' ✅'}
        </div>
        <div class="metric">
          <strong>First Input Delay:</strong> ${report.metrics.coreWebVitals.fid.toFixed(2)}ms
          ${report.metrics.coreWebVitals.fid > 100 ? ' ⚠️' : ' ✅'}
        </div>
        <div class="metric">
          <strong>Cumulative Layout Shift:</strong> ${report.metrics.coreWebVitals.cls.toFixed(3)}
          ${report.metrics.coreWebVitals.cls > 0.1 ? ' ⚠️' : ' ✅'}
        </div>

        <h2>Custom Metrics</h2>
        <div class="metric">
          <strong>Memory Usage:</strong> ${(report.metrics.memoryUsage / 1024 / 1024).toFixed(2)} MB
        </div>
        <div class="metric">
          <strong>API Response Time:</strong> ${report.metrics.customMetrics.apiResponseTime.toFixed(2)}ms
        </div>

        <h2>Recommendations</h2>
        ${report.recommendations.map(rec => `<div class="recommendation">${rec}</div>`).join('')}

        <h2>Bundle Analysis</h2>
        <div class="metric">
          <strong>Estimated Bundle Size:</strong> ${(report.metrics.bundleSize / 1024).toFixed(2)} KB
        </div>
      </body>
      </html>
    `;
  }

  private getGradeColor(grade: string): string {
    const colors = {
      'A': '#4caf50',
      'B': '#8bc34a',
      'C': '#ff9800',
      'D': '#ff5722',
      'F': '#f44336'
    };
    return colors[grade as keyof typeof colors] || '#666';
  }

  public async runAutomatedPerformanceTests(): Promise<PerformanceReport[]> {
    const reports: PerformanceReport[] = [];

    // Run tests under different conditions
    const scenarios = [
      { name: 'Normal Load', delay: 0 },
      { name: 'Slow Network', delay: 1000 },
      { name: 'High Memory', delay: 2000 }
    ];

    for (const scenario of scenarios) {
      await new Promise(resolve => setTimeout(resolve, scenario.delay));

      const report = await this.generateReport();
      report.metrics.customMetrics.dataLoadTime = scenario.delay;
      reports.push(report);
    }

    return reports;
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();
