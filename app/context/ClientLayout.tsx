'use client';

import { ToastProvider } from "@/app/context/ToastContext";
import { ToastContainer } from "@/app/components/ToastContainer";
import React from "react";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      {children}
      <ToastContainer />
    </ToastProvider>
  );
}
