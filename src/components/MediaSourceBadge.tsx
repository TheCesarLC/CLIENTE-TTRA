import React from "react";
import { detectMediaSource, MediaSourceInfo } from "../lib/mediaUtils";
import { Video, HardDrive, Zap, Image as ImageIcon, Film, PlayCircle, Sparkles } from "lucide-react";

interface MediaSourceBadgeProps {
  url: string | null | undefined;
  className?: string;
  showDetails?: boolean;
}

export default function MediaSourceBadge({
  url,
  className = "",
  showDetails = true,
}: MediaSourceBadgeProps) {
  if (!url || !url.trim()) return null;

  const info: MediaSourceInfo = detectMediaSource(url);

  // Pick provider icon
  const renderIcon = () => {
    switch (info.provider) {
      case "youtube":
        return <PlayCircle size={14} className="text-red-400 flex-shrink-0" />;
      case "vimeo":
        return <Film size={14} className="text-sky-400 flex-shrink-0" />;
      case "imagekit":
        return <Zap size={14} className="text-emerald-400 flex-shrink-0" />;
      case "cloudinary":
        return <Zap size={14} className="text-purple-400 flex-shrink-0" />;
      case "google_drive":
        return <HardDrive size={14} className="text-blue-400 flex-shrink-0" />;
      case "imgur":
        return <ImageIcon size={14} className="text-emerald-400 flex-shrink-0" />;
      case "direct_video":
        return <Video size={14} className="text-emerald-400 flex-shrink-0" />;
      case "direct_image":
        return <ImageIcon size={14} className="text-emerald-400 flex-shrink-0" />;
      default:
        return <Sparkles size={14} className="text-neutral-400 flex-shrink-0" />;
    }
  };

  return (
    <div
      className={`flex flex-col gap-1 px-3 py-2 rounded border transition-all ${info.badgeBg} ${info.badgeBorder} ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {renderIcon()}
          <span className={`text-[10px] font-black uppercase tracking-wider ${info.badgeTextCol}`}>
            {info.badgeText}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${info.badgeDotCol} animate-pulse`} />
          <span className="text-[9px] font-extrabold uppercase tracking-widest text-neutral-400">
            Auto-Detectado
          </span>
        </div>
      </div>

      {showDetails && info.description && (
        <p className="text-[10px] text-neutral-300 leading-normal pl-5">
          {info.description}
        </p>
      )}
    </div>
  );
}
