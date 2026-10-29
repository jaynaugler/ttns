import React from 'react';

export function Sidebar() {
  const steps = [
  { name: 'Personal Info', status: 'current' },
  { name: 'Current Pathways', status: 'upcoming' },
  { name: 'New Skill Interest', status: 'upcoming' },
  { name: 'Updated Pathways', status: 'upcoming' },
  { name: 'The Next Step 👣', status: 'upcoming' },
]

  return (
    <aside className="hidden w-64 shrink-0 bg-sidebar text-sidebar-foreground border-r min-h-full md:block">
      <nav aria-label="Your Journey" className="p-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider opacity-60 mb-4">Your Journey</h2>
        <ul className="space-y-4">
          {steps.map((step, index) => (
            <li key={step.name} className="flex items-start gap-3">
              <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step.status === 'current'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-sidebar-border text-sidebar-foreground opacity-50'
              }`}>
                {index + 1}
              </span>
              <span className={`text-sm ${step.status === 'current' ? 'font-bold' : 'opacity-70'}`}>
                {step.name}
              </span>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
