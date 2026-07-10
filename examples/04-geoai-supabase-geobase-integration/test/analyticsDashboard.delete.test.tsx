// @vitest-environment happy-dom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const serviceMocks = vi.hoisted(() => ({
  getSessions: vi.fn(),
  getDetectionResultsForSessions: vi.fn(),
  getAnalyticsForSessions: vi.fn(),
  deleteSession: vi.fn()
}));

vi.mock('../src/lib/supabase', () => ({
  SupabaseService: serviceMocks
}));

import { AnalyticsDashboard } from '../src/components/AnalyticsDashboard';

const daysAgo = (days: number): string =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

const mockSessions = [
  {
    id: 's1',
    user_id: 'u1',
    session_name: 'Session One',
    description: 'First session',
    created_at: daysAgo(2),
    updated_at: daysAgo(2),
    status: 'completed',
    metadata: {}
  },
  {
    id: 's2',
    user_id: 'u1',
    session_name: 'Session Two',
    description: 'Second session',
    created_at: daysAgo(1),
    updated_at: daysAgo(1),
    status: 'active',
    metadata: {}
  }
];

const mockResults = [
  {
    id: 'r1',
    session_id: 's1',
    task_type: 'solar-panel-detection',
    confidence_score: 0.9,
    geometry: {},
    properties: {},
    created_at: daysAgo(2)
  },
  {
    id: 'r2',
    session_id: 's2',
    task_type: 'building-detection',
    confidence_score: 0.8,
    geometry: {},
    properties: {},
    created_at: daysAgo(1)
  }
];

const mockMetrics = [
  {
    id: 'm1',
    session_id: 's1',
    task_type: 'solar-panel-detection',
    processing_time_ms: 1234,
    detection_count: 1,
    average_confidence: 0.9,
    created_at: daysAgo(2)
  },
  {
    id: 'm2',
    session_id: 's2',
    task_type: 'building-detection',
    processing_time_ms: 900,
    detection_count: 1,
    average_confidence: 0.8,
    created_at: daysAgo(1)
  }
];

describe('AnalyticsDashboard session deletion', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'confirm', {
      value: vi.fn(() => true),
      writable: true,
      configurable: true
    });
    serviceMocks.getSessions.mockResolvedValue(mockSessions);
    serviceMocks.getDetectionResultsForSessions.mockResolvedValue(mockResults);
    serviceMocks.getAnalyticsForSessions.mockResolvedValue(mockMetrics);
    serviceMocks.deleteSession.mockResolvedValue(undefined);
  });

  it('calls deleteSession and prunes deleted session on success', async () => {
    render(<AnalyticsDashboard userId="u1" />);

    await screen.findByText('Session One');
    expect(screen.getByText('Session Two')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Delete session Session One'));

    expect(serviceMocks.deleteSession).toHaveBeenCalledWith('s1');
    await waitFor(() => {
      expect(screen.queryByText('Session One')).toBeNull();
    });
    expect(screen.getByText('Session Two')).toBeTruthy();
  });

  it('rolls back state and shows error when delete fails', async () => {
    serviceMocks.deleteSession.mockRejectedValueOnce(new Error('Delete failed'));
    render(<AnalyticsDashboard userId="u1" />);

    await screen.findByText('Session One');
    fireEvent.click(screen.getByLabelText('Delete session Session One'));

    await waitFor(() => {
      expect(screen.getByText('Delete failed')).toBeTruthy();
    });
    expect(screen.getByText('Session One')).toBeTruthy();
  });

  it('bulk deletes selected sessions', async () => {
    render(<AnalyticsDashboard userId="u1" />);

    await screen.findByText('Session One');
    fireEvent.click(screen.getAllByLabelText('Select session Session One')[0]);
    fireEvent.click(screen.getAllByLabelText('Select session Session Two')[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Delete Selected (2)' }));

    await waitFor(() => {
      expect(serviceMocks.deleteSession).toHaveBeenCalledWith('s1');
      expect(serviceMocks.deleteSession).toHaveBeenCalledWith('s2');
    });
    expect(screen.queryByText('Session One')).toBeNull();
    expect(screen.queryByText('Session Two')).toBeNull();
  });

  it('bulk delete failure restores state and shows error', async () => {
    serviceMocks.deleteSession
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Bulk delete failed'));
    render(<AnalyticsDashboard userId="u1" />);

    await screen.findByText('Session One');
    fireEvent.click(screen.getAllByLabelText('Select all visible sessions')[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Delete Selected (2)' }));

    await waitFor(() => {
      expect(screen.getByText('Failed to delete 1 selected session(s)')).toBeTruthy();
    });
    expect(screen.getByText('Session One')).toBeTruthy();
    expect(screen.getByText('Session Two')).toBeTruthy();
  });
});
