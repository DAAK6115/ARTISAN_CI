const paths = {
  home: 'M3 10.75 12 3l9 7.75V21a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10.75Z',
  search: 'm21 21-4.35-4.35m2.35-5.15A7.5 7.5 0 1 1 4 11.5a7.5 7.5 0 0 1 15 0Z',
  calendar: 'M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z',
  heart: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6m-6 4h6m-6 4h4',
  file: 'M6 2h8l4 4v16H6V2Zm8 0v5h5M9 12h6m-6 4h6',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Zm-8 12h4',
  chat: 'M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z',
  user: 'M20 21a8 8 0 0 0-16 0m8-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'M6 6l12 12M18 6 6 18',
  star: 'm12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z',
  pin: 'M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Zm-8 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Zm-3-10 2 2 4-4',
  wallet: 'M4 6h15a2 2 0 0 1 2 2v10H4a2 2 0 0 1-2-2V6Zm0 0 12-3v3m2 6h3',
  tools: 'm14.7 6.3 3-3a5 5 0 0 1-6.6 6.6L4 17l3 3 7.1-7.1a5 5 0 0 1 6.6-6.6l-3 3-3-3Z',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87m-1-11.26a4 4 0 0 1 0 7.75',
  chart: 'M4 20V10m6 10V4m6 16v-7m4 7H2',
  image: 'M4 4h16v16H4V4Zm0 12 5-5 4 4 2-2 5 5M9 8h.01',
  award: 'M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12Zm-3 0-1 7 4-2 4 2-1-7',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-15v5l3 2',
  mic: 'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Zm-7 9a7 7 0 0 0 14 0m-7 7v4m-4 0h8',
  send: 'm22 2-7 20-4-9-9-4 20-7Zm-11 11 5-5',
  paperclip: 'm21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48',
  reply: 'm9 17-5-5 5-5m-5 5h10a6 6 0 0 1 6 6v1',
  trash: 'M3 6h18M8 6V4h8v2m-9 0 1 15h8l1-15M10 10v7m4-7v7',
  map: 'm3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15',
  volume: 'M11 5 6 9H2v6h4l5 4V5Zm4 4a4 4 0 0 1 0 6m3-9a8 8 0 0 1 0 12',
  check: 'm5 12 4 4L19 6',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
};

export default function AppIcon({ name, className = 'w-5 h-5', strokeWidth = 1.8 }) {
  const path = paths[name] || paths.home;
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d={path} />
    </svg>
  );
}
