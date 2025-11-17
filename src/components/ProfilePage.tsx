import React from 'react';
import { useAuth, ProtectedRoute } from './auth';
import { User, Award, CreditCard, Settings, Mail, MapPin, Shield, TrendingUp } from 'lucide-react';

function ProfilePageContent() {
  const { user, edubizUser } = useAuth();

  // Tier display configuration
  const tierConfig = {
    free: {
      label: 'Free',
      color: 'text-slate-400',
      bgColor: 'bg-slate-800',
      borderColor: 'border-slate-700',
      icon: '🆓'
    },
    edubiz: {
      label: 'Edubiz',
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-950',
      borderColor: 'border-cyan-700',
      icon: '🎓'
    },
    pro: {
      label: 'Pro',
      color: 'text-purple-400',
      bgColor: 'bg-purple-950',
      borderColor: 'border-purple-700',
      icon: '⭐'
    }
  };

  const currentTier = edubizUser?.tier || 'free';
  const config = tierConfig[currentTier as keyof typeof tierConfig] || tierConfig.free;

  // AI query limit
  const aiQueriesLimit = currentTier === 'free' ? 10 : '∞';
  const aiQueriesUsed = edubizUser?.ai_queries_today || 0;
  const aiQueriesPercent = currentTier === 'free' ? (aiQueriesUsed / 10) * 100 : 0;

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-900 to-blue-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-blue-700 p-3 rounded-xl mr-4">
                <User className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">My Profile</h1>
                <p className="text-blue-100 text-sm mt-1">Manage your account and preferences</p>
              </div>
            </div>
            <a
              href="/"
              className="text-blue-100 hover:text-white transition-colors text-sm font-medium"
            >
              ← Back to Dashboard
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Account Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account Information Card */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl p-6">
              <div className="flex items-center mb-6">
                <Shield className="h-6 w-6 text-cyan-400 mr-3" />
                <h2 className="text-xl font-semibold text-white">Account Information</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <dt className="text-sm text-slate-400 mb-2 flex items-center">
                    <Mail className="h-4 w-4 mr-2" />
                    Email Address
                  </dt>
                  <dd className="text-white font-medium">{user?.email}</dd>
                </div>

                <div>
                  <dt className="text-sm text-slate-400 mb-2 flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    Full Name
                  </dt>
                  <dd className="text-white font-medium">{edubizUser?.full_name || 'Not set'}</dd>
                </div>

                <div>
                  <dt className="text-sm text-slate-400 mb-2 flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    Province
                  </dt>
                  <dd className="text-white font-medium">{edubizUser?.province_code || 'Not set'}</dd>
                </div>

                <div>
                  <dt className="text-sm text-slate-400 mb-2 flex items-center">
                    <Settings className="h-4 w-4 mr-2" />
                    Role
                  </dt>
                  <dd className="text-white font-medium capitalize">{edubizUser?.role_preference || 'Not set'}</dd>
                </div>

                <div>
                  <dt className="text-sm text-slate-400 mb-2">
                    Member Since
                  </dt>
                  <dd className="text-white font-medium">
                    {edubizUser?.created_at
                      ? new Date(edubizUser.created_at).toLocaleDateString('en-CA', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : 'Unknown'
                    }
                  </dd>
                </div>
              </div>
            </div>

            {/* AI Query Usage Card */}
            {currentTier === 'free' && (
              <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <TrendingUp className="h-6 w-6 text-cyan-400 mr-3" />
                    <h2 className="text-xl font-semibold text-white">AI Query Usage</h2>
                  </div>
                  <span className="text-white font-bold">
                    {aiQueriesUsed} / {aiQueriesLimit}
                  </span>
                </div>

                <div className="relative w-full h-3 bg-slate-700 rounded-full overflow-hidden mb-4">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                    style={{ width: `${aiQueriesPercent}%` }}
                  />
                </div>

                <p className="text-slate-400 text-sm">
                  {aiQueriesUsed >= 10 ? (
                    <span className="text-orange-400 font-medium">
                      ⚠️ You've reached your daily limit. Upgrade to Edubiz for unlimited queries!
                    </span>
                  ) : (
                    `You have ${10 - aiQueriesUsed} AI queries remaining today.`
                  )}
                </p>
              </div>
            )}

            {/* Badges Section - Placeholder for Week 1 Fri-Sun */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl p-6">
              <div className="flex items-center mb-4">
                <Award className="h-6 w-6 text-cyan-400 mr-3" />
                <h2 className="text-xl font-semibold text-white">My Badges</h2>
              </div>
              <div className="text-center py-8">
                <div className="text-6xl mb-4">🏆</div>
                <p className="text-slate-400 mb-2">Badge display coming soon!</p>
                <p className="text-sm text-slate-500">Week 1 (Fri-Sun): Badge components & celebration modals</p>
              </div>
            </div>
          </div>

          {/* Right Column - Tier Card */}
          <div className="space-y-6">
            {/* Current Tier Card */}
            <div className={`${config.bgColor} rounded-xl border ${config.borderColor} shadow-xl p-6`}>
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">{config.icon}</div>
                <h3 className={`text-2xl font-bold ${config.color} mb-2`}>
                  {config.label} Tier
                </h3>
                {currentTier === 'free' && (
                  <p className="text-slate-400 text-sm">Limited access to features</p>
                )}
                {currentTier === 'edubiz' && (
                  <p className="text-cyan-300 text-sm">Full educational access</p>
                )}
                {currentTier === 'pro' && (
                  <p className="text-purple-300 text-sm">Enterprise-grade analytics</p>
                )}
              </div>

              <div className="space-y-3 mb-6">
                {currentTier === 'free' && (
                  <>
                    <div className="flex items-center text-sm text-slate-300">
                      <span className="mr-2">✓</span>
                      View-only dashboards
                    </div>
                    <div className="flex items-center text-sm text-slate-300">
                      <span className="mr-2">✓</span>
                      10 AI queries per day
                    </div>
                    <div className="flex items-center text-sm text-slate-500">
                      <span className="mr-2">✗</span>
                      Certificate tracks
                    </div>
                    <div className="flex items-center text-sm text-slate-500">
                      <span className="mr-2">✗</span>
                      Live webinars
                    </div>
                  </>
                )}
                {currentTier === 'edubiz' && (
                  <>
                    <div className="flex items-center text-sm text-cyan-200">
                      <span className="mr-2">✓</span>
                      Unlimited AI queries
                    </div>
                    <div className="flex items-center text-sm text-cyan-200">
                      <span className="mr-2">✓</span>
                      Certificate tracks
                    </div>
                    <div className="flex items-center text-sm text-cyan-200">
                      <span className="mr-2">✓</span>
                      Live webinars
                    </div>
                    <div className="flex items-center text-sm text-cyan-200">
                      <span className="mr-2">✓</span>
                      Badge system
                    </div>
                  </>
                )}
                {currentTier === 'pro' && (
                  <>
                    <div className="flex items-center text-sm text-purple-200">
                      <span className="mr-2">✓</span>
                      Everything in Edubiz
                    </div>
                    <div className="flex items-center text-sm text-purple-200">
                      <span className="mr-2">✓</span>
                      Green Button data import
                    </div>
                    <div className="flex items-center text-sm text-purple-200">
                      <span className="mr-2">✓</span>
                      Compliance tracking
                    </div>
                    <div className="flex items-center text-sm text-purple-200">
                      <span className="mr-2">✓</span>
                      Custom reports
                    </div>
                  </>
                )}
              </div>

              {currentTier === 'free' && (
                <a
                  href="/pricing"
                  className="block w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-3 px-4 rounded-lg text-center transition-colors"
                >
                  Upgrade to Edubiz
                </a>
              )}
              {currentTier === 'edubiz' && (
                <a
                  href="/pricing"
                  className="block w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg text-center transition-colors"
                >
                  Upgrade to Pro
                </a>
              )}
              {currentTier === 'pro' && (
                <div className="text-center text-purple-300 text-sm font-medium">
                  You're on the highest tier! 🎉
                </div>
              )}
            </div>

            {/* Subscription Info (if applicable) */}
            {edubizUser?.subscription_status && edubizUser.subscription_status !== 'inactive' && (
              <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl p-6">
                <div className="flex items-center mb-4">
                  <CreditCard className="h-5 w-5 text-cyan-400 mr-3" />
                  <h3 className="text-lg font-semibold text-white">Subscription</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status</span>
                    <span className={`font-medium ${
                      edubizUser.subscription_status === 'active' ? 'text-green-400' :
                      edubizUser.subscription_status === 'trialing' ? 'text-cyan-400' :
                      'text-orange-400'
                    }`}>
                      {edubizUser.subscription_status.charAt(0).toUpperCase() + edubizUser.subscription_status.slice(1)}
                    </span>
                  </div>
                  {edubizUser.trial_ends_at && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Trial Ends</span>
                      <span className="text-white font-medium">
                        {new Date(edubizUser.trial_ends_at).toLocaleDateString('en-CA')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProfilePage() {
  return (
    <ProtectedRoute requiredTier="free">
      <ProfilePageContent />
    </ProtectedRoute>
  );
}
