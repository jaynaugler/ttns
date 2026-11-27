

// "absolute" so the title stays as written whether or not the root layout
// adds a title template.
export const metadata = {
  title: { absolute: "Page not found | Take The Next Step" },
  description: "This page doesn't exist. Head back to Take The Next Step to keep planning your career.",
};

export default function NotFound() {
  return (
    <div id="not-found">
      <img src="/ttns-error.svg" alt="404 Error" />
      <p>404 -Page not found</p>
    </div>
  )
}