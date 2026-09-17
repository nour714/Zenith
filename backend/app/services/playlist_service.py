"""
Playlist management service connecting repository with YouTube extractor with user-scoping.
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

    def search_and_import(self, req: PlaylistSearchRequest, user_id: int) -> Dict[str, Any]:
        """Searches or parses playlist and stores it for the user in PostgreSQL."""
        extracted = self.yt_service.search_and_extract(
            playlist_name=req.playlist_name,
            channel_name=req.channel_name,
            direct_url=req.direct_url
        )

        db_id = self.repo.create_playlist(
            user_id=user_id,
            playlist_id=extracted["playlist_id"],
            title=extracted["title"],
            channel_title=extracted["channel_title"],
            description=extracted["description"],
            thumbnail_url=extracted["thumbnail_url"],
            webpage_url=extracted["webpage_url"],
            total_videos=extracted["total_videos"]
        )

        self.repo.add_videos_batch(db_id, extracted["videos"])
        return self.get_playlist_detail(db_id, user_id)

    def get_all_playlists(self, user_id: int) -> List[Dict[str, Any]]:
        return self.repo.get_all_playlists(user_id)

    def get_playlist_detail(self, playlist_id: int, user_id: int) -> Dict[str, Any]:
        playlist = self.repo.get_playlist_by_id(playlist_id, user_id)
        if not playlist:
            raise ResourceNotFoundException("Playlist", playlist_id)

        videos = self.repo.get_videos_for_playlist(playlist_id, user_id)
        playlist_dict = dict(playlist)
        playlist_dict["videos"] = videos
        return playlist_dict

    def toggle_video_status(self, video_id: int, is_completed: bool, user_id: int) -> Dict[str, Any]:
        return self.repo.toggle_video_status(video_id, is_completed, user_id)

    def delete_playlist(self, playlist_id: int, user_id: int) -> bool:
        deleted = self.repo.delete_playlist(playlist_id, user_id)
        if not deleted:
            raise ResourceNotFoundException("Playlist", playlist_id)
        return True
