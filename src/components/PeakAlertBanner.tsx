/**
 * Peak Alert Banner Component
 * 
 * Displays proactive alerts when demand is trending high.
 * Calculates demand trends from recent data points and predicts peak times.
 * Phase III.0 - Quick Win (1 hour, 98/100 ROI)
 */

import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, TrendingUp, Clock } from 'lucide-react';

interface PeakAlertBannerProps {
  currentDemand?: number;
  recentDemand?: number[];
  historicalPattern?: Array<{ hour: number; avg_demand: number }>;
}

export const PeakAlertBanner: React.FC<PeakAlertBannerProps> = ({
  currentDemand = 0,
  recentDemand = [],
  historicalPattern = []
}) => {
  const [dismissed, setDismissed] = useState(false);
  const [alertData, setAlertData] = useState<{
    show: boolean;
    trend: number;
    peakTime: string;
    severity: 'warning' | 'error' | 'info';
  }>({
    show: false,
    trend: 0,
    peakTime: '',
    severity: 'info'
  });

  useEffect(() => {
    // Check localStorage for dismissal (1 hour expiry)
    const dismissedUntil = localStorage.getItem('peak_alert_dismissed');
    if (dismissedUntil) {
      const expiryTime = parseInt(dismissedUntil, 10);
      if (Date.now() < expiryTime) {
        setDismissed(true);
        return;
      } else {
        localStorage.removeItem('peak_alert_dismissed');
      }
    }

    // Calculate demand trend
    if (recentDemand.length >= 3) {
      const avgRecent = recentDemand.slice(-6).reduce((sum, d) => sum + d, 0) / Math.min(recentDemand.length, 6);
      const trend = (currentDemand - avgRecent) / avgRecent;

      if (trend > 0.10) {
        // High demand spike detected
        const peakTime = predictPeakTime(historicalPattern);
        setAlertData({
          show: true,
          trend: trend * 100,
          peakTime,
          severity: trend > 0.20 ? 'error' : trend > 0.15 ? 'warning' : 'info'
        });
      } else {
        setAlertData({ show: false, trend: 0, peakTime: '', severity: 'info' });
      }
    }
  }, [currentDemand, recentDemand, historicalPattern]);

  const predictPeakTime = (pattern: Array<{ hour: number; avg_demand: number }>): string => {
    if (!pattern || pattern.length === 0) {
      // Default peak times for Ontario
      const hour = new Date().getHours();
      if (hour < 18) return '6:00 PM';
      if (hour < 20) return '8:00 PM';
      return 'Tomorrow morning';
    }

    // Find highest average demand hour in next 6 hours
    const currentHour = new Date().getHours();
    const nextHours = pattern
      .filter(p => p.hour > currentHour && p.hour <= currentHour + 6)
      .sort((a, b) => b.avg_demand - a.avg_demand);

    if (nextHours.length > 0) {
      const peakHour = nextHours[0].hour;
      const ampm = peakHour >= 12 ? 'PM' : 'AM';
      const displayHour = peakHour > 12 ? peakHour - 12 : peakHour;
      return `${displayHour}:00 ${ampm}`;
    }

    return '6:00 PM';
  };

  const handleDismiss = () => {
    setDismissed(true);
    // Store dismissal for 1 hour
    const expiryTime = Date.now() + (60 * 60 * 1000);
    localStorage.setItem('peak_alert_dismissed', expiryTime.toString());
  };

  if (!alertData.show || dismissed) {
    return null;
  }

  const severityStyles = {
    error: {
      bg: 'bg-gradient-to-r from-red-50 to-orange-50',
      border: 'border-red-300',
      text: 'text-red-900',
      icon: 'text-red-600',
      badge: 'bg-red-100 text-red-800'
    },
    warning: {
      bg: 'bg-gradient-to-r from-yellow-50 to-orange-50',
      border: 'border-yellow-300',
      text: 'text-yellow-900',
      icon: 'text-yellow-600',
      badge: 'bg-yellow-100 text-yellow-800'
    },
    info: {
      bg: 'bg-gradient-to-r from-blue-50 to-indigo-50',
      border: 'border-blue-300',
      text: 'text-blue-900',
      icon: 'text-blue-600',
      badge: 'bg-blue-100 text-blue-800'
    }
  };

  const styles = severityStyles[alertData.severity];

  return (
    <div className={`${styles.bg} border-l-4 ${styles.border} p-4 mb-6 rounded-lg shadow-md animate-slide-down`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <AlertTriangle className={`${styles.icon} animate-pulse`} size={24} />
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={`font-bold ${styles.text}`}>
                High Demand Alert
              </h3>
              <span className={`px-2 py-1 text-xs rounded-full font-medium ${styles.badge}`}>
                <TrendingUp size={12} className="inline mr-1" />
                +{alertData.trend.toFixed(0)}%
              </span>
            </div>
            
            <p className={`text-sm ${styles.text}`}>
              Demand is trending higher than average. Expected peak at{' '}
              <span className="font-bold">{alertData.peakTime}</span>
              {alertData.severity === 'error' && (
                <span className="ml-2 font-semibold">• Critical surge detected</span>
              )}
            </p>
            
            {alertData.trend > 0.15 && (
              <div className="flex items-center gap-2 mt-2 text-xs">
                <Clock size={14} className={styles.icon} />
                <span className={styles.text}>
                  Consider reducing non-essential power usage during peak hours
                </span>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className={`${styles.icon} hover:opacity-70 transition-opacity ml-4`}
          aria-label="Dismiss alert"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
};

export default PeakAlertBanner;
