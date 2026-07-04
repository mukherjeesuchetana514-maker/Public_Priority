import json
import re

with open("frontend/static/js/i18n.js", "r", encoding="utf-8") as f:
    content = f.read()

additions = {
    "en": {
        "status-pending": "Pending",
        "status-progress": "In Progress",
        "status-resolved": "Resolved"
    },
    "hi": {
        "status-pending": "लंबित",
        "status-progress": "प्रगति पर",
        "status-resolved": "हल किया गया"
    },
    "bn": {
        "status-pending": "অমীমাংসিত",
        "status-progress": "চলমান",
        "status-resolved": "সমাধান হয়েছে"
    },
    "te": {
        "status-pending": "పెండింగ్‌లో ఉంది",
        "status-progress": "ప్రగతిలో ఉంది",
        "status-resolved": "పరిష్కరించబడింది"
    },
    "ta": {
        "status-pending": "நிலுவையில் உள்ளது",
        "status-progress": "செயலில் உள்ளது",
        "status-resolved": "தீர்க்கப்பட்டது"
    },
    "es": {
        "status-pending": "Pendiente",
        "status-progress": "En Progreso",
        "status-resolved": "Resuelto"
    },
    "fr": {
        "status-pending": "En attente",
        "status-progress": "En cours",
        "status-resolved": "Résolu"
    }
}

for lang, extra_keys in additions.items():
    pattern = r'(\s*"' + lang + r'": \{)(.*?)(\n\s*\})'
    
    def replacer(match):
        inner_content = match.group(2)
        if "status-resolved" in inner_content:
            return match.group(0)
        
        new_items = ""
        for k, v in extra_keys.items():
            val = v.replace('"', '\\"')
            new_items += f',\n    "{k}": "{val}"'
        
        return match.group(1) + inner_content + new_items + match.group(3)
        
    content = re.sub(pattern, replacer, content, flags=re.DOTALL)

with open("frontend/static/js/i18n.js", "w", encoding="utf-8") as f:
    f.write(content)

print("Status translations injected successfully!")
