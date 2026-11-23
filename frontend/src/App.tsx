import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";

import { AppRoutes } from "./app/AppRoutes";
import { queryClient } from "./app/queryClient";
import { useSessionBootstrap } from "./app/useSessionBootstrap";
import { CursorGlow } from "./components/ui/CursorGlow";
import { Toaster } from "./components/ui/Toaster";

function SessionGate() {
  useSessionBootstrap();
  return (
    <>
      <AppRoutes />
      <Toaster />
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SessionGate />
      </BrowserRouter>
      {/* Mounted once, outside the router — follows the pointer across
          every route (login, partner, admin, public QR page) alike. */}
      <CursorGlow />
    </QueryClientProvider>
  );
}
