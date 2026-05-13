"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export const Footer: React.FC = () => {
  const [email, setEmail] = useState('');

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Tymczasowo przekierowanie do Google
    window.open('https://google.com', '_blank');
  };

  const handleLinkClick = () => {
    window.open('https://google.com', '_blank');
  };

  return (
    <footer style={{
      backgroundColor: '#2d3748',
      color: 'white',
      padding: '40px 20px',
      marginTop: 'auto'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '40px'
      }}>
        {/* Logo i kontakt */}
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '20px',
            marginTop: '20px'
          }}>
            <Image
              src="/images/logo.png"
              alt="GnG Logo"
              width={200}
              height={150}
              style={{ objectFit: 'contain' }}
            />
          </div>
          
          <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '8px' }}>📞</span>
            <span>188 9483 678</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '8px' }}>🕐</span>
            <span>10 am - 6 pm</span>
          </div>
        </div>

        {/* Details */}
        <div>
          <h3 style={{ 
            color: '#fbbf24',
            fontSize: '18px',
            fontWeight: 'bold',
            marginBottom: '20px'
          }}>
            Details
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button 
              onClick={handleLinkClick}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'white', 
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '16px',
                padding: '0'
              }}
            >
              About
            </button>
            <Link 
              href="/login"
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'white', 
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '16px',
                padding: '0',
                textDecoration: 'none'
              }}
            >
              Sign In
            </Link>
            <Link 
              href="/static-content/terms-of-service"
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'white', 
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '16px',
                padding: '0',
                textDecoration: 'none'
              }}
            >
              Terms of Service
            </Link>
            <Link 
              href="/static-content/privacy-policy"
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'white', 
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '16px',
                padding: '0',
                textDecoration: 'none'
              }}
            >
              Privacy Policy
            </Link>
          </div>
        </div>

        {/* Follow us */}
        <div>
          <h3 style={{ 
            color: '#fbbf24',
            fontSize: '18px',
            fontWeight: 'bold',
            marginBottom: '20px'
          }}>
            Follow us
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button 
              onClick={handleLinkClick}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'white', 
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '16px',
                padding: '0'
              }}
            >
              Facebook
            </button>
            <button 
              onClick={handleLinkClick}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'white', 
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '16px',
                padding: '0'
              }}
            >
              Instagram
            </button>
            <button 
              onClick={handleLinkClick}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'white', 
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '16px',
                padding: '0'
              }}
            >
              Twitter
            </button>
            <button 
              onClick={handleLinkClick}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'white', 
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '16px',
                padding: '0'
              }}
            >
              Pinterest
            </button>
          </div>
        </div>

        {/* Stay in touch */}
        <div>
          <h3 style={{ 
            color: '#fbbf24',
            fontSize: '18px',
            fontWeight: 'bold',
            marginBottom: '20px'
          }}>
            Stay in touch
          </h3>
          
          <form onSubmit={handleEmailSubmit} style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input
                type="email"
                placeholder="Type your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#4a5568',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'white',
                  fontSize: '16px'
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '12px 20px',
                  backgroundColor: '#718096',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                Send
              </button>
            </div>
          </form>
          
          <button
            onClick={handleLinkClick}
            style={{
              padding: '12px 24px',
              backgroundColor: '#fbbf24',
              border: 'none',
              borderRadius: '6px',
              color: '#1a202c',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            Contact support
          </button>
        </div>
      </div>
    </footer>
  );
}; 