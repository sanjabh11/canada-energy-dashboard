import React from 'react';

interface SectionProps {
  children: React.ReactNode;
  className?: string;
}

export const Section: React.FC<SectionProps> = ({ children, className }) => {
  const classes = ['container', 'section', className].filter(Boolean).join(' ');
  return <section className={classes}>{children}</section>;
};
