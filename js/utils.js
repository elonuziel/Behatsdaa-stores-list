/**
 * Utility functions for Behatsdaa Web Application
 */

export function debounce(fn, delay = 120) {
  let timer = null;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

export function initTheme() {
  const savedTheme = localStorage.getItem('behatsdaa_theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('behatsdaa_theme', isDark ? 'dark' : 'light');
}

export function normalizeHebrew(text) {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .replace(/[\u0591-\u05C7]/g, '')
    .replace(/ך/g, 'כ')
    .replace(/ם/g, 'מ')
    .replace(/ן/g, 'נ')
    .replace(/ף/g, 'פ')
    .replace(/ץ/g, 'צ')
    .replace(/["'״׳\-–_.,()/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatILS(amount) {
  if (!amount && amount !== 0) return '';
  return `${Number(amount).toLocaleString('he-IL')} ₪`;
}
