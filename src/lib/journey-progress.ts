"use client";

import { useSyncExternalStore } from "react";

import { JOURNEY_STEPS, type JourneyStepId } from "./journey";
import type { CareerMatch } from "@/types/careers";

export const JOURNEY_STORAGE_KEY = "ttns-journey-v1";

// How many careers the user can pick as their "Top 3 Career Choices".
export const MAX_TOP_CAREERS = 3;

// Journey progress plus the payloads later wizard steps consume. Fields are
// explicit, not a bag — a new stage's data gets its own field added here the
// way savedSkills does.
export interface JourneyState {
  completed: JourneyStepId[];
  // A pseudonymous browser-local journey identifier, not an account ID.
  guestId?: string;
  savedSkills?: string[];
  // The submitted profile form values, grouped by step key, e.g.
  // { personal: { firstName, lastName }, skills: { ... }, ... }.
  selectedCareerCode?: string; // stored for team 5 (always the #1 pick)
  // The user's "Top 3 Career Choices", in the order they were picked.
  // topCareerCodes[0] is the same code as selectedCareerCode.
  topCareerCodes?: string[];
  profile?: ProfileData;
  // The matches shown on /current-pathways, persisted so /updated-pathways
  // can project them and /next-step can send them to POST /api/steps.
  savedMatches?: CareerMatch[];
  // The skill(s) the user wants to learn next (picked once on
  // /updated-pathways after its redesign; the /new-skill page that used to
  // collect them is gone, so these are optional and usually absent).
  // Deliberately NOT in savedSkills: team 6's gap detection needs them
  // missing to recommend the training step for exactly what the user asked
  // to learn.
  newSkills?: string[];
}

export type ProfileData = Record<string, Record<string, string>>;

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
          typeof id === "string" && complete.has(id as JourneyStepId),
      ),
    };
    if (typeof parsed.guestId === "string" && parsed.guestId.trim()) {
      state.guestId = parsed.guestId;
    }
    if (Array.isArray(parsed.savedSkills)) {
      state.savedSkills = parsed.savedSkills.map(String);
    }
    if (parsed.profile && typeof parsed.profile === "object") {
      state.profile = parsed.profile;
    }

    // Persist the selected career code for team 5 used in the journey state
    if (typeof parsed.selectedCareerCode === "string") {
      state.selectedCareerCode = parsed.selectedCareerCode;
    }

    // Read the Top 3 picks: only text codes, no repeats, at most 3.
    if (Array.isArray(parsed.topCareerCodes)) {
      const codes = [...new Set(
        (parsed.topCareerCodes as unknown[]).filter(
          (code: unknown): code is string => typeof code === "string",
        ),
      )].slice(0, MAX_TOP_CAREERS);
      if (codes.length > 0) {
        state.topCareerCodes = codes;
        state.selectedCareerCode = codes[0];
      }
    } else if (state.selectedCareerCode) {
      // Saved by an older build that only had one pick.
      state.topCareerCodes = [state.selectedCareerCode];
    }

    if (Array.isArray(parsed.newSkills)) {
      const rawSkills = parsed.newSkills as unknown[];
      const picks = [...new Set(
        rawSkills
          .filter((skill: unknown): skill is string => typeof skill === "string")
          .map((skill: string) => skill.trim())
          .filter((skill: string) => skill !== ""),
      )];
      if (picks.length > 0) {
        state.newSkills = picks;
      }
    } else if (
      typeof parsed.newSkill === "string" && parsed.newSkill.trim() !== ""
    ) {
      // A single pick persisted by earlier builds.
      state.newSkills = [parsed.newSkill];
    }

    // Partial corruption must not lose the rest of the journey state, so
    // invalid entries are dropped rather than rejecting the whole field.
    if (Array.isArray(parsed.savedMatches)) {
      state.savedMatches = (parsed.savedMatches as unknown[]).filter(
        (item: unknown): item is CareerMatch =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as CareerMatch).code === "string" &&
          Number.isFinite((item as CareerMatch).matchPercentage),
      );
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
  writeState({ ...state, completed, savedSkills: [...skills] });
}

// Persists the submitted profile form values for the wizard's later steps.
// The page's Continue button marks the step complete, so this doesn't.
export function saveProfile(profile: ProfileData) {
  writeState({ ...readState(), profile });
}

// Called at the integration boundary, including for journeys saved before this
// field existed. Resetting the journey removes this ID with the other data.
export function ensureGuestJourneyId() {
  const state = readState();
  if (state.guestId || !state.profile) return;
  if (typeof crypto.randomUUID !== "function") return;
  writeState({ ...state, guestId: `guest-${crypto.randomUUID()}` });
}

// Select, replace, or unselect a career. Changing the choice invalidates later
// journey steps so a previous continuation does not remain falsely complete.
export function saveSelectedCareer(code: string | null) {
  const state = readState();
  const previous = state.selectedCareerCode ?? null;
  if (code === previous) return;

  const completed = state.completed.filter(
    (id) =>
      id !== "current-pathways" &&
      id !== "updated-pathways" &&
      id !== "next-step",
  );
  const next: JourneyState = { ...state, completed };
  if (code === null) {
    delete next.selectedCareerCode;
  } else {
    next.selectedCareerCode = code;
  }
  writeState(next);
}

// Saves the user's Top 3 picks (in pick order). The #1 pick is also saved as
// selectedCareerCode so Team 5's /updated-pathways keeps working unchanged.
// Changing the picks resets later journey steps, like saveSelectedCareer.
export function saveTopCareers(codes: string[]) {
  const state = readState();
  const picks = [...new Set(codes)].slice(0, MAX_TOP_CAREERS);
  const previous = state.topCareerCodes ?? [];

  const unchanged =
    picks.length === previous.length &&
    picks.every((code, i) => code === previous[i]);
  if (unchanged) return;

  const completed = state.completed.filter(
    (id) =>
      id !== "current-pathways" &&
      id !== "updated-pathways" &&
      id !== "next-step",
  );
  const next: JourneyState = { ...state, completed };
  if (picks.length === 0) {
    delete next.topCareerCodes;
    delete next.selectedCareerCode;
  } else {
    next.topCareerCodes = picks;
    next.selectedCareerCode = picks[0];
  }
  writeState(next);
}

// Persists the /current-pathways matches for /updated-pathways and /next-step.
// Callers only pass non-empty result sets, and the page's career pick persists
// selectedCareerCode, so this doesn't mark anything complete.
export function saveMatches(matches: CareerMatch[]) {
  writeState({ ...readState(), savedMatches: [...matches] });
}

// Persists the picks for the add-skills option on /updated-pathways (any
// number, stored in pick order) for the projection and next-step pages. Kept
// for that page's redesign; nothing calls it until then.
export function saveNewSkills(skills: string[]) {
  writeState({ ...readState(), newSkills: [...skills] });
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
  const journey = useSyncExternalStore(
    subscribe,
    readState,
    () => DEFAULT_STATE,
  );
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  return { journey, hydrated };
}
