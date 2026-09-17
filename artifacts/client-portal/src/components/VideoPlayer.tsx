import { Play } from "lucide-react";
import { getYouTubeId } from "@/lib/utils";

export function VideoPlayer({
  url,
  poster,
}: {
  url?: string | null;
  poster?: string | null;
}) {
  const ytId = getYouTubeId(url);
  if (ytId) {
    return (
      <div className="relative aspect-video w-full overflow-hidden bg-black">
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube.com/embed/${ytId}`}
          title="Lesson video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  if (url) {
    return (
      <div className="relative aspect-video w-full overflow-hidden bg-black">
        <video
          key={url}
          className="absolute inset-0 h-full w-full"
          controls
          preload="metadata"
          poster={poster ?? undefined}
        >
          <source src={url} />
        </video>
      </div>
    );
  }
  return (
    <div className="relative flex aspect-video w-full items-center justify-center bg-neutral-950 text-neutral-500">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-neutral-700">
          <Play className="h-7 w-7" />
        </div>
        <div className="text-sm">No video uploaded yet</div>
      </div>
    </div>
  );
}
