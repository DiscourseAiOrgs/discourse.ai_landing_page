// ============================================
// Component Loader - Load HTML Components
// ============================================

/**
 * Loads an HTML component from /src/components/ and injects it into a target element
 * @param componentName - Name of the HTML file (without .html extension)
 * @param targetSelector - CSS selector for the target element
 */
export async function loadComponent(componentName: string, targetSelector: string): Promise<void> {
  try {
    const response = await fetch(`/src/components/${componentName}.html`);

    if (!response.ok) {
      throw new Error(`Failed to load component: ${componentName}`);
    }

    const html = await response.text();
    const target = document.querySelector(targetSelector);

    if (!target) {
      console.error(`Target element not found: ${targetSelector}`);
      return;
    }

    target.innerHTML = html;
  } catch (error) {
    console.error(`Error loading component ${componentName}:`, error);
  }
}

/**
 * Loads multiple components in parallel
 * @param components - Array of {name, target} objects
 */
export async function loadComponents(components: Array<{name: string, target: string}>): Promise<void> {
  await Promise.all(
    components.map(({name, target}) => loadComponent(name, target))
  );
}
