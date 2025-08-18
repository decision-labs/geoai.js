import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GeoAI.js - Interactive Examples",
  description: "Explore GeoAI.js capabilities with interactive examples. Run AI models for building detection, object detection, land cover classification, and more directly in your browser.",
  keywords: ["GeoAI", "Geospatial AI", "JavaScript", "Machine Learning", "Computer Vision", "Satellite Imagery", "Building Detection", "Object Detection"],
  authors: [{ name: "geobase.app" }],
  creator: "geobase.app",
  publisher: "geobase.app",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://docs.geobase.app/geoai-live"),
  alternates: {
    canonical: "/geoai-live",
  },
  openGraph: {
    title: "GeoAI.js - Interactive Examples",
    description: "Explore GeoAI.js capabilities with interactive examples. Run AI models for building detection, object detection, land cover classification, and more directly in your browser.",
    url: "https://docs.geobase.app/geoai-live",
    siteName: "GeoAI.js Examples",
    images: [
      {
        url: "/geoaijs-meta.png",
        width: 1200,
        height: 630,
        alt: "GeoAI.js Interactive Examples - Geospatial AI for JavaScript",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GeoAI.js - Interactive Examples",
    description: "Explore GeoAI.js capabilities with interactive examples. Run AI models for building detection, object detection, land cover classification, and more directly in your browser.",
    images: ["/geoaijs-meta.png"],
    creator: "@geobaseapp",
    site: "@geobaseapp",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code",
    yandex: "your-yandex-verification-code",
    yahoo: "your-yahoo-verification-code",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Ensure relative URLs resolve from the base path in all routes */}
        <base href={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/`} />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
        {/* Favicon and icons */}
        <link rel="apple-touch-icon" sizes="180x180" href="/geoai-live/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/geoai-live/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/geoai-live/favicon-16x16.png" />
        <link rel="manifest" href="/geoai-live/site.webmanifest" />
        <link rel="shortcut icon" href="/geoai-live/favicon.ico" />
        <meta name="msapplication-TileColor" content="#ffffff" />
        <meta name="theme-color" content="#ffffff" />
        
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "GeoAI.js Interactive Examples",
              "description": "Explore GeoAI.js capabilities with interactive examples. Run AI models for building detection, object detection, land cover classification, and more directly in your browser.",
              "url": "https://docs.geobase.app/geoai-live",
              "applicationCategory": "DeveloperApplication",
              "operatingSystem": "Web Browser",
              "author": {
                "@type": "Organization",
                "name": "geobase.app",
                "url": "https://geobase.app"
              },
              "creator": {
                "@type": "Organization",
                "name": "geobase.app",
                "url": "https://geobase.app"
              },
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "featureList": [
                "Building Detection",
                "Object Detection", 
                "Land Cover Classification",
                "Zero Shot Object Detection",
                "Zero Shot Segmentation",
                "Oil Storage Tank Detection",
                "Car Detection",
                "Ship Detection",
                "Solar Panel Detection",
                "Wetland Segmentation"
              ],
              "screenshot": "https://docs.geobase.app/geoai-live/geoaijs-meta.png",
              "softwareVersion": "1.0.0-rc.1",
              "datePublished": "2025-01-01",
              "inLanguage": "en-US"
            })
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}