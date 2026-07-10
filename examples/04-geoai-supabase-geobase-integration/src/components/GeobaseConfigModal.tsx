import { useState } from 'react';
import { X, Image, Key } from 'lucide-react';
import { carbon } from '../utils/carbonTheme';

interface GeobaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: GeobaseConfig) => void;
  initialConfig?: GeobaseConfig;
}

interface GeobaseConfig {
  projectRef: string;
  cogImageryUrl: string;
  apiKey: string;
}

export function GeobaseConfigModal({ isOpen, onClose, onSave, initialConfig }: GeobaseConfigModalProps) {
  const [config, setConfig] = useState<GeobaseConfig>({
    projectRef: initialConfig?.projectRef || import.meta.env.VITE_GEOBASE_DEMO_PROJECT_REF || '',
    cogImageryUrl: initialConfig?.cogImageryUrl || import.meta.env.VITE_GEOBASE_DEMO_COG_IMAGERY_URL || '',
    apiKey: initialConfig?.apiKey || import.meta.env.VITE_GEOBASE_DEMO_API_KEY || '',
  });

  const [errors, setErrors] = useState<Partial<GeobaseConfig>>({});

  const validateConfig = (): boolean => {
    const newErrors: Partial<GeobaseConfig> = {};

    if (!config.projectRef.trim()) {
      newErrors.projectRef = 'Project reference is required';
    }

    if (!config.cogImageryUrl.trim()) {
      newErrors.cogImageryUrl = 'COG Imagery URL is required';
    } else if (!config.cogImageryUrl.startsWith('http')) {
      newErrors.cogImageryUrl = 'COG Imagery URL must start with http:// or https://';
    }

    if (!config.apiKey.trim()) {
      newErrors.apiKey = 'API key is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateConfig()) {
      onSave(config);
      onClose();
    }
  };

  const handleInputChange = (field: keyof GeobaseConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="carbon-card mx-4 w-full max-w-md p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold" style={{ color: carbon.chalk }}>
            {initialConfig ? 'Update Geobase Configuration' : 'Configure Geobase Provider'}
          </h2>
          <button
            onClick={onClose}
            className="transition-colors hover:text-white"
            style={{ color: carbon.muted }}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="form-label">
              <Key className="mr-1 inline h-4 w-4" />
              Project Reference
            </label>
            <input
              type="text"
              value={config.projectRef}
              onChange={(e) => handleInputChange('projectRef', e.target.value)}
              placeholder="e.g., loxsednpecspovfimsxq"
              className={`carbon-input ${errors.projectRef ? 'border-red-500' : ''}`}
            />
            {errors.projectRef && (
              <p className="mt-1 text-xs" style={{ color: carbon.error }}>{errors.projectRef}</p>
            )}
            <p className="mt-1 text-xs" style={{ color: carbon.muted }}>
              Your Geobase project identifier
            </p>
          </div>

          <div>
            <label className="form-label">
              <Image className="mr-1 inline h-4 w-4" />
              COG Imagery URL
            </label>
            <input
              type="url"
              value={config.cogImageryUrl}
              onChange={(e) => handleInputChange('cogImageryUrl', e.target.value)}
              placeholder="https://example.com/imagery.tif"
              className={`carbon-input ${errors.cogImageryUrl ? 'border-red-500' : ''}`}
            />
            {errors.cogImageryUrl && (
              <p className="mt-1 text-xs" style={{ color: carbon.error }}>{errors.cogImageryUrl}</p>
            )}
            <p className="mt-1 text-xs" style={{ color: carbon.muted }}>
              Direct URL to your COG (Cloud Optimized GeoTIFF) imagery file
            </p>
          </div>

          <div>
            <label className="form-label">
              <Key className="mr-1 inline h-4 w-4" />
              API Key
            </label>
            <input
              type="password"
              value={config.apiKey}
              onChange={(e) => handleInputChange('apiKey', e.target.value)}
              placeholder="Your Geobase API key"
              className={`carbon-input ${errors.apiKey ? 'border-red-500' : ''}`}
            />
            {errors.apiKey && (
              <p className="mt-1 text-xs" style={{ color: carbon.error }}>{errors.apiKey}</p>
            )}
            <p className="mt-1 text-xs" style={{ color: carbon.muted }}>
              Your Geobase API key for authentication
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button onClick={onClose} className="carbon-btn-secondary">
            Cancel
          </button>
          <button onClick={handleSave} className="carbon-btn-primary">
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
