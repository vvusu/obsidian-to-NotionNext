import { addIcon } from 'obsidian';

const icons: Record<string, string> = {
  'notion-logo': `
  <svg class="icon icon-tabler icon-tabler-brand-notion" fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M0 0h24v24H0z" fill="none" stroke="none"/><rect height="16" rx="2" width="16" x="4" y="4"/><path d="M7 7h3l6 6"/><path d="M8 7v10"/><path d="M7 17h2"/><path d="M15 7h2"/><path d="M16 7v10h-1l-7 -7"/></svg>
  `
};

export const addIcons = (): void => {
  Object.keys(icons).forEach((key) => {
    addIcon(key, icons[key]);
  });
};
