import { useState } from 'react';
import { X, Image, Key } from 'lucide-react';

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
    apiKey: initialConfig?.apiKey || import.meta.env.VITE_GEOBASE_DEMO_API_KEY || ''
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
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {initialConfig ? 'Update Geobase Configuration' : 'Configure Geobase Provider'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Key className="w-4 h-4 inline mr-1" />
              Project Reference
            </label>
            <input
              type="text"
              value={config.projectRef}
              onChange={(e) => handleInputChange('projectRef', e.target.value)}
              placeholder="e.g., loxsednpecspovfimsxq"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.projectRef ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.projectRef && (
              <p className="text-red-500 text-xs mt-1">{errors.projectRef}</p>
            )}
            <p className="text-gray-500 text-xs mt-1">
              Your Geobase project identifier
            </p>
          </div>


          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Image className="w-4 h-4 inline mr-1" />
              COG Imagery URL
            </label>
            <input
              type="url"
              value={config.cogImageryUrl}
              onChange={(e) => handleInputChange('cogImageryUrl', e.target.value)}
              placeholder="https://oin-hotosm-temp.s3.us-east-1.amazonaws.com/66c49f250378ba0001bb5df2/0/66c49f250378ba0001bb5df3.tif"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.cogImageryUrl ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.cogImageryUrl && (
              <p className="text-red-500 text-xs mt-1">{errors.cogImageryUrl}</p>
            )}
            <p className="text-gray-500 text-xs mt-1">
              Direct URL to your COG (Cloud Optimized GeoTIFF) imagery file
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Key className="w-4 h-4 inline mr-1" />
              API Key
            </label>
            <input
              type="password"
              value={config.apiKey}
              onChange={(e) => handleInputChange('apiKey', e.target.value)}
              placeholder="Your Geobase API key"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.apiKey ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.apiKey && (
              <p className="text-red-500 text-xs mt-1">{errors.apiKey}</p>
            )}
            <p className="text-gray-500 text-xs mt-1">
              Your Geobase API key for authentication
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
