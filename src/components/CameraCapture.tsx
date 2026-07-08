"use client";

import { useRef, useState } from "react";

interface CameraCaptureProps {
  onCapture: (file: File, previewUrl: string, base64: string) => void;
  disabled?: boolean;
}

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

export function CameraCapture({ onCapture, disabled }: CameraCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const previewUrl = URL.createObjectURL(file);
      const base64 = await fileToBase64(file);
      setPreview(previewUrl);
      onCapture(file, previewUrl, base64);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => inputRef.current?.click()}
        className="w-full rounded-2xl bg-emerald-600 px-6 py-5 text-lg font-semibold text-white shadow-lg transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Processing photo..." : "Take or upload receipt photo"}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {preview && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Receipt preview"
            className="max-h-80 w-full object-contain bg-slate-50"
          />
        </div>
      )}
    </div>
  );
}
