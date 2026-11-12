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
    key: "skills",
    title: "Skills",
    reviewTitle: "Skills",
    fields: [
      {
        name: "primarySkill",
        label: "Primary skill",
        rules: { required: "Primary skill is required" },
      },
      {
        name: "yearsOfExperience",
        label: "Years of experience",
        inputProps: { inputMode: "numeric" },
        rules: {
          required: "Years of experience is required",
          pattern: { value: /^\d+$/, message: "Enter a whole number" },
        },
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
