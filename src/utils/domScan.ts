import { Page, Frame } from 'playwright';

export interface ElementDescriptor {
  tag: string;
  type: string | null;
  name: string | null;
  id: string | null;
  role: string | null;
  ariaLabel: string | null;
  labelText: string | null;
  placeholder: string | null;
  required: boolean;
  disabled: boolean;
  readonly: boolean;
  checked: boolean | null;
  value: string | null;
  options: { text: string; value: string; selected: boolean; disabled: boolean }[] | null;
  visible: boolean;
  className: string | null;
  selectorCandidates: string[];
  outerHtmlSnippet: string;
  section: string | null;
}

// Executed inside the page/frame context.
const SCAN_SCRIPT = () => {
  function nearestSectionLabel(el: Element): string | null {
    let node: Element | null = el;
    while (node) {
      const heading = node.previousElementSibling;
      if (heading && /^H[1-6]$/.test(heading.tagName)) return heading.textContent?.trim() ?? null;
      node = node.parentElement;
      if (node) {
        const legend = node.querySelector(':scope > legend');
        if (legend) return legend.textContent?.trim() ?? null;
        const heading2 = node.querySelector(':scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > .card-header, :scope > .panel-heading');
        if (heading2 && node.contains(el)) return heading2.textContent?.trim() ?? null;
      }
    }
    return null;
  }

  function labelFor(el: Element): string | null {
    const id = el.getAttribute('id');
    if (id) {
      const lbl = document.querySelector(`label[for="${CSS.escape(id)}"]`);
      if (lbl) return lbl.textContent?.trim().replace(/\s+/g, ' ') ?? null;
    }
    const closestLabel = el.closest('label');
    if (closestLabel) return closestLabel.textContent?.trim().replace(/\s+/g, ' ') ?? null;
    // Bootstrap-style: label as previous sibling of a wrapping .form-group
    const group = el.closest('.form-group, .mb-3, .field, .form-item, .col, [class*="form-"]');
    if (group) {
      const lbl = group.querySelector('label');
      if (lbl) return lbl.textContent?.trim().replace(/\s+/g, ' ') ?? null;
    }
    return null;
  }

  function isVisible(el: Element): boolean {
    const rect = (el as HTMLElement).getBoundingClientRect();
    const style = window.getComputedStyle(el as HTMLElement);
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  }

  function buildSelectors(el: Element): string[] {
    const candidates: string[] = [];
    const id = el.getAttribute('id');
    const name = el.getAttribute('name');
    const tag = el.tagName.toLowerCase();
    if (id) candidates.push(`#${CSS.escape(id)}`);
    if (name) candidates.push(`${tag}[name="${CSS.escape(name)}"]`);
    const testId = el.getAttribute('data-testid') || el.getAttribute('data-test') || el.getAttribute('formcontrolname');
    if (testId) candidates.push(`[data-testid="${CSS.escape(testId)}"], [formcontrolname="${CSS.escape(testId)}"]`);
    return candidates;
  }

  const elements = Array.from(
    document.querySelectorAll(
      'input, select, textarea, button, [role="button"], [role="combobox"], [role="listbox"], [contenteditable="true"], .select2, [class*="dropdown"], [class*="autocomplete"]'
    )
  );

  return elements.map((el) => {
    const tag = el.tagName.toLowerCase();
    const type = el.getAttribute('type');
    let options: { text: string; value: string; selected: boolean; disabled: boolean }[] | null = null;
    if (tag === 'select') {
      options = Array.from((el as HTMLSelectElement).options).map((o) => ({
        text: o.text.trim(),
        value: o.value,
        selected: o.selected,
        disabled: o.disabled,
      }));
    }
    const descriptor = {
      tag,
      type: type ?? null,
      name: el.getAttribute('name'),
      id: el.getAttribute('id'),
      role: el.getAttribute('role'),
      ariaLabel: el.getAttribute('aria-label'),
      labelText: labelFor(el),
      placeholder: el.getAttribute('placeholder'),
      required: el.hasAttribute('required') || el.getAttribute('aria-required') === 'true',
      disabled: (el as HTMLInputElement).disabled === true || el.getAttribute('aria-disabled') === 'true',
      readonly: (el as HTMLInputElement).readOnly === true,
      checked: (el as HTMLInputElement).checked ?? null,
      value: (el as HTMLInputElement).value ?? null,
      options,
      visible: isVisible(el),
      className: el.getAttribute('class'),
      selectorCandidates: buildSelectors(el),
      outerHtmlSnippet: el.outerHTML.slice(0, 300),
      section: nearestSectionLabel(el),
    };
    return descriptor;
  });
};

export async function scanInteractiveElements(target: Page | Frame): Promise<ElementDescriptor[]> {
  return target.evaluate(SCAN_SCRIPT as any);
}

export async function scanAllFrames(page: Page): Promise<{ frameUrl: string; elements: ElementDescriptor[] }[]> {
  const results: { frameUrl: string; elements: ElementDescriptor[] }[] = [];
  for (const frame of page.frames()) {
    try {
      const elements = await scanInteractiveElements(frame);
      if (elements.length > 0) results.push({ frameUrl: frame.url(), elements });
    } catch {
      // Cross-origin or detached frame; skip.
    }
  }
  return results;
}
