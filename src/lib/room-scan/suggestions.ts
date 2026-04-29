import type { RoomScanResponse, RoomScanSuggestion } from "@/lib/room-scan/schema";

function normalizeTitle(title: string) {
  return title.trim().replace(/\s+/g, " ").toLowerCase();
}

export function filterDuplicateSuggestions(
  suggestions: RoomScanSuggestion[],
  existingTaskTitles: string[],
) {
  const existingTitles = new Set(existingTaskTitles.map(normalizeTitle));
  const seenSuggestionTitles = new Set<string>();

  return suggestions.filter((suggestion) => {
    const title = normalizeTitle(suggestion.title);

    if (existingTitles.has(title) || seenSuggestionTitles.has(title)) {
      return false;
    }

    seenSuggestionTitles.add(title);
    return true;
  });
}

export function normalizeRoomScanResponse(
  response: RoomScanResponse,
  existingTaskTitles: string[],
): RoomScanResponse {
  return {
    ...response,
    suggestions: filterDuplicateSuggestions(
      response.suggestions,
      existingTaskTitles,
    ),
  };
}

