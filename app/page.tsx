import { Analytics } from "@vercel/analytics/react";

import { Home } from "./components/home";

import { getServerSideConfig } from "./config/server";

const serverSideConfigPromise = getServerSideConfig();

export default async function App() {
  return (
    <>
      <Home />
      {(await serverSideConfigPromise)?.isVercel && <Analytics />}
    </>
  );
}
