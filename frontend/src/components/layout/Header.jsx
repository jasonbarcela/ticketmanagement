// ============================================================
// components/layout/Header.jsx — Mobile Top Bar
//
// Shown only on narrow viewports (≤768px) via CSS.
// Contains the brand wordmark and a hamburger toggle that
// opens the MobileDrawer overlay.
// ============================================================
export default function Header({ onMenuToggle }) {
  return (
    <header className="mobile-header">
      <div className="mobile-header-brand">
        <span>🔧</span> CODE <span className="brand-amp">&amp;</span> LOCKS
      </div>
      <button
        className="mobile-menu-btn"
        onClick={onMenuToggle}
        aria-label="Open navigation menu"
      >
        ☰
      </button>
    </header>
  )
}
