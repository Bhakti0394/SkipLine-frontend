import React from "react";
import { Routes, Route } from "react-router-dom";

import Index from "../pages/KitchenDashboard/Index";
import NotFound from "../pages/KitchenDashboard/NotFound";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default App;