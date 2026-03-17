import {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  KeyboardEvent,
  ReactNode,
  SelectHTMLAttributes,
  useEffect,
  useId,
  useRef,
} from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`neu-card ${className}`}>
      {children}
    </div>
  );
}

interface DialogProps extends HTMLAttributes<HTMLDivElement> {
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
  const contentRef = useRef<HTMLDivElement>(null);
  const fallbackTitleId = useId();

  useEffect(() => {
    contentRef.current?.focus();
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
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
      onClick={onClose}
    >
      <Card
        {...props}
        className={contentClassName}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          ref={contentRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId ?? fallbackTitleId}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          className="outline-none"
        >
          {children}
        </div>
      </Card>
    </div>
  );
}

export function Button({ children, className = '', variant = 'primary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }) {
  return (
    <button 
      className={`neu-button px-6 py-3 ${className} ${variant === 'primary' ? 'text-blue-400' : variant === 'danger' ? 'text-red-400' : 'text-gray-300'}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input 
      className={`neu-input w-full ${className}`}
      {...props}
    />
  );
}

export function Select({ children, className = '', ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
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

export function Label({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <label className={`block text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2 ${className}`}>
      {children}
    </label>
  );
}

export function Badge({ children, status }: { children: ReactNode; status: string }) {
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
