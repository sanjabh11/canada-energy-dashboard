/**
 * FooterSettingsMenu Component
 *
 * Beautiful, accessible footer menu for low-priority/administrative features.
 * Stripe-level quality with smooth animations and responsive design.
 */

import React, { useState } from 'react';
import { Settings, Users, Lock, Info, ChevronUp, X } from 'lucide-react';
import { cn } from '../lib/utils';

export interface FooterMenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  description?: string;
}

interface FooterSettingsMenuProps {
  items: FooterMenuItem[];
  activeItem?: string;
  onSelect: (id: string) => void;
  className?: string;
}

export const FooterSettingsMenu: React.FC<FooterSettingsMenuProps> = ({
  items,
  activeItem,
  onSelect,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile: Floating Settings Button */}
      <div className="fixed bottom-4 right-4 z-50 md:hidden">
        <button
          onClick={() => setIsOpen(true)}
          className={cn(
            'bg-slate-900 hover:bg-slate-800 text-white',
            'rounded-full p-4 shadow-2xl',
            'flex items-center gap-2',
            'transition-all duration-300 hover:scale-110',
            'border-2 border-slate-700'
          )}
          aria-label="Open settings menu"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile: Full-Screen Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer */}
          <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="bg-slate-100 rounded-lg p-2">
                  <Settings className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Settings & More</h2>
                  <p className="text-sm text-slate-600">Additional features</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-slate-600" />
              </button>
            </div>

            {/* Menu Items */}
            <div className="px-4 py-4 max-h-[60vh] overflow-y-auto">
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = activeItem === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelect(item.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center gap-4 p-4 rounded-xl',
                      'transition-all duration-200 mb-2',
                      isActive
                        ? 'bg-blue-50 border-2 border-blue-200'
                        : 'bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    )}
                  >
                    <div className={cn(
                      'rounded-lg p-2.5 transition-colors',
                      isActive ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className={cn(
                        'font-semibold',
                        isActive ? 'text-blue-900' : 'text-slate-900'
                      )}>
                        {item.label}
                      </div>
                      {item.description && (
                        <div className="text-sm text-slate-600 mt-0.5">
                          {item.description}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Desktop: Footer Bar */}
      <div className={cn(
        'hidden md:block fixed bottom-0 inset-x-0 z-40',
        'bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900',
        'border-t-2 border-slate-700 shadow-2xl',
        className
      )}>
        <div className="max-w-screen-2xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Label */}
            <div className="flex items-center gap-3">
              <div className="bg-slate-700 rounded-lg p-2">
                <Settings className="h-4 w-4 text-slate-300" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Settings & More</div>
                <div className="text-xs text-slate-400">Additional features and tools</div>
              </div>
            </div>

            {/* Right: Menu Items */}
            <div className="flex items-center gap-2">
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = activeItem === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => onSelect(item.id)}
                    className={cn(
                      'group flex items-center gap-2 px-4 py-2 rounded-lg',
                      'transition-all duration-200 font-medium text-sm',
                      isActive
                        ? 'bg-white text-slate-900 shadow-lg scale-105'
                        : 'bg-slate-700/50 text-slate-200 hover:bg-slate-700 hover:text-white hover:scale-105'
                    )}
                    title={item.description}
                  >
                    <Icon className={cn(
                      'h-4 w-4 transition-transform duration-200',
                      'group-hover:scale-110'
                    )} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop: Spacer to prevent content from going under footer */}
      <div className="hidden md:block h-20" />
    </>
  );
};

export default FooterSettingsMenu;
