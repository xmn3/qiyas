from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os, pandas as pd, joblib, numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

# الملفات
CSV_PATH = 'bodyfat-Copy1.csv'
MODEL_PATH = 'bodyfat_model.pkl'
SCALER_PATH = 'scaler.pkl'
FEATURES_PATH = 'features.txt'

# إعداد الشات بوت
CHAT_PROVIDER = os.getenv('CHAT_PROVIDER', 'gemini').lower()
CHAT_MODEL_NAME = os.getenv('CHAT_MODEL_NAME')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')

# ------------------ Chat Wrapper ------------------
class ChatWrapper:
    def __init__(self, provider, model_name=None, gemini_key=None, anthropic_key=None):
        self.provider = provider
        self.model_name = model_name
        self.gemini_model = None
        self.anthropic_client = None

        if provider == 'gemini' and gemini_key:
            try:
                genai.configure(api_key=gemini_key)
                self.gemini_model = genai.GenerativeModel(model_name or 'gemini-2.5-flash')
            except Exception as e:
                print("تعذر تهيئة Gemini:", e)
        elif provider == 'claude' and anthropic_key:
            try:
                from anthropic import Anthropic
                self.anthropic_client = Anthropic(api_key=anthropic_key)
                self.model_name = model_name or 'claude-haiku-4.5'
            except Exception as e:
                print("تعذر تهيئة Anthropic:", e)
        else:
            print(f"تحذير: لا يوجد مفتاح صالح أو مزوّد غير معروف: {provider}")

    def generate_content(self, prompt):
        if self.gemini_model:
            resp = self.gemini_model.generate_content(prompt)
            return type('R', (), {'text': getattr(resp, 'text', str(resp))})
        if self.anthropic_client:
            try:
                from anthropic import HUMAN_PROMPT, AI_PROMPT
                completion = self.anthropic_client.completions.create(
                    model=self.model_name,
                    prompt=HUMAN_PROMPT + prompt + AI_PROMPT,
                    max_tokens_to_sample=800
                )
                text = getattr(completion, 'completion', None) or getattr(completion, 'text', None) or str(completion)
                return type('R', (), {'text': text})
            except Exception as e:
                return type('R', (), {'text': f'خطأ في مزود الشات: {e}'})
        return type('R', (), {'text': 'خدمة الشات غير متاحة'})

chat_model = ChatWrapper(CHAT_PROVIDER, CHAT_MODEL_NAME, GEMINI_API_KEY, ANTHROPIC_API_KEY)

# ------------------ تحميل CSV ------------------
def repair_and_load_csv():
    if os.path.exists(CSV_PATH):
        df = pd.read_csv(CSV_PATH)
        return df
    return pd.DataFrame(columns=['Age', 'Weight', 'Height_cm'])

# ------------------ تدريب النموذج ------------------
def prepare_features(df):
    df_clean = df.copy()
    if 'Height' in df_clean.columns:
        df_clean['Height_cm'] = df_clean['Height'] * 2.54
    important_features = ['Age', 'Weight', 'Height_cm', 'Abdomen', 'Neck', 'Chest', 'Hip', 'Thigh', 'Biceps']
    features = [f for f in important_features if f in df_clean.columns]
    return df_clean, features

def train_model():
    df = repair_and_load_csv()
    df_clean, features = prepare_features(df)
    if 'BodyFat' not in df_clean.columns:
        raise Exception("عمود BodyFat غير موجود")
    X = df_clean[features]
    y = df_clean['BodyFat']
    mask = X.notna().all(axis=1) & y.notna()
    X, y = X[mask], y[mask]
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)
    model = RandomForestRegressor(n_estimators=200, max_depth=20, min_samples_split=5, min_samples_leaf=2, random_state=42)
    model.fit(X_train, y_train)
    return model, scaler, features

# تحميل أو تدريب النموذج
try:
    model = joblib.load(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)
    with open(FEATURES_PATH) as f:
        features_used = f.read().splitlines()
except:
    model, scaler, features_used = train_model()
    joblib.dump(model, MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    with open(FEATURES_PATH, 'w') as f:
        f.write('\n'.join(features_used))

# ------------------ BMI ------------------
def calculate_bmi(weight, height_cm):
    h = height_cm / 100
    bmi = weight / (h**2)
    if bmi < 18.5:
        category = "نقص وزن"; advice = "زيادة السعرات ونشاط رياضي"
    elif bmi < 25:
        category = "وزن طبيعي"; advice = "حافظ على نظامك ونشاطك"
    elif bmi < 30:
        category = "زيادة وزن"; advice = "قلل السعرات وزد النشاط"
    else:
        category = "سمنة"; advice = "استشارة أخصائي تغذية"
    return round(bmi,1), category, advice

# ------------------ Routes ------------------
@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

@app.route('/api/predict', methods=['POST'])
def predict():
    data = request.get_json(force=True)
    try:
        input_features = [float(data.get(f, 0)) for f in features_used]
        input_scaled = scaler.transform([input_features])
        prediction = model.predict(input_scaled)[0]
        prediction = max(5, min(50, prediction))
        if prediction < 6: category="ضروري"; description="دهون منخفضة جداً"; advice="قد تؤثر على الصحة"
        elif prediction < 14: category="رياضي"; description="مستوى رياضي ممتاز"; advice="حافظ على نظامك"
        elif prediction < 18: category="لياقة"; description="مستوى لائق"; advice="استمر في النشاط"
        elif prediction < 25: category="متوسط"; description="مستوى مقبول"; advice="حسن نظامك الغذائي"
        else: category="مرتفع"; description="نسبة مرتفعة"; advice="استشارة أخصائي وزيادة النشاط"
        # BMI
        bmi, bmi_category, bmi_advice = calculate_bmi(float(data.get('Weight',75)), float(data.get('Height_cm',175)))
        return jsonify({
            'prediction': round(prediction,1),
            'category': category,
            'description': description,
            'advice': advice,
            'bmi': bmi,
            'bmi_category': bmi_category,
            'bmi_advice': bmi_advice
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/chat', methods=['POST'])
def chat_with_bot():
    data = request.get_json()
    user_message = data.get('message','')
    context = """أنت مساعد ذكي مختص بالتغذية واللياقة، أجب باللغة العربية باختصار ونصائح واضحة."""
    full_prompt = f"{context}\n\nسؤال المستخدم: {user_message}"
    response = chat_model.generate_content(full_prompt)
    return jsonify({'response': response.text})

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)
