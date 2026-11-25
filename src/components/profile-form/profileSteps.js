// The one place that describes the profile form. Each entry is one step:
// - key: the group the values live under in the form data ("personal")
// - title: the heading while filling in the step
// - reviewTitle: the section heading on the review
// - fields: name (inside the group), label, react-hook-form rules, and
//   inputProps passed straight to the <Input> (e.g. inputMode)
// Mark a field `optional: true` to label it "Optional" on the review when empty.
// Adding a field here adds it to the step, the default values and the review.
export const profileSteps = [
  {
    key: "personal",
    title: "Personal info",
    reviewTitle: "About you",
    fields: [
      {
        name: "firstName",
        label: "First name",
        rules: { required: "First name is required" },
      },
      {
        name: "lastName",
        label: "Last name",
        rules: { required: "Last name is required" },
      },
    ],
  },
  {
    key: "interests",
    title: "Interests",
    reviewTitle: "Interests",
    fields: [
      {
        name: "interest1",
        label: "Interest 1",
        rules: { required: "Interest 1 is required" },
      },
      {
        name: "interest2",
        label: "Interest 2",
        rules: { required: "Interest 2 is required" },
      },
    ],
  },
  {
    key: "education",
    title: "Education",
    reviewTitle: "Education",
    fields: [
      {
        name: "school",
        label: "School",
        rules: { required: "School is required" },
      },
      {
        name: "degree",
        label: "Degree",
        rules: { required: "Degree is required" },
      },
    ],
  },
];

// Every field starts empty: { personal: { firstName: "", ... }, skills: ... }
export const profileDefaultValues = Object.fromEntries(
  profileSteps.map((step) => [
    step.key,
    Object.fromEntries(step.fields.map((field) => [field.name, ""])),
  ])
);

// Overlays saved profile data on the empty defaults: only the shape
// profileDefaultValues defines gets through, so an older saved profile that's
// missing a newly added field (or a stale group) can't leave a hole — the
// field just starts empty.
export function withSavedValues(defaults, saved) {
  if (!saved) return defaults;
  return Object.fromEntries(
    Object.entries(defaults).map(([key, fields]) => [
      key,
      Object.fromEntries(
        Object.entries(fields).map(([field, value]) => [
          field,
          typeof saved[key]?.[field] === "string" ? saved[key][field] : value,
        ])
      ),
    ])
  );
}

// DEV TOOL — remove before launch (alongside the "Reset journey" dev button).
// Sample values ProfileForm's "Autofill (dev)" button loads so the journey can
// be walked without retyping the form each run. Kept in this file so the one
// place describing the form's shape stays that place: when you add a field
// above, its review will fail "required" until you add a value here too.
export const profileDevValues = {
  personal: { firstName: "Alex", lastName: "Sample" },
  skills: { primarySkill: "Customer Service", yearsOfExperience: "4" },
  interests: { interest1: "Building things", interest2: "Helping people" },
  education: {
    school: "Red River College Polytechnic",
    degree: "Business Administration Diploma",
  },
};
