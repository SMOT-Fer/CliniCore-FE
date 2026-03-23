import type { Metadata } from "next";
import HomeClient from "./home.client";

export const metadata: Metadata = {
  title: "CliniCore",
  description: "Inicio de CliniCore con acceso a login y documentación API.",
};

export default function HomePage() {
  return <HomeClient />;
}
