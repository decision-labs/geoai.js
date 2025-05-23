"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import Sidebar from "./components/Sidebar";


const GEOBASE_CONFIG = {
  projectRef: "wmrosdnjsecywfkvxtrw",
  apikey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE4OTY1NDU4MjUsImlhdCI6MTczODc2MTQyNSwiaXNzIjoic3VwYWJhc2UiLCJyb2xlIjoiYW5vbiJ9.M8jeru5dbHe4tGh52xe2E2HlUiGCAPbZ8-JrfbxiRk0",
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
    <main className="w-full h-screen flex flex-col items-center justify-center bg-gray-50 overflow-auto">
      <h1 className="text-3xl font-bold mb-8">Example Grid</h1>
      <div className="w-full max-w-6xl px-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <a href="/tasks/object-detection" className="bg-white p-6 rounded shadow text-center hover:ring-2 ring-blue-400 transition">
          <img src="/samples/object-detection.jpg" alt="Object Detection" className="w-full h-32 object-cover rounded mb-4" />
          <h2 className="font-semibold mb-2">Object Detection</h2>
          <p className="text-gray-600">Detects and highlights objects in the imagery using AI models.</p>
        </a>
        <a href="/tasks/mask-generation" className="bg-white p-6 rounded shadow text-center hover:ring-2 ring-blue-400 transition">
          <img src="/samples/mask-generation.jpg" alt="Mask Generation" className="w-full h-32 object-cover rounded mb-4" />
          <h2 className="font-semibold mb-2">Mask Generation</h2>
          <p className="text-gray-600">Generates segmentation masks for features of interest in the image.</p>
        </a>
        <a href="/tasks/land-cover" className="bg-white p-6 rounded shadow text-center hover:ring-2 ring-blue-400 transition">
          <img src="/samples/land-cover.jpg" alt="Land Cover Classification" className="w-full h-32 object-cover rounded mb-4" />
          <h2 className="font-semibold mb-2">Land Cover Classification</h2>
          <p className="text-gray-600">Classifies terrain and land cover types such as water, forest, or urban areas.</p>
        </a>
        <a href="/tasks/zero-shot" className="bg-white p-6 rounded shadow text-center hover:ring-2 ring-blue-400 transition">
          <img src="/samples/zero-shot.jpg" alt="Zero Shot Object Detection" className="w-full h-32 object-cover rounded mb-4" />
          <h2 className="font-semibold mb-2">Zero Shot Object Detection</h2>
          <p className="text-gray-600">Detects objects without prior training on specific classes using advanced AI.</p>
        </a>
        <a href="/tasks/building-detection" className="bg-white p-6 rounded shadow text-center hover:ring-2 ring-blue-400 transition">
          <img src="/samples/building-detection.jpg" alt="Building Detection" className="w-full h-32 object-cover rounded mb-4" />
          <h2 className="font-semibold mb-2">Building Detection</h2>
          <p className="text-gray-600">Identifies and outlines buildings present in the imagery.</p>
        </a>
        <a href="/tasks/car-detection" className="bg-white p-6 rounded shadow text-center hover:ring-2 ring-blue-400 transition">
          <img src="/samples/car-detection.jpg" alt="Car Detection" className="w-full h-32 object-cover rounded mb-4" />
          <h2 className="font-semibold mb-2">Car Detection</h2>
          <p className="text-gray-600">Detects and marks cars and vehicles in the image.</p>
        </a>
        <a href="/tasks/wetland" className="bg-white p-6 rounded shadow text-center hover:ring-2 ring-blue-400 transition">
          <img src="/samples/wetland.jpg" alt="Wet Land Detection" className="w-full h-32 object-cover rounded mb-4" />
          <h2 className="font-semibold mb-2">Wet Land Detection</h2>
          <p className="text-gray-600">Identifies wetland areas such as marshes and swamps in the imagery.</p>
        </a>
        <a href="/tasks/solar-panel" className="bg-white p-6 rounded shadow text-center hover:ring-2 ring-blue-400 transition">
          <img src="/samples/solar-panel.jpg" alt="Solar Panel Detection" className="w-full h-32 object-cover rounded mb-4" />
          <h2 className="font-semibold mb-2">Solar Panel Detection</h2>
          <p className="text-gray-600">Detects solar panels and solar farms in the image.</p>
        </a>
        <a href="/tasks/ship-detection" className="bg-white p-6 rounded shadow text-center hover:ring-2 ring-blue-400 transition">
          <img src="/samples/ship-detection.jpg" alt="Ship Detection" className="w-full h-32 object-cover rounded mb-4" />
          <h2 className="font-semibold mb-2">Ship Detection</h2>
          <p className="text-gray-600">Detects ships and large vessels in water bodies.</p>
        </a>
        <a href="/tasks/oriented-object" className="bg-white p-6 rounded shadow text-center hover:ring-2 ring-blue-400 transition">
          <img src="/samples/oriented-object.jpg" alt="Oriented Object Detection" className="w-full h-32 object-cover rounded mb-4" />
          <h2 className="font-semibold mb-2">Oriented Object Detection</h2>
          <p className="text-gray-600">Detects objects and provides their orientation in the imagery.</p>
        </a>
      </div>
    </main>
  );
}
