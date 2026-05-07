'use client';

import StaggeredMenu from '@/components/soc/StaggeredMenu';

const menuItems = [
  { label: 'Dashboard', ariaLabel: 'Go to Dashboard', link: '/soc' },
  { label: 'Scanner', ariaLabel: 'Open Scan Analyzer', link: '/soc/scanner' },
  { label: 'Threat Intel', ariaLabel: 'View Threat Intelligence', link: '/soc/intelligence' },
  { label: 'Alerts', ariaLabel: 'View Alerts', link: '/soc/alerts' },
  { label: 'History', ariaLabel: 'View Logs and History', link: '/soc/history' },
  { label: 'Extension', ariaLabel: 'Open Extension Monitor', link: '/soc/extension' },
  { label: 'Settings', ariaLabel: 'Open Settings', link: '/soc/settings' },
];

export default function SOCClientNav() {
  return (
    <StaggeredMenu
      position="right"
      items={menuItems}
      displaySocials={false}
      displayItemNumbering={false}
      menuButtonColor="#e9e9ef"
      openMenuButtonColor="#10b981"
      changeMenuColorOnOpen={true}
      closeOnClickAway={true}
      colors={['#0a1f14', '#10b981']}
      accentColor="#10b981"
    />
  );
}
