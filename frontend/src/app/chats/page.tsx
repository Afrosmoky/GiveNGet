"use client";
import React, { Suspense } from "react";
import ChatsClient from "./ChatsClient";

export default function ChatsPage() {
  return (
    <Suspense fallback={<div>Ładowanie czatu...</div>}>
      <ChatsClient />
    </Suspense>
  );
} 