import React, { useState } from 'react';

interface ClassLabelSelectorProps {
  value: string;
  onChange: (label: string) => void;
  className?: string;
}

const predefinedLabels = [
  'trees.',
  'cars.',
  'buildings.',
  'trucks.',
  'cooling towers.',
  'ships.',
  'boats.',
  'solar panels.',
  'swimming pools.',
];

export const ClassLabelSelector: React.FC<ClassLabelSelectorProps> = ({
  value,
  onChange,
  className = '',
}) => {
  const [isCustom, setIsCustom] = useState(!predefinedLabels.includes(value));

  const handlePredefinedChange = (selectedLabel: string) => {
    if (selectedLabel === 'custom') {
      setIsCustom(true);
      onChange('');
    } else {
      setIsCustom(false);
      onChange(selectedLabel);
    }
  };

  const handleCustomChange = (customLabel: string) => {
    onChange(customLabel);
  };

  const ensureDot = (label: string) => {
    const trimmed = label.trim();
    return trimmed && !trimmed.endsWith('.') ? trimmed + '.' : trimmed;
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <label className="block text-sm font-medium text-blue-900 mb-2">
        Class Label
      </label>
      
      <div className="space-y-3">
        <select
          value={isCustom ? 'custom' : value}
          onChange={(e) => handlePredefinedChange(e.target.value)}
          className="block w-full rounded-md border-blue-300 bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none sm:text-sm text-gray-900 px-3 py-2 transition-all border"
        >
          {predefinedLabels.map((label) => (
            <option key={label} value={label}>
              {label}
            </option>
          ))}
          <option value="custom">Custom...</option>
        </select>

        {isCustom && (
          <input
            type="text"
            value={value}
            onChange={(e) => handleCustomChange(e.target.value)}
            onBlur={(e) => handleCustomChange(ensureDot(e.target.value))}
            placeholder="e.g., car."
            className="block w-full rounded-md border-blue-300 bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none sm:text-sm text-gray-900 px-3 py-2 transition-all border"
          />
        )}
      </div>
      
      <p className="text-xs text-blue-600 mt-2">
        Specify the object type you want to detect (e.g., "cars.", "buildings.")
      </p>
    </div>
  );
};
