import React, { memo } from "react";
import { Route, Routes } from "react-router-dom";

import { TOP } from "../Components/Pages/top";
import { Contact } from "../Components/Pages/contact";

interface RouteProps {
  path: string;
  Component: React.ComponentType;
}

const homeRoutes: RouteProps[] = [
  {
    path: "/top",
    Component: TOP
  },
  {
    path: "/contact",
    Component: Contact
  }
];

const RouterComponent: React.FC = () => {
  return (
    <Routes>
      {homeRoutes.map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={<route.Component />}
        />
      ))}
      <Route path="/contact" element={<Contact />} />
    </Routes>
  );
};

RouterComponent.displayName = "Router";

export const Router = memo(RouterComponent);
