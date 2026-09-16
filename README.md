# Zenith 🚀 (Peak Learning & Smart YouTube Tracker)

تطبيق ويب عصري ومتطور لإدارة المهام وتتبع مسارات التعلم من قوائم تشغيل يوتيوب (YouTube Playlists Tracker) مع دفتر ملاحظات جانبي ذكي (Smart Notebook)، مصمم بنمط **Modern Dark Glassmorphism** فخم يدعم اللغتين العربية والإنجليزية.

---

## 🌟 المميزات الرئيسية (Key Features)

1. **تتبع مسارات يوتيوب الذكية (Smart YouTube Tracking)**:
   - كتابة اسم الكورس واسم القناة فقط (مثل: "كورس بايثون للمبتدئين" + "محمد الدسوقي") أو وضع الرابط المباشر.
   - استخراج عدد الفيديوهات، العناوين، المدد، وروابط المشاهدة تلقائياً عبر `yt-dlp` دون الحاجة لمفاتيح API معقدة.
   - حلقات تقدم تفاعلية (Circular Progress Rings) وشريط نسبة إنجاز متطور لكل قائمة.
   - قائمة فيديوهات تفاعلية (Accordion Checklist) لتعليم الفيديوهات المكتملة مع إطلاق أنيميشن احتفالي (Confetti).
   - زر مباشر لفتح أي فيديو على يوتيوب في تبويب جديد.

2. **دفتر ملاحظات جانبي مرن (Slide-over Smart Notebook)**:
   - درج جانبي سلس يفتح من أي مكان في التطبيق.
   - دعم Markdown مع شريط أدوات سريع (عناوين، كود، نقاط، تنسيق).
   - إمكانية ربط الملاحظات بفيديو محدد أو كتابة ملاحظات عامة.
   - زر تصدير الملاحظات لملفات Markdown (`.md`).
   - زر تحسين وتلخيص الملاحظات الذكي عبر Gemini AI.

3. **لوحة المهام اليومية (Custom To-Do Board)**:
   - إدارة المهام العادية، الأولويات (عالية، متوسطة، منخفضة)، التصنيفات، وتواريخ الاستحقاق.
   - فلترة ذكية بين (الكل، مسارات يوتيوب، المهام اليومية، المكتملة).

4. **المعمارية النظيفة وجودة الكود (Clean Architecture & SOLID)**:
   - **الباك إند**: مبني باستخدام Python FastAPI وفقاً لمعمارية الطبقات المنفصلة (Routers -> Services -> Repositories -> SQLite Database) مع حقن التبعيات و Pydantic v2.
   - **الفرونت إند**: مبني بـ HTML5 دلالي و CSS3 زجاجي متقدم و Vanilla JavaScript بنظام ES Modules (صفر كود مضمن، حماية XSS، Design Tokens موحدة).

5. **دعم كامل للغتين (Bilingual RTL / LTR)**:
   - تبديل فوري بنقرة واحدة بين العربية (RTL) والإنجليزية (LTR) مع خطوط مريحة للعين (Cairo و Inter).

---

## 🛠️ متطلبات التشغيل (Prerequisites)

- Python 3.10 أو أحدث.
- المتطلبات مثبتة مسبقاً: `fastapi`, `uvicorn`, `yt-dlp`, `google-genai`, `pydantic`, `python-dotenv`.

---

## 🚀 طريقة التشغيل (How to Run)

### الطريقة الأولى (الأسهل على ويندوز):
انقر نقراً مزدوجاً على ملف:
```cmd
start.bat
```

### الطريقة الثانية (عبر موجه الأوامر / Terminal):
```bash
python run.py
```
سيتم تشغيل السيرفر تلقائياً وفتح المتصفح على الرابط:
👉 **`http://127.0.0.1:8000`**

---

## 📁 الهيكل التنظيمي للمشروع (Project Structure)

```
ToDo/
├── backend/
│   ├── app/
│   │   ├── api/                 # مسارات REST API وحقن التبعيات
│   │   │   ├── deps.py
│   │   │   └── v1/
│   │   │       ├── api.py
│   │   │       └── endpoints/   # (playlists, tasks, notes, settings, ai, stats)
│   │   ├── core/                # إعدادات النظام، السجلات، والاستثناءات
│   │   ├── db/                  # اتصال SQLite، التهيئة، و Repositories
│   │   ├── models/              # نماذج Pydantic للتحقق من البيانات
│   │   └── services/            # منطق العمليات (yt-dlp, Gemini AI, etc.)
│   ├── requirements.txt
│   └── main.py                  # تطبيق FastAPI وخدمة ملفات الفرونت إند
├── frontend/
│   ├── index.html               # هيكل دلالي نظيف خالي من أي كود مضمن
│   ├── css/
│   │   ├── tokens.css           # ألوان ومتغيرات Glassmorphism
│   │   ├── base.css
│   │   ├── layout.css
│   │   ├── components.css
│   │   ├── animations.css
│   │   └── rtl.css
│   └── js/
│       ├── main.js              # ملف الانطلاق للواجهة (Entry Point)
│       ├── core/                # Store و EventBus
│       ├── services/            # API Client
│       ├── components/          # بطاقات القوائم، المهام، النوت بوك، المودالز
│       ├── utils/               # دوال مساعدة، XSS Sanitizer، والكونفيتي
│       └── i18n/                # محرك وقواميس الترجمة العربية والإنجليزية
├── todo.db                      # قاعدة بيانات SQLite دائمة ومحلية
├── run.py                       # سكربت التشغيل بنقرة واحدة
├── start.bat                    # ملف تشغيل ويندوز سريع
└── README.md
```
