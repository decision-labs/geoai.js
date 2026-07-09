import {
  CheckCircle2,
  Circle,
  Download,
  MapPin,
  Settings,
  Trash2,
} from 'lucide-react';
import { carbon } from '../../utils/carbonTheme';
import { TASK_DEMO_LOCATIONS, type TaskDemoLocation } from '../../utils/taskDemoLocations';
import { NextStepCallout } from './NextStepCallout';

export type WorkflowStepId = 'choose-task' | 'sign-in' | 'draw-area' | 'run-detection' | 'review';

export interface DetectionTaskOption {
  task: string;
  label: string;
  color: string;
}

interface MapWorkflowPanelProps {
  tasks: DetectionTaskOption[];
  selectedTask: DetectionTaskOption | null;
  onSelectTask: (task: DetectionTaskOption) => void;
  isAuthenticated: boolean;
  hasPolygon: boolean;
  hasResults: boolean;
  isProcessing: boolean;
  currentSession: string | null;
  activeStepHint?: string;
  showSettings: boolean;
  onToggleSettings: () => void;
  canExportResults: boolean;
  onExport: () => void;
  onClearResults: () => void;
  statusMessage: string;
  zeroShotClassLabel: string;
  onZeroShotClassLabelChange: (value: string) => void;
  zoomLevel: number;
  maxZoomLevel: number;
  onZoomLevelChange: (value: number) => void;
  confidenceThreshold: number;
  onConfidenceThresholdChange: (value: number) => void;
  isEmbeddingTask: boolean;
  embeddingInteractionMode: 'roi' | 'featureSelection';
  onEmbeddingModeChange: (mode: 'roi' | 'featureSelection') => void;
  embeddingSimilarityThreshold: number;
  onEmbeddingSimilarityThresholdChange: (value: number) => void;
  embeddingLayerOpacity: number;
  onEmbeddingLayerOpacityChange: (value: number) => void;
  embeddingZoomOffset: number;
  onEmbeddingZoomOffsetChange: (value: number) => void;
  embeddingExportLabel: string;
  onEmbeddingExportLabelChange: (value: string) => void;
  filteredEmbeddingFeatureCount: number;
  showDatabaseDebugger?: boolean;
  onToggleDatabaseDebugger?: (show: boolean) => void;
}

const WORKFLOW_STEPS: { id: WorkflowStepId; label: string; hint: string }[] = [
  { id: 'choose-task', label: 'Choose a detection task', hint: 'Select a task card below to load a demo area.' },
  { id: 'sign-in', label: 'Sign in to save results', hint: 'Use Sign In in the header to persist detections.' },
  { id: 'draw-area', label: 'Draw an area on the map', hint: 'Use Draw area in the toolbar below the map.' },
  { id: 'run-detection', label: 'Run detection', hint: 'Press Run detection when your area is ready.' },
  { id: 'review', label: 'Review & export results', hint: 'Export results or clear them to start over.' },
];

export function getActiveWorkflowStep(props: Pick<
  MapWorkflowPanelProps,
  'selectedTask' | 'isAuthenticated' | 'hasPolygon' | 'hasResults' | 'isProcessing'
>): WorkflowStepId {
  if (!props.selectedTask) return 'choose-task';
  if (!props.isAuthenticated) return 'sign-in';
  if (!props.hasPolygon && !props.hasResults) return 'draw-area';
  if (props.isProcessing) return 'run-detection';
  if (!props.hasResults) return 'run-detection';
  return 'review';
}

function getActiveStep(props: MapWorkflowPanelProps): WorkflowStepId {
  return getActiveWorkflowStep(props);
}

function stepStatus(
  stepId: WorkflowStepId,
  activeStep: WorkflowStepId,
  props: MapWorkflowPanelProps
): 'complete' | 'current' | 'upcoming' {
  const order = WORKFLOW_STEPS.map((s) => s.id);
  const stepIndex = order.indexOf(stepId);
  const activeIndex = order.indexOf(activeStep);

  if (stepId === 'sign-in' && props.isAuthenticated) return 'complete';
  if (stepId === 'choose-task' && props.selectedTask) return 'complete';
  if (stepId === 'draw-area' && (props.hasPolygon || props.hasResults)) return 'complete';
  if (stepId === 'run-detection' && props.hasResults) return 'complete';
  if (stepId === 'review' && props.hasResults) return 'current';

  if (stepIndex < activeIndex) return 'complete';
  if (stepIndex === activeIndex) return 'current';
  return 'upcoming';
}

function TaskCard({
  task,
  demo,
  selected,
  onSelect,
}: {
  task: DetectionTaskOption;
  demo?: TaskDemoLocation;
  selected: boolean;
  onSelect: () => void;
}) {
  const accent = demo?.accent ?? task.color;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="text-left rounded-lg border p-3 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2ba99a]"
      style={{
        borderColor: selected ? accent : carbon.border,
        backgroundColor: selected ? `${accent}18` : carbon.hinted,
        boxShadow: selected ? `0 0 0 1px ${accent}55` : 'none',
      }}
    >
      <div className="flex items-start gap-2">
        <span
          className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: accent }}
        />
        <div className="min-w-0">
          <p className="text-sm font-medium" style={{ color: carbon.chalk }}>
            {task.label}
          </p>
          {demo && (
            <p className="mt-0.5 text-xs truncate" style={{ color: carbon.muted }}>
              {demo.placeName}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

export function MapWorkflowPanel(props: MapWorkflowPanelProps) {
  const activeStep = getActiveStep(props);
  const selectedDemo = props.selectedTask
    ? TASK_DEMO_LOCATIONS[props.selectedTask.task]
    : undefined;

  return (
    <div
      className="absolute top-4 left-4 z-10 w-[min(100%,24rem)] max-h-[calc(100%-6rem)] overflow-y-auto rounded-xl border shadow-2xl scrollbar-thin"
      style={{
        backgroundColor: carbon.carbon,
        borderColor: carbon.border,
        color: carbon.chalk,
      }}
    >
      <div
        className="sticky top-0 z-10 flex items-center justify-between border-b px-4 py-3"
        style={{ borderColor: carbon.border, backgroundColor: carbon.carbon }}
      >
        <div>
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: carbon.muted }}>
            Workflow
          </p>
          <h3 className="text-base font-semibold" style={{ color: carbon.chalk }}>
            GeoAI Detection
          </h3>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={props.onToggleSettings}
            className="rounded-md p-2 transition-colors hover:bg-[#2d3339]"
            title="Settings"
            style={{ color: props.showSettings ? carbon.accent : carbon.secondary }}
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={props.onExport}
            disabled={!props.canExportResults}
            className="rounded-md p-2 transition-colors hover:bg-[#2d3339] disabled:opacity-40"
            title="Export results"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={props.onClearResults}
            className="rounded-md p-2 transition-colors hover:bg-[#2d3339]"
            title="Clear results"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-4 px-4 py-4">
        <ol className="space-y-2">
          {WORKFLOW_STEPS.map((step, index) => {
            const status = stepStatus(step.id, activeStep, props);
            const isComplete = status === 'complete';
            const isCurrent = status === 'current';

            return (
              <li key={step.id} className="space-y-2">
                {isCurrent && (
                  <NextStepCallout message={props.activeStepHint ?? step.hint} inline />
                )}
                <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                  {isComplete ? (
                    <CheckCircle2 className="h-4 w-4" style={{ color: carbon.accent }} />
                  ) : (
                    <Circle
                      className="h-4 w-4"
                      style={{ color: isCurrent ? carbon.accent : carbon.muted }}
                      fill={isCurrent ? `${carbon.accent}33` : 'transparent'}
                    />
                  )}
                </div>
                <div>
                  <p
                    className="text-sm"
                    style={{
                      color: isCurrent ? carbon.chalk : isComplete ? carbon.secondary : carbon.muted,
                      fontWeight: isCurrent ? 600 : 400,
                    }}
                  >
                    <span className="mr-1.5 text-xs" style={{ color: carbon.muted }}>
                      {index + 1}.
                    </span>
                    {step.label}
                  </p>
                </div>
                </div>
              </li>
            );
          })}
        </ol>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider" style={{ color: carbon.muted }}>
            Detection task
          </p>
          <div className="grid grid-cols-2 gap-2">
            {props.tasks.map((task) => (
              <TaskCard
                key={task.task}
                task={task}
                demo={TASK_DEMO_LOCATIONS[task.task]}
                selected={props.selectedTask?.task === task.task}
                onSelect={() => props.onSelectTask(task)}
              />
            ))}
          </div>
        </div>

        {props.selectedTask?.task === 'zero-shot-object-detection' && (
          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: carbon.secondary }}>
              Zero-shot classes (comma-separated)
            </label>
            <input
              type="text"
              value={props.zeroShotClassLabel}
              onChange={(e) => props.onZeroShotClassLabelChange(e.target.value)}
              placeholder="car, truck, bus"
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2ba99a]"
              style={{
                backgroundColor: carbon.hinted,
                borderColor: carbon.border,
                color: carbon.chalk,
              }}
            />
          </div>
        )}

        {selectedDemo && (
          <div
            className="rounded-lg border px-3 py-2 text-xs"
            style={{ borderColor: carbon.border, backgroundColor: carbon.hinted, color: carbon.secondary }}
          >
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: carbon.accent }} />
              <span>
                Demo area: <strong style={{ color: carbon.chalk }}>{selectedDemo.placeName}</strong>
              </span>
            </div>
          </div>
        )}

        {props.showSettings && (
          <div className="space-y-3 border-t pt-3" style={{ borderColor: carbon.border }}>
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: carbon.secondary }}>
                Zoom level: {props.zoomLevel}
              </label>
              <input
                type="range"
                min="10"
                max={props.maxZoomLevel}
                value={Math.min(props.zoomLevel, props.maxZoomLevel)}
                onChange={(e) => props.onZoomLevelChange(Number(e.target.value))}
                className="w-full accent-[#2ba99a]"
              />
              <p className="mt-1 text-xs" style={{ color: carbon.muted }}>
                Provider max zoom: {props.maxZoomLevel}
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: carbon.secondary }}>
                Confidence: {props.confidenceThreshold.toFixed(2)}
              </label>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.1"
                value={props.confidenceThreshold}
                onChange={(e) => props.onConfidenceThresholdChange(Number(e.target.value))}
                className="w-full accent-[#2ba99a]"
              />
            </div>
            {props.isEmbeddingTask && (
              <>
                <div>
                  <label className="mb-2 block text-xs font-medium" style={{ color: carbon.secondary }}>
                    Embeddings mode
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['roi', 'featureSelection'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => props.onEmbeddingModeChange(mode)}
                        className="rounded-md border px-2 py-1.5 text-xs font-medium"
                        style={{
                          borderColor: props.embeddingInteractionMode === mode ? carbon.accent : carbon.border,
                          backgroundColor:
                            props.embeddingInteractionMode === mode ? `${carbon.accent}22` : carbon.hinted,
                          color: carbon.chalk,
                        }}
                      >
                        {mode === 'roi' ? 'ROI click' : 'Draw anchor'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium" style={{ color: carbon.secondary }}>
                    Similarity threshold: {props.embeddingSimilarityThreshold.toFixed(2)}
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={props.embeddingSimilarityThreshold}
                    onChange={(e) => props.onEmbeddingSimilarityThresholdChange(Number(e.target.value))}
                    className="w-full accent-[#2ba99a]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium" style={{ color: carbon.secondary }}>
                    Layer opacity: {props.embeddingLayerOpacity.toFixed(2)}
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={props.embeddingLayerOpacity}
                    onChange={(e) => props.onEmbeddingLayerOpacityChange(Number(e.target.value))}
                    className="w-full accent-[#2ba99a]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium" style={{ color: carbon.secondary }}>
                    Zoom offset: +{props.embeddingZoomOffset.toFixed(1)}
                  </label>
                  <input
                    type="range"
                    min="0.0"
                    max="2.0"
                    step="0.1"
                    value={props.embeddingZoomOffset}
                    onChange={(e) => props.onEmbeddingZoomOffsetChange(Number(e.target.value))}
                    className="w-full accent-[#2ba99a]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium" style={{ color: carbon.secondary }}>
                    Export label
                  </label>
                  <input
                    type="text"
                    value={props.embeddingExportLabel}
                    onChange={(e) => props.onEmbeddingExportLabelChange(e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2ba99a]"
                    style={{
                      backgroundColor: carbon.hinted,
                      borderColor: carbon.border,
                      color: carbon.chalk,
                    }}
                  />
                  <p className="mt-1 text-xs" style={{ color: carbon.muted }}>
                    {props.filteredEmbeddingFeatureCount} features above threshold
                  </p>
                </div>
              </>
            )}
            {import.meta.env.DEV && props.onToggleDatabaseDebugger && (
              <label className="flex items-center justify-between text-xs font-medium" style={{ color: carbon.secondary }}>
                <span>Database debugger</span>
                <input
                  type="checkbox"
                  checked={Boolean(props.showDatabaseDebugger)}
                  onChange={(e) => props.onToggleDatabaseDebugger?.(e.target.checked)}
                  className="h-4 w-4 accent-[#2ba99a]"
                />
              </label>
            )}
          </div>
        )}

        <div className="border-t pt-3" style={{ borderColor: carbon.border }}>
          <p className="text-sm" style={{ color: carbon.chalk }}>
            {props.statusMessage}
          </p>
          {props.currentSession && (
            <p className="mt-1 text-xs" style={{ color: carbon.muted }}>
              Session {props.currentSession.slice(0, 8)}…
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
