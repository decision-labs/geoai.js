"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">GeobaseAI.js</h1>
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
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-extrabold text-gray-800 sm:text-5xl sm:tracking-tight lg:text-5xl">
            Geospatial AI Models for the Web
          </h2>
          <p className="mt-5 max-w-xl mx-auto text-xl text-gray-600">
            Explore our suite of advanced AI models for geospatial data analysis. More models coming soon!
          </p>
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
              alt="Land Cover Classification"
              className="w-full h-48 object-cover rounded-lg mb-6"
            />
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
            {/* zero-shot-object-detection.mp4 */}
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
            <img
              src="/samples/wetland.jpg"
              alt="Wet Land Detection"
              className="w-full h-48 object-cover rounded-lg mb-6"
            />
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
            <img
              src="/samples/oriented-object.jpg"
              alt="Oriented Object Detection"
              className="w-full h-48 object-cover rounded-lg mb-6"
            />
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
            <img
              src="/samples/oil-storage-tank.jpg"
              alt="Oil Storage Tank Detection"
              className="w-full h-48 object-cover rounded-lg mb-6"
            />
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
