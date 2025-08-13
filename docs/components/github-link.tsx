import Link from "next/link";

export default function GithubLink({
  href,
  text,
}: {
  href: string;
  text: string;
}) {
  return (
    <Link
      href={href}
      target="_blank"
      // add underline
      style={{
        textDecoration: "underline",
      }}
    >
      🚀 {text}
    </Link>
  );
}
