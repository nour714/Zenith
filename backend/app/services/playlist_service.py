"""
Playlist management service connecting repository with YouTube extractor.
"""
from typing import Any, Dict, List, Optional
from app.db.repositories.playlist_repo import PlaylistRepository
from app.services.youtube_service import YouTubeService
from app.models.playlist import PlaylistSearchRequest
from app.core.exceptions import ResourceNotFoundException


class PlaylistService:
    def __init__(self, repo: PlaylistRepository, yt_service: YouTubeService) -> None:
        self.repo = repo
        self.yt_service = yt_service

    def search_and_import(self, req: PlaylistSearchRequest) -> Dict[str, Any]:
        """Searches or parses playlist and stores it in SQLite."""
        extracted = self.yt_service.search_and_extract(
            playlist_name=req.playlist_name,
            channel_name=req.channel_name,
            direct_url=req.direct_url
        )

        db_id = self.repo.create_playlist(
            playlist_id=extracted["playlist_id"],
            title=extracted["title"],
            channel_title=extracted["channel_title"],
            description=extracted["description"],
            thumbnail_url=extracted["thumbnail_url"],
            webpage_url=extracted["webpage_url"],
            total_videos=extracted["total_videos"]
        )

        self.repo.add_videos_batch(db_id, extracted["videos"])
        return self.get_playlist_detail(db_id)

    def get_all_playlists(self) -> List[Dict[str, Any]]:
        return self.repo.get_all_playlists()

    def get_playlist_detail(self, playlist_id: int) -> Dict[str, Any]:
        playlist = self.repo.get_playlist_by_id(playlist_id)
        if not playlist:
            raise ResourceNotFoundException("Playlist", playlist_id)

        videos = self.repo.get_videos_for_playlist(playlist_id)
        total_duration = sum(v.get("duration", 0) for v in videos)
        
        # Format duration
        hours = total_duration // 3600
        mins = (total_duration % 3600) // 60
        secs = total_duration % 60
        if hours > 0:
            formatted_duration = f"{hours}h {mins}m"
        else:
            formatted_duration = f"{mins}m {secs}s"

        playlist["videos"] = videos
        playlist["total_duration_seconds"] = total_duration
        playlist["formatted_total_duration"] = formatted_duration
        return playlist

    def toggle_video_status(self, video_id: int, is_completed: bool) -> Dict[str, Any]:
        return self.repo.toggle_video_status(video_id, is_completed)

    def delete_playlist(self, playlist_id: int) -> bool:
        return self.repo.delete_playlist(playlist_id)
