import type { Metadata } from "next";
import HealthLandingClient from "./HealthLandingClient";

// Rota oculta ate o dominio da vertical ser registrado: sem indexacao e sem links internos.
export const metadata: Metadata = {
  title: "Fluxo Health | Software clínico para clínicas de saúde",
  description:
    "Agenda, prontuário e financeiro em um só lugar, para nutrição, fisioterapia, odontologia, psicologia e estética. O tempo da consulta pertence ao paciente.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <HealthLandingClient />;
}
