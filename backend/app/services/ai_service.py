"""
Gemini AI Service integration using google-genai SDK.
Handles study plans, playlist summaries, and notebook assistant.
"""
from typing import List, Optional
from google import genai
from google.genai import types
from app.core.config import settings
from app.core.logging import get_logger
from app.core.exceptions import AIServiceError

logger = get_logger(__name__)


class AIService:
    def __init__(self, api_key: Optional[str] = None) -> None:
        self.api_key = api_key or settings.GEMINI_API_KEY
        self._client: Optional[genai.Client] = None
        if self.api_key:
            try:
                self._client = genai.Client(api_key=self.api_key)
            except Exception as exc:
                logger.warning(f"Failed to initialize Gemini Client: {exc}")

    @property
    def is_configured(self) -> bool:
        return bool(self._client)

    def generate_study_plan(
        self,
        playlist_title: str,
        channel_title: Optional[str],
        video_titles: List[str],
        target_days: int = 14
    ) -> str:
        """Generates an actionable, structured study plan for the playlist."""
        if not self.is_configured:
            return (
                "⚠️ لم يتم ضبط مفتاح Gemini API بعد.\n\n"
                "يرجى إضافة مفتاح Google Gemini API في نافذة الإعدادات لتفعيل توليد خطط المذاكرة الذكية والمساعد الآلي."
            )

        prompt = f"""
أنت مساعد تعليمي وخبير في تنظيم مسارات التعلم والمذاكرة الذكية.
لدي قائمة تشغيل / كورس يوتيوب بعنوان: "{playlist_title}" من قناة: "{channel_title or 'غير محدد'}".
تحتوي القائمة على {len(video_titles)} فيديو.
عناوين الفيديوهات كالتالي:
{chr(10).join(f"{i+1}. {t}" for i, t in enumerate(video_titles[:60]))}

المطلوب:
1. صياغة خطة دراسية متوازنة ومنظمة على مدار {target_days} يوماً (أو أسابيع حسب الحجم).
2. تقسيم الفيديوهات إلى وحدات / محطات تعليمية (Milestones).
3. تقديم 3 نصائح ذهبية لتطبيق ما تم تعلمه وتثبيت المفاهيم.
اكتب الرد بتنسيق Markdown أنيق وواضح مع العناوين والنقاط والرموز التعبيرية المناسبة، باللغة العربية.
"""
        try:
            response = self._client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt
            )
            return response.text or "تعذر الحصول على رد من الذكاء الاصطناعي."
        except Exception as exc:
            logger.error(f"Gemini API error during study plan generation: {exc}")
            raise AIServiceError(f"حدث خطأ أثناء التواصل مع Gemini AI: {str(exc)}")

    def enhance_note(self, note_title: str, note_content: str) -> str:
        """Structures and polishes raw student notes into clear bullet points."""
        if not self.is_configured:
            return note_content

        prompt = f"""
أنت محرر ومساعد دراسي احترافي.
إليك ملاحظات كتبها طالب أثناء مذاكرة موضوع: "{note_title}".
المحتوى الحالي:
---
{note_content}
---

المطلوب:
- إعادة تنظيم وتنسيق الملاحظات باستخدام Markdown أنيق.
- تصحيح الأخطاء الإملائية وتنظيم الأفكار في نقاط وعناوين واضحة.
- إبراز المفاهيم الجوهرية (Key Takeaways) وأكواد برمجية إن وجدت.
- الحفاظ على المعنى الأصلي وتفاصيل الطالب كاملة.
اكتب الملاحظات المنقحة باللغة العربية بأسلوب راقٍ وسهل المراجعة.
"""
        try:
            response = self._client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt
            )
            return response.text or note_content
        except Exception as exc:
            logger.error(f"Gemini API error during note enhancement: {exc}")
            raise AIServiceError(f"حدث خطأ أثناء تحسين الملاحظات: {str(exc)}")
