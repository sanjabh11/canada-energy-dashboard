import React from 'react';
import { HelpButton } from '../HelpButton';

type HelpPosition = 'inline' | 'right' | 'top';

type WithHelpProps<P> = P & {
  helpId?: string;
  helpPosition?: HelpPosition;
};

export function withHelp<P extends object>(
  Component: React.ComponentType<P>,
  helpId: string,
  helpPosition: HelpPosition = 'inline'
) {
  const HelpWrappedComponent: React.FC<Omit<P, 'helpId' | 'helpPosition'>> = (props) => {
    return (
      <div className={`flex items-center gap-2 ${helpPosition === 'right' ? 'justify-between' : ''}`}>
        <Component {...(props as P)} />
        <HelpButton id={helpId} />
      </div>
    );
  };

  HelpWrappedComponent.displayName = `WithHelp(${Component.displayName || Component.name || 'Component'})`;

  return HelpWrappedComponent;
}
