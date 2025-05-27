// src/components/VideoConverter.tsx
"use client"; // This is crucial for FFMPEG.WASM to work in Next.js App Router

import React, { useState, useRef, useEffect } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress"; // Optional
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // For messages

export default function VideoConverter() {
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0); // Optional for progress
  const [message, setMessage] = useState<string | null>(null); // For logs or errors
  const ffmpegRef = useRef(new FFmpeg());

  // --- 1. Load FFMPEG ---
  const loadFfmpeg = async () => {
    setMessage("Loading FFMPEG.WASM (ffmpeg.wasm)... This may take a moment.");
    const ffmpeg = ffmpegRef.current;
    ffmpeg.on("log", ({ message: logMessage }) => {
      // You can parse logMessage to show more structured progress if needed
      console.log(logMessage);
      setMessage(logMessage); // Display raw FFMPEG logs
    });

    ffmpeg.on("progress", ({ progress: p, time }) => {
      console.log(time, `time`);
      // Progress is a value between 0 and 1
      setProgress(Math.round(p * 100));
    });

    try {
      // URL for the FFMPEG core files.
      // Using unpkg CDN. You can also host these files in your `public` folder.
      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
      // Note: Using a specific version (0.12.6) as it's known to be stable.
      // Newer versions (@ffmpeg/core-mt for multi-threaded) might require specific server headers (COOP, COEP).
      // The single-threaded version (@ffmpeg/core) is generally easier to set up.

      await ffmpeg.load({
        coreURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.js`,
          "text/javascript"
        ),
        wasmURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.wasm`,
          "application/wasm"
        ),
        // workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript'), // For multi-threaded
      });
      setFfmpegLoaded(true);
      setMessage("FFMPEG loaded successfully!");
    } catch (error) {
      console.error("Error loading FFMPEG:", error);
      setMessage(`Error loading FFMPEG: ${error}`);
      setFfmpegLoaded(false);
    }
  };

  useEffect(() => {
    loadFfmpeg();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Load FFMPEG on component mount

  // --- 2. Handle File Input ---
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setGifUrl(null); // Reset previous GIF
      setMessage("Video file selected.");
      setProgress(0);
    }
  };

  // --- 3. Conversion Logic ---
  const convertToGif = async () => {
    if (!ffmpegLoaded) {
      setMessage("FFMPEG is not loaded yet. Please wait.");
      return;
    }
    if (!videoFile) {
      setMessage("Please select a video file first.");
      return;
    }

    setIsConverting(true);
    setGifUrl(null);
    setProgress(0);
    setMessage("Starting conversion...");

    const ffmpeg = ffmpegRef.current;
    const inputFileName = "input." + videoFile.name.split(".").pop(); // e.g., input.mp4
    const outputFileName = "output.gif";

    try {
      // Write the video file to FFMPEG's virtual file system
      await ffmpeg.writeFile(inputFileName, await fetchFile(videoFile));
      setMessage("Video file written to FFMPEG memory.");

      // Run the FFMPEG command for GIF conversion
      // Example command: -i input.mp4 -vf "fps=10,scale=320:-1:flags=lanczos" output.gif
      // -i: input file
      // -vf: video filter
      //   fps=10: set GIF to 10 frames per second
      //   scale=480:-1: resize width to 480px, height auto-adjusts maintaining aspect ratio
      //   flags=lanczos: good quality scaling algorithm
      // You can adjust these parameters!
      setMessage("Running FFMPEG command...");
      await ffmpeg.exec([
        "-i",
        inputFileName,
        "-vf",
        "fps=15,scale=480:-1:flags=lanczos", // Adjust fps and scale as needed
        // '-ss', '00:00:01', // Optional: Start time (e.g., 1 second in)
        // '-t', '3',         // Optional: Duration (e.g., 3 seconds long)
        outputFileName,
      ]);
      setMessage("Conversion complete! Reading output...");

      // Read the resulting GIF
      const data = await ffmpeg.readFile(outputFileName);

      // Create a URL for the GIF blob
      const url = URL.createObjectURL(new Blob([data], { type: "image/gif" }));
      setGifUrl(url);
      setMessage("GIF generated successfully!");

      // Optional: Clean up files from FFMPEG's virtual file system
      // await ffmpeg.deleteFile(inputFileName);
      // await ffmpeg.deleteFile(outputFileName);
    } catch (error) {
      console.error("Error during conversion:", error);
      setMessage(`Conversion error: ${error}`);
      setGifUrl(null);
    } finally {
      setIsConverting(false);
      setProgress(100); // Mark as complete
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Video to GIF Converter</CardTitle>
        <CardDescription>
          Upload your video and convert it to an animated GIF.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!ffmpegLoaded && message && (
          <Alert
            variant={message?.startsWith("Error") ? "destructive" : "default"}
          >
            <AlertTitle>
              {message?.startsWith("Error") ? "Error" : "Status"}
            </AlertTitle>
            <AlertDescription>
              {message || "Loading FFMPEG..."}
            </AlertDescription>
          </Alert>
        )}

        {ffmpegLoaded && (
          <>
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="video-file">Select Video File</Label>
              <Input
                id="video-file"
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                disabled={isConverting}
              />
            </div>

            {videoFile && !isConverting && (
              <Button
                onClick={convertToGif}
                disabled={!videoFile || isConverting || !ffmpegLoaded}
              >
                Convert to GIF
              </Button>
            )}
          </>
        )}

        {(isConverting || progress > 0) && ffmpegLoaded && (
          <div className="space-y-2">
            <Label>{isConverting ? "Converting..." : "Progress"}</Label>
            <Progress value={progress} className="w-full" />
            {message && (
              <p className="text-sm text-muted-foreground">{message}</p>
            )}
          </div>
        )}

        {gifUrl && !isConverting && (
          <div className="space-y-2 mt-4">
            <Label>Generated GIF:</Label>
            <img
              src={gifUrl}
              alt="Generated GIF"
              className="max-w-full rounded-md border"
            />
            <Button asChild variant="outline">
              <a
                href={gifUrl}
                download={`${videoFile?.name.split(".")[0] || "converted"}.gif`}
              >
                Download GIF
              </a>
            </Button>
          </div>
        )}
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-xs text-muted-foreground">
          Conversion happens in your browser. No files are uploaded to a server.
        </p>
      </CardFooter>
    </Card>
  );
}
