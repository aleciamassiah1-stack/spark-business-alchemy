import { type ReactNode } from "react";

type Props = {
  title: string;
  action?: ReactNode;
};

// Sticky section header for the Business screen. Pins below the page chrome
// while a section is being scrolled. Stays in the dark luxury style.
export function SectionHeader({ title, action }: Props) {
  return (
    <div className="sticky top-0 z-20 -mx-5 px-5">
      <div className="flex items-center justify-between border-b border-white/[0.04] bg-background/85 py-2 backdrop-blur-md">
        <span className="label-mono">{title}</span>
        {action}
      </div>
    </div>
  );
}
