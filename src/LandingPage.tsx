import React from 'react';
import './LandingPage.css';
import logo from '/Finance Companion Logo.png'; 

interface LandingPageProps {
  onLogin: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  return (
    <div className="landing-page">
      <div className="landing-container">
        {/* Header */}
        <header className="landing-header">
          <div className="landing-logo">
            <img src={logo} alt="Finance Companion Logo" style={{ mixBlendMode: 'multiply' }} />
            WAMS
          </div>
          <nav className="landing-nav">
            <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="landing-btn landing-btn-outline" style={{ border: 'none' }}>
              Features
            </button>
            <button onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })} className="landing-btn landing-btn-outline" style={{ border: 'none' }}>
              Pricing
            </button>
            <button onClick={onLogin} className="landing-btn landing-btn-outline">
              Log In
            </button>
            <button onClick={onLogin} className="landing-btn landing-btn-primary">
              Get Started
            </button>
          </nav>
        </header>

        {/* Hero Section */}
        <section className="landing-hero">
          <h1>
            Master Your <br />
            <span>Web Apps & Finances</span>
          </h1>
          <p>
            The all-in-one dashboard to manage your subscriptions, track expenses, 
            and organize your digital life. Join 6,000+ users taking control today.
          </p>
          <div className="hero-buttons">
            <button onClick={onLogin} className="landing-btn landing-btn-primary hero-btn-large">
              Start Free Trial
            </button>
            <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="landing-btn landing-btn-outline hero-btn-large">
              Learn More
            </button>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="landing-features">
          <h2 className="section-title">Everything You Need</h2>
          <p className="section-subtitle">
            Stop juggling multiple spreadsheets and bookmarks. WAMS brings it all together.
          </p>
          
          <div className="features-grid">
            <div className="feature-card">
              <span className="feature-icon">🚀</span>
              <h3>Centralized Dashboard</h3>
              <p>
                Access all your web applications from a single, organized dashboard. 
                Categorize tiles, manage tabs, and launch apps instantly.
              </p>
            </div>
            
            <div className="feature-card">
              <span className="feature-icon">💰</span>
              <h3>Expense Tracking</h3>
              <p>
                Track subscriptions, monitor budgets, and visualize your spending habits.
                Never miss a payment with automated due date reminders.
              </p>
            </div>
            
            <div className="feature-card">
              <span className="feature-icon">🔐</span>
              <h3>Secure Sharing</h3>
              <p>
                Share specific categories or financial data with your accountant or family members
                securely, without sharing your login credentials.
              </p>
            </div>

            <div className="feature-card">
              <span className="feature-icon">📈</span>
              <h3>Stock Ticker</h3>
              <p>
                Keep an eye on your investments with a built-in stock ticker. 
                Track major indices and your personal portfolio in real-time.
              </p>
            </div>

            <div className="feature-card">
              <span className="feature-icon">📱</span>
              <h3>Multi-Device</h3>
              <p>
                Access your dashboard from anywhere. Whether you're on desktop, tablet, 
                or mobile, your data is always synced and ready.
              </p>
            </div>

            <div className="feature-card">
              <span className="feature-icon">🛡️</span>
              <h3>Bank-Grade Security</h3>
              <p>
                Your data is encrypted and secure. We use industry-standard security 
                practices to ensure your information stays private.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="landing-pricing">
          <h2 className="section-title">Simple, Transparent Pricing</h2>
          <p className="section-subtitle">
            Start with a 7-day free trial. No credit card required.
          </p>
          
          <div className="pricing-grid">
            <div className="pricing-card">
              <div className="pricing-header">
                <h3 className="pricing-title">Monthly</h3>
                <div className="pricing-price">$19.99</div>
                <div className="pricing-period">per month</div>
              </div>
              <ul className="pricing-features">
                <li><span className="check-icon">✓</span> Unlimited Tiles & Tabs</li>
                <li><span className="check-icon">✓</span> Expense Tracking</li>
                <li><span className="check-icon">✓</span> Secure Data Storage</li>
                <li><span className="check-icon">✓</span> Email Support</li>
              </ul>
              <button onClick={onLogin} className="landing-btn landing-btn-outline" style={{ width: '100%' }}>
                Choose Monthly
              </button>
            </div>
            
            <div className="pricing-card featured">
              <div className="pricing-badge">Best Value</div>
              <div className="pricing-header">
                <h3 className="pricing-title">Annual</h3>
                <div className="pricing-price">$191.99</div>
                <div className="pricing-period">per year</div>
              </div>
              <ul className="pricing-features">
                <li><span className="check-icon">✓</span> <strong>Save 20%</strong> ($15.99/mo)</li>
                <li><span className="check-icon">✓</span> Unlimited Tiles & Tabs</li>
                <li><span className="check-icon">✓</span> Expense Tracking</li>
                <li><span className="check-icon">✓</span> Secure Data Storage</li>
                <li><span className="check-icon">✓</span> Priority Support</li>
                <li><span className="check-icon">✓</span> Accountant Access Sharing</li>
              </ul>
              <button onClick={onLogin} className="landing-btn landing-btn-primary" style={{ width: '100%' }}>
                Choose Annual
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="landing-footer">
          <div className="landing-container">
            <div className="footer-content">
              <div className="footer-col">
                <h4>WAMS</h4>
                <p style={{ color: '#a0aec0' }}>
                  The ultimate Web Application Management System for professionals and businesses.
                </p>
              </div>
              <div className="footer-col">
                <h4>Product</h4>
                <ul>
                  <li><a href="#">Features</a></li>
                  <li><a href="#">Pricing</a></li>
                  <li><a href="#">Security</a></li>
                  <li><a href="#">Roadmap</a></li>
                </ul>
              </div>
              <div className="footer-col">
                <h4>Company</h4>
                <ul>
                  <li><a href="#">About Us</a></li>
                  <li><a href="#">Contact</a></li>
                  <li><a href="#">Careers</a></li>
                  <li><a href="#">Blog</a></li>
                </ul>
              </div>
              <div className="footer-col">
                <h4>Legal</h4>
                <ul>
                  <li><a href="#">Privacy Policy</a></li>
                  <li><a href="#">Terms of Service</a></li>
                  <li><a href="#">Cookie Policy</a></li>
                </ul>
              </div>
            </div>
            <div className="footer-bottom">
              &copy; {new Date().getFullYear()} WAMS Inc. All rights reserved.
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;

