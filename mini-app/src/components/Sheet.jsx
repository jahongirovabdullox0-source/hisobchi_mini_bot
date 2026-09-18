import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import Icon from './Icon';

const SheetCtx = createContext({ close: () => {} });
export const useSheet = () => useContext(SheetCtx);

/**
 * Pastdan chiquvchi oyna (Bottom Sheet).
 * children va footer funksiya bo'lishi mumkin: ({ close }) => ...
 */
export default function Sheet({ title, subtitle, children, footer, className = '' }) {
  const { sheet, closeSheet, registerSheetClose } = useApp();
  const [open, setOpen] = useState(false);
  const closing = useRef(false);
  const keyRef = useRef(sheet ? sheet.key : undefined);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setOpen(true));
    document.body.classList.add('no-scroll');
    return () => {
      cancelAnimationFrame(raf);
      document.body.classList.remove('no-scroll');
    };
  }, []);

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    setOpen(false);
    setTimeout(() => closeSheet(keyRef.current), 230);
  }, [closeSheet]);

  useEffect(() => {
    registerSheetClose(close);
  }, [close, registerSheetClose]);

  const body = typeof children === 'function' ? children({ close }) : children;
  const foot = typeof footer === 'function' ? footer({ close }) : footer;

  return (
    <SheetCtx.Provider value={{ close }}>
      <div className={`sheet-root${open ? ' open' : ''}`}>
        <div className="sheet-backdrop" onClick={close} />
        <div className={`sheet ${className}`} role="dialog" aria-modal="true">
          <div className="sheet-handle" />
          {title && (
            <div className="sheet-header">
              <div className="grow">
                <h3>{title}</h3>
                {subtitle && <p className="muted small">{subtitle}</p>}
              </div>
              <button className="icon-btn" onClick={close} aria-label="Yopish">
                <Icon name="x" size={20} />
              </button>
            </div>
          )}
          <div className="sheet-body">{body}</div>
          {foot && <div className="sheet-footer">{foot}</div>}
        </div>
      </div>
    </SheetCtx.Provider>
  );
}
