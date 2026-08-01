/**
 * iOS `apple-touch-startup-image` link descriptors.
 *
 * iOS picks the launch image by matching device-width / device-height in CSS px,
 * the device pixel ratio and the orientation. Device width/height are always the
 * *portrait* values, even for the landscape entry.
 */
type Device = { w: number; h: number; dpr: number; landscape?: boolean };

const DEVICES: Device[] = [
  // iPhone (portrait)
  { w: 320, h: 568, dpr: 2 },
  { w: 375, h: 667, dpr: 2 },
  { w: 414, h: 736, dpr: 3 },
  { w: 375, h: 812, dpr: 3 },
  { w: 414, h: 896, dpr: 2 },
  { w: 414, h: 896, dpr: 3 },
  { w: 390, h: 844, dpr: 3 },
  { w: 393, h: 852, dpr: 3 },
  { w: 428, h: 926, dpr: 3 },
  { w: 430, h: 932, dpr: 3 },
  // iPad (portrait)
  { w: 768, h: 1024, dpr: 2 },
  { w: 810, h: 1080, dpr: 2 },
  { w: 834, h: 1112, dpr: 2 },
  { w: 834, h: 1194, dpr: 2 },
  { w: 1024, h: 1366, dpr: 2 },
  // iPad (landscape)
  { w: 768, h: 1024, dpr: 2, landscape: true },
  { w: 810, h: 1080, dpr: 2, landscape: true },
  { w: 834, h: 1112, dpr: 2, landscape: true },
  { w: 834, h: 1194, dpr: 2, landscape: true },
  { w: 1024, h: 1366, dpr: 2, landscape: true },
];

export const iosSplashLinks = DEVICES.map(({ w, h, dpr, landscape }) => {
  const pw = w * dpr;
  const ph = h * dpr;
  const file = landscape ? `splash-${ph}x${pw}.png` : `splash-${pw}x${ph}.png`;
  return {
    rel: "apple-touch-startup-image",
    href: `/splash/${file}`,
    media: `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: ${landscape ? "landscape" : "portrait"})`,
  };
});
