import { describe, it, expect } from 'vitest';
import { STAMINA_RESOURCE, getPathResource, getResourceDisplayName } from '../pathResources';

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

describe('getResourceDisplayName', () => {
  it('should return "Stamina" for stamina resource type', () => {
    expect(getResourceDisplayName('stamina')).toBe('Stamina');
  });
});

describe('getPathResource', () => {
  it('should return null for unknown path', () => {
    const resource = getPathResource('unknown_path' as any);
    expect(resource).toBeNull();
  });

  it('should return fury for berserker path', () => {
    const resource = getPathResource('berserker');
    expect(resource.type).toBe('fury');
  });
});
