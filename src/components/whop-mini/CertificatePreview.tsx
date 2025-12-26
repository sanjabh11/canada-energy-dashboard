/**
 * Certificate Preview
 * 
 * Shows 3 certificate tracks with lock icons for upsell.
 * Static data - no API calls.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {
    Award, ArrowLeft, Lock, Clock, BookOpen,
    ChevronRight, CheckCircle
} from 'lucide-react';

interface WhopMiniUser {
    id: string;
    tier: 'free' | 'basic' | 'pro';
    isWhopUser: boolean;
}

interface CertificateTrack {
    id: string;
    name: string;
    description: string;
    modules: number;
    hours: number;
    tier: 'free' | 'basic' | 'pro';
    topics: string[];
    outcomes: string[];
}

// Static certificate data
const CERTIFICATE_TRACKS: CertificateTrack[] = [
    {
        id: 'residential-energy',
        name: 'Residential Energy Fundamentals',
        description: 'Master the basics of Canadian energy systems, billing, and efficiency for homeowners.',
        modules: 5,
        hours: 6,
        tier: 'free',
        topics: [
            'Understanding Your Electricity Bill',
            'RoLR vs Competitive Rates',
            'Time-of-Use Pricing',
            'Energy Efficiency Basics',
            'Solar & Battery for Homes'
        ],
        outcomes: [
            'Read and analyze electricity bills',
            'Compare retail electricity rates',
            'Identify energy-saving opportunities',
            'Evaluate home solar proposals'
        ]
    },
    {
        id: 'grid-operations',
        name: 'Grid Operations & Markets',
        description: 'Understand how Alberta\'s electricity grid operates, including AESO markets and demand response.',
        modules: 8,
        hours: 12,
        tier: 'basic',
        topics: [
            'AESO Market Structure',
            'Pool Price Mechanics',
            'Supply Stack & Merit Order',
            'Grid Reliability (N-1)',
            'Demand Response Programs',
            'Ancillary Services',
            'Interconnection Queue',
            'Renewable Integration'
        ],
        outcomes: [
            'Interpret AESO pool price data',
            'Understand grid emergency protocols',
            'Evaluate demand response opportunities',
            'Navigate interconnection processes'
        ]
    },
    {
        id: 'tier-compliance',
        name: 'TIER Compliance & Carbon Markets',
        description: 'Master Alberta\'s industrial carbon pricing system, including 2025 amendments.',
        modules: 10,
        hours: 15,
        tier: 'pro',
        topics: [
            'TIER Regulation Overview',
            'Benchmark Calculations',
            'Compliance Pathways',
            '2025 Amendments Deep Dive',
            'Direct Investment Credits (NEW)',
            'Carbon Offset Markets',
            'Credit Reactivation Rules',
            'CCUS Integration',
            'Methane Regulations',
            'Compliance Reporting'
        ],
        outcomes: [
            'Calculate facility compliance obligations',
            'Evaluate offset vs credit strategies',
            'Navigate Direct Investment Credits',
            'Prepare TIER compliance reports'
        ]
    }
];

function TrackCard({
    track,
    userTier,
    index
}: {
    track: CertificateTrack;
    userTier: 'free' | 'basic' | 'pro';
    index: number;
}) {
    const tierOrder = { free: 0, basic: 1, pro: 2 };
    const isLocked = tierOrder[track.tier] > tierOrder[userTier];

    const tierColors = {
        free: 'bg-green-500/20 text-green-300 border-green-500/30',
        basic: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
        pro: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
    };

    const tierLabels = {
        free: 'Free',
        basic: 'Basic ($29/mo)',
        pro: 'Pro ($99/mo)'
    };

    return (
        <div className={`bg-slate-800/50 border rounded-xl overflow-hidden transition-all ${isLocked ? 'border-slate-700 opacity-80' : 'border-cyan-500/30 hover:border-cyan-500'
            }`}>
            {/* Header */}
            <div className="p-6 border-b border-slate-700">
                <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-lg 
                          flex items-center justify-center text-white font-bold">
                        {index + 1}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${tierColors[track.tier]}`}>
                            {tierLabels[track.tier]}
                        </span>
                        {isLocked && <Lock className="w-4 h-4 text-slate-500" />}
                    </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{track.name}</h3>
                <p className="text-slate-400">{track.description}</p>
            </div>

            {/* Stats */}
            <div className="px-6 py-4 bg-slate-900/50 flex items-center gap-6 border-b border-slate-700">
                <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-300">{track.modules} modules</span>
                </div>
                <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-300">{track.hours} hours</span>
                </div>
            </div>

            {/* Topics Preview */}
            <div className="p-6">
                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
                    Topics Covered
                </h4>
                <ul className="space-y-2 mb-6">
                    {track.topics.slice(0, 4).map((topic, i) => (
                        <li key={i} className="flex items-center gap-2 text-slate-300">
                            <CheckCircle className="w-4 h-4 text-cyan-500 flex-shrink-0" />
                            <span>{topic}</span>
                        </li>
                    ))}
                    {track.topics.length > 4 && (
                        <li className="text-slate-500 text-sm">
                            + {track.topics.length - 4} more topics
                        </li>
                    )}
                </ul>

                {/* CTA */}
                {isLocked ? (
                    <a
                        href={`https://whop.com/canada-energy/?plan=${track.tier}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 bg-slate-700 text-white 
                       font-semibold py-3 rounded-lg hover:bg-slate-600 transition-colors"
                    >
                        <Lock className="w-4 h-4" />
                        Unlock Track
                    </a>
                ) : (
                    <button
                        className="w-full flex items-center justify-center gap-2 bg-cyan-500 text-white 
                       font-semibold py-3 rounded-lg hover:bg-cyan-600 transition-colors"
                    >
                        Start Learning
                        <ChevronRight className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
}

export default function CertificatePreview({ user }: { user: WhopMiniUser | null }) {
    const userTier = user?.tier || 'free';

    return (
        <div className="min-h-screen bg-slate-900">
            {/* Header */}
            <div className="bg-slate-800 border-b border-slate-700">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <Link to="/whop-mini" className="inline-flex items-center text-slate-400 hover:text-white mb-4">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Academy
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-amber-500/20 rounded-lg flex items-center justify-center">
                            <Award className="w-6 h-6 text-amber-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Certificate Tracks</h1>
                            <p className="text-slate-400">Earn verified credentials in Canadian energy</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Value Proposition */}
                <div className="bg-gradient-to-r from-amber-500/10 to-purple-500/10 border border-amber-500/30 
                        rounded-xl p-6 mb-8">
                    <h2 className="text-xl font-bold text-white mb-2">Why Earn a Certificate?</h2>
                    <div className="grid md:grid-cols-3 gap-4 text-center md:text-left">
                        <div>
                            <div className="text-2xl font-bold text-amber-400">LinkedIn</div>
                            <div className="text-slate-400 text-sm">Shareable credentials</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-cyan-400">QR Verified</div>
                            <div className="text-slate-400 text-sm">Instant verification</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-purple-400">$2,600+</div>
                            <div className="text-slate-400 text-sm">CEM exam equivalent</div>
                        </div>
                    </div>
                </div>

                {/* Tracks Grid */}
                <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-6">
                    {CERTIFICATE_TRACKS.map((track, index) => (
                        <TrackCard
                            key={track.id}
                            track={track}
                            userTier={userTier}
                            index={index}
                        />
                    ))}
                </div>

                {/* CEM Prep Callout */}
                <div className="mt-8 bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Award className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white mb-2">
                                Preparing for CEM Certification?
                            </h3>
                            <p className="text-slate-400 mb-4">
                                Our TIER Compliance track covers many topics from the Certified Energy Manager (CEM) exam.
                                Use it as affordable prep before investing $2,670 in the official CIET course.
                            </p>
                            <a
                                href="https://whop.com/canada-energy/?plan=pro"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-purple-400 font-semibold hover:text-purple-300"
                            >
                                Start CEM Prep
                                <ChevronRight className="w-4 h-4 ml-1" />
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
