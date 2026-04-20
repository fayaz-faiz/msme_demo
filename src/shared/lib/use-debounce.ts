import { useEffect, useState } from "react";

export function useDebounce(
  value: string,
  delay = 1000,
  minLength = 2,
): string {
  const [debouncedValue, setDebouncedValue] = useState("");

  useEffect(() => {
    if (value.trim().length === 0) {
      setDebouncedValue("");
      return;
    }
    if (value.trim().length < minLength) {
      return;
    }
    const timer = setTimeout(() => setDebouncedValue(value.trim()), delay);
    return () => clearTimeout(timer);
  }, [value, delay, minLength]);

  return debouncedValue;
}
