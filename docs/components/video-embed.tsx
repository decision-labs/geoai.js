type VideoEmbedProps = {
  src: string;
  title?: string;
};

export default function VideoEmbed({
  src,
  title = "Video player",
}: VideoEmbedProps) {
  return (
    <div
      style={{
        position: "relative",
        paddingBottom: "56.25%",
        marginTop: "2rem",
        marginBottom: "2rem",
        height: 0,
        overflow: "hidden",
        maxWidth: "100%",
        borderRadius: "8px",
        boxShadow:
          "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      }}
    >
      <video
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}
        src={src}
        title={title}
        controls
        preload="metadata"
        poster=""
        autoPlay
        muted
        loop
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
}
