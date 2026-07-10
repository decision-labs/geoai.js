import { ArrowDown } from 'lucide-react';
import { carbon } from '../../utils/carbonTheme';

interface NextStepCalloutProps {
  message: string;
  align?: 'left' | 'center';
  compact?: boolean;
  /** When true, flows in document layout instead of absolute positioning. */
  inline?: boolean;
}

export function NextStepCallout({
  message,
  align = 'left',
  compact = false,
  inline = false,
}: NextStepCalloutProps) {
  return (
    <div
      className={`next-step-callout pointer-events-none ${
        inline
          ? 'w-full'
          : `absolute z-20 bottom-full mb-2 ${
              align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-5'
            }`
      }`}
      role="status"
      aria-live="polite"
    >
      <div
        className={`relative rounded-lg border shadow-lg backdrop-blur-sm ${
          inline ? 'w-full px-4 py-3' : 'min-w-[18rem] max-w-[26rem] px-4 py-3'
        }`}
        style={{
          backgroundColor: 'rgba(33, 37, 41, 0.96)',
          borderColor: `${carbon.accent}66`,
          boxShadow: `0 8px 24px rgba(0, 0, 0, 0.35), 0 0 0 1px ${carbon.accent}22`,
        }}
      >
        <div className="flex items-start gap-3">
          <ArrowDown
            className="mt-0.5 h-4 w-4 shrink-0"
            style={{ color: carbon.accent }}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: carbon.accent }}
            >
              Next step
            </p>
            <p
              className={`mt-1 leading-relaxed ${compact ? 'text-sm' : 'text-sm'}`}
              style={{ color: carbon.chalk }}
            >
              {message}
            </p>
          </div>
        </div>
        {!inline && (
          <>
            <span
              className="absolute left-1/2 top-full -translate-x-1/2 border-[6px] border-transparent"
              style={{ borderTopColor: `${carbon.accent}66` }}
              aria-hidden
            />
            <span
              className="absolute left-1/2 top-[calc(100%-1px)] -translate-x-1/2 border-[5px] border-transparent"
              style={{ borderTopColor: 'rgba(33, 37, 41, 0.96)' }}
              aria-hidden
            />
          </>
        )}
      </div>
    </div>
  );
}
