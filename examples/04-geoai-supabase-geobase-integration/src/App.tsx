import React, { useState, useEffect } from 'react';
import { Map, BarChart3, Settings, LogIn, LogOut, User } from 'lucide-react';
import { InteractiveMap } from './components/InteractiveMap';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { DatabaseDebugger } from './components/DatabaseDebugger';
import { GeobaseConfigModal } from './components/GeobaseConfigModal';

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
    console.log('📊 Results summary:', results.map(r => ({
      task: r.task,
      featureCount: r.detections.features.length,
      processingTime: r.processingTime
    })));
    // Results should already be saved by useGeoAI hook with autoSave: true
    // This is just for UI feedback and additional processing
  };

  const handleDetectionError = (error: string) => {
    setError(error);
  };

  const handleSessionSelect = (sessionId: string) => {
    console.log('Session selected:', sessionId);
    // You can add logic to load session data or switch to map view
    setActiveTab('map');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading GeoAI Integration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Map className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">GeoAI Integration</h1>
              </div>
              <div className="hidden md:flex items-center space-x-1">
                <span className="text-sm text-gray-500">with</span>
                <span className="text-sm font-medium text-green-600">Supabase</span>
                <span className="text-sm text-gray-500">&</span>
                <span className="text-sm font-medium text-blue-600">Geobase</span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Provider Selector */}
            <div className="flex items-center space-x-2">
              <select
                value={selectedProvider}
                onChange={(e) => handleProviderChange(e.target.value as 'esri' | 'mapbox' | 'geobase' | 'google')}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="esri">ESRI (Free)</option>
                <option value="mapbox">Mapbox</option>
                <option value="geobase">Geobase</option>
                <option value="google">Google Maps</option>
              </select>
              
              {selectedProvider === 'geobase' && geobaseConfig && (
                <button
                  onClick={handleGeobaseConfigUpdate}
                  className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title="Update Geobase Configuration"
                >
                  ⚙️ Config
                </button>
              )}
            </div>

              {/* User Menu */}
              {user ? (
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">{user.email}</span>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center space-x-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('map')}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'map'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Map className="w-4 h-4" />
              <span>Interactive Map</span>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'analytics'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Analytics</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-600"
                >
                  <span className="sr-only">Dismiss</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'map' && (
          <div className="h-[calc(100vh-200px)]">
            <InteractiveMap
              provider={selectedProvider}
              geobaseConfig={geobaseConfig}
              onDetectionComplete={handleDetectionComplete}
              onError={handleDetectionError}
              showDatabaseDebugger={showDatabaseDebugger}
              onToggleDatabaseDebugger={setShowDatabaseDebugger}
            />
          </div>
        )}

        {activeTab === 'analytics' && (
          <AnalyticsDashboard
            userId={user?.id}
            onSessionSelect={handleSessionSelect}
          />
        )}

        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">Settings</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-3">Map Provider</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">ESRI (Recommended)</h4>
                    <p className="text-sm text-gray-600 mb-2">Free satellite imagery, no API key required</p>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-green-600">Active</span>
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Geobase</h4>
                    <p className="text-sm text-gray-600 mb-2">Custom imagery with high resolution</p>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm text-yellow-600">Requires API Key</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-3">Environment Variables</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">Required for full functionality:</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• <code className="bg-gray-200 px-1 rounded">VITE_SUPABASE_URL</code> - Your Supabase project URL</li>
                    <li>• <code className="bg-gray-200 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> - Your Supabase anon key</li>
                    <li>• <code className="bg-gray-200 px-1 rounded">VITE_GEOBASE_PROJECT_REF</code> - Your Geobase project reference</li>
                    <li>• <code className="bg-gray-200 px-1 rounded">VITE_GEOBASE_API_KEY</code> - Your Geobase API key</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-3">Features</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Real-time AI Detection</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Supabase Integration</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">PostGIS Spatial Queries</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Analytics Dashboard</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Database Debugger - Only show in development */}
      {import.meta.env.DEV && showDatabaseDebugger && <DatabaseDebugger />}

      {/* Authentication Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {authMode === 'signin' ? 'Sign In' : 'Sign Up'}
              </h2>
              <button
                onClick={() => setShowAuthModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={authMode === 'signin' ? handleSignIn : handleSignUp}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={authForm.email}
                    onChange={(e) => setAuthForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={authForm.password}
                    onChange={(e) => setAuthForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between mt-6">
                <button
                  type="button"
                  onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {authMode === 'signin' ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
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
