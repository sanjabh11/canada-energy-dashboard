import React from 'react';
import { getLeadIntakeDisclosure } from '../lib/leadIntake';

/**
 * Point-of-collection privacy notice (audit G7).
 *
 * Renders only deployment-configured collection details. When details have
 * not been approved and verified, the form is fail-closed and this explains
 * why collection is unavailable without inventing a contact or data region.
 */
export const PrivacyCollectionNotice: React.FC<{ className?: string }> = ({ className = '' }) => {
  const disclosure = getLeadIntakeDisclosure();
  return disclosure ? (
    <p className={`text-xs text-slate-500 ${className}`.trim()}>
      We collect your work contact details to respond to your inquiry and, if you request it, to
      scope a pilot. Facility figures are collected only when you explicitly submit a pilot request.
      Processing locations: {disclosure.processingLocations}. Retention:{' '}
      {disclosure.retentionSummary}. Questions: {disclosure.contactName},{' '}
      <a href={`mailto:${disclosure.contactEmail}`} className="underline hover:text-slate-300">
        {disclosure.contactEmail}
      </a>{' '}
      . Read our{' '}
      <a href={disclosure.policiesUrl} className="underline hover:text-slate-300">
        privacy policies and practices
      </a>
      .
    </p>
  ) : (
    <p role="status" className={`text-xs text-amber-300 ${className}`.trim()}>
      Pilot requests are disabled while the responsible privacy contact, processing locations, and
      retention period are being verified and approved.
    </p>
  );
};

export default PrivacyCollectionNotice;
