import json
import re

with open("frontend/static/js/i18n.js", "r", encoding="utf-8") as f:
    content = f.read()

additions = {
    "en": {
        "chatbot-typing": "Typing...",
        "chatbot-reply-default": "I am a helpful civic AI. I've noted your question and can guide you through the platform!",
        "chatbot-reply-report": "To report an issue, click on 'Suggest Development' in the top navigation bar. You can upload a photo and our AI will automatically fill in the details for you!",
        "chatbot-reply-points": "You earn Civic Points every time you submit a valid report or upvote community suggestions. Officials can see your points on the leaderboard!",
        "chatbot-reply-review": "Your suggestions are sent directly to the verified official dashboard for your respective zone or ward. They review and update the status in real time."
    },
    "hi": {
        "chatbot-typing": "टाइप कर रहा है...",
        "chatbot-reply-default": "मैं एक सहायक नागरिक एआई हूं। मैंने आपका प्रश्न नोट कर लिया है और आपको मंच के माध्यम से मार्गदर्शन कर सकता हूं!",
        "chatbot-reply-report": "किसी समस्या की रिपोर्ट करने के लिए, शीर्ष नेविगेशन बार में 'विकास का सुझाव दें' पर क्लिक करें। आप एक तस्वीर अपलोड कर सकते हैं और हमारा एआई स्वचालित रूप से आपके लिए विवरण भर देगा!",
        "chatbot-reply-points": "हर बार जब आप एक वैध रिपोर्ट सबमिट करते हैं या सामुदायिक सुझावों को वोट देते हैं तो आप नागरिक अंक अर्जित करते हैं। अधिकारी लीडरबोर्ड पर आपके अंक देख सकते हैं!",
        "chatbot-reply-review": "आपके सुझाव सीधे आपके संबंधित ज़ोन या वार्ड के लिए सत्यापित आधिकारिक डैशबोर्ड पर भेजे जाते हैं। वे वास्तविक समय में स्थिति की समीक्षा करते हैं और उसे अपडेट करते हैं।"
    },
    "bn": {
        "chatbot-typing": "টাইপ করছে...",
        "chatbot-reply-default": "আমি একজন সহায়ক নাগরিক এআই। আমি আপনার প্রশ্নটি নোট করেছি এবং আপনাকে প্ল্যাটফর্মের মাধ্যমে গাইড করতে পারি!",
        "chatbot-reply-report": "কোনো সমস্যার রিপোর্ট করতে, শীর্ষ নেভিগেশন বারে 'উন্নয়নের পরামর্শ দিন'-এ ক্লিক করুন। আপনি একটি ছবি আপলোড করতে পারেন এবং আমাদের এআই স্বয়ংক্রিয়ভাবে আপনার জন্য বিবরণ পূরণ করবে!",
        "chatbot-reply-points": "প্রতিবার আপনি একটি বৈধ রিপোর্ট জমা দিলে বা সম্প্রদায় পরামর্শ আপভোট করলে আপনি নাগরিক পয়েন্ট উপার্জন করেন। কর্মকর্তারা লিডারবোর্ডে আপনার পয়েন্ট দেখতে পারেন!",
        "chatbot-reply-review": "আপনার পরামর্শগুলো সরাসরি আপনার নিজ নিজ জোন বা ওয়ার্ডের যাচাইকৃত অফিসিয়াল ড্যাশবোর্ডে পাঠানো হয়। তারা রিয়েল-টাইমে স্থিতি পর্যালোচনা ও আপডেট করে।"
    },
    "te": {
        "chatbot-typing": "టైప్ చేస్తోంది...",
        "chatbot-reply-default": "నేను సహాయక పౌర AI ని. నేను మీ ప్రశ్నను గమనించాను మరియు ప్లాట్‌ఫారమ్ ద్వారా మీకు మార్గనిర్దేశం చేయగలను!",
        "chatbot-reply-report": "సమస్యను నివేదించడానికి, ఎగువ నావిగేషన్ బార్‌లోని 'అభివృద్ధిని సూచించండి' పై క్లిక్ చేయండి. మీరు ఫోటోను అప్‌లోడ్ చేయవచ్చు మరియు మా AI మీ కోసం వివరాలను స్వయంచాలకంగా పూరిస్తుంది!",
        "chatbot-reply-points": "మీరు చెల్లుబాటు అయ్యే నివేదికను సమర్పించిన ప్రతిసారీ లేదా కమ్యూనిటీ సూచనలకు ఓటు వేసిన ప్రతిసారీ మీరు సివిక్ పాయింట్లను పొందుతారు. అధికారులు లీడర్‌బోర్డ్‌లో మీ పాయింట్లను చూడగలరు!",
        "chatbot-reply-review": "మీ సూచనలు మీ సంబంధిత జోన్ లేదా వార్డుకు సంబంధించిన ధృవీకరించబడిన అధికారిక డాష్‌బోర్డ్‌కు నేరుగా పంపబడతాయి. వారు నిజ సమయంలో స్థితిని సమీక్షించి, నవీకరిస్తారు."
    },
    "ta": {
        "chatbot-typing": "தட்டச்சு செய்கிறது...",
        "chatbot-reply-default": "நான் ஒரு பயனுள்ள குடிமை AI. உங்கள் கேள்வியை நான் குறித்துக் கொண்டேன், தளத்தின் மூலம் உங்களுக்கு வழிகாட்ட முடியும்!",
        "chatbot-reply-report": "ஒரு சிக்கலைப் புகாரளிக்க, மேல் வழிசெலுத்தல் பட்டியில் உள்ள 'மேம்பாட்டைப் பரிந்துரைக்க' என்பதைக் கிளிக் செய்யவும். நீங்கள் ஒரு புகைப்படத்தைப் பதிவேற்றலாம் மற்றும் எங்கள் AI தானாகவே உங்களுக்கான விவரங்களை நிரப்பும்!",
        "chatbot-reply-points": "நீங்கள் சரியான அறிக்கையைச் சமர்ப்பிக்கும் அல்லது சமூகப் பரிந்துரைகளுக்கு வாக்களிக்கும் ஒவ்வொரு முறையும் குடிமக்கள் புள்ளிகளைப் பெறுவீர்கள். அதிகாரிகள் உங்கள் புள்ளிகளை லீடர்போர்டில் பார்க்கலாம்!",
        "chatbot-reply-review": "உங்கள் பரிந்துரைகள் நேரடியாக உங்கள் மண்டலம் அல்லது வார்டுக்கான சரிபார்க்கப்பட்ட அதிகாரப்பூர்வ கட்டுப்பாட்டு அறைக்கு அனுப்பப்படும். அவர்கள் நிகழ்நேரத்தில் நிலையை மதிப்பாய்வு செய்து புதுப்பிக்கிறார்கள்."
    },
    "es": {
        "chatbot-typing": "Escribiendo...",
        "chatbot-reply-default": "Soy una IA cívica útil. ¡He anotado tu pregunta y puedo guiarte a través de la plataforma!",
        "chatbot-reply-report": "Para reportar un problema, haz clic en 'Sugerir Desarrollo' en la barra de navegación superior. ¡Puedes subir una foto y nuestra IA completará automáticamente los detalles por ti!",
        "chatbot-reply-points": "Ganas puntos cívicos cada vez que envías un reporte válido o votas por sugerencias de la comunidad. ¡Los oficiales pueden ver tus puntos en la tabla de clasificación!",
        "chatbot-reply-review": "Tus sugerencias se envían directamente al panel oficial verificado de tu zona o barrio respectivo. Ellos revisan y actualizan el estado en tiempo real."
    },
    "fr": {
        "chatbot-typing": "En train d'écrire...",
        "chatbot-reply-default": "Je suis une IA civique utile. J'ai noté votre question et peux vous guider à travers la plateforme !",
        "chatbot-reply-report": "Pour signaler un problème, cliquez sur 'Suggérer un Développement' dans la barre de navigation supérieure. Vous pouvez téléverser une photo et notre IA remplira automatiquement les détails pour vous !",
        "chatbot-reply-points": "Vous gagnez des points civiques chaque fois que vous soumettez un rapport valide ou votez pour des suggestions de la communauté. Les officiels peuvent voir vos points sur le classement !",
        "chatbot-reply-review": "Vos suggestions sont envoyées directement au tableau de bord officiel vérifié de votre zone ou quartier. Ils examinent et mettent à jour le statut en temps réel."
    }
}

for lang, extra_keys in additions.items():
    pattern = r'(\s*"' + lang + r'": \{)(.*?)(\n\s*\})'
    
    def replacer(match):
        inner_content = match.group(2)
        if "chatbot-reply-default" in inner_content:
            return match.group(0)
        
        new_items = ""
        for k, v in extra_keys.items():
            # escape double quotes securely
            val = v.replace('"', '\\"')
            new_items += f',\n    "{k}": "{val}"'
        
        return match.group(1) + inner_content + new_items + match.group(3)
        
    content = re.sub(pattern, replacer, content, flags=re.DOTALL)

with open("frontend/static/js/i18n.js", "w", encoding="utf-8") as f:
    f.write(content)

print("Chatbot translations injected successfully!")
