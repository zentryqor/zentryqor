import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

/**
 * Liquid-glass toggle — matches the `.switch` style used across settings.
 */
const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root className={cn("liquid-switch", className)} {...props} ref={ref}>
    <span className="liquid-switch__track" aria-hidden>
      <span className="liquid-switch__glow" />
    </span>
    <SwitchPrimitives.Thumb className="liquid-switch__thumb" />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
