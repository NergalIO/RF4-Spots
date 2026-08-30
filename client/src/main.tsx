import ReactDOM from "react-dom/client";
import { App } from "./App";
import { applyPlatformFlag } from "./platform";
import "leaflet/dist/leaflet.css";
import "./styles.css";

applyPlatformFlag();

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);

