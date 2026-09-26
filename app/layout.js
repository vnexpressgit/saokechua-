import { Merriweather, Merriweather_Sans, Roboto_Mono } from "next/font/google";
import "./globals.css";

const merriweather = Merriweather({
  weight: ["400", "700", "900"],
  subsets: ["latin", "vietnamese"],
  variable: "--font-merriweather",
  display: "swap",
});

const merriweatherSans = Merriweather_Sans({
  weight: ["400", "500", "700"],
  subsets: ["latin", "vietnamese"],
  variable: "--font-merriweather-sans",
  display: "swap",
});

const robotoMono = Roboto_Mono({
  weight: ["400", "500", "700"],
  subsets: ["latin", "vietnamese"],
  variable: "--font-roboto-mono",
  display: "swap",
});

export const metadata = {
  title: "VnExpress - Quản Lý Thu Chi & Sao Kê Giao Dịch",
  description: "Hệ thống quản lý tài chính cá nhân và sao kê giao dịch ngân hàng theo chuẩn thiết kế VnExpress.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "VnExpress Thu Chi",
  },
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport = {
  themeColor: "#b13460",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="vi"
      className={`${merriweather.variable} ${merriweatherSans.variable} ${robotoMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="VnExpress Thu Chi" />
      </head>
      <body className="min-h-full bg-[#f3f3f3] text-[#202020] flex justify-center font-sans antialiased selection:bg-[#fce6eb] selection:text-[#b13460]">
        {/* Khung mobile-first chuẩn VnExpress: phẳng, viền 1px, không đổ bóng */}
        <div className="w-full max-w-md min-h-screen bg-[#ffffff] text-[#202020] relative flex flex-col border-x border-[#d6d6d6]">
          {children}
        </div>
      </body>
    </html>
  );
}
