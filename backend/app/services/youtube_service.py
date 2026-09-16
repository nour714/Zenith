"""
YouTube Playlist Search & Extraction Service utilizing yt-dlp.
Supports:
1. Search by (playlist_name + channel_name)
2. Direct YouTube Playlist URL extraction
"""
import urllib.parse
from typing import Any, Dict, List, Optional
import yt_dlp

from app.core.exceptions import YouTubeExtractionError
from app.core.logging import get_logger

logger = get_logger(__name__)


class YouTubeService:
    def __init__(self) -> None:
        self.ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            "extract_flat": True,
            "skip_download": True,
            "ignoreerrors": True,
        }

    def search_and_extract(
        self,
        playlist_name: Optional[str] = None,
        channel_name: Optional[str] = None,
        direct_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Main entry point for retrieving playlist metadata and its video entries.
        """
        target_url = None

        if direct_url and ("youtube.com" in direct_url or "youtu.be" in direct_url):
            target_url = direct_url.strip()
            logger.info(f"Using direct playlist URL: {target_url}")
        elif playlist_name:
            query = playlist_name.strip()
            if channel_name:
                query += f" {channel_name.strip()}"
            encoded_query = urllib.parse.quote_plus(query)
            # YouTube filter `sp=EgIQAw%253D%253D` specifically filters results to Playlists
            search_url = f"https://www.youtube.com/results?search_query={encoded_query}&sp=EgIQAw%253D%253D"
            logger.info(f"Searching YouTube playlists with query: '{query}' -> {search_url}")

            target_url = self._find_best_matching_playlist(search_url)
            if not target_url:
                raise YouTubeExtractionError(
                    message=f"لم يتم العثور على أي قائمة تشغيل مطابقة لـ: '{query}'. تأكد من صحة الاسم أو استخدم الرابط المباشر."
                )
        else:
            raise YouTubeExtractionError(
                message="يجب إدخال اسم القائمة أو رابطها المباشر."
            )

        return self._extract_playlist_details(target_url)

    def _find_best_matching_playlist(self, search_url: str) -> Optional[str]:
        """Extracts search results and returns the top playlist URL."""
        try:
            with yt_dlp.YoutubeDL(self.ydl_opts) as ydl:
                result = ydl.extract_info(search_url, download=False)
                if not result:
                    return None
                entries = result.get("entries", [])
                for entry in entries:
                    if not entry:
                        continue
                    # Check if entry is a playlist
                    entry_url = entry.get("url") or entry.get("webpage_url")
                    if entry_url and ("playlist?list=" in entry_url or "list=" in entry_url):
                        return entry_url
                    # Sometimes yt-dlp returns id of playlist
                    playlist_id = entry.get("id")
                    if playlist_id and playlist_id.startswith("PL"):
                        return f"https://www.youtube.com/playlist?list={playlist_id}"
                
                # Fallback to first entry if available
                if entries and entries[0]:
                    first = entries[0]
                    return first.get("url") or first.get("webpage_url")
                return None
        except Exception as exc:
            logger.error(f"Error during YouTube search: {exc}")
            raise YouTubeExtractionError(
                message="تعذر البحث في يوتيوب حالياً. يرجى التأكد من اتصال الإنترنت أو استخدام الرابط المباشر للقائمة."
            )

    def _extract_playlist_details(self, playlist_url: str) -> Dict[str, Any]:
        """Extracts complete metadata and entries of the playlist."""
        try:
            with yt_dlp.YoutubeDL(self.ydl_opts) as ydl:
                info = ydl.extract_info(playlist_url, download=False)
                if not info:
                    raise YouTubeExtractionError("تعذر قراءة بيانات القائمة من يوتيوب.")

                # If the URL was a single video in a playlist, yt-dlp might resolve the playlist id
                playlist_id = info.get("id") or "playlist_" + str(hash(playlist_url))
                title = info.get("title") or "قائمة تشغيل بدون عنوان"
                channel_title = info.get("uploader") or info.get("channel") or ""
                description = info.get("description") or ""
                webpage_url = info.get("webpage_url") or playlist_url
                
                # Thumbnail
                thumbnail_url = ""
                thumbnails = info.get("thumbnails", [])
                if thumbnails and isinstance(thumbnails, list):
                    thumbnail_url = thumbnails[-1].get("url", "")
                
                entries = info.get("entries", [])
                videos: List[Dict[str, Any]] = []
                total_duration = 0

                for idx, entry in enumerate(entries):
                    if not entry:
                        continue
                    vid_id = entry.get("id") or f"vid_{idx}"
                    vid_title = entry.get("title") or f"فيديو {idx+1}"
                    duration = entry.get("duration") or 0
                    if isinstance(duration, (int, float)):
                        total_duration += int(duration)
                    else:
                        duration = 0

                    # Best thumbnail
                    vid_thumb = ""
                    v_thumbs = entry.get("thumbnails", [])
                    if v_thumbs and isinstance(v_thumbs, list):
                        vid_thumb = v_thumbs[-1].get("url", "")
                    if not vid_thumb:
                        vid_thumb = f"https://i.ytimg.com/vi/{vid_id}/hqdefault.jpg"

                    vid_url = entry.get("url")
                    if not vid_url or not vid_url.startswith("http"):
                        vid_url = f"https://www.youtube.com/watch?v={vid_id}"

                    videos.append({
                        "video_id": vid_id,
                        "title": vid_title,
                        "duration": int(duration),
                        "thumbnail_url": vid_thumb,
                        "webpage_url": vid_url,
                        "position": idx + 1
                    })

                # If playlist thumbnail is empty, use first video's thumbnail
                if not thumbnail_url and videos:
                    thumbnail_url = videos[0]["thumbnail_url"]

                return {
                    "playlist_id": playlist_id,
                    "title": title,
                    "channel_title": channel_title,
                    "description": description,
                    "thumbnail_url": thumbnail_url,
                    "webpage_url": webpage_url,
                    "total_videos": len(videos),
                    "total_duration_seconds": total_duration,
                    "videos": videos
                }

        except YouTubeExtractionError:
            raise
        except Exception as exc:
            logger.error(f"Failed to extract playlist details from '{playlist_url}': {exc}")
            raise YouTubeExtractionError(
                message=f"حدث خطأ أثناء استخراج فيديوهات القائمة: {str(exc)}"
            )
