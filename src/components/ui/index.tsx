import {
  ButtonHTMLAttributes,
  DialogHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  KeyboardEvent,
  MouseEvent,
  ReactNode,
  SelectHTMLAttributes,
  useEffect,
  useId,
  useRef,
} from 'react';

type CardProps = Readonly<HTMLAttributes<HTMLDivElement> & { children: ReactNode }>;

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div className={`neu-card ${className}`} {...props}>
      {children}
    </div>
  );
}

interface DialogProps extends Omit<DialogHTMLAttributes<HTMLDialogElement>, 'onClose'> {
  children: ReactNode;
  onClose: () => void;
  onEnter?: () => void;
  overlayClassName?: string;
  contentClassName?: string;
  titleId?: string;
}

function isEnterHandledByElement(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName;
  return (
    tagName === 'BUTTON' ||
    tagName === 'A' ||
    tagName === 'SELECT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'INPUT' ||
    target.isContentEditable
  );
}

export function Dialog({
  children,
  onClose,
  onEnter,
  overlayClassName = '',
  contentClassName = '',
  titleId,
  ...props
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fallbackTitleId = useId();

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }

    if (
      event.key === 'Enter' &&
      onEnter &&
      !event.defaultPrevented &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey &&
      !isEnterHandledByElement(event.target)
    ) {
      event.preventDefault();
      onEnter();
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm ${overlayClassName}`}
      onClick={(event: MouseEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <dialog
        ref={dialogRef}
        {...props}
        open
        aria-labelledby={titleId ?? fallbackTitleId}
        className="m-0 border-none bg-transparent p-0 text-inherit shadow-none outline-none backdrop:bg-transparent"
        onCancel={(event) => {
          event.preventDefault();
          onClose();
        }}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <Card className={`outline-none ${contentClassName}`}>
          {children}
        </Card>
      </dialog>
    </div>
  );
}

type ButtonProps = Readonly<ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger';
}>;

export function Button({ children, className = '', variant = 'primary', ...props }: ButtonProps) {
  let variantClassName = 'text-blue-400';
  if (variant === 'danger') {
    variantClassName = 'text-red-400';
  } else if (variant === 'secondary') {
    variantClassName = 'text-gray-300';
  }

  return (
    <button
      className={`neu-button px-6 py-3 ${className} ${variantClassName}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ className = '', ...props }: Readonly<InputHTMLAttributes<HTMLInputElement>>) {
  return (
    <input
      className={`neu-input w-full ${className}`}
      {...props}
    />
  );
}

export function Select({ children, className = '', ...props }: Readonly<SelectHTMLAttributes<HTMLSelectElement>>) {
  return (
    <div className="relative w-full">
      <select
        className={`neu-input w-full appearance-none ${className}`}
        {...props}
      >
        {children}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
      </div>
    </div>
  );
}

export function Label({ children, className = '' }: Readonly<{ children: ReactNode; className?: string }>) {
  return (
    <label className={`block text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2 ${className}`}>
      {children}
    </label>
  );
}

export function Badge({ children, status }: Readonly<{ children: ReactNode; status: string }>) {
  const getColors = () => {
    switch(status.toLowerCase()) {
      case 'checked in': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'checked out': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getColors()}`}>
      {children}
    </span>
  );
}
