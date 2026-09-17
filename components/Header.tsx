'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useState} from 'react';
import {navigation, site} from '@/content/site';

export default function Header() {
  const [open, setOpen] = useState(false);
  const path = usePathname();

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="wordmark" href="/" aria-label="Florida Flamingo Working Group home">
          <span className="brand-symbol" aria-hidden="true">F<span>F</span></span>
          <span>FLORIDA FLAMINGO<small>WORKING GROUP</small></span>
        </Link>
        <a
          className="button coral mobile-donate"
          href={site.donation}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Donate through PayPal (opens in a new tab)"
        >
          Donate
        </a>
        <button
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="main-nav"
          onClick={() => setOpen(!open)}
        >
          {open ? 'Close menu' : 'Menu'} <span aria-hidden="true">{open ? '×' : '☰'}</span>
        </button>
        <nav id="main-nav" className={open ? 'nav open' : 'nav'} aria-label="Main navigation">
          {navigation.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              aria-current={path.replace(/\/$/, '') === href.replace(/\/$/, '') ? 'page' : undefined}
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}
          <a
            className="button small coral donate-button"
            href={site.donation}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            aria-label="Donate through PayPal (opens in a new tab)"
          >
            Donate <span aria-hidden="true">↗</span>
          </a>
          <Link
            className="button small navy report-button"
            href="/report-a-flamingo-sighting/"
            onClick={() => setOpen(false)}
          >
            Report a sighting <span aria-hidden="true">↗</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
