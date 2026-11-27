import type { CSSProperties } from "react";

import { formatCurrency } from "@/components/look-forward/wage-projection-card";
import type { PrintPlan } from "@/lib/career-summary";

// "Save my plan": a one-page US Letter career plan sheet, print only (hidden
// on screen). @page has no margin, so the browser prints no URL, date or
// page-count lines; the sheet's own padding is the margin. The sheet is a
// fixed 8.5 × 11 in box, so it can't spill onto a second page.
//
// Colours are brand tokens from globals.css (the light-mode values, whatever
// the colour mode) plus black and white, printed exactly as they are
// (print-color-adjust). Everything is also readable in black and white:
// every colour carries a word, a number or a pattern too. All text is real
// text, 10pt or larger, with headings in order (h1 → h4).
const STYLES = `
@media print {
  @page { size: letter; margin: 0; }
  html, body { background: #fff !important; height: auto !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; }
  body > header, body > footer, aside { display: none !important; }
  main :not([data-print-plan], [data-print-plan] *, :has([data-print-plan])) { display: none !important; }
  main, main :has([data-print-plan]) { margin: 0 !important; padding: 0 !important; max-width: none !important; min-height: 0 !important; display: block !important; }
  [data-print-plan] { display: flex !important; margin: 0 !important; }
}
.pp {
  box-sizing: border-box; width: 8.5in; height: 11in; overflow: hidden;
  padding: 0 0.55in 0.45in; flex-direction: column; gap: 10pt;
  background: #fff; color: #000; font-size: 10.5pt; line-height: 1.35;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.pp * { box-sizing: border-box; }
/* The page's ~70ch text width doesn't apply on the sheet. */
[data-print-plan].pp p, [data-print-plan].pp li { max-width: none; }
.pp h1, .pp h2, .pp h3, .pp h4, .pp p, .pp ol, .pp ul { margin: 0; padding: 0; }
.pp ol, .pp ul { list-style: none; }
.pp h3 { font-size: 11.5pt; font-weight: 700; color: var(--brand-red); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 5pt; }
.pp h4 { font-size: 10.5pt; font-weight: 700; margin-bottom: 4pt; }
.pp-small { font-size: 10pt; }

.pp-band { margin: 0 -0.55in; padding: 0.32in 0.55in 11pt; background: var(--brand-red); color: #fff;
  border-bottom: 6pt solid var(--brand-yellow); display: flex; justify-content: space-between; align-items: flex-end; gap: 18pt; }
.pp-wordmark { font-size: 10.5pt; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--brand-yellow); }
.pp-band > div:first-child { flex: none; }
.pp-band h1 { font-size: 22pt; font-weight: 800; line-height: 1.1; white-space: nowrap; }
.pp-who { text-align: right; min-width: 0; max-width: 3.6in; }
.pp-who .pp-name { font-size: 13pt; font-weight: 700; overflow-wrap: anywhere; }

.pp-hero { display: flex; justify-content: space-between; align-items: flex-start; gap: 18pt; }
.pp-hero h2 { font-size: 19pt; font-weight: 800; line-height: 1.15; color: var(--brand-red); overflow-wrap: anywhere;
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.pp-noc { margin-top: 3pt; font-size: 11pt; }
/* Sized to its content: the label and the longest value ("Undetermined",
   "Very limited") each stay on one line inside the padding. */
.pp .pp-badge { flex: none; text-align: center; border: 1.5pt solid #000; border-radius: 8pt; padding: 6pt 14pt; }
.pp-badge .pp-small, .pp-badge strong { display: block; white-space: nowrap; }
.pp-badge strong { font-size: 13pt; line-height: 1.25; }

.pp-row { display: grid; grid-template-columns: 1fr 1.25fr; gap: 16pt; }
.pp-box { border: 1pt solid #000; border-radius: 8pt; padding: 8pt 11pt; min-width: 0; }

/* Each number with its label on one line underneath; reads in order as
   "94 today → 100 after this plan". */
.pp-scores { display: flex; align-items: flex-start; gap: 10pt; }
.pp-score-col { display: flex; flex-direction: column; gap: 2pt; }
.pp-score { font-size: 26pt; font-weight: 800; line-height: 1; }
.pp-score-label { font-size: 10pt; white-space: nowrap; }
.pp-meter { position: relative; height: 12pt; margin: 8pt 0 5pt; border: 1pt solid #000; border-radius: 6pt; overflow: hidden; background: #fff; }
.pp-meter span { position: absolute; top: 0; bottom: 0; }
.pp-today { left: 0; background: var(--card-blue); }
.pp-gain { background: repeating-linear-gradient(45deg, var(--brand-yellow) 0 3pt, var(--brand-orange) 3pt 6pt); border-left: 1pt solid #000; }
.pp-key { display: flex; flex-wrap: wrap; gap: 3pt 12pt; font-size: 10pt; }
.pp-key i { display: inline-block; width: 10pt; height: 10pt; border: 1pt solid #000; vertical-align: -1pt; margin-right: 4pt; }

.pp-range { position: relative; height: 14pt; margin: 2pt 7pt 0; }
.pp-range-line { position: absolute; left: 0; right: 0; top: 4pt; height: 6pt; border-radius: 3pt; background: var(--card-blue); }
.pp-tick { position: absolute; top: 0; width: 14pt; height: 14pt; margin-left: -7pt; border-radius: 50%; background: #fff; border: 3pt solid var(--brand-red); }
.pp-pay { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6pt; margin-top: 4pt; }
.pp-pay li:nth-child(2) { text-align: center; }
.pp-pay li:nth-child(3) { text-align: right; }
.pp-pay strong { display: block; font-size: 12.5pt; }
.pp-pay span { display: block; }

.pp-steps { display: grid; gap: 10pt; position: relative; }
.pp-step { position: relative; border: 1pt solid #000; border-radius: 8pt; padding: 7pt 10pt 7pt 38pt; min-width: 0; }
.pp-num { position: absolute; left: 9pt; top: 8pt; width: 21pt; height: 21pt; border-radius: 50%; background: var(--brand-red); color: #fff;
  font-weight: 800; font-size: 11pt; display: flex; align-items: center; justify-content: center; }
.pp-step-kind { font-size: 10pt; text-transform: uppercase; letter-spacing: 0.06em; }
.pp-step-label { font-weight: 700; overflow-wrap: anywhere; }
.pp-step-gain { margin-top: 2pt; font-weight: 700; color: var(--card-blue); }

.pp-chips { display: flex; flex-wrap: wrap; gap: 3pt; }
.pp-chip { font-size: 10pt; line-height: 1.25; padding: 1pt 7pt; border-radius: 10pt; border: 1pt solid var(--card-blue); }
.pp-chip-next { background: var(--brand-yellow); border-color: var(--brand-orange); font-weight: 700; }
.pp-chip-more { border-style: dashed; }

.pp-move { border-left: 6pt solid var(--brand-red); background: var(--surface-cream); padding: 7pt 12pt; border-radius: 0 8pt 8pt 0; }
.pp-move-title { font-size: 12.5pt; font-weight: 800; overflow-wrap: anywhere; }

.pp-foot { margin-top: auto; border-top: 1pt solid #000; padding-top: 6pt; display: flex; flex-wrap: wrap; justify-content: space-between; gap: 2pt 12pt; font-size: 10pt; }
.pp-foot span { white-space: nowrap; }
`;

// Outlook badge colours (light-mode brand tokens, as on the page); the word
// itself is always printed, so it reads in black and white too.
const OUTLOOK_STYLE: Record<string, CSSProperties> = {
  "Very good": { background: "var(--card-blue)", color: "#fff" },
  Good: { background: "var(--card-blue)", color: "#fff" },
  Moderate: { background: "var(--brand-yellow)", color: "#000", borderColor: "var(--brand-orange)" },
  Limited: { background: "var(--brand-red)", color: "#fff" },
  "Very limited": { background: "var(--brand-red)", color: "#fff" },
};

const HAVE_SHOWN = 10;
const TO_WORK_SHOWN = 6;
const STEP_KIND = { skills: "Skills", education: "Education", experience: "Experience" } as const;

const percent = (n: number) => `${Math.max(0, Math.min(100, n))}%`;
const hourly = (n: number) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 2 }).format(n);
const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(1).replace(/\.0$/, "")}`;

export function PrintablePlan({ plan }: { plan: PrintPlan }) {
  const { scoreToday, scoreAfter, pay } = plan;
  const gain = scoreToday !== undefined && scoreAfter !== undefined ? scoreAfter - scoreToday : undefined;
  const median = pay.length === 3 && pay[2].yearly > pay[0].yearly
    ? ((pay[1].yearly - pay[0].yearly) / (pay[2].yearly - pay[0].yearly)) * 100
    : 50;

  return (
    <article data-print-plan="" className="pp hidden print:flex" aria-label="My career plan">
      <style>{STYLES}</style>

      <div className="pp-band">
        <div>
          <p className="pp-wordmark">Take The Next Step</p>
          <h1>My career plan</h1>
        </div>
        <div className="pp-who">
          {plan.name && <p className="pp-name">{plan.name}</p>}
          <p>{plan.date}</p>
        </div>
      </div>

      <div className="pp-hero">
        <div style={{ minWidth: 0 }}>
          <h2>{plan.career}</h2>
          <p className="pp-noc">NOC {plan.code}</p>
        </div>
        <p className="pp-badge" style={plan.outlook ? OUTLOOK_STYLE[plan.outlook] : undefined}>
          <span className="pp-small">Nova Scotia outlook</span>
          <strong>{plan.outlook ?? "Not published"}</strong>
        </p>
      </div>

      <div className="pp-row">
        <section className="pp-box">
          <h3>Match score</h3>
          {scoreToday === undefined ? (
            <p>Not saved yet. Run Current Pathways to get your match.</p>
          ) : (
            <>
              <p className="pp-scores">
                <span className="pp-score-col">
                  <span className="pp-score">{scoreToday}</span>{" "}
                  <span className="pp-score-label">today</span>
                </span>{" "}
                {scoreAfter !== undefined && scoreAfter !== scoreToday && (
                  <>
                    <span aria-hidden="true" className="pp-score">→</span>{" "}
                    <span className="pp-score-col">
                      <span className="pp-score">{scoreAfter}</span>{" "}
                      <span className="pp-score-label">after this plan</span>
                    </span>
                  </>
                )}
              </p>
              {/* Decorative: the numbers above and the key below say it all. */}
              <div className="pp-meter" aria-hidden="true">
                <span className="pp-today" style={{ width: percent(scoreToday) }} />
                {gain !== undefined && gain > 0 && (
                  <span className="pp-gain" style={{ left: percent(scoreToday), width: percent(gain) }} />
                )}
              </div>
              <p className="pp-key">
                <span><i aria-hidden="true" className="pp-today" style={{ position: "static" }} />Today, out of 100</span>
                {gain !== undefined && gain > 0 ? (
                  <span><i aria-hidden="true" className="pp-gain" style={{ position: "static" }} />This plan adds {signed(gain)}</span>
                ) : scoreAfter !== undefined ? (
                  <span>No change from this plan</span>
                ) : null}
              </p>
            </>
          )}
        </section>

        <section className="pp-box">
          <h3>Pay range</h3>
          {pay.length === 3 ? (
            <>
              <div className="pp-range" aria-hidden="true">
                <span className="pp-range-line" />
                {[0, median, 100].map((left) => (
                  <span key={left} className="pp-tick" style={{ left: `${left}%` }} />
                ))}
              </div>
              <ul className="pp-pay">
                {pay.map((level) => (
                  <li key={level.label}>
                    <strong>{formatCurrency(level.yearly)}/yr</strong>
                    <span className="pp-small">
                      {plan.payIsAnnual ? "about " : ""}
                      {hourly(level.hourly)}/hr
                    </span>
                    <span className="pp-small">
                      <strong style={{ display: "inline", fontSize: "10pt" }}>{level.label}</strong> ({level.note})
                    </span>
                  </li>
                ))}
              </ul>
              <p className="pp-small" style={{ marginTop: "5pt" }}>
                Job Bank wages{plan.payPeriod ? `, ${plan.payPeriod.replace("-", "–")}` : ""}.
              </p>
            </>
          ) : (
            <p>Job Bank doesn&apos;t publish a full pay range for this career.</p>
          )}
        </section>
      </div>

      <section>
        <h3>Your plan</h3>
        {plan.steps.length > 0 ? (
          <ol className="pp-steps" style={{ gridTemplateColumns: `repeat(${plan.steps.length}, 1fr)` }}>
            {plan.steps.map((step, index) => (
              <li key={step.kind} className="pp-step">
                <span className="pp-num" aria-hidden="true">{index + 1}</span>
                <p className="pp-step-kind">
                  <span className="sr-only">Step {index + 1}: </span>
                  {STEP_KIND[step.kind]}
                </p>
                <p className="pp-step-label">{step.label}</p>
                {step.gain !== undefined && (
                  <p className="pp-step-gain">
                    {step.gain > 0 ? `${signed(step.gain)} to your match` : "No change to your match"}
                  </p>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p>No plan chosen yet. Try changes on Updated Pathways and choose one.</p>
        )}
      </section>

      <section className="pp-row" style={{ gridTemplateColumns: "1fr 1fr" }} aria-labelledby="pp-skills">
        <h3 id="pp-skills" style={{ gridColumn: "1 / -1", marginBottom: 0 }}>Skills</h3>
        <div>
          <h4>Skills you have that this career uses</h4>
          <Chips skills={plan.have} shown={HAVE_SHOWN} empty="None of the skills you selected yet." />
        </div>
        <div>
          <h4>Skills to work on next</h4>
          <Chips skills={plan.toWork} shown={TO_WORK_SHOWN} next empty="None beyond your plan." />
        </div>
      </section>

      {plan.nextMove && (
        <section className="pp-move">
          <h3>Your next move</h3>
          <p className="pp-move-title">{plan.nextMove.title}</p>
          <p>{plan.nextMove.why}</p>
          {plan.nextMove.impact.map((line) => (
            <p key={line} style={{ fontWeight: 700 }}>
              {line}
            </p>
          ))}
        </section>
      )}

      <div className="pp-foot">
        <p>
          <span>
            Find Nova Scotia job postings: <strong>jobbank.gc.ca</strong>
          </span>{" "}
          · <span>NOC {plan.code}</span>
        </p>
        <p>
          <span>Generated by Take The Next Step</span> · <span>scores and wages are estimates</span>
        </p>
      </div>
    </article>
  );
}

function Chips({ skills, shown, next = false, empty }: { skills: readonly string[]; shown: number; next?: boolean; empty: string }) {
  if (skills.length === 0) return <p>{empty}</p>;
  const more = skills.length - shown;
  return (
    <ul className="pp-chips">
      {skills.slice(0, shown).map((skill) => (
        <li key={skill} className={`pp-chip${next ? " pp-chip-next" : ""}`}>
          {skill}
        </li>
      ))}
      {more > 0 && <li className="pp-chip pp-chip-more">+{more} more</li>}
    </ul>
  );
}
