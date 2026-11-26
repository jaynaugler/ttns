import type { PlanDocument } from "@/lib/career-summary";

// The print version of The Next Step: "My career plan" on one or two pages,
// from the same plan document "Copy plan as text" uses. Hidden on screen.
// In print, the stylesheet hides the site header, sidebar, footer and every
// part of the page that isn't the plan, and prints black on white whatever
// the colour mode, with full links written out.
const PRINT_STYLES = `
@media print {
  @page { margin: 15mm; }
  html, body { background: #fff !important; color: #000 !important; }
  header, footer, aside { display: none !important; }
  main :not([data-print-plan], [data-print-plan] *, :has([data-print-plan])) { display: none !important; }
  main { padding: 0 !important; }
  [data-print-plan], [data-print-plan] * { color: #000 !important; background: transparent !important; }
  [data-print-plan] { font-size: 11pt; line-height: 1.4; }
  [data-print-plan] h2 { break-after: avoid; }
  [data-print-plan] section { break-inside: avoid; }
}
`;

export function PrintablePlan({ doc }: { doc: PlanDocument }) {
  return (
    <article data-print-plan="" className="hidden print:block">
      <style>{PRINT_STYLES}</style>
      <h1 className="mb-3 text-2xl font-bold">{doc.title}</h1>
      <div className="space-y-3">
        {doc.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-base font-bold">{section.heading}</h2>
            <ul className="list-disc pl-5">
              {section.items.map((item) => (
                <li key={item} className="break-words">
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="mt-3 text-sm">Estimates only: wages and match scores are a rough guide.</p>
    </article>
  );
}
