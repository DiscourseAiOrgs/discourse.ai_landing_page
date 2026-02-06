// ============================================
// Cortify Landing Page - Main Script
// ============================================

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  initMobileMenu();
  initWaitlistForms();
  initSmoothScroll();
  initScrollAnimations();
  initCounters();
  initFAQAccordion();
  initParallaxEffect();
});

// ==================== THEME TOGGLE ====================

function initThemeToggle(): void {
  const themeToggle = document.getElementById('theme-toggle');
  const darkIcon = document.getElementById('theme-icon-dark');
  const lightIcon = document.getElementById('theme-icon-light');
  const html = document.documentElement;

  if (!themeToggle || !darkIcon || !lightIcon) return;

  // Check for saved theme preference or default to dark
  const savedTheme = localStorage.getItem('theme') || 'dark';
  setTheme(savedTheme);

  // Toggle theme on button click
  themeToggle.addEventListener('click', () => {
    const currentTheme = html.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  });

  function setTheme(theme: string): void {
    if (theme === 'light') {
      html.setAttribute('data-theme', 'light');
      darkIcon?.classList.add('hidden');
      lightIcon?.classList.remove('hidden');
    } else {
      html.removeAttribute('data-theme');
      darkIcon?.classList.remove('hidden');
      lightIcon?.classList.add('hidden');
    }
  }
}

// ==================== MOBILE MENU ====================

function initMobileMenu(): void {
  const menuButton = document.getElementById('mobile-menu-button');
  const nav = document.querySelector('nav');

  if (!menuButton || !nav) return;

  let mobileMenu: HTMLDivElement | null = null;

  menuButton.addEventListener('click', () => {
    if (!mobileMenu) {
      // Create mobile menu
      mobileMenu = document.createElement('div');
      mobileMenu.className = 'fixed inset-0 top-16 z-40 bg-dark/95 backdrop-blur-xl md:hidden';
      mobileMenu.innerHTML = `
        <div class="p-6 space-y-4">
          <a href="#features" class="block py-3 text-lg text-theme-secondary hover:text-theme-primary transition-colors">Features</a>
          <a href="#pricing" class="block py-3 text-lg text-theme-secondary hover:text-theme-primary transition-colors">Pricing</a>
          <a href="#about" class="block py-3 text-lg text-theme-secondary hover:text-theme-primary transition-colors">About Us</a>
          <div class="pt-4 space-y-3" style="border-top: 1px solid var(--border-primary);">
            <a href="#download" class="btn-primary-blue w-full justify-center">Download for Windows</a>
            <a href="#waitlist" class="btn-outline w-full justify-center">Join the Waitlist</a>
          </div>
        </div>
      `;
      document.body.appendChild(mobileMenu);
      document.body.style.overflow = 'hidden';

      // Close menu when clicking links
      mobileMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          mobileMenu?.remove();
          mobileMenu = null;
          document.body.style.overflow = '';
        });
      });
    } else {
      // Close menu
      mobileMenu.remove();
      mobileMenu = null;
      document.body.style.overflow = '';
    }
  });
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
  const nameInput = form.querySelector<HTMLInputElement>('input[name="name"]');
  const emailInput = form.querySelector<HTMLInputElement>('input[name="email"]');
  const submitButton = form.querySelector<HTMLButtonElement>('button[type="submit"]');

  if (!nameInput || !emailInput || !submitButton) return;

  const name = nameInput.value.trim();
  const email = emailInput.value.trim();

  if (!name || name.length < 2) {
    showToast('Please enter your name (at least 2 characters).', 'error');
    return;
  }

  if (!email || !isValidEmail(email)) {
    showToast('Please enter a valid email address.', 'error');
    return;
  }

  const originalContent = submitButton.innerHTML;
  submitButton.disabled = true;
  submitButton.innerHTML = `
    <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  `;

  try {
    const response = await fetch(`${API_BASE}/waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, source: 'landing_page' }),
    });

    const data: WaitlistResponse = await response.json();

    if (response.ok && data.success && data.data) {
      nameInput.value = '';
      emailInput.value = '';
      showToast(`Welcome ${name}! You're #${data.data.position} on the waitlist! 🎉`, 'success');
    } else {
      const errorMessage = data.error || data.message || 'Something went wrong.';
      if (errorMessage.toLowerCase().includes('already')) {
        showToast('This email is already on the waitlist!', 'info');
      } else {
        showToast(errorMessage, 'error');
      }
    }
  } catch (error) {
    console.error('Waitlist submission error:', error);
    showToast('Unable to connect. Please try again.', 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = originalContent;
  }
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ==================== TOAST NOTIFICATIONS ====================

function showToast(message: string, type: 'success' | 'error' | 'info'): void {
  // Remove existing toasts
  document.querySelectorAll('.toast-notification').forEach(t => t.remove());

  const toast = document.createElement('div');
  toast.className = 'toast-notification fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg text-sm font-medium shadow-lg';

  switch (type) {
    case 'success':
      toast.classList.add('bg-green-500', 'text-white');
      break;
    case 'error':
      toast.classList.add('bg-red-500', 'text-white');
      break;
    case 'info':
      toast.classList.add('bg-blue-500', 'text-white');
      break;
  }

  toast.textContent = message;
  document.body.appendChild(toast);

  // Auto-remove after 4 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
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

      const navHeight = 64;
      const targetPosition = target.getBoundingClientRect().top + window.scrollY - navHeight;

      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth',
      });

      history.pushState(null, '', href);
    });
  });
}

// ==================== SCROLL ANIMATIONS ====================

function initScrollAnimations(): void {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-fade-in-up');
        entry.target.classList.remove('opacity-0');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Observe feature cards
  document.querySelectorAll('.feature-card').forEach(card => {
    observer.observe(card);
  });

  // Observe stats items
  document.querySelectorAll('.stats-item').forEach(stat => {
    observer.observe(stat);
  });

  // Observe feature card animates
  document.querySelectorAll('.feature-card-animate').forEach(card => {
    observer.observe(card);
  });

  // Observe use case cards
  document.querySelectorAll('.use-case-card').forEach(card => {
    observer.observe(card);
  });

  // Observe FAQ items
  document.querySelectorAll('.faq-item').forEach(item => {
    observer.observe(item);
  });
}

// ==================== COUNTER ANIMATION ====================

function initCounters(): void {
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const counter = entry.target as HTMLElement;
        animateCounter(counter);
        counterObserver.unobserve(counter);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('.counter').forEach(counter => {
    counterObserver.observe(counter);
  });
}

function animateCounter(element: HTMLElement): void {
  const target = parseInt(element.getAttribute('data-target') || '0');
  const duration = 2000; // 2 seconds
  const increment = target / (duration / 16); // 60fps
  let current = 0;

  const updateCounter = () => {
    current += increment;
    if (current < target) {
      element.textContent = Math.floor(current).toLocaleString();
      requestAnimationFrame(updateCounter);
    } else {
      element.textContent = target.toLocaleString();
    }
  };

  updateCounter();
}

// ==================== FAQ ACCORDION ====================

function initFAQAccordion(): void {
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');

    if (!question || !answer) return;

    question.addEventListener('click', () => {
      const isOpen = question.classList.contains('active');

      // Close all other FAQs
      faqItems.forEach(otherItem => {
        const otherQuestion = otherItem.querySelector('.faq-question');
        const otherAnswer = otherItem.querySelector('.faq-answer');
        if (otherQuestion && otherAnswer && otherItem !== item) {
          otherQuestion.classList.remove('active');
          otherAnswer.classList.remove('open');
        }
      });

      // Toggle current FAQ
      if (isOpen) {
        question.classList.remove('active');
        answer.classList.remove('open');
      } else {
        question.classList.add('active');
        answer.classList.add('open');
      }
    });
  });
}

// ==================== PARALLAX EFFECT ====================

function initParallaxEffect(): void {
  const heroImage = document.querySelector('.animate-float') as HTMLElement;

  if (!heroImage) return;

  let ticking = false;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const scrolled = window.pageYOffset;
        const parallaxSpeed = 0.3;

        // Only apply parallax in the hero section (first 100vh)
        if (scrolled < window.innerHeight) {
          heroImage.style.transform = `translateY(${scrolled * parallaxSpeed}px)`;
        }

        ticking = false;
      });

      ticking = true;
    }
  });
}
