"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  requiredSpecialRooms,
  scannableStarterRooms,
} from "@/lib/workspaces/room-setup";

export function RoomSetupForm({
  action,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
}) {
  const [customRooms, setCustomRooms] = useState([""]);

  return (
    <form action={action} className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        {scannableStarterRooms.map((roomName) => (
          <label
            className="flex min-h-14 items-center gap-3 rounded-xl border bg-background p-3 text-sm font-medium"
            htmlFor={`room-${roomName}`}
            key={roomName}
          >
            <Checkbox
              defaultChecked
              id={`room-${roomName}`}
              name="selectedRooms"
              value={roomName}
            />
            {roomName}
          </label>
        ))}
      </div>

      <div className="space-y-3">
        <div>
          <h2 className="text-base font-semibold">Always included</h2>
          <p className="text-sm text-muted-foreground">
            These cover shared logistics that do not belong to a single physical
            room.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {requiredSpecialRooms.map((roomName) => (
            <div
              className="rounded-xl border bg-muted/40 p-3 text-sm font-medium text-muted-foreground"
              key={roomName}
            >
              {roomName}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <h2 className="text-base font-semibold">Add custom spaces</h2>
          <p className="text-sm text-muted-foreground">
            Include offices, guest rooms, basement areas, workshops, or anything
            unique to the home.
          </p>
        </div>
        <div className="space-y-2">
          {customRooms.map((value, index) => (
            <div className="flex gap-2" key={index}>
              <label className="sr-only" htmlFor={`custom-room-${index}`}>
                Custom room {index + 1}
              </label>
              <Input
                id={`custom-room-${index}`}
                maxLength={80}
                name="customRooms"
                onChange={(event) => {
                  const nextRooms = [...customRooms];
                  nextRooms[index] = event.target.value;
                  setCustomRooms(nextRooms);
                }}
                placeholder="Office, basement, guest room..."
                value={value}
              />
              {customRooms.length > 1 ? (
                <Button
                  aria-label="Remove custom room"
                  onClick={() =>
                    setCustomRooms((rooms) =>
                      rooms.filter((_, roomIndex) => roomIndex !== index),
                    )
                  }
                  size="icon"
                  type="button"
                  variant="outline"
                >
                  <X className="size-4" aria-hidden />
                </Button>
              ) : null}
            </div>
          ))}
        </div>
        <Button
          onClick={() => setCustomRooms((rooms) => [...rooms, ""])}
          type="button"
          variant="outline"
        >
          <Plus className="size-4" aria-hidden />
          Add another space
        </Button>
      </div>

      <Button className="min-h-12 w-full text-base" size="lg">
        {submitLabel}
      </Button>
    </form>
  );
}
