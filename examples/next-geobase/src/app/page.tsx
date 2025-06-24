"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import GitHubButton from 'react-github-btn'

const GEOBASE_CONFIG = {
  projectRef: process.env.NEXT_PUBLIC_GEOBASE_PROJECT_REF,
  apikey: process.env.NEXT_PUBLIC_GEOBASE_API_KEY,
  cogImagery:
    "https://oin-hotosm-temp.s3.us-east-1.amazonaws.com/67ba1d2bec9237a9ebd358a3/0/67ba1d2bec9237a9ebd358a4.tif",
  provider: "geobase",
};

export default function Home() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    console.log("Initializing map...");
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          },
          "raster-tiles": {
            type: "raster",
            tiles: [
              `https://${GEOBASE_CONFIG.projectRef}.geobase.app/titiler/v1/cog/tiles/WebMercatorQuad/{z}/{x}/{y}?url=${GEOBASE_CONFIG.cogImagery}&apikey=${GEOBASE_CONFIG.apikey}`,
            ],
            tileSize: 256,
            attribution:
              'Data &copy; <a href="https://openaerialmap.org/" target="_blank">OpenAerialMap</a> contributors',
          },
          "mapbox-satellite": {
            type: "raster",
            tiles: [
              "https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}.png?access_token=pk.eyJ1Ijoic2FiIiwiYSI6ImNsNDE3bGR3bzB2MmczaXF5dmxpaTloNmcifQ.NQ-B8jBPtOd53tNYt42Gqw",
            ],
            tileSize: 256,
          },
        },
        layers: [
          {
            id: "osm-tiles",
            type: "raster",
            source: "osm",
            minzoom: 0,
            maxzoom: 19,
          },
          {
            id: "simple-tiles",
            type: "raster",
            source: "raster-tiles",
            minzoom: 0,
            maxzoom: 22,
          },
        ],
      },
      center: [114.84857638295142, -3.449805712621256],
      zoom: 18,
    });

    return () => {
      console.log("Cleaning up map...");
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  // return (
  //   <main className="w-full h-screen flex">
  //     {/* Sidebar */}
  //     <Sidebar map={map} />
  //     {/* Map Container */}
  //     <div className="flex-1 h-full relative">
  //       <div ref={mapContainer} className="w-full h-full" />
  //     </div>
  //   </main>
  // );

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">GeoAI.js</h1>
            </div>
            <nav className="flex space-x-8">
              <a
                href="#"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Home
              </a>
              <a
                href="#"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Documentation
              </a>
              <a
                href="#"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                About
              </a>
              {/* add github star button */}
              <div className="flex items-center">
                <GitHubButton href="https://github.com/decision-labs/geobase-ai.js" data-color-scheme="no-preference: light; light: light; dark: light;" data-size="large" data-show-count="true" aria-label="Star decision-labs/geobase-ai.js on GitHub">Star</GitHubButton>
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center py-16 mb-12">
          <h2 className="text-6xl sm:text-6xl font-semibold text-gray-900 leading-tight mb-4">
            GeoAI for the modern
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/9/99/Unofficial_JavaScript_logo_2.svg"
              alt="JavaScript logo"
              className="inline h-16 align-middle mx-2"
              style={{ top: 'bottom', marginBottom: '20px' }}
            />
            developer
          </h2>
          <p className="mt-4 mb-10 max-w-2xl mx-auto text-2xl sm:text-2xl font-light text-gray-700 leading-relaxed">
          Open-source GeoAI. No backend required. Run models right in your JavaScript apps or edge devices!
          </p>
          {/* Google Fonts for Permanent Marker */}
          <link href="https://fonts.googleapis.com/css2?family=Permanent+Marker&display=swap" rel="stylesheet" />
          <div
            className="mx-auto mt-6 w-fit bg-yellow-400 text-black rounded-sm shadow p-3 text-2xl font-bold text-center"
            style={{ fontFamily: 'Permanent Marker, cursive', transform: 'rotate(-3deg)' }}
          >
            We're working on more models—stay tuned or{' '}
            <a href="https://mailchi.mp/ece911e44b4e/new-geoaijs-models" className="underline hover:text-yellow-700 font-bold text-blue-900" target="_blank" rel="noopener noreferrer">join our newsletter</a>!
          </div>
        </div>

        <section className="max-w-3xl mx-auto mb-12">
          <div className="mb-4">
            <SyntaxHighlighter language="shell" style={oneDark} customStyle={{ borderRadius: 8, fontSize: 16, marginBottom: 16 }}>
              pnpm add @geobase/geoai
            </SyntaxHighlighter>
          </div>
          <SyntaxHighlighter language="javascript" style={oneDark} customStyle={{ borderRadius: 8, fontSize: 16 }}>
            {`import { geoai } from "@geobase/geoai";

// mapProviderConfig can also accept Mapbox or other image tile endpoints
const mapProviderConfig = {
  provider: "geobase", projectRef, apikey, cogImagery
};

const pipeline = await geoai.pipeline(
  [{ task : "object-detection"}], mapProviderConfig
);

const result = await pipeline.inference(polygon);`}
          </SyntaxHighlighter>
        </section>

        {/* Works with section */}
        <div className="max-w-3xl mx-auto mb-12 text-center">
          <div className="flex items-center justify-center mb-4">
            <hr className="flex-grow border-gray-200" />
            <span className="mx-4 text-sm text-gray-400">Works with</span>
            <hr className="flex-grow border-gray-200" />
          </div>
          <div className="flex flex-wrap justify-center items-center gap-8">
            <div className="flex flex-col items-center">
              <div className="h-12 w-28 flex items-center justify-center mb-2">
                <img src="/provider-logos/geobase.svg" alt="Geobase" className="h-full object-contain filter grayscale" />
              </div>
            </div>
            <div className="flex flex-col items-center">
              <div className="h-12 w-28 flex items-center justify-center mb-2">
                <img src="/provider-logos/mapbox.svg" alt="Mapbox" className="h-full object-contain filter grayscale" />
              </div>
            </div>
            <div className="flex flex-col items-center">
              <div className="h-12 w-28 flex items-center justify-center mb-2">
                <img src="/provider-logos/esri.svg" alt="ESRI" className="h-full object-contain filter grayscale" style={{ transform: 'scale(0.7)' }} />
              </div>
              <span className="mt-1 px-2 py-0.5 border border-dashed border-gray-300 rounded text-xs text-gray-400">coming soon</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="h-12 w-28 flex items-center justify-center mb-2">
                <img src="/provider-logos/google-maps.svg" alt="Google Maps" className="h-full object-contain filter grayscale" />
              </div>
              <span className="mt-1 px-2 py-0.5 border border-dashed border-gray-300 rounded text-xs text-gray-400">coming soon</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <a
            href="/tasks/object-detection"
            className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-48 object-cover rounded-lg mb-6"
            >
              <source src="/video/object-detection.mp4" type="video/mp4" />
            </video>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Object Detection
            </h2>
            <p className="text-gray-600 text-lg">
              Detects and highlights objects in the imagery using AI models.
            </p>
          </a>
          <a
            href="/tasks/mask-generation"
            className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-48 object-cover rounded-lg mb-6"
            >
              <source src="/video/mask-generation.mp4" type="video/mp4" />
            </video>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Mask Generation
            </h2>
            <p className="text-gray-600 text-lg">
              Generates segmentation masks for features of interest in the
              image.
            </p>
          </a>
          <a
            href="/tasks/building-footprint"
            className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-48 object-cover rounded-lg mb-6"
            >
              <source src="/video/building-footprint.mp4" type="video/mp4" />
            </video>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Building Footprint Segmentation
            </h2>
            <p className="text-gray-600 text-lg">
              Generates segmentation masks for building footprints
              in satellite imagery.
            </p>
          </a>
          <a
            href="/tasks/land-cover"
            className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-48 object-cover rounded-lg mb-6"
            >
              <source src="/video/land-cover-classification.mp4" type="video/mp4" />
            </video>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Land Cover Classification
            </h2>
            <p className="text-gray-600 text-lg">
              Classifies terrain and land cover types such as water, forest, or
              urban areas.
            </p>
          </a>
          <a
            href="/tasks/zero-shot"
            className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-48 object-cover rounded-lg mb-6"
            >
              <source src="/video/zero-shot-object-detection.mp4" type="video/mp4" />
            </video>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Zero Shot Object Detection
            </h2>
            <p className="text-gray-600 text-lg">
              Detects objects without prior training on specific classes using
              advanced AI.
            </p>
          </a>
          <a
            href="/tasks/zero-shot-segmentation"
            className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-48 object-cover rounded-lg mb-6"
            >
              <source src="/video/zero-shot-segmentation.mp4" type="video/mp4" />
            </video>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Zero Shot Segmentation
            </h2>
            <p className="text-gray-600 text-lg">
              Segment objects without prior training on specific classes using
              advanced AI.
            </p>
          </a>          
          <a
            href="/tasks/building-detection"
            className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-48 object-cover rounded-lg mb-6"
            >
              <source src="/video/building-detection.mp4" type="video/mp4" />
            </video>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Building Detection
            </h2>
            <p className="text-gray-600 text-lg">
              Identifies and outlines buildings present in the imagery.
            </p>
          </a>
          <a
            href="/tasks/car-detection"
            className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-48 object-cover rounded-lg mb-6"
            >
              <source src="/video/cars-detection-model.mp4" type="video/mp4" />
            </video>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Car Detection
            </h2>
            <p className="text-gray-600 text-lg">
              Detects and marks cars and vehicles in the image.
            </p>
          </a>
          <a
            href="/tasks/wetland-segmentation"
            className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-48 object-cover rounded-lg mb-6"
            >
              <source src="/video/wetland-segmentation.mp4" type="video/mp4" />
            </video>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Wet Land Detection
            </h2>
            <p className="text-gray-600 text-lg">
              Identifies wetland areas such as marshes and swamps in the
              imagery.
            </p>
          </a>
          <a
            href="/tasks/solar-panel"
            className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-48 object-cover rounded-lg mb-6"
            >
              <source src="/video/solar-detection-model.mp4" type="video/mp4" />
            </video>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Solar Panel Detection
            </h2>
            <p className="text-gray-600 text-lg">
              Detects solar panels and solar farms in the image.
            </p>
          </a>
          <a
            href="/tasks/ship-detection"
            className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-48 object-cover rounded-lg mb-6"
            >
              <source src="/video/ship-detection-model.mp4" type="video/mp4" />
            </video>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Ship Detection
            </h2>
            <p className="text-gray-600 text-lg">
              Detects ships and large vessels in water bodies.
            </p>
          </a>
          <a
            href="/tasks/oriented-object-detection"
            className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-48 object-cover rounded-lg mb-6"
            >
              <source src="/video/oriented-object-detection.mp4" type="video/mp4" />
            </video>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Oriented Object Detection
            </h2>
            <p className="text-gray-600 text-lg">
              Detects objects and provides their orientation in the imagery.
            </p>
          </a>
          <a
            href="/tasks/oil-storage-tank"
            className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-48 object-cover rounded-lg mb-6"
            >
              <source src="/video/oil-storage-tank.mp4" type="video/mp4" />
            </video>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Oil Storage Tank Detection
            </h2>
            <p className="text-gray-600 text-lg">
              Detects oil storage tanks in the imagery.
            </p>
          </a>          
        </div>
      </main>
    </div>
  );
}
