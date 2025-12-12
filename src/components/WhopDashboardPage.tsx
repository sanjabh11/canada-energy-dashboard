/**
 * WhopDashboardPage - Creator Dashboard for Whop Integration
 * 
 * This page is for creators to manage their cohorts and view analytics.
 * Path: /whop/dashboard
 * 
 * Features:
 * - Cohort member management
 * - Engagement analytics
 * - Certificate issuance stats
 * - Revenue overview (from Whop)
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from './auth';
import { whopClient, type WhopTier, WHOP_ACCESS_MATRIX } from '../lib/whop';
import {
    Users, BookOpen, Award, TrendingUp,
    DollarSign, Calendar, BarChart3,
    ArrowRight, Loader, Lock
} from 'lucide-react';

import { getCohortStats, type CohortStats } from '../lib/cohortService';

export function WhopDashboardPage() {
    const { user, edubizUser, tier, hasTierAccess } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<CohortStats | null>(null);

    // Check if user has creator access (Pro or Team tier)
    const hasCreatorAccess = hasTierAccess('pro');

    useEffect(() => {
        const loadStats = async () => {
            setLoading(true);

            if (hasCreatorAccess && edubizUser?.id) {
                const data = await getCohortStats(edubizUser.id);
                setStats(data);
            }

            setLoading(false);
        };

        if (edubizUser) {
            loadStats();
        }
    }, [hasCreatorAccess, edubizUser]);

    // Access denied view
    if (!hasCreatorAccess) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
                <div className="max-w-md text-center">
                    <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Lock className="w-10 h-10 text-purple-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-4">
                        Creator Dashboard
                    </h1>
                    <p className="text-slate-400 mb-6">
                        The Creator Dashboard is available for Pro and Team tier members.
                        Manage cohorts, track engagement, and issue certificates.
                    </p>
                    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 mb-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Pro Tier Features</h3>
                        <ul className="space-y-2 text-left text-sm text-slate-300">
                            <li className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-cyan-400" />
                                Unlimited cohort management
                            </li>
                            <li className="flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-cyan-400" />
                                Member engagement analytics
                            </li>
                            <li className="flex items-center gap-2">
                                <Award className="w-4 h-4 text-cyan-400" />
                                Custom certificate templates
                            </li>
                            <li className="flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-cyan-400" />
                                Revenue tracking integration
                            </li>
                        </ul>
                    </div>
                    <a
                        href="https://whop.com/canada-energy-academy/?d2c=true&plan=pro"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all"
                    >
                        Upgrade to Pro
                        <ArrowRight className="w-5 h-5" />
                    </a>
                </div>
            </div>
        );
    }

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <Loader className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
                    <p className="text-slate-400">Loading creator dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900">
            {/* Header */}
            <header className="bg-gradient-to-r from-purple-900 to-pink-900 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-6 py-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold">Creator Dashboard</h1>
                            <p className="text-purple-200 mt-1">Manage your energy education community</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-purple-700/50 rounded-full text-sm font-medium capitalize">
                                {tier} Tier
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Stats Grid */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        icon={<Users className="w-6 h-6" />}
                        label="Total Members"
                        value={stats?.totalMembers || 0}
                        color="cyan"
                    />
                    <StatCard
                        icon={<TrendingUp className="w-6 h-6" />}
                        label="Active This Week"
                        value={stats?.activeMembers || 0}
                        color="green"
                    />
                    <StatCard
                        icon={<Award className="w-6 h-6" />}
                        label="Certificates Issued"
                        value={stats?.certificatesIssued || 0}
                        color="purple"
                    />
                    <StatCard
                        icon={<BarChart3 className="w-6 h-6" />}
                        label="Avg. Completion"
                        value={`${stats?.avgCompletion || 0}%`}
                        color="amber"
                    />
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <ActionCard
                        title="Manage Cohorts"
                        description="Create and manage learning cohorts for your community"
                        icon={<Users />}
                        href="/admin/cohorts"
                    />
                    <ActionCard
                        title="Certificate Tracks"
                        description="View and customize certificate programs"
                        icon={<BookOpen />}
                        href="/certificates"
                    />
                    <ActionCard
                        title="Member Analytics"
                        description="Deep dive into engagement metrics"
                        icon={<BarChart3 />}
                        href="/admin/cohorts"
                    />
                </div>
            </div>
        </div>
    );
}

// Stat Card Component
function StatCard({ icon, label, value, color }: {
    icon: React.ReactNode;
    label: string;
    value: number | string;
    color: 'cyan' | 'green' | 'purple' | 'amber';
}) {
    const colors = {
        cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
        green: 'bg-green-500/10 text-green-400 border-green-500/30',
        purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
        amber: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    };

    return (
        <div className={`rounded-xl border ${colors[color]} p-6`}>
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${colors[color].split(' ')[0]}`}>
                    {icon}
                </div>
                <div>
                    <p className="text-sm text-slate-400">{label}</p>
                    <p className="text-2xl font-bold text-white">{value}</p>
                </div>
            </div>
        </div>
    );
}

// Action Card Component
function ActionCard({ title, description, icon, href }: {
    title: string;
    description: string;
    icon: React.ReactNode;
    href: string;
}) {
    return (
        <a
            href={href}
            className="block bg-slate-800 rounded-xl border border-slate-700 p-6 hover:bg-slate-750 hover:border-slate-600 transition-all group"
        >
            <div className="flex items-start gap-4">
                <div className="p-3 bg-slate-700 rounded-lg text-slate-300 group-hover:text-cyan-400 transition-colors">
                    {icon}
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
                    <p className="text-sm text-slate-400">{description}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
            </div>
        </a>
    );
}

export default WhopDashboardPage;
