import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import "./index.css";

// 导入页面
import App from "./App";
import TimerPage from "./pages/Timer";
import TasksPage from "./pages/Tasks";
import CatPage from "./pages/Cat";
import StatsPage from "./pages/Stats";
import SettingsPage from "./pages/Settings";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <TimerPage /> },
      { path: "timer", element: <TimerPage /> },
      { path: "tasks", element: <TasksPage /> },
      { path: "cat", element: <CatPage /> },
      { path: "stats", element: <StatsPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
