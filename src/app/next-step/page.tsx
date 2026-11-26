"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type ReactNode } from "react";
import { Check, Minus } from "lucide-react";

import { JourneyStepPage } from "@/components/journey-step-page";
import { NextStepRecommendations } from "@/components/next-steps/NextStepRecommendations";
import { formatCurrency } from "@/components/look-forward/wage-projection-card";
import { Button } from "@/components/ui/button";
import {
  getCareerSummary,
  getPathSummary,
  markSkillsForCareer,
  planSkills,
  skillGapsFor,
  splitPicks,
  type CareerSummary,
  type CareerWages,
  type OutlookRecord,
  type PathSummary,
  type TrendItem,
  type WageFigure,
} from "@/lib/career-summary";
import { resetJourney, useJourneyProgress } from "@/lib/journey-progress";
import { findCareerById } from "@/lib/projection-logic";
import type { CareerMatch } from "@/types/careers";

import { getNovaScotiaOutlooks } from "./actions";

// Journey step 4 (Team 5). Wraps up the journey: a banner with the path
// chosen on Updated Pathways (or the #1 Top-3 pick) and quick facts, then
// cards for its wages, Nova Scotia outlook and skills, Team 6's recommended
// next steps for it, the skills being learned, the other Top 3 picks, and a
// fresh start. The page's own "Start a new journey" replaces
// JourneyStepPage's Continue.
export default function NextStepPage() {
  const { journey } = useJourneyProgress();
  return (
    <JourneyStepPage
      pageId="next-step"
      nextHref="/profile"
      showContinue={false}
      description="Your top career picks up close: what they pay, where they're headed in Nova Scotia, and the skills that get you there."
      contentClassName="max-w-4xl"
      // Locked again because a skills change cleared the picks: say so.
      lockedMessage={
        journey.picksCleared
          ? "Your skills changed, so your earlier career picks and plan were cleared. Pick your Top 3 again to see your next step."
          : undefined
      }
    >
      <NextStepSummary />
    </JourneyStepPage>
  );
}

// Links on the page background and the light cards; brand yellow in dark
// mode, where the global link blue is too dark on grey.
const pageLinkClass =
  "inline-flex min-h-11 items-center underline underline-offset-4 break-words focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-red dark:text-[var(--dm-brand-yellow)] dark:focus-visible:outline-[var(--dm-brand-yellow)]";

// The light cards below the banner, as in Look Forward.
const cardClass =
  "min-w-0 space-y-4 rounded-xl border-2 border-foreground/50 bg-background p-5 text-foreground dark:bg-[var(--dm-card-grey)]";

const chipClass =
  "max-w-full rounded-full border-2 border-foreground/50 px-3 py-1 break-words";

// outline-solid: the Button's outline-none sets Tailwind's outline style to
// none, which would leave outline-3 with no visible ring.
const buttonClass =
  "min-h-11 cursor-pointer px-5 text-base focus-visible:outline-solid focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-red dark:focus-visible:outline-[var(--dm-brand-yellow)]";

// Up to three tiles a row, as many as fit at 12rem each. Follows the content
// width, not the viewport, so the sidebar never squeezes a wage mid-word;
// one column at 320px.
const fitGridClass =
  "grid grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-3";

// "Skills this career lists that you didn't select" shows this many before
// "Show all".
const SKILLS_SHOWN = 5;

type OutlookStatus = "loading" | "ready" | "error";

function NextStepSummary() {
  const { journey } = useJourneyProgress();
  // Only picks in the matches Current Pathways last saved: one made under
  // earlier skills mustn't stand in as the user's #1.
  const { current: codes, stale } = splitPicks(
    journey.topCareerCodes,
    journey.savedMatches,
  );
  // The page leads with the path chosen on /updated-pathways (the career
  // whose wage was showing, under the selected change), or without one, the
  // #1 Top 3 pick. getPathSummary is undefined for a career that isn't in
  // the saved matches, so a stale choice falls back the same way.
  const path = getPathSummary(
    journey.lookForward,
    journey.savedMatches,
    journey.savedSkills,
  );
  const leadCode = path ? journey.lookForward?.careerCode : codes[0];
  const codesKey = [...new Set([leadCode, ...codes].filter(Boolean))].join(",");
  const firstName = journey.profile?.personal?.firstName?.trim();

  // Outlook records for the current picks; a stale key means still loading.
  const [outlooks, setOutlooks] = useState<{
    key: string;
    status: Exclude<OutlookStatus, "loading">;
    records: OutlookRecord[];
  }>();
  useEffect(() => {
    if (!codesKey) return;
    let current = true;
    getNovaScotiaOutlooks(codesKey.split(","))
      .then((records) => {
        if (current) setOutlooks({ key: codesKey, status: "ready", records });
      })
      .catch(() => {
        if (current) setOutlooks({ key: codesKey, status: "error", records: [] });
      });
    return () => {
      current = false;
    };
  }, [codesKey]);
  const outlookStatus: OutlookStatus =
    outlooks?.key === codesKey ? outlooks.status : "loading";
  const records = outlooks?.key === codesKey ? outlooks.records : [];

  // Filled just after the region mounts, so screen readers announce it.
  const [intro, setIntro] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(
      () => setIntro(`Here's your path${firstName ? `, ${firstName}` : ""}.`),
      150,
    );
    return () => window.clearTimeout(timer);
  }, [firstName]);

  const top = leadCode
    ? getCareerSummary(leadCode, journey.savedMatches, records)
    : undefined;
  // The Top 3 picks other than the lead, numbered as they were picked.
  const others = codes.flatMap((code, index) => {
    if (code === top?.code) return [];
    const summary = getCareerSummary(code, journey.savedMatches, records);
    return summary ? [{ summary, pickNumber: index + 1 }] : [];
  });

  return (
    <div className="space-y-8">
      {stale.length > 0 && <StalePicks codes={stale} />}
      {top ? (
        <>
          <div className="space-y-2">
            <Banner intro={intro} summary={top} path={path} />
            {/* The footer credits Unsplash "unless stated otherwise", so the
                banner's source is stated here. Full foreground colour, not
                muted, so it stays readable. */}
            <p className="text-sm text-foreground">{BANNER_IMAGE.credit}.</p>
          </div>
          <WagesCard summary={top} />
          <OutlookCard summary={top} status={outlookStatus} />
          <CareerSkillsCard
            summary={top}
            savedMatches={journey.savedMatches}
            plan={planSkills(path?.scenario)}
          />
          <SkillsInProgress skills={journey.newSkills} summary={top} />
          {/* "Your next moves" (built on Joshua's #51 card design) for the
              same career the page leads with, so the cards always match the
              banner. After both skills cards, so those sit together. The
              plan is passed only when the page leads with the plan's career. */}
          <NextStepRecommendations
            summary={top}
            savedMatches={journey.savedMatches}
            savedSkills={journey.savedSkills}
            plan={path ? journey.lookForward?.scenario : undefined}
            degree={journey.profile?.education?.degree}
            className={cardClass}
          />
          {others.length > 0 && <OtherPicks picks={others} />}
        </>
      ) : (
        <NoPicks />
      )}

      <StartOver />
    </div>
  );
}

function careerName(summary: CareerSummary): string {
  return summary.title ?? `Career ${summary.code}`;
}

function formatHourly(value: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// "2025-11-21" -> "November 21, 2025". Read as UTC so it never slips a day.
function formatDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? isoDate
    : new Intl.DateTimeFormat("en-CA", { dateStyle: "long", timeZone: "UTC" }).format(date);
}

// A light card with an h2, for each part of the summary.
function SectionCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className={cardClass}>
      <h2 id={headingId} className="text-2xl font-bold break-words">
        {title}
      </h2>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Banner: the #1 pick at a glance
// ---------------------------------------------------------------------------

// Banner artwork generated with Leonardo.ai: a coastal trail to a lighthouse
// at sunrise. Decorative, so alt="". The lighthouse sits at about 26% from
// the left, so the image is anchored left and the text goes over the sky.
const BANNER_IMAGE = {
  src: "/next_step_image.webp",
  width: 1376,
  height: 768,
  credit: "Banner artwork generated with Leonardo.ai",
};

function Banner({
  intro,
  summary,
  path,
}: {
  intro: string;
  summary: CareerSummary;
  // The change chosen on /updated-pathways; without one, the #1 pick.
  path?: PathSummary;
}) {
  const headingId = useId();
  const planId = useId();
  const name = careerName(summary);
  const typical = summary.wages?.typical;
  return (
    <section
      aria-labelledby={headingId}
      className="relative isolate overflow-hidden rounded-2xl bg-card-blue px-5 py-8 text-white sm:px-8 sm:py-10"
    >
      <Image
        src={BANNER_IMAGE.src}
        width={BANNER_IMAGE.width}
        height={BANNER_IMAGE.height}
        sizes="(min-width: 1024px) 896px, 100vw"
        // Eager: it's the page's Largest Contentful Paint, and Next warns
        // (the dev overlay's "1 Issue") when that image is lazy.
        loading="eager"
        alt=""
        className="absolute inset-0 -z-20 size-full object-cover object-[20%_50%]"
      />
      {/* Below sm the text spans the banner, so brand blue covers it evenly
          at 80%. From sm the text sits in the right 60%: the blue holds at
          80% across the right 65% (so every line of text is on it) and
          fades out by 95%, letting the lighthouse show. 80% is the floor:
          white text measured 4.8:1 on the real pixels at the sun (the
          worst spot, under the career title), and 4.8:1 even over pure
          white; 75% fell to 4.3:1. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-card-blue/80 sm:bg-transparent sm:bg-linear-to-l sm:from-card-blue/80 sm:from-65% sm:to-transparent sm:to-95%"
      />
      <div
        aria-hidden="true"
        className="absolute inset-y-0 right-0 w-3 bg-brand-yellow sm:w-4"
      />

      <div className="space-y-5 pr-4 sm:ml-auto sm:w-3/5">
        <div role="status" className="min-h-8 text-xl font-bold break-words sm:text-2xl">
          {intro}
        </div>
        <div className="space-y-1">
          <h2 id={headingId} className="text-sm font-bold tracking-widest uppercase">
            {path ? "Your chosen path" : "Your #1 pick"}
          </h2>
          <h3 className="text-3xl font-bold text-balance break-words sm:text-4xl">
            {name}
          </h3>
          <p>NOC {summary.code}</p>
        </div>

        {path && (
          <div className="space-y-2">
            <p id={planId} className="text-sm font-bold tracking-wide uppercase">
              The plan
            </p>
            <ul aria-labelledby={planId} className="flex flex-wrap gap-2">
              {path.plan.map((step) => (
                <li
                  key={step}
                  className="max-w-full rounded-full border-2 border-white px-3 py-1 font-bold break-words"
                >
                  {step}
                </li>
              ))}
            </ul>
          </div>
        )}

        <dl className={fitGridClass}>
          <StatChip term="Match score">
            {path ? (
              <>
                <span>
                  {path.scoreToday}
                  {/* Arrow is decorative; the words carry the change. */}
                  <span aria-hidden="true"> → </span>
                  <span className="sr-only"> today, </span>
                  {path.scoreAfter}
                </span>
                <span className="block text-sm font-normal">after this plan</span>
              </>
            ) : summary.score !== undefined ? (
              <>
                {summary.score}
                <span className="block text-sm font-normal">out of 100</span>
              </>
            ) : (
              "Not saved"
            )}
          </StatChip>
          <StatChip term="Typical wage">
            {typical ? (
              <>
                {formatCurrency(typical.yearly)}
                <span className="text-base font-normal">/yr</span>
              </>
            ) : (
              "Not published"
            )}
          </StatChip>
          {/* The climb from starting pay, not the bare "after N years"
              figure: at 5 years that equals Typical by rule, so it would
              only repeat the tile beside it. */}
          {path?.afterYears && path.years !== undefined && (
            <StatChip
              term={`Starting out → after ${path.years} ${path.years === 1 ? "year" : "years"}`}
            >
              {summary.wages?.startingOut ? (
                // Each amount stays whole; the line may break at the arrow.
                <span>
                  <span className="whitespace-nowrap">
                    {formatCurrency(summary.wages.startingOut.yearly)}
                  </span>
                  <span aria-hidden="true"> → </span>
                  <span className="sr-only"> to </span>
                  <span className="whitespace-nowrap">
                    {formatCurrency(path.afterYears.yearly)}
                  </span>
                </span>
              ) : (
                formatCurrency(path.afterYears.yearly)
              )}
              <span className="block text-sm font-normal">a year (rough guide)</span>
            </StatChip>
          )}
          <StatChip term="Nova Scotia outlook">
            {summary.outlook ?? "Not published"}
          </StatChip>
        </dl>

        {summary.jobBankUrl && (
          <p>
            <a
              href={summary.jobBankUrl}
              className="inline-flex min-h-11 items-center font-bold text-white underline underline-offset-4 break-words focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              See Nova Scotia job postings for {name} on Job Bank
            </a>
          </p>
        )}
      </div>
    </section>
  );
}

function StatChip({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-xl border-2 border-brand-yellow bg-card-blue/60 px-4 py-3">
      <dt className="text-sm font-bold tracking-wide break-words uppercase">{term}</dt>
      <dd className="min-w-0 text-2xl font-bold break-words">{children}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// What it pays
// ---------------------------------------------------------------------------

function WagesCard({ summary }: { summary: CareerSummary }) {
  return (
    <SectionCard title="What it pays">
      <WageTiles wages={summary.wages} />
    </SectionCard>
  );
}

function WageTiles({ wages }: { wages: CareerWages | undefined }) {
  if (!wages) return <p>Job Bank doesn&apos;t publish wages for this career.</p>;

  const tiles: { term: string; figure: WageFigure | undefined }[] = [
    { term: "Starting out", figure: wages.startingOut },
    { term: "Typical (median)", figure: wages.typical },
    { term: "Top earners", figure: wages.topEarners },
  ];

  return (
    <>
      <dl className={fitGridClass}>
        {tiles.map(({ term, figure }) => (
          <div
            key={term}
            className="flex min-w-0 flex-col gap-1 rounded-lg border-2 border-foreground/30 p-4"
          >
            <dt className="text-sm font-bold break-words">{term}</dt>
            <dd className="flex min-w-0 flex-col gap-1 break-words">
              {figure ? (
                <>
                  <span className="text-xl font-bold">{formatCurrency(figure.yearly)}/yr</span>
                  {/* Read as "…/yr, …/hour", not run together. */}
                  <span className="sr-only">, </span>
                  <span className="text-sm">
                    {wages.isAnnual ? "about " : ""}
                    {formatHourly(figure.hourly)}/hour
                  </span>
                </>
              ) : (
                <span>Not published</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-sm">
        Job Bank wages{wages.referencePeriod ? `, ${wages.referencePeriod}` : ""}.
        Starting out and top earners are Job Bank&apos;s lowest and highest 10%.
        {wages.isAnnual && " Hourly figures are the yearly wage over a 37.5-hour week."}
      </p>
    </>
  );
}

// ---------------------------------------------------------------------------
// Outlook in Nova Scotia
// ---------------------------------------------------------------------------

const UNDETERMINED = "Undetermined";

// Badge colours from globals.css; the word is always shown, so colour is
// never the only cue.
function badgeClass(outlook: string): string {
  switch (outlook) {
    case "Very good":
    case "Good":
      return "border-card-blue bg-card-blue text-white";
    case "Moderate":
      return "border-brand-orange bg-brand-yellow text-black dark:bg-[var(--dm-brand-yellow)]";
    case "Limited":
    case "Very limited":
      return "border-brand-red bg-brand-red text-white dark:bg-[var(--dm-brand-red)]";
    default:
      return "border-foreground/50 bg-background text-foreground dark:bg-[var(--dm-card-grey)]";
  }
}

function OutlookBadge({ outlook }: { outlook: string }) {
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="font-bold">Job Bank outlook:</span>
      <span className={`rounded-full border-2 px-4 py-1 text-lg font-bold ${badgeClass(outlook)}`}>
        {outlook}
      </span>
    </p>
  );
}

function OutlookCard({
  summary,
  status,
}: {
  summary: CareerSummary;
  status: OutlookStatus;
}) {
  const { outlook } = summary;
  return (
    <SectionCard title="Outlook in Nova Scotia">
      {outlook ? (
        <OutlookBadge outlook={outlook} />
      ) : (
        <p>
          {status === "loading"
            ? "Loading the outlook ..."
            : "Job Bank hasn't published an outlook for this career in Nova Scotia."}
        </p>
      )}

      {outlook === UNDETERMINED ? (
        <p>
          Job Bank hasn&apos;t rated this career in Nova Scotia — too few
          people work in it to measure.
        </p>
      ) : (
        <>
          {summary.outlookReleaseDate && outlook && (
            <p className="text-sm">Published {formatDate(summary.outlookReleaseDate)}.</p>
          )}
          {status === "loading" && outlook && <p>Loading employment trends ...</p>}
          {status === "error" && (
            <p>We couldn&apos;t load the employment trends just now. Try reloading the page.</p>
          )}
          {summary.trends && (
            <details className="rounded-lg border-2 border-foreground/30">
              <summary className="flex min-h-11 cursor-pointer items-center px-4 font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-red dark:focus-visible:outline-[var(--dm-brand-yellow)]">
                Employment trends from Job Bank
              </summary>
              <div className="space-y-3 px-4 pb-4">
                {summary.trends.map((block, index) =>
                  block.kind === "paragraph" ? (
                    <p key={index}>{block.text}</p>
                  ) : (
                    <TrendList key={index} items={block.items} />
                  ),
                )}
              </div>
            </details>
          )}
        </>
      )}
    </SectionCard>
  );
}

function TrendList({ items }: { items: TrendItem[] }) {
  return (
    <ul className="list-disc space-y-1 pl-6">
      {items.map((item, index) => (
        <li key={index} className="break-words">
          {item.text}
          {item.items.length > 0 && (
            <div className="mt-1">
              <TrendList items={item.items} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Your skills and this career
// ---------------------------------------------------------------------------

function CareerSkillsCard({
  summary,
  savedMatches,
  plan,
}: {
  summary: CareerSummary;
  savedMatches: CareerMatch[] | undefined;
  // Skills the chosen path already learns, left out of the unselected list.
  plan: string[];
}) {
  const [showAll, setShowAll] = useState(false);
  const listId = useId();

  if (!summary.matchedSkills && !summary.skillsToDevelop) {
    return (
      <SectionCard title="Your skills and this career">
        <p>
          Skill details for this career weren&apos;t saved. Run Current
          Pathways again to see them.
        </p>
      </SectionCard>
    );
  }

  const matched = summary.matchedSkills ?? [];
  const gaps = skillGapsFor(summary.code, savedMatches, plan);
  const toDevelop = gaps.skills;
  const shown = showAll ? toDevelop : toDevelop.slice(0, SKILLS_SHOWN);
  const inPlan = plan.filter((skill) => summary.skillsToDevelop?.includes(skill));
  // The count every skill shares, when they all share one.
  const sharedCount = gaps.countsVary ? 0 : (toDevelop[0]?.alsoNeededBy ?? 0);

  return (
    <SectionCard title="Your skills and this career">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="min-w-0 space-y-2">
          <h3 className="text-lg font-bold">Skills you selected that it uses</h3>
          {matched.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {matched.map((skill) => (
                <li key={skill} className={chipClass}>
                  {skill}
                </li>
              ))}
            </ul>
          ) : (
            <p>None of the skills you selected.</p>
          )}
        </div>

        <div className="min-w-0 space-y-2">
          <h3 className="text-lg font-bold">
            Skills this career lists that you didn&apos;t select
          </h3>
          {/* We only know the skills the user picked, not every skill they
              have, so none of this is stated as a gap. */}
          {toDevelop.length > 0 && (
            <p className="text-sm">
              {[
                "You may already have some of these; we only know the skills you selected.",
                gaps.countsVary && "The ones your other matches also list come first.",
                // The same count on every row: said once here instead.
                !gaps.countsVary &&
                  sharedCount > 0 &&
                  `Each of these is also listed by ${sharedCount} of your other matches.`,
                inPlan.length > 0 && `Not counting ${inPlan.join(", ")}: already in your plan.`,
              ]
                .filter(Boolean)
                .join(" ")}
            </p>
          )}
          {toDevelop.length > 0 ? (
            <>
              <ul id={listId} className="space-y-2">
                {shown.map(({ skill, alsoNeededBy }) => (
                  <li
                    key={skill}
                    className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 rounded-lg border-2 border-foreground/30 px-3 py-2"
                  >
                    <span className="min-w-0 font-bold break-words">{skill}</span>
                    {/* Only when it differs between skills; the same count on
                        every row says nothing. */}
                    {gaps.countsVary && alsoNeededBy > 0 && (
                      <span className="text-sm">
                        Also listed by {alsoNeededBy} of your other matches
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              {toDevelop.length > SKILLS_SHOWN && (
                <Button
                  variant="secondary"
                  aria-expanded={showAll}
                  aria-controls={listId}
                  className={buttonClass}
                  onClick={() => setShowAll((open) => !open)}
                >
                  {showAll ? "Show fewer" : `Show all ${toDevelop.length}`}
                </Button>
              )}
            </>
          ) : (
            <p>
              {inPlan.length > 0
                ? "None left: your plan covers the rest."
                : "None. You selected every skill it lists."}
            </p>
          )}
        </div>
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Skills the user picked on /updated-pathways
// ---------------------------------------------------------------------------

function SkillsInProgress({
  skills,
  summary,
}: {
  skills: string[] | undefined;
  summary: CareerSummary;
}) {
  const marked = markSkillsForCareer(skills, summary);
  return (
    <SectionCard title="Skills you're working on">
      {marked.length > 0 ? (
        // One full-width row per skill, so the rows line up whether or not
        // their text wraps.
        <ul className="space-y-3">
          {marked.map(({ skill, used }) => (
            <li
              key={skill}
              className="flex w-full min-w-0 items-center gap-2 rounded-2xl border-2 border-foreground/50 px-4 py-2"
            >
              {used ? (
                <Check aria-hidden="true" className="size-5 shrink-0" />
              ) : (
                <Minus aria-hidden="true" className="size-5 shrink-0" />
              )}
              <span className="min-w-0 break-words">
                <strong>{skill}</strong>
                {/* In words, so the icon is never the only cue. */}
                <span className="text-sm">
                  {" "}
                  {used ? "· used in this career" : "· not used in this career"}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="space-y-1">
          <p>You haven&apos;t picked any skills to learn yet.</p>
          <Link href="/updated-pathways" className={pageLinkClass}>
            Pick up to 3 skills on Updated Pathways
          </Link>
        </div>
      )}
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// #2 and #3
// ---------------------------------------------------------------------------

// Top 3 picks other than the career the page leads with, numbered as picked.
function OtherPicks({
  picks,
}: {
  picks: { summary: CareerSummary; pickNumber: number }[];
}) {
  return (
    <SectionCard title="Your other picks">
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {picks.map(({ summary, pickNumber }) => {
          const name = careerName(summary);
          const typical = summary.wages?.typical;
          return (
            <li
              key={summary.code}
              className="flex min-w-0 flex-col gap-2 rounded-lg border-2 border-foreground/30 p-4"
            >
              <p className="text-sm font-bold">#{pickNumber} Top 3 pick</p>
              <h3 className="text-xl font-bold break-words">{name}</h3>
              <dl className="space-y-1">
                <OtherPickFact term="Match score">
                  {summary.score !== undefined ? `${summary.score} out of 100` : "Not saved"}
                </OtherPickFact>
                <OtherPickFact term="Typical wage">
                  {typical ? `${formatCurrency(typical.yearly)}/yr` : "Not published"}
                </OtherPickFact>
                <OtherPickFact term="Nova Scotia outlook">
                  {summary.outlook ?? "Not published"}
                </OtherPickFact>
              </dl>
              {summary.jobBankUrl && (
                <p className="mt-auto">
                  <a href={summary.jobBankUrl} className={pageLinkClass}>
                    See Nova Scotia job postings for {name} on Job Bank
                  </a>
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}

function OtherPickFact({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-wrap gap-x-2">
      <dt className="font-bold">{term}:</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// No picks, and starting over
// ---------------------------------------------------------------------------

// Picks left out because they aren't in the current matches, named so the
// user knows why and where to fix it.
function StalePicks({ codes }: { codes: string[] }) {
  const titles = codes.map((code) => findCareerById(code)?.title ?? `NOC ${code}`);
  return (
    <section aria-label="Picks left out" className={cardClass}>
      <p>
        {codes.length === 1 ? "One of your saved picks is" : `${codes.length} of your saved picks are`}{" "}
        no longer in your career matches, so this page leaves{" "}
        {codes.length === 1 ? "it" : "them"} out:
      </p>
      <ul className="list-disc space-y-1 pl-6">
        {titles.map((title, index) => (
          <li key={codes[index]} className="break-words">
            {title}
          </li>
        ))}
      </ul>
      <Link href="/current-pathways" className={pageLinkClass}>
        Review your Top 3 on Current Pathways
      </Link>
    </section>
  );
}

function NoPicks() {
  return (
    <SectionCard title="Pick your top careers first">
      <p>
        Choose up to three careers you like on Current Pathways, and this page
        will show what they pay, their outlook in Nova Scotia, and the skills
        that get you there.
      </p>
      <Link href="/current-pathways" className={pageLinkClass}>
        Choose your Top 3 on Current Pathways
      </Link>
    </SectionCard>
  );
}

function StartOver() {
  const router = useRouter();
  const headingId = useId();
  const noteId = useId();
  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <h2 id={headingId} className="text-2xl font-bold">
        Ready for a different path?
      </h2>
      <p id={noteId}>This clears your saved answers.</p>
      <Button
        aria-describedby={noteId}
        className={buttonClass}
        onClick={() => {
          resetJourney();
          router.push("/profile");
        }}
      >
        Start a new journey
      </Button>
    </section>
  );
}
