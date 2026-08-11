"use client";

import { useEffect, useRef } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Grid3X3, Layers } from "lucide-react";
import { GITHUB_REPO_URI, NPM_PACKAGE_NAME } from "../config";
import { MobileNavigation } from "../components";
import { GitHubStarsButton } from "@/components/ui/shadcn-io/github-stars-button";

function LazyVideo({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (el.dataset.src && !el.src) {
            el.src = el.dataset.src;
          }
          void el.play().catch(() => {});
        } else {
          el.pause();
        }
      },
      { rootMargin: "240px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      data-src={src}
      className={className}
      muted
      loop
      playsInline
      preload="none"
    />
  );
}

const PROVIDERS = [
  {
    name: "Geobase",
    src: "/geoai-live/provider-logos/geobase.svg",
    href: "https://geobase.app",
    available: true,
  },
  {
    name: "Mapbox",
    src: "/geoai-live/provider-logos/mapbox.svg",
    available: true,
  },
  {
    name: "ESRI",
    src: "/geoai-live/provider-logos/esri.svg",
    available: true,
    scale: 0.85,
  },
  {
    name: "Google Maps",
    src: "/geoai-live/provider-logos/google-maps.svg",
    available: true,
  },
  {
    name: "OpenAerialMap",
    href: "https://docs.geobase.app/geoai/map-providers/oam",
    icon: "oam" as const,
    available: true,
  },
  {
    name: "TMS",
    href: "https://docs.geobase.app/geoai/map-providers/tms",
    icon: "tms" as const,
    available: true,
  },
  {
    name: "WMS",
    href: "https://docs.geobase.app/geoai/map-providers/wms",
    icon: "wms" as const,
    available: true,
  },
] as const;

type TaskCard = {
  href: string;
  title: string;
  description: string;
  video: string;
  badge?: string;
};

const TASKS: TaskCard[] = [
  {
    href: "/geoai-live/tasks/image-feature-extraction",
    title: "Image Feature Extraction",
    description:
      "Extract DINOv3 patch embeddings from satellite imagery for similarity and analysis.",
    video:
      "https://geobase-docs.s3.amazonaws.com/geobase-ai-assets/image-feature-extraction.mp4",
    badge: "DINOv3",
  },
  {
    href: "/geoai-live/tasks/oil-storage-tank-detection",
    title: "Oil Storage Tank Detection",
    description: "Detect oil storage tanks in aerial imagery.",
    video:
      "https://geobase-docs.s3.amazonaws.com/geobase-ai-assets/oil-storage-tank-detection.mp4",
  },
  {
    href: "/geoai-live/tasks/object-detection",
    title: "Object Detection",
    description: "Detect and highlight objects in the imagery.",
    video:
      "https://geobase-docs.s3.amazonaws.com/geobase-ai-assets/object-detection.mp4",
  },
  {
    href: "/geoai-live/tasks/building-detection",
    title: "Building Detection",
    description: "Identify and outline buildings in the imagery.",
    video:
      "https://geobase-docs.s3.amazonaws.com/geobase-ai-assets/building-detection.mp4",
  },
  {
    href: "/geoai-live/tasks/car-detection",
    title: "Car Detection",
    description: "Detect cars and vehicles in the image.",
    video:
      "https://geobase-docs.s3.amazonaws.com/geobase-ai-assets/car-detection-model.mp4",
  },
  {
    href: "/geoai-live/tasks/wetland-segmentation",
    title: "Wetland Detection",
    description:
      "Identify wetland areas from 4-band multispectral COG imagery (Geobase).",
    video:
      "https://geobase-docs.s3.amazonaws.com/geobase-ai-assets/wetland-segmentation.mp4",
  },
  {
    href: "/geoai-live/tasks/solar-panel-detection",
    title: "Solar Panel Detection",
    description: "Detect solar panels and solar farms in the image.",
    video:
      "https://geobase-docs.s3.amazonaws.com/geobase-ai-assets/solar-panel-detection.mp4",
  },
  {
    href: "/geoai-live/tasks/ship-detection",
    title: "Ship Detection",
    description: "Detect ships and large vessels in water bodies.",
    video:
      "https://geobase-docs.s3.amazonaws.com/geobase-ai-assets/ship-detection.mp4",
  },
  {
    href: "/geoai-live/tasks/oriented-object-detection",
    title: "Oriented Object Detection",
    description: "Detect objects and report their orientation.",
    video:
      "https://geobase-docs.s3.amazonaws.com/geobase-ai-assets/oriented-object-detection.mp4",
  },
  {
    href: "/geoai-live/tasks/building-footprint-segmentation",
    title: "Building Footprint Segmentation",
    description:
      "Generate building footprint polygons — ChangeStar ViT-B by default.",
    video:
      "https://geobase-docs.s3.amazonaws.com/geobase-ai-assets/building-footprint-segmentation.mp4",
  },
  {
    href: "/geoai-live/tasks/land-cover-classification",
    title: "Land Cover Classification",
    description:
      "Classify terrain and land cover such as water, forest, or urban areas.",
    video:
      "https://geobase-docs.s3.amazonaws.com/geobase-ai-assets/land-cover-classification.mp4",
  },
  {
    href: "/geoai-live/tasks/zero-shot-object-detection",
    title: "Zero-Shot Object Detection",
    description:
      "Detect objects from text prompts without class-specific training.",
    video:
      "https://geobase-docs.s3.amazonaws.com/geobase-ai-assets/zero-shot-object-detection.mp4",
  },
  {
    href: "/geoai-live/tasks/zero-shot-segmentation",
    title: "Zero-Shot Segmentation",
    description:
      "Segment objects from prompts without class-specific training.",
    video:
      "https://geobase-docs.s3.amazonaws.com/geobase-ai-assets/zero-shot-segmentation.mp4",
  },
  {
    href: "/geoai-live/tasks/mask-generation",
    title: "Interactive Mask Generation",
    description:
      "Generate segmentation masks for features of interest in the image.",
    video:
      "https://geobase-docs.s3.amazonaws.com/geobase-ai-assets/mask-generation.mp4",
  },
  {
    href: "/geoai-live/tasks/embedding-similarity-search",
    title: "Embedding Similarity Search",
    description: "Find similar patches in the imagery based on embeddings.",
    video:
      "https://geobase-docs.s3.amazonaws.com/geobase-ai-assets/embedding-similarity-search.mp4",
  },
];

function ProviderIcon({
  icon,
}: {
  icon: "oam" | "tms" | "wms";
}) {
  if (icon === "oam") {
    return (
      <span className="text-[11px] font-semibold tracking-wide text-stone-300">
        OAM
      </span>
    );
  }
  if (icon === "tms") {
    return <Grid3X3 className="h-5 w-5 text-stone-300" aria-hidden />;
  }
  return <Layers className="h-5 w-5 text-stone-300" aria-hidden />;
}

const navLinkClass =
  "rounded-md px-3 py-2 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0c0f0d] text-stone-100 font-sans antialiased">
      <a
        href="#models"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-emerald-700 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to models
      </a>

      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#0c0f0d]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <a
            href="/geoai-live"
            className="flex items-center gap-2 rounded-md text-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
          >
            <img
              src="/geoai-live/javascript-logo.svg"
              alt=""
              className="h-5 w-auto sm:h-6"
            />
            <span className="text-lg font-semibold tracking-tight sm:text-xl">
              {NPM_PACKAGE_NAME}
            </span>
          </a>

          <nav className="hidden items-center gap-1 text-sm font-medium text-stone-200 lg:flex">
            <a className={navLinkClass} href="#models">
              Models
            </a>
            <a className={navLinkClass} href="https://docs.geobase.app/geoai">
              Docs
            </a>
            <a className={navLinkClass} href="#footer">
              About
            </a>
            <a
              className={navLinkClass}
              href="https://decision-labs.com/newsletter/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Newsletter
            </a>
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <a
              className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
              href="https://docs.geobase.app/geoai/"
            >
              Get Started
            </a>
            <GitHubStarsButton
              username="decision-labs"
              repo="geoai.js"
              formatted
            />
          </div>

          <MobileNavigation />
        </div>
      </header>

      <main>
        {/* Hero — one composition: brand, headline, support, CTAs, product visual */}
        <section className="relative min-h-[100svh] overflow-hidden">
          <div className="absolute inset-0">
            <video
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              className="h-full w-full bg-[#0c0f0d] object-cover"
            >
              <source
                src="https://geobase-docs.s3.amazonaws.com/geobase-ai-assets/ship-detection.mp4"
                type="video/mp4"
              />
            </video>
            {/* Keep the demo visible; darken only where copy sits */}
            <div className="absolute inset-0 bg-[#0c0f0d]/40" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0c0f0d] from-[15%] via-[#0c0f0d]/70 via-50% to-[#0c0f0d]/25" />
          </div>

          <div className="relative mx-auto flex min-h-[100svh] max-w-5xl flex-col justify-end px-4 pb-16 pt-28 sm:px-6 sm:pb-20 lg:pb-24">
            <div className="landing-hero-copy max-w-3xl">
              <div className="mb-5 flex items-center gap-3 sm:mb-6 lg:mb-7">
                <img
                  src="/geoai-live/javascript-logo.svg"
                  alt=""
                  className="h-10 w-auto drop-shadow-sm sm:h-12"
                />
                <span className="text-4xl font-semibold tracking-tight text-stone-50 sm:text-5xl md:text-6xl">
                  {NPM_PACKAGE_NAME}
                </span>
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-stone-50 text-shadow-sm sm:text-4xl md:text-5xl lg:text-[3.5rem] lg:leading-[1.1]">
                Geospatial AI for the modern JavaScript developer
              </h1>
              <p className="mt-5 max-w-2xl text-base text-stone-200/95 sm:text-lg md:text-xl">
                Open-source models in the browser. No backend required — run
                inference in your apps or on the edge.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <a
                  className="inline-flex min-h-11 items-center justify-center rounded-md bg-emerald-700 px-6 py-3 text-base font-medium text-white shadow-[0_10px_30px_-12px_rgba(4,120,87,0.8)] transition hover:bg-emerald-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
                  href="https://docs.geobase.app/geoai/"
                >
                  Get Started
                </a>
                <a
                  className="inline-flex min-h-11 items-center justify-center rounded-md border border-stone-500/80 bg-stone-950/50 px-6 py-3 text-base font-medium text-stone-50 backdrop-blur-sm transition hover:border-stone-300 hover:bg-stone-900/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                  href="#models"
                >
                  Explore models
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Providers — logo strip, not a card grid */}
        <section className="border-y border-stone-800/80 bg-[#0c0f0d] px-4 py-12 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <p className="text-center text-sm text-stone-400">
              Works with your mapping stack
            </p>
            <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-6 sm:gap-x-10">
              {PROVIDERS.map((provider) => {
                const content = (
                  <>
                    {"src" in provider && provider.src ? (
                      <img
                        src={provider.src}
                        alt={provider.name}
                        className="h-7 w-auto max-w-[5.5rem] object-contain opacity-70 brightness-0 invert transition group-hover:opacity-100"
                        style={
                          "scale" in provider && provider.scale
                            ? { transform: `scale(${provider.scale})` }
                            : undefined
                        }
                      />
                    ) : (
                      <ProviderIcon
                        icon={"icon" in provider ? provider.icon : "tms"}
                      />
                    )}
                    <span className="sr-only">{provider.name}</span>
                  </>
                );

                if ("href" in provider && provider.href) {
                  return (
                    <li key={provider.name}>
                      <a
                        href={provider.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center justify-center"
                        title={provider.name}
                      >
                        {content}
                      </a>
                    </li>
                  );
                }

                return (
                  <li
                    key={provider.name}
                    className="group flex items-center justify-center"
                    title={provider.name}
                  >
                    {content}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* Install */}
        <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <h2 className="mb-4 text-center text-sm font-medium text-stone-400">
            Install
          </h2>
          <div className="code-sample overflow-hidden rounded-xl border border-stone-800 bg-[#121614]">
            <SyntaxHighlighter
              language="shell"
              style={oneDark}
              PreTag="div"
              customStyle={{
                margin: 0,
                borderRadius: 0,
                fontSize: 15,
                background: "transparent",
                padding: "1rem 1.25rem",
                textShadow: "none",
                boxShadow: "none",
                outline: "none",
              }}
              codeTagProps={{
                style: {
                  background: "transparent",
                  textShadow: "none",
                  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
                },
              }}
            >
              {`pnpm add ${NPM_PACKAGE_NAME}`}
            </SyntaxHighlighter>
            <div className="border-t border-stone-800">
              <SyntaxHighlighter
                language="javascript"
                style={oneDark}
                PreTag="div"
                customStyle={{
                  margin: 0,
                  borderRadius: 0,
                  fontSize: 14,
                  background: "transparent",
                  padding: "1.25rem",
                  textShadow: "none",
                  boxShadow: "none",
                  outline: "none",
                }}
                codeTagProps={{
                  style: {
                    background: "transparent",
                    textShadow: "none",
                    fontFamily:
                      "var(--font-geist-mono), ui-monospace, monospace",
                  },
                }}
              >
                {`import { geoai } from "${NPM_PACKAGE_NAME}";

const pipeline = await geoai.pipeline(
  [{ task: "building-detection" }],
  { provider: "esri" }
);

const result = await pipeline.inference({ inputs: { polygon } });`}
              </SyntaxHighlighter>
            </div>
          </div>
          <p className="mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-sm text-stone-400">
            <span>Built with</span>
            <a
              href="https://github.com/huggingface/transformers.js/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-stone-200 underline-offset-4 transition hover:text-white hover:underline"
            >
              <img
                src="/geoai-live/huggingface-logo.svg"
                alt=""
                className="h-4 w-4"
              />
              Transformers.js
            </a>
            <span>and</span>
            <a
              href="https://geobase.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center transition opacity-90 hover:opacity-100"
              title="Geobase"
            >
              <img
                src="/geoai-live/geobase-logo-darkmode.svg"
                alt="Geobase"
                className="h-5 w-auto"
              />
            </a>
          </p>
        </section>

        {/* Models */}
        <section
          id="models"
          className="scroll-mt-24 px-4 pb-20 sm:px-6 sm:pb-28"
        >
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-stone-50 sm:text-4xl">
                Interactive model demos
              </h2>
              <p className="mt-3 text-base text-stone-400 sm:text-lg">
                Draw an area on the map and run detection, segmentation, or
                feature extraction in the browser.
              </p>
            </div>

            <ul className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {TASKS.map((task) => (
                <li key={task.href}>
                  <a
                    href={task.href}
                    className="group flex h-full flex-col overflow-hidden rounded-xl border border-stone-800 bg-[#121614] transition hover:border-stone-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-stone-900">
                      <LazyVideo
                        src={task.video}
                        className="h-full w-full object-cover transition duration-500 ease-out group-hover:brightness-110"
                      />
                      {task.badge ? (
                        <span className="absolute left-3 top-3 rounded bg-stone-950/80 px-2 py-0.5 font-mono text-[11px] font-medium text-emerald-300">
                          {task.badge}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-5">
                      <h3 className="text-lg font-semibold text-stone-50 transition group-hover:text-white">
                        {task.title}
                      </h3>
                      <p className="text-sm leading-relaxed text-stone-400">
                        {task.description}
                      </p>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <footer
          id="footer"
          className="border-t border-stone-800 bg-[#0a0c0b]"
        >
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
              <div className="sm:col-span-2">
                <div className="flex items-center gap-2">
                  <img
                    src="/geoai-live/javascript-logo.svg"
                    alt=""
                    className="h-6 w-auto"
                  />
                  <span className="text-xl font-semibold tracking-tight">
                    GeoAI.js
                  </span>
                </div>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-stone-400">
                  Open-source GeoAI for JavaScript. Run models in the browser or
                  on edge devices without a model-serving backend.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-stone-200">
                  Resources
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-stone-400">
                  <li>
                    <a
                      href="https://docs.geobase.app/geoai/"
                      className="transition hover:text-stone-100"
                    >
                      Documentation
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://docs.geobase.app/geoai-live"
                      className="transition hover:text-stone-100"
                    >
                      Live examples
                    </a>
                  </li>
                  <li>
                    <a
                      href={GITHUB_REPO_URI}
                      className="transition hover:text-stone-100"
                    >
                      GitHub
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-stone-200">
                  Community
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-stone-400">
                  <li>
                    <a
                      href="https://geobase.app/discord"
                      className="transition hover:text-stone-100"
                    >
                      Discord
                    </a>
                  </li>
                </ul>
              </div>
            </div>
            <div className="mt-10 flex flex-col items-center gap-3 border-t border-stone-800 pt-8 text-center text-xs text-stone-500 sm:flex-row sm:justify-between sm:text-left">
              <p>geobase.app © {new Date().getFullYear()}</p>
              <div className="flex gap-4">
                <a
                  href="https://geobase.app/agb"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition hover:text-stone-300"
                >
                  AGB
                </a>
                <a
                  href="https://geobase.app/impressum"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition hover:text-stone-300"
                >
                  Impressum
                </a>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
