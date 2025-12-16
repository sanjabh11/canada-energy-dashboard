/**
 * WhopExperiencePage - Main Experience View for Whop Integration
 * 
 * This page is rendered when users access the app through Whop.
 * Path: /whop/experience/:experienceId?
 * 
 * Features:
 * - Detects Whop iframe context
 * - Handles Whop user token
 * - Shows appropriate content based on user tier
 * - Optimized for iframe embedding
 */

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from './auth';
import { whopClient, verifyWhopToken, type WhopUser } from '../lib/whop';
import { CertificatesPageContent } from './CertificatesPage';
import { EnergyDataDashboard } from './EnergyDataDashboard';
import { Zap, BookOpen, Award, Users, Loader } from 'lucide-react';

interface WhopExperiencePageProps {
    // Optional prop to force a specific view
    defaultView?: 'dashboard' | 'certificates' | 'cohorts';
}

export function WhopExperiencePage({ defaultView = 'certificates' }: WhopExperiencePageProps) {
    const { experienceId } = useParams<{ experienceId?: string }>();
    const [searchParams] = useSearchParams();
    const { user, loading: authLoading } = useAuth();

    // View state
    const [currentView, setCurrentView] = useState<'certificates' | 'dashboard' | 'cohorts'>(defaultView);

    const [isInIframe, setIsInIframe] = useState(false);
    const [whopLoading, setWhopLoading] = useState(true);
    const [whopUser, setWhopUser] = useState<WhopUser | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Detect iframe context and handle Whop token
    useEffect(() => {
        const checkWhopContext = async () => {
            // Check if we're in an iframe
            const inIframe = window.self !== window.top;
            setIsInIframe(inIframe);

            // Check for Whop token in URL or headers
            const whopToken = searchParams.get('whop_token') ||
                searchParams.get('token');

            if (whopToken) {
                try {
                    const verified = await verifyWhopToken(whopToken);
                    if (verified.valid) {
                        const loggedInUser = await whopClient.loginFromToken(whopToken);
                        setWhopUser(loggedInUser);
                    } else {
                        console.warn('Whop token invalid:', verified.error);
                    }
                } catch (err) {
                    console.error('Error verifying Whop token:', err);
                    setError('Failed to authenticate with Whop');
                }
            }

            // Also check for existing Whop session
            const existingUser = whopClient.getCurrentUser();
            if (existingUser?.isWhopUser) {
                setWhopUser(existingUser);
            }

            setWhopLoading(false);
        };

        checkWhopContext();
    }, [searchParams]);

    // Loading state
    if (authLoading || whopLoading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <Loader className="w-12 h-12 text-cyan-500 animate-spin mx-auto mb-4" />
                    <p className="text-slate-400">Loading Canada Energy Academy...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Zap className="w-8 h-8 text-red-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Connection Error</h1>
                    <p className="text-slate-400">{error}</p>
                </div>
            </div>
        );
    }

    // Determine the active user (Whop user takes precedence)
    const activeUser = whopUser || user;
    const tier = activeUser?.tier || 'free';

    return (
        <div className={`whop-experience ${isInIframe ? 'in-iframe' : ''}`}>
            {/* Iframe-specific styles */}
            {isInIframe && (
                <style>{`
          body { 
            margin: 0; 
            padding: 0; 
            overflow-x: hidden;
          }
          /* Hide the main navigation header in iframe */
          .whop-experience.in-iframe header.nav-header,
          .whop-experience.in-iframe header.site-header {
            display: none !important;
          }
        `}</style>
            )}

            {/* Welcome Banner (only in iframe) */}
            {isInIframe && activeUser && (
                <div className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border-b border-cyan-500/30 px-4 py-3">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Zap className="w-5 h-5 text-cyan-400" />
                            <span className="text-white font-medium">
                                Canada Energy Academy
                            </span>
                            {activeUser.name && (
                                <span className="text-slate-400">• Welcome back, {activeUser.name}</span>
                            )}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${tier === 'free' ? 'bg-slate-700 text-slate-300' :
                            tier === 'basic' ? 'bg-cyan-500/20 text-cyan-300' :
                                tier === 'pro' ? 'bg-purple-500/20 text-purple-300' :
                                    'bg-amber-500/20 text-amber-300'
                            } capitalize`}>
                            {tier} Learner
                        </span>
                    </div>
                </div>
            )}

            {/* Quick Navigation / Tab Switcher (for iframe users) */}
            {isInIframe && (
                <div className="bg-slate-800/50 border-b border-slate-700 px-4 py-2">
                    <div className="max-w-7xl mx-auto flex gap-4 overflow-x-auto">
                        <button
                            onClick={() => setCurrentView('certificates')}
                            className={`flex items-center gap-2 px-3 py-1 rounded text-sm transition-colors ${currentView === 'certificates'
                                ? 'bg-cyan-500/20 text-cyan-300 font-medium'
                                : 'text-slate-300 hover:text-white hover:bg-slate-700'
                                }`}
                        >
                            <BookOpen className="w-4 h-4" />
                            My Learning
                        </button>
                        <button
                            onClick={() => setCurrentView('dashboard')}
                            className={`flex items-center gap-2 px-3 py-1 rounded text-sm transition-colors ${currentView === 'dashboard'
                                ? 'bg-cyan-500/20 text-cyan-300 font-medium'
                                : 'text-slate-300 hover:text-white hover:bg-slate-700'
                                }`}
                        >
                            <Zap className="w-4 h-4" />
                            Energy Dashboard
                        </button>
                        {(tier === 'pro' || tier === 'team') && (
                            <a href="/whop/dashboard" className="flex items-center gap-2 px-3 py-1 rounded text-sm text-slate-300 hover:text-white hover:bg-slate-700">
                                <Users className="w-4 h-4" />
                                Creator Dashboard
                            </a>
                        )}
                    </div>
                </div>
            )}

            {/* Conditional Content Rendering */}
            <div className="min-h-screen bg-slate-900">
                {currentView === 'certificates' ? (
                    <div className="pb-12">
                        {/* Learning Hero Section */}
                        <div className="relative overflow-hidden bg-slate-900 border-b border-slate-800">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10" />
                            <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
                                <h1 className="text-4xl font-bold text-white mb-4">
                                    Your Learning Journey
                                </h1>
                                <p className="text-xl text-slate-300 max-w-2xl">
                                    Master Canada's energy systems through credentialed tracks.
                                    {tier === 'free' && " Upgrade to earn verifying certificates."}
                                </p>
                            </div>
                        </div>
                        <CertificatesPageContent />
                    </div>
                ) : (
                    <EnergyDataDashboard />
                )}
            </div>
        </div>
    );
}

export default WhopExperiencePage;
