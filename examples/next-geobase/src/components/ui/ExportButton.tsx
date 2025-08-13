import React, { useState } from 'react';
import { ExportUtils } from '../../utils/exportUtils';

interface ExportButtonProps {
  detections?: GeoJSON.FeatureCollection;
  geoRawImage?: any;
  task?: string;
  provider?: string;
  disabled?: boolean;
  className?: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  detections,
  geoRawImage,
  task = 'detection',
  provider = 'unknown',
  disabled = false,
  className = '',
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleDownloadGeoJSON = () => {
    if (!detections || !detections.features.length) return;
    
    const filename = ExportUtils.generateFilename(task, provider);
    ExportUtils.downloadGeoJSON(detections, filename);
    setShowDropdown(false);
  };

  const handleDownloadPNG = () => {
    if (!geoRawImage) return;
    
    try {
      const filename = ExportUtils.generateImageFilename(task, provider);
      ExportUtils.downloadPNG(geoRawImage, filename);
      setShowDropdown(false);
    } catch (error) {
      console.error('Failed to download PNG:', error);
      // You could add a toast notification here
    }
  };

  const handleCopyToClipboard = async () => {
    if (!detections) return;
    
    try {
      const formattedGeoJSON = ExportUtils.formatGeoJSONForCopy(detections);
      await ExportUtils.copyToClipboard(formattedGeoJSON);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setShowDropdown(false);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const hasDetections = detections && detections.features.length > 0;
  const hasGeoImage = !!geoRawImage;
  const hasExportableData = hasDetections || hasGeoImage;

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={disabled || !hasExportableData}
        className={`
          flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-200
          ${hasExportableData && !disabled
            ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg hover:shadow-emerald-500/25'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }
          ${className}
        `}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export
        <svg className={`w-4 h-4 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {showDropdown && hasExportableData && (
        <div className="absolute top-full right-0 mt-2 w-56 bg-white/95 backdrop-blur-xl rounded-lg shadow-2xl border border-gray-200/50 z-50">
          <div className="p-2">
            {hasDetections && (
              <>
                <button
                  onClick={handleDownloadGeoJSON}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-emerald-50/80 rounded-lg transition-colors duration-200 text-gray-700"
                >
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div>
                    <div className="font-medium">Download GeoJSON</div>
                    <div className="text-xs text-gray-500">Save detections as .geojson</div>
                  </div>
                </button>
                
                <button
                  onClick={handleCopyToClipboard}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-emerald-50/80 rounded-lg transition-colors duration-200 text-gray-700"
                >
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <div className="font-medium">
                      {copied ? 'Copied!' : 'Copy GeoJSON'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {copied ? 'GeoJSON copied successfully' : 'Copy formatted GeoJSON'}
                    </div>
                  </div>
                </button>
              </>
            )}

            {hasGeoImage && (
              <button
                onClick={handleDownloadPNG}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-emerald-50/80 rounded-lg transition-colors duration-200 text-gray-700"
              >
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div>
                  <div className="font-medium">Reference Image</div>
                  <div className="text-xs text-gray-500">Save reference image as .png</div>
                </div>
              </button>
            )}
          </div>
          
          {/* Export info */}
          <div className="px-4 py-2 border-t border-gray-200/50 bg-gray-50/50">
            <div className="text-xs text-gray-600">
              {hasDetections && `${detections.features.length} detection${detections.features.length !== 1 ? 's' : ''}`}
              {hasDetections && hasGeoImage && ' • '}
              {hasGeoImage && `${geoRawImage.width}×${geoRawImage.height} image`}
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {showDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
};
