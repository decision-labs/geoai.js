import logo from "./logo.svg";
import "./App.css";
import { useRef, useState } from "react";
import MapboxDrawComponent from "./MapboxDrawComponent";

function App() {
  const mapContainerRef = useRef(null);
  const [geojson, setGeojson] = useState("");

  const handleGeojsonChange = event => {
    setGeojson(event.target.value);
    // Add logic to update the map with the new GeoJSON
  };

  return (
    <div className="App">
      <textarea
        value={geojson}
        onChange={handleGeojsonChange}
        placeholder="Paste GeoJSON here"
        style={{ width: "100%", height: "150px" }}
      />
      <div ref={mapContainerRef} style={{ width: "100%", height: "500px" }}>
        <MapboxDrawComponent
          mapContainerRef={mapContainerRef}
          geojson={geojson}
        />
      </div>
    </div>
  );
}

export default App;
