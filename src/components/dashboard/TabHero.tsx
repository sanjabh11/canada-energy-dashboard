/**
 * TabHero - Reusable hero section used across multiple dashboard tabs
 * Extracts the repeated gradient hero pattern from EnergyDataDashboard.tsx
 */
import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface HeroCard {
  icon: LucideIcon;
  iconColor: string;
  title: string;
  description: string;
}

interface TabHeroProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  cards: HeroCard[];
  shaderClass?: string;
}

export function TabHero({ icon: Icon, title, subtitle, cards, shaderClass = 'shader-bg-secondary' }: TabHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--border-subtle)]/50">
      <div className={`absolute inset-0 ${shaderClass} animate-gradient-xy`}></div>
      <div className="absolute inset-0 bg-black/20"></div>
      <div className="relative z-10 p-8">
        <div className="text-center animate-fade-in">
          <div className="glass-card p-6 rounded-full w-20 h-20 mx-auto mb-6 animate-float">
            <Icon className="h-10 w-10 text-white mx-auto" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">{title}</h2>
          <p className="text-xl text-white/90 mb-8 animate-fade-in-delayed">
            {subtitle}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 animate-fade-in-slow">
            {cards.map((card, index) => {
              const CardIcon = card.icon;
              return (
                <div key={index} className="glass-card p-6 rounded-xl text-white">
                  <CardIcon className={`h-8 w-8 ${card.iconColor} mb-3`} />
                  <h3 className="font-semibold mb-2">{card.title}</h3>
                  <p className="text-sm text-white/80">{card.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
