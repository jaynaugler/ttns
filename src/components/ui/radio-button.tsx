import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

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
    <div className="flex max-w-sm flex-col gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-5 shadow-md">
      <h3 className="mb-1 flex items-center gap-2 text-base font-bold text-gray-900">
        <span>Select Your Vibe</span>
      </h3>

      {options.map((option) => (
        <label
          key={option.value}
          className="group flex cursor-pointer select-none items-center justify-between rounded-xl border border-gray-200 bg-white p-4 transition-all duration-200 hover:border-cyan-400 hover:bg-cyan-50/50 has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50/60"
        >
          <span className="flex flex-col">
            <span className="text-sm font-semibold text-gray-800 transition-colors group-hover:text-cyan-800 group-has-[:checked]:text-blue-900">
              {option.title}
            </span>

            <span className="text-xs text-gray-500 transition-colors group-hover:text-cyan-700 group-has-[:checked]:text-blue-700">
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

          <span className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-gray-300 bg-white transition-all duration-200 group-hover:scale-105 group-hover:border-cyan-500 peer-checked:border-blue-600 peer-checked:bg-blue-600 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-400 peer-focus-visible:ring-offset-2">
            <svg
              aria-hidden="true"
              className="h-5 w-5 fill-current text-gray-400 transition-colors duration-200 peer-checked:text-white"
              viewBox="0 0 24 24"
            >
              <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 21.5h2.1l1.9-8.2 2.1 2V21.5h2v-6.7l-2.1-2 1.1-5.3C15.4 9 17 10 18.5 10V8c-1.3 0-2.6-.8-3.3-2l-1-1.7c-.4-.7-1.1-1.1-1.9-1.1-.3 0-.6.1-.9.2L6 5.8V11h2V7.8l1.8-1.1" />
            </svg>
          </span>
        </label>
      ))}
    </div>
  );
}
