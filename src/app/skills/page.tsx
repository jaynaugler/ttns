import { UserSkillSelection } from "@/components/skill-selection";

// Journey step 1 (second half): current-skill selection. Its own page rather
// than home-page filler; the selection's Continue saves the skills and leads
// to the current pathways.
export default function SkillsPage() {
  return <UserSkillSelection />;
}