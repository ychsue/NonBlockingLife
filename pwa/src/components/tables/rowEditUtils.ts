const INTERACTIVE_SELECTOR = [
  'input',
  'textarea',
  'select',
  'button',
  'a',
  'label',
  '[contenteditable="true"]',
  '[data-stop-row-edit="true"]',
  '[role="button"]',
  '[role="link"]',
].join(',')

export function shouldOpenRowEdit(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return true
  const interactiveEL = target.closest(INTERACTIVE_SELECTOR);
  if (!interactiveEL) return true;
  if (interactiveEL.tagName === 'TR') {
    return true;
  }
  return false;
}
