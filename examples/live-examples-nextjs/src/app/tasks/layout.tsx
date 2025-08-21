import { BackToHomeButton } from '../../components';
import { Analytics } from "@vercel/analytics/next"

export default function TaskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full h-screen relative">
      {/* Back to Home Button - Top Left */}
      <div className="absolute top-6 left-6 z-50">
        <BackToHomeButton />
      </div>
      {children}
      <Analytics />
    </div>
  );
}
