import { describe, it, expect } from 'vitest';
import { STAMINA_RESOURCE, getPathResource } from '../pathResources';

describe('Stamina Resource', () => {
  it('should have stamina as default pre-path resource', () => {
    expect(STAMINA_RESOURCE.type).toBe('stamina');
    expect(STAMINA_RESOURCE.max).toBe(50);
    expect(STAMINA_RESOURCE.current).toBe(50);
    expect(STAMINA_RESOURCE.color).toBeDefined();
  });

  it('should return stamina for players without a path', () => {
    const resource = getPathResource(undefined);
    expect(resource.type).toBe('stamina');
  });
});
