import type { Metadata } from "next";
import HomeClient from "./home.client";

export const metadata: Metadata = {
  title: "Inicio",
  description: "Inicio de StarMOT con acceso a login y documentación API.",
};

export default function HomePage() {
  return <HomeClient />;
}
