const paths: Record<string, string> = {
  all: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  Seafood: "M3 12c4-7 11-7 15 0-4 7-11 7-15 0z M18 12l3-4v8z M7 11h.1",
  Meat: "M4 15c0-7 9-12 14-10s3 8-2 12c-4 3-12 3-12-2z M11 14c3-1 5-3 5-5",
  Vegetables: "M4 20C3 10 7 5 20 4c0 10-5 16-16 16z M4 20l10-10",
  Grains: "M12 21V4 M12 9c-4 0-6-2-6-5 4 0 6 2 6 5z M12 14c4 0 6-2 6-5-4 0-6 2-6 5z M12 19c-4 0-6-2-6-5 4 0 6 2 6 5z",
  "Seasoning/Sauces": "M9 3h6v4l3 4v10H6V11l3-4z M6 13h12",
  "Dry Foods": "M6 4h12l-1 4 3 12H4L7 8z M8 8h8 M9 14h6",
  Supplies: "M3 8l9-5 9 5v9l-9 4-9-4z M3 8l9 5 9-5 M12 13v8",
  search: "M16 16l4 4 M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0z",
  bag: "M4 8h16l-1 13H5z M8 9V6a4 4 0 0 1 8 0v3",
  order: "M6 4h12v17l-3-2-3 2-3-2-3 2z M9 9h6 M9 13h6",
  user: "M5 20v-2a7 5 0 0 1 14 0v2 M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0z",
  plus: "M12 5v14 M5 12h14", minus: "M5 12h14", check: "M5 12l4 4L19 6",
  mail: "M3 5h18v14H3z M3 6l9 7 9-7", back: "M15 6l-6 6 6 6", arrow: "M4 12h15 M13 6l6 6-6 6",
  truck: "M2 5h13v12H2z M15 9h4l3 4v4h-7 M8 18a2 2 0 1 1-4 0 2 2 0 1 1 4 0 M20 18a2 2 0 1 1-4 0 2 2 0 1 1 4 0",
  close: "M6 6l12 12 M18 6L6 18",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z",
  info: "M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z M12 11v5 M12 8h.01",
  store: "M4 10v10h16V10 M3 10l2-6h14l2 6z M10 20v-5h4v5",
  heart: "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z",
}
export function Icon({ n, size = 20, fill = false }: { n: string; size?: number; fill?: boolean }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill={fill ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[n] || paths.all} />
    </svg>
  )
}
