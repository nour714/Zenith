"""
YouTube Playlist & Video Search & Extraction Service utilizing yt-dlp and oEmbed fallback.
Supports:
1. Search by (playlist_name + channel_name)
2. Direct YouTube Playlist URL extraction
3. Direct single YouTube Video URL extraction (as an individual learning track)
4. Automatic fallback via YouTube oEmbed API when bot challenges or network blocks occur
"""
import json
import re
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional
import yt_dlp

from app.core.exceptions import YouTubeExtractionError
from app.core.logging import get_logger

logger = get_logger(__name__)


def extract_video_id(url: str) -> Optional[str]:
    """Extracts the 11-character YouTube video ID from various URL formats."""
    if not url:
        return None
    patterns = [
        r"(?:youtu\.be/|v/|u/\w/|embed/|shorts/|watch\?v=)([\w-]{11})",
        r"[?&]v=([\w-]{11})",
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


def extract_playlist_id(url: str) -> Optional[str]:
    """Extracts YouTube playlist ID (e.g. PL...) from URL."""
    if not url:
        return None
    match = re.search(r"[?&]list=([a-zA-Z0-9_-]+)", url)
    if match:
        return match.group(1)
    return None


class YouTubeService:
    def __init__(self) -> None:
        self.ydl_opts = self._get_ydl_opts()

    def _get_ydl_opts(self) -> Dict[str, Any]:
        """Returns optimal yt-dlp configuration with JS runtime and multi-client support."""
        return {
            "quiet": True,
            "no_warnings": True,
            "extract_flat": "in_playlist",
            "skip_download": True,
            "ignoreerrors": False,
            "socket_timeout": 15,
            "js_runtimes": {"node": {}},
            "extractor_args": {
                "youtube": {
                    "player_client": ["android", "web", "mweb", "ios"],
                }
            },
            "http_headers": {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "Accept-Language": "ar,en-US;q=0.9,en;q=0.8",
            },
        }

    def search_and_extract(
        self,
        playlist_name: Optional[str] = None,
        channel_name: Optional[str] = None,
        direct_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Main entry point for retrieving playlist/video metadata and video entries.
        """
        if direct_url and ("youtube.com" in direct_url or "youtu.be" in direct_url):
            clean_url = direct_url.strip()
            logger.info(f"Processing direct YouTube URL: {clean_url}")

            playlist_id = extract_playlist_id(clean_url)
            video_id = extract_video_id(clean_url)

            # If playlist ID exists in URL, attempt playlist extraction first
            if playlist_id:
                target_url = f"https://www.youtube.com/playlist?list={playlist_id}"
                logger.info(f"Targeting playlist ID: {playlist_id} -> {target_url}")
                try:
                    result = self._extract_playlist_details(target_url)
                    if result.get("videos") and len(result["videos"]) > 0:
                        return result
                except Exception as exc:
                    logger.warning(f"Playlist extraction failed for '{playlist_id}': {exc}")
                    if video_id:
                        logger.info(f"Falling back to single video extraction for video ID: {video_id}")
                        return self._extract_single_video(video_id, clean_url)
                    raise

            # If single video URL (no playlist, or playlist had 0 videos)
            if video_id:
                logger.info(f"Extracting single video track for ID: {video_id}")
                return self._extract_single_video(video_id, clean_url)

            # Fallback to direct URL processing
            return self._extract_playlist_details(clean_url)

        elif playlist_name:
            query = playlist_name.strip()
            if channel_name:
                query += f" {channel_name.strip()}"
            encoded_query = urllib.parse.quote_plus(query)
            search_url = f"https://www.youtube.com/results?search_query={encoded_query}&sp=EgIQAw%253D%253D"
            logger.info(f"Searching YouTube playlists with query: '{query}' -> {search_url}")

            target_url = self._find_best_matching_playlist(search_url, query)
            if not target_url:
                raise YouTubeExtractionError(
                    message=f"لم يتم العثور على أي قائمة تشغيل مطابقة لـ: '{query}'. تأكد من صحة الاسم أو استخدم الرابط المباشر."
                )
            return self._extract_playlist_details(target_url)
        else:
            raise YouTubeExtractionError(
                message="يجب إدخال اسم القائمة أو رابط يوتيوب المباشر."
            )

    def _extract_single_video(self, video_id: str, original_url: str) -> Dict[str, Any]:
        """Extracts a single video and structures it as a 1-video course track."""
        canonical_url = f"https://www.youtube.com/watch?v={video_id}"

        # 1. Attempt rich extraction via yt-dlp
        try:
            with yt_dlp.YoutubeDL(self._get_ydl_opts()) as ydl:
                info = ydl.extract_info(canonical_url, download=False)
                if info:
                    title = info.get("title") or "فيديو بدون عنوان"
                    channel_title = info.get("uploader") or info.get("channel") or ""
                    description = info.get("description") or ""
                    duration = int(info.get("duration") or 0)

                    thumbnail_url = ""
                    thumbnails = info.get("thumbnails", [])
                    if thumbnails and isinstance(thumbnails, list):
                        thumbnail_url = thumbnails[-1].get("url", "")
                    if not thumbnail_url:
                        thumbnail_url = f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"

                    return {
                        "playlist_id": f"vid_{video_id}",
                        "title": title,
                        "channel_title": channel_title,
                        "description": description,
                        "thumbnail_url": thumbnail_url,
                        "webpage_url": canonical_url,
                        "total_videos": 1,
                        "total_duration_seconds": duration,
                        "videos": [
                            {
                                "video_id": video_id,
                                "title": title,
                                "duration": duration,
                                "thumbnail_url": thumbnail_url,
                                "webpage_url": canonical_url,
                                "position": 1,
                            }
                        ],
                    }
        except Exception as exc:
            logger.warning(f"yt-dlp extraction failed for video {video_id}: {exc}. Using oEmbed fallback.")

        # 2. Resilient Fallback via YouTube oEmbed API
        return self._build_single_video_fallback(video_id, original_url)

    def _extract_via_oembed(self, target_url: str) -> Optional[Dict[str, Any]]:
        """Direct, public YouTube oEmbed lookup (0-auth, reliable, instant)."""
        try:
            encoded = urllib.parse.quote(target_url, safe="")
            oembed_url = f"https://www.youtube.com/oembed?url={encoded}&format=json"
            req = urllib.request.Request(
                oembed_url,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "Accept": "application/json",
                }
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                if resp.status == 200:
                    return json.loads(resp.read().decode("utf-8"))
        except Exception as exc:
            logger.warning(f"oEmbed fallback error for '{target_url}': {exc}")
        return None

    def _build_single_video_fallback(self, video_id: str, original_url: str) -> Dict[str, Any]:
        """Builds valid 1-video course track using oEmbed or basic metadata."""
        canonical_url = f"https://www.youtube.com/watch?v={video_id}"
        oembed = self._extract_via_oembed(canonical_url) or {}

        title = oembed.get("title") or f"فيديو تعليمي ({video_id})"
        channel_title = oembed.get("author_name") or "YouTube Creator"
        thumbnail_url = (
            oembed.get("thumbnail_url")
            or f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"
        )

        return {
            "playlist_id": f"vid_{video_id}",
            "title": title,
            "channel_title": channel_title,
            "description": f"مسار تعليمي للفيديو: {title}",
            "thumbnail_url": thumbnail_url,
            "webpage_url": canonical_url,
            "total_videos": 1,
            "total_duration_seconds": 0,
            "videos": [
                {
                    "video_id": video_id,
                    "title": title,
                    "duration": 0,
                    "thumbnail_url": thumbnail_url,
                    "webpage_url": canonical_url,
                    "position": 1,
                }
            ],
        }

    def _find_best_matching_playlist(self, search_url: str, query: str = "") -> Optional[str]:
        """Extracts search results and returns the top playlist URL."""
        try:
            with yt_dlp.YoutubeDL(self._get_ydl_opts()) as ydl:
                result = ydl.extract_info(search_url, download=False)
                if result:
                    entries = result.get("entries", [])
                    for entry in entries:
                        if not entry:
                            continue
                        entry_url = entry.get("url") or entry.get("webpage_url")
                        if entry_url and ("playlist?list=" in entry_url or "list=" in entry_url):
                            return entry_url
                        playlist_id = entry.get("id")
                        if playlist_id and str(playlist_id).startswith("PL"):
                            return f"https://www.youtube.com/playlist?list={playlist_id}"

                    if entries and entries[0]:
                        first = entries[0]
                        return first.get("url") or first.get("webpage_url")

                # Fallback to direct ytsearch
                if query:
                    search_res = ydl.extract_info(f"ytsearch3:{query}", download=False)
                    if search_res and search_res.get("entries"):
                        for item in search_res["entries"]:
                            if item:
                                return item.get("webpage_url") or item.get("url")
                return None
        except Exception as exc:
            logger.error(f"Error during YouTube search: {exc}")
            raise YouTubeExtractionError(
                message="تعذر البحث في يوتيوب حالياً. يرجى التأكد من اتصال الإنترنت أو استخدام الرابط المباشر للقائمة."
            )

    def _extract_playlist_details(self, playlist_url: str) -> Dict[str, Any]:
        """Extracts complete metadata and entries of the playlist."""
        try:
            with yt_dlp.YoutubeDL(self._get_ydl_opts()) as ydl:
                info = ydl.extract_info(playlist_url, download=False)
                if not info:
                    # If this was a video URL, try video fallback
                    vid_id = extract_video_id(playlist_url)
                    if vid_id:
                        return self._extract_single_video(vid_id, playlist_url)
                    raise YouTubeExtractionError("تعذر قراءة بيانات القائمة من يوتيوب. تأكد من صحة الرابط.")

                playlist_id = info.get("id") or "playlist_" + str(abs(hash(playlist_url)))
                title = info.get("title") or "قائمة تشغيل بدون عنوان"
                channel_title = info.get("uploader") or info.get("channel") or ""
                description = info.get("description") or ""
                webpage_url = info.get("webpage_url") or playlist_url

                thumbnail_url = ""
                thumbnails = info.get("thumbnails", [])
                if thumbnails and isinstance(thumbnails, list):
                    thumbnail_url = thumbnails[-1].get("url", "")

                entries = info.get("entries", [])
                videos: List[Dict[str, Any]] = []
                total_duration = 0

                # If no entries, check if it's a single video
                if not entries:
                    vid_id = extract_video_id(playlist_url) or extract_video_id(webpage_url)
                    if vid_id or info.get("_type") == "video" or "watch?v=" in webpage_url or "youtu.be/" in webpage_url:
                        entries = [info]

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
                        "position": idx + 1,
                    })

                # If videos list is still empty, try single video extraction if video ID is found
                if not videos:
                    vid_id = extract_video_id(playlist_url) or extract_video_id(webpage_url)
                    if vid_id:
                        return self._extract_single_video(vid_id, playlist_url)
                    raise YouTubeExtractionError("لم يتم العثور على أي فيديوهات في هذه القائمة أو أنها قائمة خاصة.")

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
                    "videos": videos,
                }

        except YouTubeExtractionError:
            raise
        except Exception as exc:
            logger.error(f"Failed to extract playlist details from '{playlist_url}': {exc}")
            # Try single video fallback as last resort before failing
            vid_id = extract_video_id(playlist_url)
            if vid_id:
                try:
                    return self._extract_single_video(vid_id, playlist_url)
                except Exception:
                    pass
            raise YouTubeExtractionError(
                message=f"حدث خطأ أثناء استخراج فيديوهات القائمة: {str(exc)}"
            )
