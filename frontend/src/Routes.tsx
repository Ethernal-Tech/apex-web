import { createBrowserRouter } from "react-router-dom"
import App from "./App";
import Bridge from "./Bridge";
import ErrorPage from "./router/ErrorPage";

export const router = createBrowserRouter([
    {
      path: "/",
      element: <App />,
      errorElement: <ErrorPage />,
    },
    {
      path: "/bridge",
      element: <Bridge />,
    },
  ]);