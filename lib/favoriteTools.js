'use client';

// Shared favorites store — localStorage-backed, no account required, works
// across browser sessions. All favorite UI (star toggles, the /favorites
// page, the compact shortcut row) reads and writes through this single
// module instead of each page rolling its own logic.
import { useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'convertam_favorite_tools';
const EVENT_NAME = 'convertam:favorite-tools-changed';

function readSlugs() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

function writeSlugs(slugs) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
  } catch {
    // localStorage unavailable (private mode, quota) — favorites just won't persist
  }
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: slugs }));
}

export function getFavoriteSlugs() {
  return readSlugs();
}

export function isFavoriteTool(slug) {
  return readSlugs().includes(slug);
}

// New favorites are appended at the end — insertion order is preserved and
// never reshuffled, per product requirement.
export function addFavoriteTool(slug) {
  const current = readSlugs();
  if (current.includes(slug)) return current;
  const next = [...current, slug];
  writeSlugs(next);
  return next;
}

export function removeFavoriteTool(slug) {
  const current = readSlugs();
  const next = current.filter((s) => s !== slug);
  writeSlugs(next);
  return next;
}

export function toggleFavoriteTool(slug) {
  return isFavoriteTool(slug) ? removeFavoriteTool(slug) : addFavoriteTool(slug);
}

export function useFavoriteTools() {
  const [slugs, setSlugs] = useState([]);

  useEffect(() => {
    setSlugs(readSlugs());
    function handleChange(e) {
      setSlugs(e.detail ?? readSlugs());
    }
    function handleStorage(e) {
      if (!e.key || e.key === STORAGE_KEY) setSlugs(readSlugs());
    }
    window.addEventListener(EVENT_NAME, handleChange);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(EVENT_NAME, handleChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const toggle = useCallback((slug) => {
    setSlugs(toggleFavoriteTool(slug));
  }, []);

  const remove = useCallback((slug) => {
    setSlugs(removeFavoriteTool(slug));
  }, []);

  return { slugs, isFavorite: (slug) => slugs.includes(slug), toggle, remove };
}
