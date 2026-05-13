"use client";
import React, { Suspense } from "react";
import ConsultantChatClient from "./ConsultantChatClient";

export default function ConsultantChatPage() {
  return (
    <Suspense fallback={<div>Ładowanie czatu z konsultantem...</div>}>
      <ConsultantChatClient />
    </Suspense>
  );
}

