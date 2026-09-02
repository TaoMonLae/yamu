type Props = {
  children: React.ReactNode;
  className?: string;
};

// React Bits ShinyText treatment, reduced to a CSS-only success cue.
export function ShinyText({ children, className = "" }: Props) {
  return <span className={`shiny-text ${className}`}>{children}</span>;
}
