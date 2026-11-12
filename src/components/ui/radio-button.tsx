type RadioOption = {
  value: string;
  title: string;
  description: string;
};

type RadioButtonGroupProps = {
  name: string;
  options: RadioOption[];
  defaultValue?: string;
};

export function RadioButtonGroup({
  name,
  options,
  defaultValue,
}: RadioButtonGroupProps) {
  return (
    <div className="flex max-w-sm flex-col gap-4 rounded-2xl border border-border bg-muted p-5 shadow-md">
      <h3 className="mb-1 flex items-center gap-2 text-base font-bold text-foreground">
        <span>Select Your Vibe</span>
      </h3>

      {options.map((option) => (
        <label
          key={option.value}
          className="group flex cursor-pointer select-none items-center justify-between rounded-xl border border-border bg-background p-4 transition-all duration-200 hover:border-primary/50 hover:bg-primary/5 has-[:checked]:border-primary has-[:checked]:bg-primary/10"
        >
          <span className="flex flex-col">
            <span className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary group-has-[:checked]:text-primary">
              {option.title}
            </span>

            <span className="text-xs text-muted-foreground transition-colors group-hover:text-primary group-has-[:checked]:text-primary">
              {option.description}
            </span>
          </span>

          <input
            type="radio"
            name={name}
            value={option.value}
            className="peer sr-only"
            defaultChecked={option.value === defaultValue}
          />

          <span className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-border bg-background transition-all duration-200 group-hover:scale-105 group-hover:border-primary peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2">
            <svg
              aria-hidden="true"
              className="h-5 w-5 fill-current text-muted-foreground transition-colors duration-200 peer-checked:text-primary-foreground"
              viewBox="0 0 24 24"
            >
              <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2 .9 2 2 2zM9.8 8.9L7 21.5h2.1l1.9-8.2 2.1 2V21.5h2v-6.7l-2.1-2 1.1-5.3C15.4 9 17 10 18.5 10V8c-1.3 0-2.6-.8-3.3-2l-1-1.7c-.4-.7-1.1-1.1-1.9-1.1-.3 0-.6.1-.9.2L6 5.8V11h2V7.8l1.8-1.1" />
            </svg>
          </span>
        </label>
      ))}
    </div>
  );
}
