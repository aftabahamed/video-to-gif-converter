"use client";
// src/app/page.tsx
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton"; // Optional: for loading state

// Dynamically import the VideoConverter component with SSR turned off
const VideoConverterWithNoSSR = dynamic(
  () => import("@/components/VideoConverter"), // Adjust path if needed
  {
    ssr: false, // This is the key!
    loading: () => (
      // Optional: Show a loading skeleton or message
      <div className="w-full max-w-lg mx-auto space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-10 w-1/3" />
      </div>
    ),
  }
);

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24 bg-background">
      <VideoConverterWithNoSSR />
    </main>
  );
}
