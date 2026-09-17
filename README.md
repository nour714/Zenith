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
   - **الباك إند**: مبني باستخدام Python FastAPI وفقاً لمعمارية الطبقات المنفصلة (Routers -> Services -> Repositories -> PostgreSQL/Supabase Database) مع حقن التبعيات و Pydantic v2 وحماية المصادقة عبر Header `X-Zenith-Key`.
   - **الفرونت إند**: مبني بـ HTML5 دلالي و CSS3 زجاجي متقدم و Vanilla JavaScript بنظام ES Modules (صفر كود مضمن، حماية XSS، Design Tokens موحدة).

5. **دعم كامل للغتين (Bilingual RTL / LTR)**:
   - تبديل فوري بنقرة واحدة بين العربية (RTL) والإنجليزية (LTR) مع خطوط مريحة للعين (Cairo و Inter).

---

## 🛠️ متطلبات التشغيل (Prerequisites)

- **Python**: إصدار 3.10 أو أحدث (يوصى بـ 3.12+).
- **قاعدة بيانات PostgreSQL**: يوصى باستخدام [Supabase](https://supabase.com) (مع Connection Pooler للبيئات السحابية والسيرفرلس).
- **المكتبات المطلوبة**: `fastapi`, `uvicorn`, `psycopg2-binary`, `pydantic`, `pydantic-settings`, `yt-dlp`, `google-genai`, `python-dotenv`.

---

## 🚀 طريقة التشغيل والإعداد (Setup & How to Run)

### 1️⃣ تثبيت التبعيات (Install Dependencies):
```bash
pip install -r requirements.txt
# أو باستخدام uv:
# uv sync
```

### 2️⃣ إعداد متغيرات البيئة وقاعدة البيانات (Environment Configuration):
قم بإنشاء ملف `.env` في المجلد الرئيسي للمشروع (أو انسخ `.env.example` إلى `.env`):

```env
# رابط اتصال PostgreSQL / Supabase
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres

# مفتاح Gemini AI (اختياري لميزات الذكاء الاصطناعي)
GEMINI_API_KEY=your_gemini_api_key_here

# حماية العمليات وتعديل البيانات (اختياري - في حال عدم تعيينه يعمل التطبيق بنمط التطوير المفتوح)
ZENITH_ADMIN_KEY=your_secret_admin_key

# النطاقات المسموح بها في CORS (افتراضياً: *)
ALLOWED_ORIGINS=*

HOST=127.0.0.1
PORT=8000
```

> [!TIP]
> **كيف تحصل على رابط DATABASE_URL من Supabase؟**
> 1. افتح مشروعك على [Supabase Dashboard](https://supabase.com/dashboard).
> 2. اذهب إلى **Project Settings** (⚙️) > **Database** > **Connection string**.
> 3. اختر تبويب **Connection Pooler** (المنفذ `6543`) وضع كلمة المرور الخاصة بقاعدتك.
> 4. سيقوم التطبيق تلقائياً بإنشاء كافة الجداول والفهارس (`zenith_playlists`, `zenith_videos`, `zenith_custom_tasks`, `zenith_notes`, `zenith_settings`) عند الإقلاع لأول مرة.

### 3️⃣ تشغيل التطبيق (Start the App):

#### الطريقة الأولى (على نظام ويندوز):
انقر نقراً مزدوجاً على ملف:
```cmd
start.bat
```

#### الطريقة الثانية (عبر Terminal):
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
│   │   ├── api/                 # مسارات REST API، حقن التبعيات وحماية المصادقة
│   │   │   ├── deps.py          # حقن التبعيات ومصادقة X-Zenith-Key
│   │   │   └── v1/
│   │   │       ├── api.py
│   │   │       └── endpoints/   # (playlists, tasks, notes, settings, ai, stats)
│   │   ├── core/                # إعدادات النظام (Config)، السجلات، والاستثناءات
│   │   ├── db/                  # اتصال PostgreSQL/Supabase، التهيئة التلقائية، و Repositories
│   │   ├── models/              # نماذج Pydantic للتحقق من البيانات
│   │   └── services/            # منطق العمليات (yt-dlp, Gemini AI, etc.)
│   ├── requirements.txt
│   ├── tests/                   # اختبارات التكامل E2E
│   └── main.py                  # تطبيق FastAPI، تكوين CORS وخدمة ملفات الفرونت إند
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
├── run.py                       # سكربت تشغيل خادم Zenith بنقرة واحدة
├── start.bat                    # ملف تشغيل ويندوز سريع
├── pyproject.toml               # إعدادات المشروع وحزم Vercel / Pyright
├── vercel.json                  # إعدادات نشر Vercel Serverless
└── README.md
```
