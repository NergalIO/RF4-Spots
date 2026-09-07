import ReactDOM from "react-dom/client";
import { App } from "./app/App";
import { applyPlatformFlag } from "./shared/platform";
import "leaflet/dist/leaflet.css";
import "./styles.css";

applyPlatformFlag();

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);

