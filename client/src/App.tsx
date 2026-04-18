import { NavLink, Route, Routes } from "react-router-dom";
import CampaignsPage from "./pages/CampaignsPage";
import HomePage from "./pages/HomePage";
import ApifyPage from "./pages/ApifyPage";
import SponsorsPage from "./pages/SponsorsPage";

export default function App() {
  return (
    <div className="layout">
      <nav className="nav">
        <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
          Overview
        </NavLink>
        <NavLink
          to="/sponsors"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Sponsors
        </NavLink>
        <NavLink
          to="/campaigns"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Campaigns
        </NavLink>
        <NavLink to="/apify" className={({ isActive }) => (isActive ? "active" : "")}>
          Apify lab
        </NavLink>
      </nav>

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/sponsors" element={<SponsorsPage />} />
        <Route path="/campaigns" element={<CampaignsPage />} />
        <Route path="/apify" element={<ApifyPage />} />
      </Routes>
    </div>
  );
}
