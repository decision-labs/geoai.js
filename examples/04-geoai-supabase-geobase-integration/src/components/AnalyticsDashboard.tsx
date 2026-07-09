import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { BarChart3, TrendingUp, MapPin, Clock, Target, Database, Trash2 } from 'lucide-react';
import { SupabaseService } from '../lib/supabase';
import type { DetectionAnalytics } from '../lib/supabase';
import { carbon } from '../utils/carbonTheme';

type SessionRow = Awaited<ReturnType<typeof SupabaseService.getSessions>>[number];
type DetectionResultRow = Awaited<ReturnType<typeof SupabaseService.getDetectionResults>>[number];

interface AnalyticsData {
  totalDetections: number;
  totalSessions: number;
  averageProcessingTime: number;
  taskBreakdown: Record<string, number>;
  recentSessions: SessionRow[];
  performanceMetrics: DetectionAnalytics[];
}

interface AnalyticsDashboardProps {
  userId?: string;
  onSessionSelect?: (sessionId: string) => void;
  refreshKey?: number;
}

export function AnalyticsDashboard({ userId, onSessionSelect, refreshKey }: AnalyticsDashboardProps) {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [detectionResults, setDetectionResults] = useState<DetectionResultRow[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<DetectionAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [selectedTask, setSelectedTask] = useState<string>('all');
  const isLoadingRef = useRef(false);
  const lastLoadedUserIdRef = useRef<string | undefined>(undefined);

  const loadAnalyticsData = useCallback(async (force = false) => {
    if (isLoadingRef.current) return;
    if (!force && lastLoadedUserIdRef.current === userId) return;

    try {
      isLoadingRef.current = true;
      setLoading(true);
      setError(null);

      // Get user sessions
      const userSessions = await SupabaseService.getSessions(userId);
      const sessionIds = userSessions.map((session) => session.id);

      // Batch fetch instead of per-session request loops
      const [allResults, allAnalytics] = await Promise.all([
        SupabaseService.getDetectionResultsForSessions(sessionIds),
        SupabaseService.getAnalyticsForSessions(sessionIds)
      ]);

      setSessions(userSessions);
      setDetectionResults(allResults);
      setPerformanceMetrics(allAnalytics as DetectionAnalytics[]);
      lastLoadedUserIdRef.current = userId;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics data');
    } finally {
      isLoadingRef.current = false;
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (refreshKey === undefined) return;
    loadAnalyticsData(true);
  }, [refreshKey, loadAnalyticsData]);

  useEffect(() => {
    lastLoadedUserIdRef.current = undefined;
    setSessions([]);
    setDetectionResults([]);
    setPerformanceMetrics([]);
    setSelectedSessionIds([]);
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  const handleDeleteSession = useCallback(async (sessionId: string, sessionName: string) => {
    const confirmed = window.confirm(
      `Delete session "${sessionName}"? This will also delete associated detections and analytics.`
    );
    if (!confirmed) return;

    setDeleteError(null);
    setDeletingSessionId(sessionId);

    const previousSessions = sessions;
    const previousDetectionResults = detectionResults;
    const previousPerformanceMetrics = performanceMetrics;

    // Optimistically prune state; DB will cascade-delete dependent rows.
    setSessions((prev) => prev.filter((session) => session.id !== sessionId));
    setDetectionResults((prev) => prev.filter((result) => result.session_id !== sessionId));
    setPerformanceMetrics((prev) => prev.filter((metric) => metric.session_id !== sessionId));
    setSelectedSessionIds((prev) => prev.filter((id) => id !== sessionId));

    try {
      await SupabaseService.deleteSession(sessionId);
    } catch (err) {
      setSessions(previousSessions);
      setDetectionResults(previousDetectionResults);
      setPerformanceMetrics(previousPerformanceMetrics);
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete session');
    } finally {
      setDeletingSessionId(null);
    }
  }, [sessions, detectionResults, performanceMetrics]);

  const toggleSessionSelection = useCallback((sessionId: string) => {
    setSelectedSessionIds((prev) =>
      prev.includes(sessionId) ? prev.filter((id) => id !== sessionId) : [...prev, sessionId]
    );
  }, []);

  const toggleSelectAllVisibleSessions = useCallback((visibleSessionIds: string[]) => {
    const allSelected = visibleSessionIds.every((id) => selectedSessionIds.includes(id));
    if (allSelected) {
      setSelectedSessionIds((prev) => prev.filter((id) => !visibleSessionIds.includes(id)));
      return;
    }
    setSelectedSessionIds((prev) => {
      const merged = new Set([...prev, ...visibleSessionIds]);
      return Array.from(merged);
    });
  }, [selectedSessionIds]);

  const handleBulkDeleteSessions = useCallback(async () => {
    if (selectedSessionIds.length === 0 || isBulkDeleting) return;

    const confirmed = window.confirm(
      `Delete ${selectedSessionIds.length} selected sessions? This will also delete associated detections and analytics.`
    );
    if (!confirmed) return;

    setDeleteError(null);
    setIsBulkDeleting(true);

    const idsToDelete = [...selectedSessionIds];
    const previousSessions = sessions;
    const previousDetectionResults = detectionResults;
    const previousPerformanceMetrics = performanceMetrics;
    const previousSelectedSessionIds = selectedSessionIds;

    // Optimistic prune for bulk delete.
    setSessions((prev) => prev.filter((session) => !idsToDelete.includes(session.id)));
    setDetectionResults((prev) => prev.filter((result) => !idsToDelete.includes(result.session_id)));
    setPerformanceMetrics((prev) => prev.filter((metric) => !idsToDelete.includes(metric.session_id)));
    setSelectedSessionIds([]);

    try {
      const failedIds: string[] = [];
      for (const id of idsToDelete) {
        try {
          await SupabaseService.deleteSession(id);
        } catch {
          failedIds.push(id);
        }
      }

      if (failedIds.length > 0) {
        setDeleteError(`Failed to delete ${failedIds.length} selected session(s)`);
        await loadAnalyticsData(true);
      }
    } catch (err) {
      setSessions(previousSessions);
      setDetectionResults(previousDetectionResults);
      setPerformanceMetrics(previousPerformanceMetrics);
      setSelectedSessionIds(previousSelectedSessionIds);
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete selected sessions');
      await loadAnalyticsData(true);
    } finally {
      setIsBulkDeleting(false);
    }
  }, [selectedSessionIds, isBulkDeleting, sessions, detectionResults, performanceMetrics, loadAnalyticsData]);

  const analyticsData = useMemo<AnalyticsData>(() => {
    const filteredSessions = sessions.filter((session) => {
      if (selectedTimeRange === 'all') return true;

      const sessionDate = new Date(session.created_at);
      const now = new Date();
      const daysAgo = selectedTimeRange === '7d' ? 7 : selectedTimeRange === '30d' ? 30 : 90;
      const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

      return sessionDate >= cutoffDate;
    });

    const filteredSessionIds = new Set(filteredSessions.map((session) => session.id));

    const scopedResults = detectionResults.filter((result) => filteredSessionIds.has(result.session_id));
    const filteredResults = selectedTask === 'all'
      ? scopedResults
      : scopedResults.filter((result) => result.task_type === selectedTask);

    const scopedMetrics = performanceMetrics.filter((metric) => filteredSessionIds.has(metric.session_id));
    const filteredMetrics = selectedTask === 'all'
      ? scopedMetrics
      : scopedMetrics.filter((metric) => metric.task_type === selectedTask);

    const taskBreakdown: Record<string, number> = {};
    let totalProcessingTime = 0;
    let processingTimeCount = 0;

    filteredResults.forEach((result) => {
      taskBreakdown[result.task_type] = (taskBreakdown[result.task_type] || 0) + 1;
    });

    filteredMetrics.forEach((metric) => {
      if (metric.processing_time_ms) {
        totalProcessingTime += metric.processing_time_ms;
        processingTimeCount += 1;
      }
    });

    return {
      totalDetections: filteredResults.length,
      totalSessions: filteredSessions.length,
      averageProcessingTime: processingTimeCount > 0 ? totalProcessingTime / processingTimeCount : 0,
      taskBreakdown,
      recentSessions: filteredSessions.slice(0, 10),
      performanceMetrics: filteredMetrics
    };
  }, [sessions, detectionResults, performanceMetrics, selectedTimeRange, selectedTask]);

  const visibleSessionIds = useMemo(
    () => analyticsData.recentSessions.map((session) => session.id),
    [analyticsData.recentSessions]
  );
  const selectedVisibleCount = selectedSessionIds.filter((id) => visibleSessionIds.includes(id)).length;
  const allVisibleSelected = visibleSessionIds.length > 0 && selectedVisibleCount === visibleSessionIds.length;

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTaskColor = (task: string) => {
    const colors: Record<string, string> = {
      'oil-storage-tank-detection': '#ff6b6b',
      'solar-panel-detection': '#4ecdc4',
      'building-detection': '#45b7d1',
      'car-detection': '#96ceb4',
      'ship-detection': '#feca57',
      'land-cover-classification': '#ff9ff3',
      'building-footprint-segmentation': '#a8e6cf',
      'wetland-segmentation': '#88d8c0'
    };
    return colors[task] || '#6c757d';
  };

  const getTaskLabel = (task: string) => {
    const labels: Record<string, string> = {
      'oil-storage-tank-detection': 'Oil Tanks',
      'solar-panel-detection': 'Solar Panels',
      'building-detection': 'Buildings',
      'car-detection': 'Cars',
      'ship-detection': 'Ships',
      'land-cover-classification': 'Land Cover',
      'building-footprint-segmentation': 'Building Footprints',
      'wetland-segmentation': 'Wetlands'
    };
    return labels[task] || task;
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="spinner h-8 w-8" />
        <span className="ml-2" style={{ color: carbon.secondary }}>Loading analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-lg border p-4"
        style={{ borderColor: 'rgba(252, 129, 129, 0.4)', backgroundColor: 'rgba(127, 29, 29, 0.35)' }}
      >
        <p style={{ color: '#fecaca' }}>Error loading analytics: {error}</p>
        <button onClick={() => loadAnalyticsData(true)} className="carbon-btn-primary mt-2">
          Retry
        </button>
      </div>
    );
  }

  if (!analyticsData.totalSessions && !analyticsData.totalDetections) {
    return (
      <div className="py-8 text-center">
        <Database className="mx-auto mb-4 h-12 w-12" style={{ color: carbon.muted }} />
        <p style={{ color: carbon.secondary }}>No analytics data available</p>
      </div>
    );
  }

  const metricCards = [
    { icon: Target, label: 'Total Detections', value: analyticsData.totalDetections.toLocaleString(), color: carbon.accent },
    { icon: BarChart3, label: 'Sessions', value: analyticsData.totalSessions, color: carbon.success },
    { icon: Clock, label: 'Avg Processing Time', value: formatTime(analyticsData.averageProcessingTime), color: carbon.warning },
    { icon: TrendingUp, label: 'Tasks Used', value: Object.keys(analyticsData.taskBreakdown).length, color: carbon.purple },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold" style={{ color: carbon.chalk }}>Analytics Dashboard</h2>
        <div className="flex space-x-2">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value as '7d' | '30d' | '90d' | 'all')}
            className="carbon-select text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>
          <select
            value={selectedTask}
            onChange={(e) => setSelectedTask(e.target.value)}
            className="carbon-select text-sm"
          >
            <option value="all">All tasks</option>
            {Object.keys(analyticsData.taskBreakdown).map(task => (
              <option key={task} value={task}>
                {getTaskLabel(task)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        {metricCards.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="carbon-card p-6">
            <div className="flex items-center">
              <div className="rounded-lg p-2" style={{ backgroundColor: `${color}22` }}>
                <Icon className="h-6 w-6" style={{ color }} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium" style={{ color: carbon.secondary }}>{label}</p>
                <p className="text-2xl font-bold" style={{ color: carbon.chalk }}>{value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="carbon-card p-6">
        <h3 className="mb-4 text-lg font-semibold" style={{ color: carbon.chalk }}>Detection Task Breakdown</h3>
        <div className="space-y-3">
          {Object.entries(analyticsData.taskBreakdown)
            .sort(([,a], [,b]) => b - a)
            .map(([task, count]) => (
              <div key={task} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-4 w-4 rounded-full" style={{ backgroundColor: getTaskColor(task) }} />
                  <span className="font-medium" style={{ color: carbon.chalk }}>{getTaskLabel(task)}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm" style={{ color: carbon.secondary }}>{count} detections</span>
                  <div className="h-2 w-32 rounded-full" style={{ backgroundColor: carbon.border }}>
                    <div
                      className="h-2 rounded-full"
                      style={{
                        backgroundColor: getTaskColor(task),
                        width: `${(count / analyticsData.totalDetections) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      <div className="carbon-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold" style={{ color: carbon.chalk }}>Recent Sessions</h3>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm" style={{ color: carbon.secondary }}>
              <input
                type="checkbox"
                aria-label="Select all visible sessions"
                checked={allVisibleSelected}
                onChange={() => toggleSelectAllVisibleSessions(visibleSessionIds)}
                className="h-4 w-4 rounded accent-[#2ba99a]"
                style={{ borderColor: carbon.border }}
              />
              Select all
            </label>
            <button
              type="button"
              onClick={() => void handleBulkDeleteSessions()}
              disabled={selectedVisibleCount === 0 || isBulkDeleting}
              className="rounded px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: carbon.error }}
            >
              {isBulkDeleting ? 'Deleting...' : `Delete Selected (${selectedVisibleCount})`}
            </button>
          </div>
        </div>
        {deleteError && (
          <div
            className="mb-3 rounded border px-3 py-2 text-sm"
            style={{ borderColor: 'rgba(252, 129, 129, 0.4)', backgroundColor: 'rgba(127, 29, 29, 0.35)', color: '#fecaca' }}
          >
            {deleteError}
          </div>
        )}
        <div className="space-y-3">
          {analyticsData.recentSessions.map(session => (
            <div
              key={session.id}
              className="flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors hover:bg-[#353c44]"
              style={{ borderColor: carbon.border, backgroundColor: carbon.hinted }}
              onClick={() => onSessionSelect?.(session.id)}
            >
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  aria-label={`Select session ${session.session_name}`}
                  checked={selectedSessionIds.includes(session.id)}
                  onClick={(event) => event.stopPropagation()}
                  onChange={() => toggleSessionSelection(session.id)}
                  className="h-4 w-4 rounded accent-[#2ba99a]"
                />
                <MapPin className="h-5 w-5" style={{ color: carbon.muted }} />
                <div>
                  <p className="font-medium" style={{ color: carbon.chalk }}>{session.session_name}</p>
                  <p className="text-sm" style={{ color: carbon.secondary }}>{session.description}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium" style={{ color: carbon.chalk }}>{formatDate(session.created_at)}</p>
                <p className="text-sm capitalize" style={{ color: carbon.secondary }}>{session.status}</p>
              </div>
              <button
                type="button"
                aria-label={`Delete session ${session.session_name}`}
                title="Delete session"
                onClick={(event) => {
                  event.stopPropagation();
                  void handleDeleteSession(session.id, session.session_name);
                }}
                disabled={deletingSessionId === session.id || isBulkDeleting}
                className="ml-3 rounded p-2 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ color: carbon.error }}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {analyticsData.performanceMetrics.length > 0 && (
        <div className="carbon-card p-6">
          <h3 className="mb-4 text-lg font-semibold" style={{ color: carbon.chalk }}>Performance Metrics</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y" style={{ borderColor: carbon.border }}>
              <thead style={{ backgroundColor: carbon.hinted }}>
                <tr>
                  {['Task', 'Detections', 'Avg Confidence', 'Processing Time'].map((heading) => (
                    <th
                      key={heading}
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                      style={{ color: carbon.muted }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: carbon.border }}>
                {analyticsData.performanceMetrics.map(metric => (
                  <tr key={metric.id}>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center">
                        <div
                          className="mr-2 h-3 w-3 rounded-full"
                          style={{ backgroundColor: getTaskColor(metric.task_type) }}
                        />
                        <span style={{ color: carbon.chalk }}>{getTaskLabel(metric.task_type)}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm" style={{ color: carbon.secondary }}>
                      {metric.detection_count}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm" style={{ color: carbon.secondary }}>
                      {metric.average_confidence ? (metric.average_confidence * 100).toFixed(1) + '%' : 'N/A'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm" style={{ color: carbon.secondary }}>
                      {formatTime(metric.processing_time_ms)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
