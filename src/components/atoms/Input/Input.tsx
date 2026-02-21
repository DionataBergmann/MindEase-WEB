import { forwardRef } from "react";
import { Input as UIInput, type InputProps as UIInputProps } from "@/components/ui/input";

export type InputProps = UIInputProps;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (props, ref) => <UIInput ref={ref} {...props} />
);
Input.displayName = "Input";
