// ============================================
// apps/web/src/scripts/main.ts
// Minimal JavaScript for interactivity
// ============================================

/**
 * Initialize the application
 * 
 * We keep JavaScript minimal - only for:
 * - Mobile menu toggle
 * - Form submissions (waitlist)
 * - Smooth scroll enhancements
 */
document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initWaitlistForm();
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
    const isOpen = mobileMenu.classList.contains('hidden');
    
    mobileMenu.classList.toggle('hidden');
    menuIcon?.classList.toggle('hidden');
    closeIcon?.classList.toggle('hidden');
    
    // Prevent body scroll when menu is open
    document.body.style.overflow = isOpen ? 'hidden' : '';
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

// ==================== WAITLIST FORM ====================

interface WaitlistResponse {
  success: boolean;
  data?: {
    position: number;
  };
  error?: string;
}

function initWaitlistForm(): void {
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

      // Show loading state
      const originalText = submitButton.innerHTML;
      submitButton.disabled = true;
      submitButton.innerHTML = `
        <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Joining...</span>
      `;

      try {
        const response = await fetch('/api/waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, source: 'landing_page' }),
        });

        const data: WaitlistResponse = await response.json();

        if (data.success) {
          // Success - show message and reset form
          emailInput.value = '';
          showMessage(messageDiv, `You're #${data.data?.position} on the waitlist!`, 'success');
          
          // Optionally redirect to download page
          // window.location.href = '/download';
        } else {
          showMessage(messageDiv, data.error || 'Something went wrong', 'error');
        }
      } catch (error) {
        showMessage(messageDiv, 'Network error. Please try again.', 'error');
      } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
      }
    });
  });
}

function showMessage(
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
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      e.preventDefault();
      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;

      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
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
          entry.target.classList.add('animate-fade-in-up');
          observer.unobserve(entry.target);
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

// ==================== DOWNLOAD HANDLERS ====================

/**
 * Track download clicks (placeholder for analytics)
 */
export function trackDownload(platform: 'windows' | 'macos' | 'linux'): void {
  console.log(`Download clicked: ${platform}`);
  
  // In production, send to analytics
  // gtag('event', 'download', { platform });
}

// Make available globally for onclick handlers
(window as any).trackDownload = trackDownload;