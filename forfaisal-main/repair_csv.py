# run_repair.py
from app import repair_and_load_csv

print("جاري إصلاح ملف CSV...")
df = repair_and_load_csv()
print(f"تم الإصلاح بنجاح! الأبعاد: {df.shape}")
print("الأعمدة:", df.columns.tolist())
print("أول 5 صفوف:")
print(df.head())