import { createPortal } from 'react-dom';
import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <Sonner
      theme="dark"
      position="bottom-right"
      offset={24}
      gap={8}
      visibleToasts={1}
      duration={4500}
      closeButton
      toastOptions={{
        unstyled: true,
        style: {
          all: 'unset',
          display: 'flex',
          flexDirection: 'column',
          width: '320px',
          background: '#111118',
          border: '1px solid rgba(255,255,255,0.08)',
          borderTop: '3px solid #ef4444',
          borderRadius: '10px',
          padding: '14px 16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          fontFamily: 'inherit',
          cursor: 'default',
          position: 'relative',
          overflow: 'hidden',
        } as React.CSSProperties,
        classNames: {
          title: 'toast-title',
          description: 'toast-description',
          closeButton: 'toast-close',
          success: 'toast-success',
          error: 'toast-error',
          warning: 'toast-warning',
          info: 'toast-info',
        },
      }}
      {...props}
    />,
    document.body
  );
};

export { Toaster };