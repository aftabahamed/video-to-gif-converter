// src/app/page.tsx
import VideoConverter from "@/components/VideoConverter"; // Adjust path if needed

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24 bg-background">
      <VideoConverter />
    </main>
  );
}
