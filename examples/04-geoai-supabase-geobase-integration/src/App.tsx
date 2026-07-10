import React, { useState, useEffect } from 'react';
import { Map, BarChart3, Settings, LogIn, LogOut, User } from 'lucide-react';
import { InteractiveMap } from './components/InteractiveMap';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { DatabaseDebugger } from './components/DatabaseDebugger';
import { GeobaseConfigModal } from './components/GeobaseConfigModal';
import { carbon } from './utils/carbonTheme';

interface DetectionResult {
  task: string;
  detections: GeoJSON.FeatureCollection;
  geoRawImage: unknown;
  processingTime: number;
  modelLoadingTime?: number;
}
import { SupabaseService } from './lib/supabase';

type Tab = 'map' | 'analytics' | 'settings';

interface User {
  id: string;
  email?: string;
}

interface GeobaseConfig {
  projectRef: string;
  cogImageryUrl: string;
  apiKey: string;
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('map');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<'esri' | 'mapbox' | 'geobase' | 'google'>('esri');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authForm, setAuthForm] = useState({ email: '', password: '' });
  const [showGeobaseConfig, setShowGeobaseConfig] = useState(false);
  const [geobaseConfig, setGeobaseConfig] = useState<GeobaseConfig | null>(null);
  const [showDatabaseDebugger, setShowDatabaseDebugger] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [analyticsRefreshKey, setAnalyticsRefreshKey] = useState(0);

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const handleProviderChange = (provider: 'esri' | 'mapbox' | 'geobase' | 'google') => {
    if (provider === 'geobase' && !geobaseConfig) {
      setShowGeobaseConfig(true);
    } else {
      setSelectedProvider(provider);
    }
  };

  const handleGeobaseConfigSave = (config: GeobaseConfig) => {
    setGeobaseConfig(config);
    setSelectedProvider('geobase');
  };

  const handleGeobaseConfigUpdate = () => {
    setShowGeobaseConfig(true);
  };

  const checkAuthStatus = async () => {
    try {
      const currentUser = await SupabaseService.getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      console.log('No authenticated user');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      await SupabaseService.signIn(authForm.email, authForm.password);
      await checkAuthStatus();
      setShowAuthModal(false);
      setAuthForm({ email: '', password: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      await SupabaseService.signUp(authForm.email, authForm.password);
      await checkAuthStatus();
      setShowAuthModal(false);
      setAuthForm({ email: '', password: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
    }
  };

  const handleSignOut = async () => {
    try {
      await SupabaseService.signOut();
      setUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign out failed');
    }
  };

  const handleDetectionComplete = (results: DetectionResult[]) => {
    console.log('🎉 Detection completed:', results);
    setAnalyticsRefreshKey((key) => key + 1);
  };

  const handleDetectionError = (error: string) => {
    setError(error);
  };

  const handleSessionSelect = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setActiveTab('map');
  };

  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: carbon.carbon, color: carbon.chalk }}
      >
        <div className="text-center">
          <div className="spinner mx-auto mb-4 h-12 w-12" />
          <p style={{ color: carbon.secondary }}>Loading GeoAI Integration...</p>
        </div>
      </div>
    );
  }

  const tabClass = (tab: Tab) =>
    `flex items-center space-x-2 border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
      activeTab === tab ? 'border-[#2ba99a] text-[#2ba99a]' : 'border-transparent text-[#a3a3a3] hover:border-[#3a4249] hover:text-[#f0f0f0]'
    }`;

  return (
    <div className="min-h-screen" style={{ backgroundColor: carbon.carbon, color: carbon.chalk }}>
      <header className="border-b" style={{ backgroundColor: carbon.carbon, borderColor: carbon.border }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ backgroundColor: carbon.accent }}
                >
                  <Map className="h-5 w-5" style={{ color: carbon.carbon }} />
                </div>
                <h1 className="text-xl font-bold" style={{ color: carbon.chalk }}>
                  GeoAI Integration
                </h1>
              </div>
              <div className="hidden items-center space-x-1 md:flex">
                <span className="text-sm" style={{ color: carbon.muted }}>with</span>
                <span className="text-sm font-medium" style={{ color: carbon.success }}>Supabase</span>
                <span className="text-sm" style={{ color: carbon.muted }}>&</span>
                <span className="text-sm font-medium" style={{ color: carbon.blue }}>Geobase</span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <select
                  value={selectedProvider}
                  onChange={(e) => handleProviderChange(e.target.value as 'esri' | 'mapbox' | 'geobase' | 'google')}
                  className="carbon-select text-sm"
                >
                  <option value="esri">ESRI (Free)</option>
                  <option value="mapbox">Mapbox</option>
                  <option value="geobase">Geobase</option>
                  <option value="google">Google Maps</option>
                </select>

                {selectedProvider === 'geobase' && geobaseConfig && (
                  <button
                    onClick={handleGeobaseConfigUpdate}
                    className="carbon-btn-primary px-3 py-2 text-sm"
                    title="Update Geobase Configuration"
                  >
                    Config
                  </button>
                )}
              </div>

              {user ? (
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4" style={{ color: carbon.muted }} />
                    <span className="text-sm" style={{ color: carbon.secondary }}>{user.email}</span>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center space-x-1 px-3 py-2 text-sm transition-colors hover:text-white"
                    style={{ color: carbon.secondary }}
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="carbon-btn-primary flex items-center space-x-1"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <nav className="border-b" style={{ backgroundColor: carbon.carbon, borderColor: carbon.border }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button onClick={() => setActiveTab('map')} className={tabClass('map')}>
              <Map className="h-4 w-4" />
              <span>Interactive Map</span>
            </button>
            <button onClick={() => setActiveTab('analytics')} className={tabClass('analytics')}>
              <BarChart3 className="h-4 w-4" />
              <span>Analytics</span>
            </button>
            <button onClick={() => setActiveTab('settings')} className={tabClass('settings')}>
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </nav>

      {activeTab === 'map' ? (
        <main className="h-[calc(100vh-8rem)]" style={{ backgroundColor: carbon.carbon }}>
          {error && (
            <div className="absolute left-1/2 top-36 z-30 w-full max-w-xl -translate-x-1/2 px-4">
              <div className="rounded-lg border border-red-400/40 bg-red-950/90 p-4 text-red-100">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm">{error}</p>
                  <button
                    type="button"
                    onClick={() => setError(null)}
                    className="text-red-300 hover:text-red-100"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}
          <InteractiveMap
            provider={selectedProvider}
            geobaseConfig={geobaseConfig}
            isAuthenticated={Boolean(user)}
            selectedSessionId={selectedSessionId}
            onDetectionComplete={handleDetectionComplete}
            onError={handleDetectionError}
            showDatabaseDebugger={showDatabaseDebugger}
            onToggleDatabaseDebugger={setShowDatabaseDebugger}
          />
        </main>
      ) : (
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {error && (
          <div
            className="mb-6 rounded-lg border p-4"
            style={{ borderColor: 'rgba(252, 129, 129, 0.4)', backgroundColor: 'rgba(127, 29, 29, 0.35)' }}
          >
            <div className="flex">
              <div className="ml-3 flex-1">
                <p className="text-sm" style={{ color: '#fecaca' }}>{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-auto pl-3 transition-colors hover:text-white"
                style={{ color: '#fca5a5' }}
              >
                <span className="sr-only">Dismiss</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <AnalyticsDashboard
            userId={user?.id}
            onSessionSelect={handleSessionSelect}
            refreshKey={analyticsRefreshKey}
          />
        )}

        {activeTab === 'settings' && (
          <div className="carbon-card p-6">
            <h2 className="mb-6 text-xl font-semibold" style={{ color: carbon.chalk }}>Settings</h2>

            <div className="space-y-6">
              <div>
                <h3 className="mb-3 text-lg font-medium" style={{ color: carbon.chalk }}>Map Provider</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-lg border p-4" style={{ borderColor: carbon.border, backgroundColor: carbon.hinted }}>
                    <h4 className="mb-2 font-medium" style={{ color: carbon.chalk }}>ESRI (Recommended)</h4>
                    <p className="mb-2 text-sm" style={{ color: carbon.secondary }}>
                      Free satellite imagery, no API key required (max zoom 20)
                    </p>
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: carbon.success }} />
                      <span className="text-sm" style={{ color: carbon.success }}>Active</span>
                    </div>
                  </div>

                  <div className="rounded-lg border p-4" style={{ borderColor: carbon.border, backgroundColor: carbon.hinted }}>
                    <h4 className="mb-2 font-medium" style={{ color: carbon.chalk }}>Geobase</h4>
                    <p className="mb-2 text-sm" style={{ color: carbon.secondary }}>
                      Custom imagery with high resolution
                    </p>
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: carbon.warning }} />
                      <span className="text-sm" style={{ color: carbon.warning }}>Requires API Key</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-lg font-medium" style={{ color: carbon.chalk }}>Environment Variables</h3>
                <div className="rounded-lg border p-4" style={{ borderColor: carbon.border, backgroundColor: carbon.hinted }}>
                  <p className="mb-2 text-sm" style={{ color: carbon.secondary }}>Required for full functionality:</p>
                  <ul className="space-y-1 text-sm" style={{ color: carbon.secondary }}>
                    <li>• <code className="rounded px-1" style={{ backgroundColor: carbon.carbon, color: carbon.accent }}>VITE_SUPABASE_URL</code> — Your Supabase project URL</li>
                    <li>• <code className="rounded px-1" style={{ backgroundColor: carbon.carbon, color: carbon.accent }}>VITE_SUPABASE_ANON_KEY</code> — Your Supabase anon key</li>
                    <li>• <code className="rounded px-1" style={{ backgroundColor: carbon.carbon, color: carbon.accent }}>VITE_GEOBASE_PROJECT_REF</code> — Your Geobase project reference</li>
                    <li>• <code className="rounded px-1" style={{ backgroundColor: carbon.carbon, color: carbon.accent }}>VITE_GEOBASE_API_KEY</code> — Your Geobase API key</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-lg font-medium" style={{ color: carbon.chalk }}>Features</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {['Real-time AI Detection', 'Supabase Integration', 'PostGIS Spatial Queries', 'Analytics Dashboard'].map((feature) => (
                    <div key={feature} className="flex items-center space-x-3">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: carbon.success }} />
                      <span className="text-sm" style={{ color: carbon.secondary }}>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      )}

      {/* Database Debugger - Only show in development */}
      {import.meta.env.DEV && showDatabaseDebugger && <DatabaseDebugger />}

      {/* Authentication Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="carbon-card mx-4 w-full max-w-md p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold" style={{ color: carbon.chalk }}>
                {authMode === 'signin' ? 'Sign In' : 'Sign Up'}
              </h2>
              <button
                onClick={() => setShowAuthModal(false)}
                className="transition-colors hover:text-white"
                style={{ color: carbon.muted }}
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={authMode === 'signin' ? handleSignIn : handleSignUp}>
              <div className="space-y-4">
                <div>
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    value={authForm.email}
                    onChange={(e) => setAuthForm(prev => ({ ...prev, email: e.target.value }))}
                    className="carbon-input"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    value={authForm.password}
                    onChange={(e) => setAuthForm(prev => ({ ...prev, password: e.target.value }))}
                    className="carbon-input"
                    required
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                  className="text-sm transition-colors hover:underline"
                  style={{ color: carbon.accent }}
                >
                  {authMode === 'signin' ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                </button>
                <button type="submit" className="carbon-btn-primary">
                  {authMode === 'signin' ? 'Sign In' : 'Sign Up'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Geobase Configuration Modal */}
      <GeobaseConfigModal
        isOpen={showGeobaseConfig}
        onClose={() => setShowGeobaseConfig(false)}
        onSave={handleGeobaseConfigSave}
        initialConfig={geobaseConfig || undefined}
      />
    </div>
  );
}

export default App;
