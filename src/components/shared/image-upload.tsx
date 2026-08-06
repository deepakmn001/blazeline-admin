"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Upload,
  ImagePlus,
  Trash2,
  Loader2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

interface ImageUploadProps {
  value?: File | null;

  previewUrl?: string | null;

  onChange: (file: File | null) => void;

  label?: string;

  description?: string;

  disabled?: boolean;

  maxSizeMB?: number;

  accept?: string[];
}

const DEFAULT_ACCEPT = [
  "image/png",
  "image/jpeg",
  "image/webp",
];

export function ImageUpload({
  value,
  previewUrl,

  onChange,

  label = "Category Image",

  description =
    "PNG, JPG or WEBP. Maximum 5 MB.",

  disabled = false,

  maxSizeMB = 5,

  accept = DEFAULT_ACCEPT,
}: ImageUploadProps) {
  const inputRef =
    useRef<HTMLInputElement>(null);

  const [dragging, setDragging] =
    useState(false);

  const [error, setError] =
    useState("");

  const [preview, setPreview] =
    useState<string | null>(
      previewUrl ?? null
    );

  const [loading, setLoading] =
    useState(false);

  useEffect(() => {
    if (previewUrl) {
      setPreview(previewUrl);
    }
  }, [previewUrl]);

  useEffect(() => {
    if (!value) return;

    const url =
      URL.createObjectURL(value);

    setPreview(url);

    return () =>
      URL.revokeObjectURL(url);
  }, [value]);

  function validate(file: File) {
    if (
      !accept.includes(file.type)
    ) {
      return "Only PNG, JPG and WEBP images are allowed.";
    }

    if (
      file.size >
      maxSizeMB *
        1024 *
        1024
    ) {
      return `Image must be smaller than ${maxSizeMB} MB.`;
    }

    return null;
  }
    function handleFile(file: File | null) {
    if (!file) return;

    const validationError = validate(file);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setLoading(true);

    onChange(file);

    const url = URL.createObjectURL(file);

    setPreview(url);

    setTimeout(() => {
      setLoading(false);
    }, 250);
  }

  function openFilePicker() {
    if (disabled) return;

    inputRef.current?.click();
  }

  function removeImage() {
    onChange(null);

    setPreview(null);

    setError("");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function onDrop(
    event: React.DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();

    if (disabled) return;

    setDragging(false);

    const file =
      event.dataTransfer.files?.[0] ?? null;

    handleFile(file);
  }

  function onDragOver(
    event: React.DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();

    if (disabled) return;

    setDragging(true);
  }

  function onDragLeave() {
    setDragging(false);
  }

  return (
    <Card className="overflow-hidden rounded-2xl">

      <CardContent className="p-6">

        <div className="mb-4">

          <h3 className="text-sm font-semibold text-ink">
            {label}
          </h3>

          <p className="mt-1 text-xs text-ink-faint">
            {description}
          </p>

        </div>

        <input
          ref={inputRef}
          type="file"
          accept={accept.join(",")}
          hidden
          onChange={(event) =>
            handleFile(
              event.target.files?.[0] ?? null
            )
          }
        />

        <div
          onClick={openFilePicker}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={cn(
            "relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 transition-all",
            dragging
              ? "border-brand-500 bg-brand-50"
              : "border-line hover:border-brand-300 hover:bg-brand-50/40",
            disabled &&
              "pointer-events-none opacity-50"
          )}
        >
                  {loading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-brand-500" />

              <p className="text-sm text-ink-faint">
                Preparing image...
              </p>
            </div>
          ) : preview ? (
            <div className="flex w-full flex-col items-center gap-5">

              <div className="relative h-56 w-full overflow-hidden rounded-2xl border border-line">

                <Image
                  src={preview}
                  alt="Preview"
                  fill
                  className="object-cover"
                />

              </div>

              <div className="flex flex-wrap justify-center gap-3">

                <Button
                  type="button"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    openFilePicker();
                  }}
                >
                  <Upload className="h-4 w-4" />
                  Replace Image
                </Button>

                <Button
                  type="button"
                  variant="destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage();
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </Button>

              </div>

            </div>
          ) : (
            <>

              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50">

                <ImagePlus className="h-8 w-8 text-brand-600" />

              </div>

              <h4 className="text-base font-semibold text-ink">
                Drag & Drop Image
              </h4>

              <p className="mt-2 max-w-sm text-center text-sm text-ink-faint">
                Drop an image here or click to browse your computer.
              </p>

              <Button
                type="button"
                className="mt-6"
              >
                Browse Files
              </Button>

            </>
          )}
        </div>
        

        {error && (
          <p className="mt-3 text-sm font-medium text-danger">
            {error}
          </p>
        )}

      </CardContent>

    </Card>
  );
}