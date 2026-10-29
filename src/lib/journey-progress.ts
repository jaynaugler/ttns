"use client";

import { useSyncExternalStore } from "react";

import { JOURNEY_STEPS, type JourneyStepId } from "./journey";

export const JOURNEY_STORAGE_KEY = "ttns-journey-v1";

// Journey progress plus the payloads later wizard steps consume. Fields are
// explicit, not a bag — a new stage's data gets its own field (savedProfile,
// savedCareerId, ...) the same way savedSkills does.
export interface JourneyState {
  completed: JourneyStepId[];
  savedSkills?: string[];
}

const DEFAULT_STATE: JourneyState = { completed: [] };

const complete = new Set<JourneyStepId>(JOURNEY_STEPS.map((step) => step.id));

const listeners = new Set<() => void>();
let storageHooked = false;
let cachedRaw: string | null = null;
let cachedState: JourneyState = DEFAULT_STATE;

function parse(raw: string | null): JourneyState {
  if (!raw) return DEFAULT_STATE;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.completed)) return DEFAULT_STATE;
    const state: JourneyState = {
      // Ignore ids that are no longer journey pages (e.g. after a rename).
      completed: [...parsed.completed].filter(
        (id): id is JourneyStepId =>
          typeof id === "string" && complete.has(id as JourneyStepId)
      ),
    };
    if (Array.isArray(parsed.savedSkills)) {
      state.savedSkills = parsed.savedSkills.map(String);
    }
    return state;
  } catch {
    return DEFAULT_STATE;
  }
}

function readState(): JourneyState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(JOURNEY_STORAGE_KEY);
  } catch {
    return DEFAULT_STATE; // broken/private-mode storage: journey still works
  }
  if (raw === cachedRaw) return cachedState;
  cachedRaw = raw;
  cachedState = parse(raw);
  return cachedState;
}

function notify() {
  for (const listener of listeners) listener();
}

function handleStorage(event: StorageEvent) {
  // A null key means clear(); otherwise only react to our own key.
  if (event.key === JOURNEY_STORAGE_KEY || event.key === null) notify();
}

function subscribe(listener: () => void) {
  if (typeof window !== "undefined" && !storageHooked) {
    // setItem only notifies other tabs via "storage"; same-tab writes notify
    // the listener set below, keeping sidebar and drawer in sync.
    window.addEventListener("storage", handleStorage);
    storageHooked = true;
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function writeState(state: JourneyState) {
  try {
    window.localStorage.setItem(JOURNEY_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // not persistable — the in-memory cache keeps the session usable
  }
  cachedRaw = null;
  cachedState = state;
  notify();
}

export function getSavedJourney(): JourneyState {
  return readState();
}

export function markStepComplete(id: JourneyStepId) {
  const state = readState();
  if (state.completed.includes(id)) return;
  writeState({ ...state, completed: [...state.completed, id] });
}

// Persists the /skills selection and marks that page complete.
export function saveSkills(skills: string[]) {
  const state = readState();
  const completed: JourneyStepId[] = state.completed.includes("skills")
    ? state.completed
    : [...state.completed, "skills"];
  if (
    completed.length === state.completed.length &&
    state.savedSkills &&
    state.savedSkills.length === skills.length &&
    state.savedSkills.every((skill, i) => skill === skills[i])
  ) {
    return;
  }
  writeState({ completed, savedSkills: [...skills] });
}

export function resetJourney() {
  try {
    window.localStorage.removeItem(JOURNEY_STORAGE_KEY);
  } catch {
    // nothing to clear
  }
  cachedRaw = null;
  cachedState = DEFAULT_STATE;
  notify();
}

const noopSubscribe = () => () => {};

// SSR-safe access to the journey state. Before hydration this returns the
// empty default, which matches the server HTML; the `hydrated` flag lets
// gate components suppress the default-locked flash on first paint.
export function useJourneyProgress(): {
  journey: JourneyState;
  hydrated: boolean;
} {
  const journey = useSyncExternalStore(subscribe, readState, () => DEFAULT_STATE);
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  return { journey, hydrated };
}