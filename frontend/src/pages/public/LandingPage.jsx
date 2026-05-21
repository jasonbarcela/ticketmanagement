// pages/public/LandingPage.jsx — Local phone repair shop landing (Tambo, Pamplona, Camarines Sur)
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const SERVICES = [
  {
    icon: '📱',
    title: 'Screen Replacement',
    desc: 'Replacement for cracked or unresponsive screens on common smartphone models.',
  },
  {
    icon: '🔋',
    title: 'Battery Replacement',
    desc: 'Help for weak batteries, fast draining, or devices that no longer hold a charge.',
  },
  {
    icon: '🔌',
    title: 'Charging Port Repair',
    desc: 'Fix for loose ports, slow charging, or phones that do not charge properly.',
  },
  {
    icon: '⚙️',
    title: 'Software Troubleshooting',
    desc: 'Basic software checks for lag, boot issues, and common app or system problems.',
  },
  {
    icon: '✨',
    title: 'Phone Cleaning',
    desc: 'General cleaning of ports, speakers, and exterior to keep your device tidy.',
  },
  {
    icon: '🔍',
    title: 'Basic Diagnostics',
    desc: 'Initial check to identify the problem before repair work is recommended.',
  },
]

const TRACKING_STATUSES = [
  'Pending',
  'Checking Device',
  'Repair Ongoing',
  'Ready for Pickup',
  'Completed',
]

const WHY = [
  { icon: '💰', title: 'Affordable Service', desc: 'Fair pricing suited for students, workers, and local customers.' },
  { icon: '🙂', title: 'Friendly Assistance', desc: 'Approachable staff who explain the issue and repair process clearly.' },
  { icon: '📋', title: 'Organized Repair Records', desc: 'Each repair is logged so we can track your device properly.' },
  { icon: '🔔', title: 'Faster Customer Updates', desc: 'Check repair status online using your ticket reference number.' },
]

const CONTACT = [
  { label: 'Contact Number', value: '09084966657' },
  { label: 'Facebook Page', value: 'facebook.com/codeandlocks' },
  { label: 'Email Address', value: 'codeandlocks@gmail.com ' },
  { label: 'Shop Address', value: 'Tambo, Pamplona, Camarines Sur, Philippines', full: true },
  { label: 'Business Hours', value: 'Monday – Saturday, 9:00 AM – 6:00 PM', full: true },
]

function PublicNav({ menuOpen, setMenuOpen }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToContact = () => {
    setMenuOpen(false)
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      <header className={`landing-nav${scrolled ? ' scrolled' : ''}`}>
        <Link to="/home" className="landing-brand">
          <span className="landing-brand-icon">🔧</span>
          <span>CODE <span className="accent">&amp;</span> LOCKS</span>
        </Link>

        <nav className="landing-nav-links" aria-label="Main navigation">
          <Link to="/home" onClick={() => setMenuOpen(false)}>Home</Link>
          <a href="#about" onClick={() => setMenuOpen(false)}>About</a>
          <a href="#services" onClick={() => setMenuOpen(false)}>Services</a>
          <a href="#tracking" onClick={() => setMenuOpen(false)}>Repair Tracking</a>
          <a href="#contact" onClick={() => { setMenuOpen(false); scrollToContact() }}>Contact</a>
          <Link to="/book-online" className="landing-btn landing-btn-primary" style={{ marginLeft: 4 }}>
            Book Repair
          </Link>
        </nav>

        <button
          type="button"
          className="landing-nav-toggle"
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </header>

      <nav className={`landing-mobile-menu${menuOpen ? ' open' : ''}`} aria-label="Mobile navigation">
        <Link to="/home" onClick={() => setMenuOpen(false)}>Home</Link>
        <a href="#about" onClick={() => setMenuOpen(false)}>About</a>
        <a href="#services" onClick={() => setMenuOpen(false)}>Services</a>
        <a href="#tracking" onClick={() => setMenuOpen(false)}>Repair Tracking</a>
        <a href="#contact" onClick={() => { setMenuOpen(false); scrollToContact() }}>Contact</a>
        <Link to="/book-online" className="landing-btn landing-btn-primary" style={{ marginTop: 8 }} onClick={() => setMenuOpen(false)}>
          Book Repair
        </Link>
      </nav>
    </>
  )
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)

  const scrollToContact = () => {
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="landing-page">
      <PublicNav menuOpen={menuOpen} setMenuOpen={setMenuOpen} />

      {/* Hero */}
      <section className="landing-hero">
        <span className="landing-hero-badge">Tambo, Pamplona, Camarines Sur</span>
        <h1>Trusted Phone Repair Services in Tambo, Pamplona</h1>
        <p className="landing-hero-sub">
          We provide affordable and reliable phone repair services for common smartphone problems.
        </p>
        <div className="landing-hero-actions">
          <Link to="/book-online" className="landing-btn landing-btn-primary">
            Book Repair
          </Link>
          <button type="button" className="landing-btn landing-btn-outline-light" onClick={scrollToContact}>
            Contact Us
          </button>
        </div>
      </section>

      {/* About */}
      <section id="about" className="landing-section landing-section-white">
        <div className="landing-container">
          <div className="landing-section-head">
            <h2>About Our Shop</h2>
          </div>
          <p className="landing-about-text">
            Our shop helps customers with phone repair needs such as screen replacement, battery issues,
            charging problems, and software troubleshooting. We aim to provide organized and reliable
            service for customers in Tambo, Pamplona, Camarines Sur.
          </p>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="landing-section landing-section-muted">
        <div className="landing-container">
          <div className="landing-section-head">
            <h2>Our Services</h2>
            <p>Common repairs we handle for local customers, students, and workers in the area.</p>
          </div>
          <div className="landing-services-grid">
            {SERVICES.map(s => (
              <article key={s.title} className="landing-service-card">
                <div className="landing-service-icon">{s.icon}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Repair tracking */}
      <section id="tracking" className="landing-section landing-section-white">
        <div className="landing-container">
          <div className="landing-section-head">
            <h2>Repair Tracking</h2>
          </div>
          <div className="landing-tracking-box">
            <p className="landing-tracking-intro">
              After you submit a repair request, you will receive a ticket reference number (for example,
              CL-2026-00001). Use that number on our tracking page to see the latest status of your device repair.
            </p>
            <div className="landing-status-flow" aria-label="Example repair statuses">
              {TRACKING_STATUSES.map((status, i) => (
                <span key={status} style={{ display: 'contents' }}>
                  {i > 0 && <span className="landing-status-arrow" aria-hidden>→</span>}
                  <span className="landing-status-pill">{status}</span>
                </span>
              ))}
            </div>
            <div className="landing-tracking-cta">
              <Link to="/track" className="landing-btn landing-btn-primary">
                Check Repair Status
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Why choose us */}
      <section className="landing-section landing-section-muted">
        <div className="landing-container">
          <div className="landing-section-head">
            <h2>Why Choose Us</h2>
            <p>A simple local shop focused on clear service and honest communication.</p>
          </div>
          <div className="landing-why-grid">
            {WHY.map(w => (
              <div key={w.title} className="landing-why-item">
                <span className="landing-why-icon">{w.icon}</span>
                <div>
                  <strong>{w.title}</strong>
                  <span>{w.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="landing-section landing-section-white">
        <div className="landing-container">
          <div className="landing-section-head">
            <h2>Contact Us</h2>
            <p>Visit us in Tambo, Pamplona or reach out through the channels below.</p>
          </div>
          <div className="landing-contact-grid">
            {CONTACT.map(c => (
              <div key={c.label} className={`landing-contact-card${c.full ? ' full-width' : ''}`}>
                <label>{c.label}</label>
                <p>{c.value}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 28 }}>
            <Link to="/book-online" className="landing-btn landing-btn-primary">
              Book a Repair Online
            </Link>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <p className="landing-footer-copy">
          © {new Date().getFullYear()} Code &amp; Locks — Phone repair shop, Tambo, Pamplona, Camarines Sur.
        </p>
        <p className="landing-footer-staff">
          <Link to="/login">Staff login</Link>
        </p>
      </footer>
    </div>
  )
}
