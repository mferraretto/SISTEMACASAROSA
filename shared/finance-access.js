const FINANCE_KEY_PATTERN = /financ/i;
const PURCHASE_KEY_PATTERN = /compra/i;

export const ALLOWED_PROFILES = ['FINANCEIRO', 'COMPRAS'];

function normalizeToken(value) {
  if (value === undefined || value === null) return '';
  const normalized = String(value).trim();
  if (!normalized) return '';
  return normalized
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

function shouldInheritProfile(token) {
  if (!token) return false;
  return FINANCE_KEY_PATTERN.test(token) || PURCHASE_KEY_PATTERN.test(token);
}

function collectProfiles(value, result, keyHint = '', parentHint = '') {
  if (value === undefined || value === null) return;

  const normalizedKey = normalizeToken(keyHint);
  const normalizedParent = normalizeToken(parentHint);

  if (typeof value === 'string') {
    const normalizedValue = normalizeToken(value);
    if (normalizedValue) {
      result.add(normalizedValue);
      if (!shouldInheritProfile(normalizedValue)) {
        if (shouldInheritProfile(normalizedKey)) result.add(normalizedKey);
        if (shouldInheritProfile(normalizedParent)) result.add(normalizedParent);
      }
    }
    return;
  }

  if (typeof value === 'number') {
    if (value) {
      if (normalizedKey) result.add(normalizedKey);
      else if (normalizedParent) result.add(normalizedParent);
    }
    return;
  }

  if (typeof value === 'boolean') {
    if (value) {
      if (normalizedKey) result.add(normalizedKey);
      if (normalizedParent) result.add(normalizedParent);
    }
    return;
  }

  if (Array.isArray(value)) {
    const nextParent = normalizedKey || normalizedParent;
    value.forEach((item) => collectProfiles(item, result, '', nextParent));
    return;
  }

  if (typeof value === 'object') {
    const nextParent = normalizedKey || normalizedParent;
    let beforeSize = result.size;
    Object.entries(value).forEach(([childKey, childVal]) => {
      collectProfiles(childVal, result, childKey, nextParent);
    });
    const addedEntries = result.size > beforeSize;
    if (!addedEntries && shouldInheritProfile(normalizedKey)) {
      result.add(normalizedKey);
    }
    if (!addedEntries && shouldInheritProfile(normalizedParent)) {
      result.add(normalizedParent);
    }
  }
}

const PRIMARY_KEYS = [
  'financeiro',
  'perfilFinanceiro',
  'finance',
  'perfis',
  'permissoes',
  'permissoesFinanceiro',
  'permissoesCompras',
  'acessos',
  'roles',
  'departamentos',
  'areas',
  'setores',
];

export function extractFinanceProfiles(userData) {
  const result = new Set();
  if (!userData || typeof userData !== 'object') {
    return [];
  }

  const keysToInspect = new Set();
  PRIMARY_KEYS.forEach((key) => {
    if (key in userData) keysToInspect.add(key);
  });

  Object.entries(userData).forEach(([key, value]) => {
    if (typeof value === 'object' && value !== null) {
      if (FINANCE_KEY_PATTERN.test(key) || PURCHASE_KEY_PATTERN.test(key)) {
        keysToInspect.add(key);
      }
    }
  });

  if (!keysToInspect.size && 'perfil' in userData) {
    keysToInspect.add('perfil');
  }

  keysToInspect.forEach((key) => {
    collectProfiles(userData[key], result, key, '');
  });

  return Array.from(result).filter(Boolean);
}

export function hasFinanceAccess(userData) {
  const profiles = extractFinanceProfiles(userData);
  return profiles.some((profile) => ALLOWED_PROFILES.includes(profile));
}
