import { useRef, type ReactNode } from "react";
import { useDismissible } from "./useDismissible";

type Props = {
  open: boolean;
  onClose: () => void;
  trigger: ReactNode;
  children: ReactNode;
  className?: string;
  listClassName?: string;
};

export function DropdownMenu({
  open,
  onClose,
  trigger,
  children,
  className = "user-menu",
  listClassName = "user-menu-list",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useDismissible(open, onClose, ref);
  return (
    <div className={className} ref={ref}>
      {trigger}
      {open && (
        <div className={listClassName} role="menu">
          {children}
        </div>
      )}
    </div>
  );
}
