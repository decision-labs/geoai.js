import { useState, useEffect } from 'react';
import { SupabaseService } from '../lib/supabase';
import { normalizeGeometryForDatabase } from '../utils/geometry';
import { carbon } from '../utils/carbonTheme';

export function DatabaseDebugger() {
  const [user, setUser] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [detectionResults, setDetectionResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkUser = async () => {
    try {
      setLoading(true);
      const currentUser = await SupabaseService.getCurrentUser();
      setUser(currentUser);
      console.log('Current user:', currentUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get user');
      console.error('User check error:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkSessions = async () => {
    try {
      setLoading(true);
      const sessionData = await SupabaseService.getSessions();
      setSessions(sessionData);
      console.log('Sessions:', sessionData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get sessions');
      console.error('Sessions check error:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkDetectionResults = async () => {
    try {
      setLoading(true);
      if (sessions.length > 0) {
        const results = await SupabaseService.getDetectionResults(sessions[0].id);
        setDetectionResults(results);
        console.log('Detection results:', results);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get detection results');
      console.error('Detection results check error:', err);
    } finally {
      setLoading(false);
    }
  };

  const createTestSession = async () => {
    try {
      setLoading(true);
      const currentUser = await SupabaseService.getCurrentUser();
      if (!currentUser) {
        throw new Error('No user authenticated - please sign in first');
      }

      const testSession = await SupabaseService.createSession({
        user_id: currentUser.id,
        session_name: 'Test Session',
        description: 'Test session for debugging',
        status: 'active',
        metadata: { test: true },
      });

      console.log('Test session created:', testSession);

      const testGeometry = normalizeGeometryForDatabase({
        type: 'Polygon',
        coordinates: [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]],
      });
      if (!testGeometry) {
        throw new Error('Failed to normalize test geometry');
      }

      const testResult = {
        session_id: testSession.id,
        task_type: 'oil-storage-tank-detection',
        confidence_score: 0.85,
        geometry: testGeometry,
        properties: { test: true },
      };

      await SupabaseService.saveDetectionResults([testResult]);
      console.log('Test detection result created');

      await checkSessions();
      await checkDetectionResults();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create test session');
      console.error('Test session creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkUser();
  }, []);

  return (
    <div
      className="carbon-card fixed bottom-4 left-4 z-30 max-h-96 max-w-md overflow-auto p-4 text-sm"
      style={{ color: carbon.chalk }}
    >
      <h3 className="mb-2 font-bold" style={{ color: carbon.accent }}>Database Debugger</h3>

      {error && (
        <div
          className="mb-2 rounded border px-3 py-2"
          style={{ borderColor: 'rgba(252, 129, 129, 0.4)', backgroundColor: 'rgba(127, 29, 29, 0.35)', color: '#fecaca' }}
        >
          {error}
        </div>
      )}

      <div className="space-y-2">
        <div>
          <strong style={{ color: carbon.secondary }}>User:</strong>{' '}
          {user ? `${user.email} (${user.id.slice(0, 8)}...)` : 'Not authenticated'}
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={checkUser} disabled={loading} className="carbon-btn-primary px-2 py-1 text-xs disabled:opacity-50">
            Check User
          </button>
          <button onClick={checkSessions} disabled={loading} className="carbon-btn-secondary px-2 py-1 text-xs disabled:opacity-50">
            Check Sessions
          </button>
          <button
            onClick={checkDetectionResults}
            disabled={loading || sessions.length === 0}
            className="carbon-btn-secondary px-2 py-1 text-xs disabled:opacity-50"
          >
            Check Results
          </button>
          <button
            onClick={createTestSession}
            disabled={loading || !user}
            className="carbon-btn-secondary px-2 py-1 text-xs disabled:opacity-50"
          >
            Create Test Session
          </button>
        </div>

        <div className="text-xs" style={{ color: carbon.secondary }}>
          <div><strong>Sessions:</strong> {sessions.length}</div>
          <div><strong>Detection Results:</strong> {detectionResults.length}</div>
        </div>

        {loading && <div className="text-xs" style={{ color: carbon.muted }}>Loading...</div>}
      </div>
    </div>
  );
}
