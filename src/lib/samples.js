export const SAMPLES = [
  {
    id: "orbit",
    name: "Orbit",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <circle cx="200" cy="200" r="70" fill="#5eead4"/>
  <ellipse cx="200" cy="200" rx="150" ry="52" fill="none" stroke="#a78bfa" stroke-width="22" transform="rotate(-24 200 200)"/>
  <circle cx="330" cy="140" r="26" fill="#f472b6"/>
  <circle cx="200" cy="200" r="26" fill="#0b0f18"/>
</svg>`,
  },
  {
    id: "puncak",
    name: "Puncak",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <polygon points="200,60 330,320 70,320" fill="#38bdf8"/>
  <polygon points="200,140 285,320 115,320" fill="#a78bfa"/>
  <circle cx="200" cy="110" r="34" fill="#fbbf24"/>
  <rect x="60" y="336" width="280" height="18" rx="9" fill="#5eead4"/>
</svg>`,
  },
];

export function sampleFile(sample) {
  return new File([sample.svg], `${sample.id}-logo.svg`, { type: "image/svg+xml" });
}
