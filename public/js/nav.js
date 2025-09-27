// Creatives Takeover - Mobile Navigation JavaScript

(function() {
  'use strict';
  
  // Wait for DOM to be ready
  document.addEventListener('DOMContentLoaded', function() {
    
    // Get navigation elements
    const navToggle = document.getElementById('navToggle');
    const siteNav = document.getElementById('site-nav');
    
    // Set current year in footer
    const yearElement = document.getElementById('year');
    if (yearElement) {
      yearElement.textContent = new Date().getFullYear();
    }
    
    // Exit early if navigation elements don't exist
    if (!navToggle || !siteNav) {
      return;
    }
    
    // Toggle mobile navigation
    function toggleNav() {
      const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
      const newState = !isExpanded;
      
      // Update button state
      navToggle.setAttribute('aria-expanded', newState);
      
      // Update navigation state
      siteNav.setAttribute('aria-hidden', !newState);
      
      // Add/remove body scroll lock for mobile
      if (newState) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }
    
    // Close navigation
    function closeNav() {
      navToggle.setAttribute('aria-expanded', 'false');
      siteNav.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
    
    // Handle click events
    navToggle.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      toggleNav();
    });
    
    // Close navigation when clicking outside
    document.addEventListener('click', function(e) {
      const isClickInsideNav = siteNav.contains(e.target);
      const isClickOnToggle = navToggle.contains(e.target);
      
      if (!isClickInsideNav && !isClickOnToggle) {
        closeNav();
      }
    });
    
    // Close navigation on escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        closeNav();
      }
    });
    
    // Close navigation when window is resized to desktop size
    window.addEventListener('resize', function() {
      if (window.innerWidth >= 601) {
        closeNav();
      }
    });
    
    // Handle navigation link clicks (smooth scroll)
    const navLinks = siteNav.querySelectorAll('a[href^="#"]');
    navLinks.forEach(function(link) {
      link.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        const target = document.querySelector(href);
        
        if (target) {
          e.preventDefault();
          closeNav();
          
          // Smooth scroll to target
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
          
          // Update URL hash
          if (history.pushState) {
            history.pushState(null, null, href);
          } else {
            location.hash = href;
          }
        }
      });
    });
    
    // Progressive enhancement: Add touch support
    if ('ontouchstart' in window) {
      navToggle.addEventListener('touchstart', function(e) {
        // Prevent double-tap zoom on mobile
        e.preventDefault();
      });
    }
    
  });
  
})();