// script.js - نسخة متكاملة

const el = id => document.getElementById(id);

window.appState = {
    currentRecord: null,
    isProcessing: false
};

/* ------------------ دوال مساعدة ------------------ */
function readInputs() {
    return {
        Age: el('inputAge')?.value ? Number(el('inputAge').value) : null,
        Weight: el('inputWeight')?.value ? Number(el('inputWeight').value) : null,
        Height_cm: el('inputHeight')?.value ? Number(el('inputHeight').value) : null,
        Abdomen: el('inputAbdomen')?.value ? Number(el('inputAbdomen').value) : null,
        Neck: el('inputNeck')?.value ? Number(el('inputNeck').value) : null,
        Chest: el('inputChest')?.value ? Number(el('inputChest').value) : null,
        Hip: el('inputHip')?.value ? Number(el('inputHip').value) : null,
        Thigh: el('inputThigh')?.value ? Number(el('inputThigh').value) : null
    };
}

function validate(record) {
    const required = ['Age', 'Weight', 'Height_cm'];
    const errors = [];

    required.forEach(field => {
        if (!record[field] || record[field] <= 0) {
            errors.push(`حقل ${field} مطلوب ويجب أن يكون أكبر من الصفر`);
        }
    });

    if (errors.length > 0) {
        showNotification(errors.join('<br>'), 'error');
        return false;
    }
    return true;
}

/* ------------------ الإشعارات ------------------ */
function showNotification(message, type = 'info') {
    const existing = document.querySelectorAll('.custom-notification');
    existing.forEach(n => n.remove());

    const notif = document.createElement('div');
    const bgColor = type === 'error' ? 'bg-red-500' :
                    type === 'success' ? 'bg-green-500' : 'bg-blue-500';

    notif.className = `custom-notification fixed top-4 right-4 ${bgColor} text-white px-6 py-4 rounded-xl shadow-lg z-50`;
    notif.innerHTML = `<div>${message}</div>`;
    document.body.appendChild(notif);

    setTimeout(() => notif.remove(), 5000);
}

/* ------------------ الاتصال بالـ API التنبؤ ------------------ */
async function callPredict(record) {
    if (window.appState.isProcessing) return null;
    window.appState.isProcessing = true;

    try {
        const res = await fetch('/api/predict', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(record)
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'حدث خطأ في التنبؤ');
        return data;
    } catch (error) {
        showNotification(`فشل في التنبؤ: ${error.message}`, 'error');
        console.error(error);
        return null;
    } finally {
        window.appState.isProcessing = false;
    }
}

/* ------------------ حساب BMI ------------------ */
function calculateBMI(weight, height_cm) {
    if (!weight || !height_cm) return null;
    const height_m = height_cm / 100;
    return (weight / (height_m ** 2)).toFixed(1);
}

/* ------------------ عرض النتائج ------------------ */
function displayPredictionResult(result, record) {
    const resultDiv = el('predictResult');
    if (!resultDiv) return;

    const { prediction, category } = result;

    let colorClass = 'text-blue-600';
    let bgClass = 'bg-blue-50 border-blue-200';
    let description = '';

    // تفسير النتائج حسب النسبة
    if (category === 'رياضي') {
        colorClass = 'text-green-600';
        bgClass = 'bg-green-50 border-green-200';
        description = `
            <strong>فوائد:</strong> قلب صحي، قوة عضلية عالية، طاقة جيدة، تحسن الأداء الرياضي.
        `;
    } else if (category === 'لياقة') {
        colorClass = 'text-blue-600';
        bgClass = 'bg-blue-50 border-blue-200';
        description = `
            <strong>احتمالية أمراض:</strong> ارتفاع بسيط في الدهون قد يؤثر على القلب والكوليسترول.
        `;
    } else if (category === 'متوسط') {
        colorClass = 'text-yellow-600';
        bgClass = 'bg-yellow-50 border-yellow-200';
        description = `
            <strong>احتمالية أمراض:</strong> زيادة خطر السمنة، ارتفاع ضغط الدم، مشاكل القلب.
        `;
    } else if (category === 'مرتفع') {
        colorClass = 'text-red-600';
        bgClass = 'bg-red-50 border-red-200';
        description = `
            <strong>احتمالية أمراض:</strong> سمنة مفرطة، سكري، أمراض قلبية، ارتفاع ضغط الدم.
        `;
    }

    const bmi = calculateBMI(record.Weight, record.Height_cm);

    resultDiv.className = `flex flex-col items-center justify-center rounded-2xl p-8 text-center min-h-[300px] border-2 ${bgClass}`;
    resultDiv.innerHTML = `
        <h2 class="text-6xl font-bold ${colorClass} mb-2">${prediction}%</h2>
        <span class="inline-block px-4 py-2 rounded-full ${colorClass.replace('text', 'bg').replace('600', '100')} ${colorClass} font-bold text-sm mb-4">
            ${category}
        </span>
        <p class="text-gray-700 leading-relaxed max-w-md mb-2">${description}</p>
        <p class="text-gray-800 font-semibold">مؤشر كتلة الجسم (BMI): ${bmi}</p>
    `;
}

/* ------------------ إعادة تحميل النموذج ------------------ */
async function reloadModel() {
    try {
        showNotification('جاري إعادة تدريب النموذج...', 'info');

        const res = await fetch('/api/reload-model', { method: 'POST' });
        const data = await res.json();

        if (res.ok) showNotification('تم إعادة تدريب النموذج بنجاح', 'success');
        else throw new Error(data.error || 'فشل في إعادة التدريب');
    } catch (error) {
        showNotification(`فشل في إعادة تدريب النموذج: ${error.message}`, 'error');
    }
}

/* ------------------ شات بوت متصل بجيمناي ------------------ */
async function sendChatMessage(message) {
    if (!message) return;
    appendMessage(message, true);
    el('chatInput').value = '';

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });

        const data = await response.json();
        appendMessage(data.reply || 'لم يتم تلقي رد من الخادم.', false);
    } catch (err) {
        console.error(err);
        appendMessage('حدث خطأ أثناء الاتصال بالـ API.', false);
    }
}

function appendMessage(text, fromUser) {
    const chatMessages = el('chatMessages');
    const msgDiv = document.createElement('div');
    msgDiv.className = `flex ${fromUser ? 'justify-end' : 'justify-start'}`;
    msgDiv.innerHTML = `<div class="${fromUser ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'} rounded-2xl p-3 max-w-[80%] text-sm">${text}</div>`;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

/* ------------------ تهيئة الأحداث ------------------ */
document.addEventListener('DOMContentLoaded', () => {
    // زر حساب الدهون
    if (el('startBtn')) {
        el('startBtn').addEventListener('click', async () => {
            const rec = readInputs();
            if (!validate(rec)) return;

            const resultDiv = el('predictResult');
            resultDiv.innerHTML = `<p class="text-blue-600">جاري تحليل البيانات...</p>`;

            const predictionResult = await callPredict(rec);
            if (predictionResult) displayPredictionResult(predictionResult, rec);
        });
    }

    // زر إعادة تدريب النموذج
    if (el('reloadBtn')) {
        el('reloadBtn').addEventListener('click', reloadModel);
    }

    // شات بوت
    el('sendMessage')?.addEventListener('click', () => sendChatMessage(el('chatInput').value));
    el('chatInput')?.addEventListener('keypress', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendChatMessage(el('chatInput').value);
        }
    });

    // فتح/إغلاق الشات
    const chatBtn = el('chatBotButton');
    const chatWin = el('chatWindow');
    const chatClose = el('closeChat');

    chatBtn?.addEventListener('click', () => {
        chatWin.classList.toggle('hidden');
        chatWin.classList.toggle('opacity-0');
        chatWin.classList.toggle('scale-95');
    });
    chatClose?.addEventListener('click', () => {
        chatWin.classList.add('hidden');
        chatWin.classList.add('opacity-0');
        chatWin.classList.add('scale-95');
    });
});
