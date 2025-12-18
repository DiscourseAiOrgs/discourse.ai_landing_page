// ============================================
// apps/web/src/scripts/main.ts
// Landing page interactivity
// ============================================

/**
 * API Configuration
 * In development, Vite proxies /api to localhost:8787
 * In production, update this to your actual API URL
 */
const API_BASE = '/api';

/**
 * Initialize all interactive features when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initStickyNav();
  initWaitlistForms();
  initSmoothScroll();
  initAnimateOnScroll();
});

// ==================== MOBILE MENU ====================

function initMobileMenu(): void {
  const menuButton = document.getElementById('mobile-menu-button');
  const mobileMenu = document.getElementById('mobile-menu');
  const menuIcon = document.getElementById('menu-icon');
  const closeIcon = document.getElementById('close-icon');

  if (!menuButton || !mobileMenu) return;

  menuButton.addEventListener('click', () => {
    const isHidden = mobileMenu.classList.contains('hidden');

    if (isHidden) {
      // Open menu
      mobileMenu.classList.remove('hidden');
      menuIcon?.classList.add('hidden');
      closeIcon?.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    } else {
      // Close menu
      mobileMenu.classList.add('hidden');
      menuIcon?.classList.remove('hidden');
      closeIcon?.classList.add('hidden');
      document.body.style.overflow = '';
    }
  });

  // Close menu when clicking a link
  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      mobileMenu.classList.add('hidden');
      menuIcon?.classList.remove('hidden');
      closeIcon?.classList.add('hidden');
      document.body.style.overflow = '';
    });
  });
}

// ==================== STICKY NAVIGATION ====================

function initStickyNav(): void {
  const nav = document.getElementById('main-nav');
  if (!nav) return;

  // Classes to add/remove on scroll
  const scrolledClasses = ['bg-white/90', 'backdrop-blur-lg', 'shadow-sm', 'border-b', 'border-slate-100'];
  const transparentClasses = ['bg-transparent'];

  function updateNav() {
    if (window.scrollY > 50) {
      // Scrolled - add background
      nav.classList.remove(...transparentClasses);
      nav.classList.add(...scrolledClasses);
    } else {
      // At top - transparent
      nav.classList.remove(...scrolledClasses);
      nav.classList.add(...transparentClasses);
    }
  }

  // Initial check
  updateNav();

  // Listen for scroll
  window.addEventListener('scroll', updateNav, { passive: true });
}

// ==================== WAITLIST FORM ====================

interface WaitlistResponse {
  success: boolean;
  data?: {
    id: string;
    email: string;
    position: number;
    createdAt: string;
  };
  error?: string;
  message?: string;
}

function initWaitlistForms(): void {
  const forms = document.querySelectorAll<HTMLFormElement>('.waitlist-form');

  forms.forEach(form => {
    form.addEventListener('submit', handleWaitlistSubmit);
  });
}

async function handleWaitlistSubmit(event: Event): Promise<void> {
  event.preventDefault();

  const form = event.target as HTMLFormElement;
  const emailInput = form.querySelector<HTMLInputElement>('input[type="email"]');
  const submitButton = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const messageDiv = form.querySelector<HTMLDivElement>('.form-message');

  if (!emailInput || !submitButton) return;

  const email = emailInput.value.trim();
  
  // Basic validation
  if (!email) {
    showMessage(messageDiv, 'Please enter your email address.', 'error');
    return;
  }

  if (!isValidEmail(email)) {
    showMessage(messageDiv, 'Please enter a valid email address.', 'error');
    return;
  }

  // Save original button content
  const originalContent = submitButton.innerHTML;

  // Show loading state
  submitButton.disabled = true;
  submitButton.innerHTML = `
    <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <span>Joining...</span>
  `;

  try {
    const response = await fetch(`${API_BASE}/waitlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        source: 'landing_page',
      }),
    });

    const data: WaitlistResponse = await response.json();

    if (response.ok && data.success && data.data) {
      // Success!
      emailInput.value = '';
      showMessage(
        messageDiv,
        `🎉 You're #${data.data.position} on the waitlist! We'll notify you when it's your turn.`,
        'success'
      );

      // Optional: Track conversion
      trackEvent('waitlist_signup', { position: data.data.position });

    } else {
      // API returned an error
      const errorMessage = data.error || data.message || 'Something went wrong. Please try again.';
      
      // Handle specific error cases
      if (errorMessage.toLowerCase().includes('already')) {
        showMessage(messageDiv, '📧 This email is already on the waitlist!', 'info');
      } else {
        showMessage(messageDiv, errorMessage, 'error');
      }
    }

  } catch (error) {
    console.error('Waitlist submission error:', error);
    
    // Network or parsing error
    showMessage(
      messageDiv,
      'Unable to connect. Please check your internet connection and try again.',
      'error'
    );

  } finally {
    // Restore button state
    submitButton.disabled = false;
    submitButton.innerHTML = originalContent;
  }
}

/**
 * Display a message below the form
 */
function showMessage(
  element: HTMLDivElement | null,
  message: string,
  type: 'success' | 'error' | 'info'
): void {
  if (!element) return;

  // Set message text
  element.textContent = message;

  // Apply styling based on type
  element.className = 'form-message mt-3 text-sm font-medium rounded-lg p-3';
  
  switch (type) {
    case 'success':
      element.classList.add('bg-emerald-50', 'text-emerald-700', 'border', 'border-emerald-200');
      break;
    case 'error':
      element.classList.add('bg-red-50', 'text-red-700', 'border', 'border-red-200');
      break;
    case 'info':
      element.classList.add('bg-brand-50', 'text-brand-700', 'border', 'border-brand-200');
      break;
  }

  // Show the message
  element.classList.remove('hidden');

  // Auto-hide after 8 seconds (longer for reading)
  setTimeout(() => {
    element.classList.add('hidden');
  }, 8000);
}

/**
 * Simple email validation
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Track events (placeholder for analytics)
 */
function trackEvent(eventName: string, data?: Record<string, unknown>): void {
  console.log(`[Analytics] ${eventName}`, data);
  
  // In production, send to your analytics service:
  // gtag('event', eventName, data);
  // plausible(eventName, { props: data });
}

// ==================== SMOOTH SCROLL ====================

function initSmoothScroll(): void {
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;

      e.preventDefault();
      
      const target = document.querySelector(href);
      if (!target) return;

      // Get nav height for offset
      const nav = document.getElementById('main-nav');
      const navHeight = nav?.offsetHeight || 80;

      // Calculate position
      const targetPosition = target.getBoundingClientRect().top + window.scrollY - navHeight;

      // Smooth scroll
      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth',
      });

      // Update URL without jumping
      history.pushState(null, '', href);
    });
  });
}

// ==================== ANIMATE ON SCROLL ====================

function initAnimateOnScroll(): void {
  const animatedElements = document.querySelectorAll<HTMLElement>('[data-animate]');

  if (!animatedElements.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target as HTMLElement;
          const animation = el.dataset.animate || 'fade-in-up';
          const delay = el.dataset.delay || '0';

          // Apply animation delay
          el.style.animationDelay = `${delay}ms`;
          el.style.animationFillMode = 'forwards';
          
          // Add animation class
          el.classList.add(`animate-${animation}`);
          el.classList.remove('opacity-0');

          // Stop observing this element
          observer.unobserve(el);
        }
      });
    },
    {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px',
    }
  );

  // Start observing elements
  animatedElements.forEach(el => {
    el.classList.add('opacity-0');
    observer.observe(el);
  });
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Detect user's operating system
 */
export function detectPlatform(): 'windows' | 'macos' | 'linux' | 'unknown' {
  const userAgent = navigator.userAgent.toLowerCase();
  const platform = navigator.platform.toLowerCase();

  if (platform.includes('win') || userAgent.includes('windows')) {
    return 'windows';
  }
  if (platform.includes('mac') || userAgent.includes('mac')) {
    return 'macos';
  }
  if (platform.includes('linux') || userAgent.includes('linux')) {
    return 'linux';
  }

  return 'unknown';
}

/**
 * Highlight the recommended download button based on OS
 */
export function highlightPlatformDownload(): void {
  const platform = detectPlatform();
  const buttons = document.querySelectorAll('[data-platform]');

  buttons.forEach(button => {
    const buttonPlatform = button.getAttribute('data-platform');
    if (buttonPlatform === platform) {
      button.classList.add('ring-2', 'ring-brand-500', 'ring-offset-2');
    }
  });
}

// Make utilities available globally if needed
(window as any).detectPlatform = detectPlatform;
(window as any).highlightPlatformDownload = highlightPlatformDownload;