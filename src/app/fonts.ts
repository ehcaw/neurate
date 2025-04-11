import localFont from "next/font/local";

export const zedMono = localFont({
  src: [
    {
      path: "./fonts/zed-mono-regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/zed-mono-bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "./fonts/zed-mono-italic.ttf",
      weight: "400",
      style: "italic",
    },
    {
      path: "./fonts/zed-mono-bolditalic.ttf",
      weight: "700",
      style: "italic",
    },
  ],
  variable: "--font-zed-mono",
});

export const zedSans = localFont({
  src: [
    {
      path: "//fonts/zed-sans-regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/zed-sans-bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "./fonts/zed-sans-italic.ttf",
      weight: "400",
      style: "italic",
    },
    {
      path: "./fonts/zed-sans-bolditalic.ttf",
      weight: "700",
      style: "italic",
    },
  ],
  variable: "--font-zed-sans",
});
