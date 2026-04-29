"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  CheckCircle2,
  ClipboardCheck,
  ImagePlus,
  Loader2,
  Sparkles,
  Trash2,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import type { RoomScanResponse, RoomScanSuggestion } from "@/lib/room-scan/schema";

type ScanStep = "intro" | "capture" | "review";

type CapturedImage = {
  id: string;
  name: string;
  dataUrl: string;
};

function formatValue(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function fileToImage(file: File) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function compressImage(file: File) {
  const image = await fileToImage(file);
  const maxSide = 1280;
  const ratio = Math.min(1, maxSide / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * ratio));
  const height = Math.max(1, Math.round(image.height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not prepare this image.");
  }

  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.78);
}

export function RoomScanFlow({
  existingTaskCount,
  roomId,
  roomName,
  roomUrl,
  workspaceId,
}: {
  existingTaskCount: number;
  roomId: string;
  roomName: string;
  roomUrl: string;
  workspaceId: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<ScanStep>("intro");
  const [images, setImages] = useState<CapturedImage[]>([]);
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<RoomScanResponse | null>(null);
  const [selectedTitles, setSelectedTitles] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const totalPayloadSize = useMemo(
    () => images.reduce((sum, image) => sum + image.dataUrl.length, 0),
    [images],
  );

  async function addImages(files: FileList | null) {
    if (!files) {
      return;
    }

    setError(null);
    const remainingSlots = 4 - images.length;
    const selectedFiles = Array.from(files).slice(0, remainingSlots);

    try {
      const compressedImages = await Promise.all(
        selectedFiles.map(async (file) => ({
          id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
          name: file.name,
          dataUrl: await compressImage(file),
        })),
      );
      const nextImages = [...images, ...compressedImages];
      const nextPayloadSize = nextImages.reduce(
        (sum, image) => sum + image.dataUrl.length,
        0,
      );

      if (nextPayloadSize > 5_600_000) {
        setError("Those photos are too large together. Try fewer photos.");
        return;
      }

      setImages(nextImages);
    } catch (imageError) {
      setError(
        imageError instanceof Error
          ? imageError.message
          : "One of those photos could not be prepared.",
      );
    }
  }

  function generateSuggestions() {
    setError(null);

    if (images.length === 0) {
      setError("Add at least one room photo before generating tasks.");
      return;
    }

    startTransition(async () => {
      const response = await fetch(
        `/app/workspaces/${workspaceId}/rooms/${roomId}/scan/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            notes,
            images: images.map((image) => image.dataUrl),
          }),
        },
      );
      const body = await response.json();

      if (!response.ok) {
        setError(body.error ?? "Room Scan could not generate suggestions.");
        return;
      }

      setResult(body);
      setSelectedTitles(
        new Set(
          (body.suggestions as RoomScanSuggestion[]).map(
            (suggestion) => suggestion.title,
          ),
        ),
      );
      setStep("review");
    });
  }

  function saveSelectedTasks() {
    if (!result) {
      return;
    }

    const suggestions = result.suggestions.filter((suggestion) =>
      selectedTitles.has(suggestion.title),
    );

    if (suggestions.length === 0) {
      setError("Choose at least one suggestion to create.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const response = await fetch(
        `/app/workspaces/${workspaceId}/rooms/${roomId}/scan/create`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ suggestions }),
        },
      );
      const body = await response.json();

      if (!response.ok) {
        setError(body.error ?? "Selected tasks could not be created.");
        return;
      }

      router.push(roomUrl);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Room Scan needs attention</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {step === "intro" ? (
        <Card>
          <CardHeader>
            <CardTitle>Walk into {roomName}</CardTitle>
            <CardDescription>
              Take photos from a few corners and add context about what is
              staying, donating, fragile, or urgent.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                "Take up to four clear photos.",
                "Mention keep, donate, sell, or trash decisions.",
                "Review every suggestion before saving.",
              ].map((item, index) => (
                <div className="rounded-xl border bg-muted/35 p-4" key={item}>
                  <Badge variant="secondary">Step {index + 1}</Badge>
                  <p className="mt-3 text-sm font-medium">{item}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              This room currently has {existingTaskCount} tasks. Room Scan will
              avoid suggesting exact duplicates.
            </div>
            <Button
              className="min-h-12 w-full text-base"
              onClick={() => setStep("capture")}
            >
              <Camera className="size-4" aria-hidden />
              Start room scan
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {step === "capture" ? (
        <Card>
          <CardHeader>
            <CardTitle>Add photos and notes</CardTitle>
            <CardDescription>
              Photos are used only to generate suggestions and are not stored.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
              <label
                className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/35 p-5 text-center"
                htmlFor="room-scan-photos"
              >
                <ImagePlus className="size-8 text-primary" aria-hidden />
                <span className="font-medium">Take or choose room photos</span>
                <span className="text-sm text-muted-foreground">
                  {images.length}/4 added. Keep the room well lit.
                </span>
              </label>
              <input
                accept="image/*"
                capture="environment"
                className="sr-only"
                disabled={images.length >= 4}
                id="room-scan-photos"
                multiple
                onChange={(event) => addImages(event.target.files)}
                type="file"
              />
              {images.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {images.map((image) => (
                    <div className="relative overflow-hidden rounded-xl border" key={image.id}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt=""
                        className="aspect-square w-full object-cover"
                        src={image.dataUrl}
                      />
                      <Button
                        aria-label={`Remove ${image.name}`}
                        className="absolute right-2 top-2 size-9 rounded-full"
                        onClick={() =>
                          setImages((currentImages) =>
                            currentImages.filter((item) => item.id !== image.id),
                          )
                        }
                        size="icon"
                        type="button"
                        variant="secondary"
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="room-scan-notes">
                Notes for this room
              </label>
              <Textarea
                id="room-scan-notes"
                maxLength={2000}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Example: donate the small desk, pack books last, mirror is fragile..."
                rows={5}
                value={notes}
              />
              <p className="text-xs text-muted-foreground">
                Approximate upload size: {(totalPayloadSize / 1_000_000).toFixed(1)} MB
              </p>
            </div>

            <Button
              className="min-h-12 w-full text-base"
              disabled={isPending || images.length === 0}
              onClick={generateSuggestions}
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="size-4" aria-hidden />
              )}
              Generate room checklist
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {step === "review" && result ? (
        <Card>
          <CardHeader>
            <CardTitle>Review suggested tasks</CardTitle>
            <CardDescription>{result.roomSummary}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.suggestions.length > 0 ? (
              <div className="space-y-3">
                {result.suggestions.map((suggestion) => (
                  <label
                    className="flex gap-3 rounded-xl border bg-background p-4"
                    htmlFor={`suggestion-${suggestion.title}`}
                    key={suggestion.title}
                  >
                    <Checkbox
                      checked={selectedTitles.has(suggestion.title)}
                      id={`suggestion-${suggestion.title}`}
                      onCheckedChange={(checked) => {
                        setSelectedTitles((currentTitles) => {
                          const nextTitles = new Set(currentTitles);

                          if (checked) {
                            nextTitles.add(suggestion.title);
                          } else {
                            nextTitles.delete(suggestion.title);
                          }

                          return nextTitles;
                        });
                      }}
                    />
                    <span className="min-w-0 flex-1 space-y-2">
                      <span className="block font-medium">{suggestion.title}</span>
                      {suggestion.description ? (
                        <span className="block text-sm text-muted-foreground">
                          {suggestion.description}
                        </span>
                      ) : null}
                      <span className="flex flex-wrap gap-2">
                        <Badge variant="secondary">
                          {formatValue(suggestion.category)}
                        </Badge>
                        <Badge
                          variant={
                            suggestion.priority === "critical"
                              ? "destructive"
                              : "outline"
                          }
                        >
                          {formatValue(suggestion.priority)}
                        </Badge>
                        <Badge variant="outline">
                          {formatValue(suggestion.estimatedEffort)}
                        </Badge>
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {suggestion.reason}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-8 text-center">
                <ClipboardCheck className="size-8 text-primary" aria-hidden />
                <div>
                  <p className="font-medium">No new tasks found</p>
                  <p className="text-sm text-muted-foreground">
                    The scan matched tasks that are already in this room.
                  </p>
                </div>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                className="min-h-12 text-base"
                disabled={isPending || result.suggestions.length === 0}
                onClick={saveSelectedTasks}
              >
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <CheckCircle2 className="size-4" aria-hidden />
                )}
                Create selected tasks
              </Button>
              <Button
                className="min-h-12 text-base"
                onClick={() => setStep("capture")}
                type="button"
                variant="outline"
              >
                Adjust photos or notes
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
