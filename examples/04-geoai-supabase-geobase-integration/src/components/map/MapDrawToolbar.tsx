import type { ReactNode } from 'react';
import { MousePointerClick, Pentagon, Play, Trash2 } from 'lucide-react';
import { carbon } from '../../utils/carbonTheme';
import { NextStepCallout } from './NextStepCallout';

export type ToolbarNextStep = 'draw' | 'run' | null;

interface MapDrawToolbarProps {
  canDraw: boolean;
  canDelete: boolean;
  canRun: boolean;
  isProcessing: boolean;
  isEmbeddingTask: boolean;
  embeddingMode: 'roi' | 'featureSelection';
  statusHint: string;
  nextStepHighlight?: ToolbarNextStep;
  onDrawPolygon: () => void;
  onDelete: () => void;
  onRun: () => void;
}

function ToolbarButton({
  label,
  icon,
  onClick,
  disabled,
  accent,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-w-[5.5rem] flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40"
      style={{
        color: accent ? carbon.carbon : carbon.chalk,
        backgroundColor: accent ? carbon.accent : carbon.hinted,
      }}
      onMouseEnter={(e) => {
        if (!disabled && accent) {
          e.currentTarget.style.backgroundColor = carbon.accentHover;
        } else if (!disabled) {
          e.currentTarget.style.backgroundColor = '#353c44';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = accent ? carbon.accent : carbon.hinted;
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export function MapDrawToolbar({
  canDraw,
  canDelete,
  canRun,
  isProcessing,
  isEmbeddingTask,
  embeddingMode,
  statusHint,
  nextStepHighlight = null,
  onDrawPolygon,
  onDelete,
  onRun,
}: MapDrawToolbarProps) {
  const drawLabel = isEmbeddingTask && embeddingMode === 'roi' ? 'Place ROI' : 'Draw area';
  const drawIcon =
    isEmbeddingTask && embeddingMode === 'roi' ? (
      <MousePointerClick className="h-5 w-5" />
    ) : (
      <Pentagon className="h-5 w-5" />
    );

  const drawHint =
    isEmbeddingTask && embeddingMode === 'roi'
      ? 'Click the map to place your region of interest.'
      : 'Draw a polygon around what you want to detect.';
  const runHint = isProcessing ? 'Detection in progress…' : 'Run detection on your drawn area.';

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-6 z-20 flex justify-center px-4">
      <div
        className="pointer-events-auto flex max-w-full flex-col items-center gap-2 rounded-2xl border px-3 py-3 shadow-2xl"
        style={{
          backgroundColor: carbon.carbon,
          borderColor: carbon.border,
        }}
      >
        <p className="max-w-md text-center text-xs" style={{ color: carbon.secondary }}>
          {statusHint}
        </p>
        <div className="flex flex-wrap items-end justify-center gap-2">
          <div className="relative">
            {nextStepHighlight === 'draw' && (
              <NextStepCallout message={drawHint} align="center" compact />
            )}
            <ToolbarButton
            label={drawLabel}
            icon={drawIcon}
            onClick={onDrawPolygon}
            disabled={!canDraw || isProcessing || (isEmbeddingTask && embeddingMode === 'roi')}
          />
          </div>
          <ToolbarButton
            label="Delete"
            icon={<Trash2 className="h-5 w-5" />}
            onClick={onDelete}
            disabled={!canDelete || isProcessing}
          />
          <div className="relative">
            {nextStepHighlight === 'run' && (
              <NextStepCallout message={runHint} align="center" compact />
            )}
            <ToolbarButton
            label={isProcessing ? 'Running…' : 'Run detection'}
            icon={<Play className="h-5 w-5" />}
            onClick={onRun}
            disabled={!canRun || isProcessing}
            accent
          />
          </div>
        </div>
      </div>
    </div>
  );
}
