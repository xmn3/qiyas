ملف إعداد الشات وتهيئته

لتمكين خدمة الشات في التطبيق يمكنك استخدام أحد موفري الشات المدعومين: `gemini` أو `claude`.

المتغيرات المهمة (ضعها في ملف `.env` أو في بيئة النظام):

- `CHAT_PROVIDER` : `gemini` أو `claude` (الافتراضي: `gemini`)
- `CHAT_MODEL_NAME` : اسم النموذج المطلوب (اختياري). مثال: `claude-haiku-4.5` أو `gemini-2.5-flash`
- `GEMINI_API_KEY` : مفتاح واجهة برمجة تطبيقات Gemini (إن اخترت `gemini`)
- `ANTHROPIC_API_KEY` : مفتاح واجهة برمجة تطبيقات Anthropic (إن اخترت `claude`)

مثال على محتوى `.env`:

CHAT_PROVIDER=claude
CHAT_MODEL_NAME=claude-haiku-4.5
ANTHROPIC_API_KEY=sk-....

تشغيل محلي سريع:

1. تثبيت المتطلبات:

```powershell
python -m pip install -r requirements.txt
```

2. ضبط المتغيرات في `.env` أو في البيئة.

3. تشغيل التطبيق:

```powershell
python app.py
```

ملاحظات:
- إذا لم تقم بتثبيت حزمة `anthropic` أو لم تضف المفتاح، سيظل التطبيق يستخدم Gemini (إن توفر مفتاحه) وإلا ستعود رسالة أن خدمة الشات غير متاحة.
- قمت بإضافة غلاف (`ChatWrapper`) في `app.py` للحفاظ على واجهة موحدة بين المزودين. يمكنك تغيير `CHAT_PROVIDER` و `CHAT_MODEL_NAME` بدون تعديل الكود.
