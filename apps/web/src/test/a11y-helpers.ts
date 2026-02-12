import { run } from 'axe-core';
import { expect } from 'vitest';
import type { VueWrapper } from '@vue/test-utils';

/**
 * Runs axe-core accessibility checks against a mounted Vue component.
 *
 * Disables `color-contrast` and `region` rules because happy-dom
 * does not compute layout/styles accurately enough for those checks.
 */
export async function checkAccessibility(wrapper: VueWrapper): Promise<void> {
  const results = await run(wrapper.element as HTMLElement, {
    rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
    },
  });
  const violations = results.violations.map(
    (v) => `${v.id}: ${v.description} (${v.nodes.length} nodes)`
  );
  expect(violations).toEqual([]);
}
