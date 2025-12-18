// ============================================
// apps/web/src/scripts/main.ts
// Minimal JavaScript for landing page interactivity
// ============================================

import { icons } from './icons';

/**
 * Initialize all interactive features
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
  const menuIconEl = document.getElementById('menu-icon');
  const closeIconEl = document.getElementById('close-icon');

  if (!menuButton || !mobileMenu) return;

  // Set initial icons
  if (menuIconEl) menuIconEl.innerHTML = icons.menu;
  if (closeIconEl) {
    closeIconEl.innerHTML = icons.close;
    closeIconEl.classList.add('hidden');
  }

  menuButton.addEventListener('click', () => {
    const isHidden = mobileMenu.classList.contains('hidden');

    if (isHidden) {
      // Open menu
      mobileMenu.classList.remove('hidden');
      menuIconEl?.classList.add('hidden');
      closeIconEl?.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    } else {
      // Close menu
      mobileMenu.classList.add('hidden');
      menuIconEl?.classList.remove('hidden');
      closeIconEl?.classList.add('hidden');
      document.body.style.overflow = '';
    }
  });

  // Close menu when clicking a link
  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      mobileMenu.classList.add('hidden');
      menuIconEl?.classList.remove('hidden');
      closeIconEl?.classList.add('hidden');
      document.body.style.overflow = '';
    });
  });
}

// ==================== STICKY NAV ====================

function initStickyNav(): void {
  const nav = document.getElementById('main-nav');
  if (!nav) return;

  let lastScroll = 0;
  const scrollThreshold = 100;

  window.addEventListener('scroll', () => {
    const currentScroll = window.scrollY;

    // Add/remove background blur based on scroll position
    if (currentScroll > 50) {
      nav.classList.add('bg-white/80', 'backdrop-blur-lg', 'shadow-sm');
      nav.classList.remove('bg-transparent');
    } else {
      nav.classList.remove('bg-white/80', 'backdrop-blur-lg', 'shadow-sm');
      nav.classList.add('bg-transparent');
    }

    // Optional: Hide/show nav on scroll direction
    if (currentScroll > scrollThreshold) {
      if (currentScroll > lastScroll) {
        // Scrolling down - could hide nav
        // nav.classList.add('-translate-y-full');
      } else {
        // Scrolling up
        // nav.classList.remove('-translate-y-full');
      }
    }

    lastScroll = currentScroll;
  });
}

// ==================== WAITLIST FORM ====================

interface ApiResponse {
  success: boolean;
  data?: { position: number };
  error?: string;
  message?: string;
}

function initWaitlistForms(): void {
  const forms = document.querySelectorAll<HTMLFormElement>('.waitlist-form');

  forms.forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const emailInput = form.querySelector<HTMLInputElement>('input[type="email"]');
      const submitButton = form.querySelector<HTMLButtonElement>('button[type="submit"]');
      const messageDiv = form.querySelector<HTMLDivElement>('.form-message');

      if (!emailInput || !submitButton) return;

      const email = emailInput.value.trim();
      if (!email) return;

      // Save original button content
      const originalContent = submitButton.innerHTML;

      // Show loading state
      submitButton.disabled = true;
      submitButton.innerHTML = `
        <svg class="animate-spin h-5 w-5 mx-auto" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      `;

      try {
        const response = await fetch('/api/waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, source: 'landing_page' }),
        });

        const data: ApiResponse = await response.json();

        if (data.success && data.data) {
          emailInput.value = '';
          showFormMessage(messageDiv, `🎉 You're #${data.data.position} on the waitlist!`, 'success');
        } else {
          showFormMessage(messageDiv, data.error || 'Something went wrong. Please try again.', 'error');
        }
      } catch (error) {
        showFormMessage(messageDiv, 'Network error. Please check your connection.', 'error');
      } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = originalContent;
      }
    });
  });
}

function showFormMessage(
  element: HTMLDivElement | null,
  message: string,
  type: 'success' | 'error'
): void {
  if (!element) return;

  element.textContent = message;
  element.className = `form-message mt-3 text-sm font-medium ${
    type === 'success' ? 'text-emerald-600' : 'text-red-600'
  }`;
  element.classList.remove('hidden');

  // Auto-hide after 5 seconds
  setTimeout(() => {
    element.classList.add('hidden');
  }, 5000);
}

// ==================== SMOOTH SCROLL ====================

function initSmoothScroll(): void {
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;

      e.preventDefault();
      const target = document.querySelector(href);

      if (target) {
        const navHeight = document.getElementById('main-nav')?.offsetHeight || 0;
        const targetPosition = target.getBoundingClientRect().top + window.scrollY - navHeight;

        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth',
        });
      }
    });
  });
}

// ==================== ANIMATE ON SCROLL ====================

function initAnimateOnScroll(): void {
  const animatedElements = document.querySelectorAll('[data-animate]');

  if (!animatedElements.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target as HTMLElement;
          const animation = el.dataset.animate || 'fade-in-up';
          const delay = el.dataset.delay || '0';

          el.style.animationDelay = `${delay}ms`;
          el.classList.add(`animate-${animation}`);
          el.classList.remove('opacity-0');

          observer.unobserve(el);
        }
      });
    },
    {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px',
    }
  );

  animatedElements.forEach(el => {
    el.classList.add('opacity-0');
    observer.observe(el);
  });
}

// ==================== PLATFORM DETECTION ====================

export function detectPlatform(): 'windows' | 'macos' | 'linux' | 'unknown' {
  const userAgent = navigator.userAgent.toLowerCase();

  if (userAgent.includes('win')) return 'windows';
  if (userAgent.includes('mac')) return 'macos';
  if (userAgent.includes('linux')) return 'linux';

  return 'unknown';
}

// Make available globally
(window as any).detectPlatform = detectPlatform;