import { useState, useEffect } from 'react';
import { SupabaseService } from '../lib/supabase';

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
      // Get results from the first session if available
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
        metadata: { test: true }
      });

      console.log('Test session created:', testSession);
      
      // Also create a test detection result
      const testResult = {
        session_id: testSession.id,
        task_type: 'oil-storage-tank-detection',
        confidence_score: 0.85,
        geometry: {
          type: 'Polygon',
          coordinates: [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]]
        },
        properties: { test: true }
      };

      await SupabaseService.saveDetectionResults([testResult]);
      console.log('Test detection result created');
      
      await checkSessions(); // Refresh sessions
      await checkDetectionResults(); // Refresh results
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
    <div className="fixed bottom-4 left-4 bg-white border rounded-lg p-4 shadow-lg max-w-md max-h-96 overflow-auto">
      <h3 className="font-bold mb-2">Database Debugger</h3>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded mb-2">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <div>
          <strong>User:</strong> {user ? `${user.email} (${user.id.slice(0, 8)}...)` : 'Not authenticated'}
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={checkUser}
            disabled={loading}
            className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 disabled:opacity-50"
          >
            Check User
          </button>
          
          <button
            onClick={checkSessions}
            disabled={loading}
            className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 disabled:opacity-50"
          >
            Check Sessions
          </button>
          
          <button
            onClick={checkDetectionResults}
            disabled={loading || sessions.length === 0}
            className="px-2 py-1 bg-purple-500 text-white rounded text-xs hover:bg-purple-600 disabled:opacity-50"
          >
            Check Results
          </button>
          
          <button
            onClick={createTestSession}
            disabled={loading || !user}
            className="px-2 py-1 bg-orange-500 text-white rounded text-xs hover:bg-orange-600 disabled:opacity-50"
          >
            Create Test Session
          </button>
        </div>

        <div className="text-xs">
          <div><strong>Sessions:</strong> {sessions.length}</div>
          <div><strong>Detection Results:</strong> {detectionResults.length}</div>
        </div>

        {loading && <div className="text-xs text-gray-500">Loading...</div>}
      </div>
    </div>
  );
}
