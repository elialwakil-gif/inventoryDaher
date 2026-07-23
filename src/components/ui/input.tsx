import * as React from "react";

import { cn } from "@/lib/utils";

const normalizeDecimalInput = (value: string, allowNegative: boolean) => {
  const normalizedValue = value.replace(/,/g, ".");
  let result = "";
  let hasDecimalSeparator = false;

  for (const char of normalizedValue) {
    if (char >= "0" && char <= "9") {
      result += char;
      continue;
    }

    if (char === "." && !hasDecimalSeparator) {
      result += char;
      hasDecimalSeparator = true;
      continue;
    }

    if (char === "-" && allowNegative && result.length === 0) {
      result += char;
    }
  }

  return result;
};

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  (
    { className, type, onBlur, onChange, onFocus, step, inputMode, ...props },
    ref,
  ) => {
    const isDecimalInput = type === "number";
    const [focusedValue, setFocusedValue] = React.useState<string | null>(null);
    const isControlled = props.value !== undefined;
    const allowNegative =
      props.min === undefined ||
      Number(props.min) < 0 ||
      !Number.isFinite(Number(props.min));
    const displayValue =
      isDecimalInput && isControlled && focusedValue !== null
        ? focusedValue
        : props.value;

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!isDecimalInput) {
        onChange?.(event);
        return;
      }

      const nextValue = normalizeDecimalInput(event.target.value, allowNegative);
      event.target.value = nextValue;
      event.currentTarget.value = nextValue;
      setFocusedValue(nextValue);
      onChange?.(event);
    };

    const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
      if (isDecimalInput) {
        setFocusedValue(String(event.currentTarget.value ?? ""));
      }

      onFocus?.(event);
    };

    const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
      if (isDecimalInput) {
        const nextValue = normalizeDecimalInput(
          event.currentTarget.value,
          allowNegative,
        );
        event.currentTarget.value = nextValue;
        setFocusedValue(null);
      }

      onBlur?.(event);
    };

    return (
      <input
        type={isDecimalInput ? "text" : type}
        inputMode={isDecimalInput ? inputMode || "decimal" : inputMode}
        step={isDecimalInput ? step || "any" : step}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
        value={displayValue}
        onBlur={handleBlur}
        onChange={handleChange}
        onFocus={handleFocus}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
