import json
import re

with open("frontend/static/js/i18n.js", "r", encoding="utf-8") as f:
    content = f.read()

additions = {
    "en": {
        "cat-water": "Water",
        "cat-roads": "Roads",
        "cat-infrastructure": "Infrastructure",
        "cat-environment": "Environment",
        "cat-education": "Education",
        "cat-health": "Health",
        "cat-other": "Other"
    },
    "hi": {
        "cat-water": "पानी",
        "cat-roads": "सड़कें",
        "cat-infrastructure": "बुनियादी ढांचा",
        "cat-environment": "पर्यावरण",
        "cat-education": "शिक्षा",
        "cat-health": "स्वास्थ्य",
        "cat-other": "अन्य"
    },
    "bn": {
        "cat-water": "জল",
        "cat-roads": "রাস্তা",
        "cat-infrastructure": "অবকাঠামো",
        "cat-environment": "পরিবেশ",
        "cat-education": "শিক্ষা",
        "cat-health": "স্বাস্থ্য",
        "cat-other": "অন্যান্য"
    },
    "te": {
        "cat-water": "నీరు",
        "cat-roads": "రోడ్లు",
        "cat-infrastructure": "మౌలిక సదుపాయాలు",
        "cat-environment": "పర్యావరణం",
        "cat-education": "విద్య",
        "cat-health": "ఆరోగ్యం",
        "cat-other": "ఇతర"
    },
    "ta": {
        "cat-water": "நீர்",
        "cat-roads": "சாலைகள்",
        "cat-infrastructure": "உள்கட்டமைப்பு",
        "cat-environment": "சுற்றுச்சூழல்",
        "cat-education": "கல்வி",
        "cat-health": "சுகாதாரம்",
        "cat-other": "மற்றவை"
    },
    "es": {
        "cat-water": "Agua",
        "cat-roads": "Caminos",
        "cat-infrastructure": "Infraestructura",
        "cat-environment": "Medio Ambiente",
        "cat-education": "Educación",
        "cat-health": "Salud",
        "cat-other": "Otro"
    },
    "fr": {
        "cat-water": "Eau",
        "cat-roads": "Routes",
        "cat-infrastructure": "Infrastructure",
        "cat-environment": "Environnement",
        "cat-education": "Éducation",
        "cat-health": "Santé",
        "cat-other": "Autre"
    }
}

for lang, extra_keys in additions.items():
    pattern = r'(\s*"' + lang + r'": \{)(.*?)(\n\s*\})'
    
    def replacer(match):
        inner_content = match.group(2)
        if "cat-water" in inner_content:
            return match.group(0)
        
        new_items = ""
        for k, v in extra_keys.items():
            val = v.replace('"', '\\"')
            new_items += f',\n    "{k}": "{val}"'
        
        return match.group(1) + inner_content + new_items + match.group(3)
        
    content = re.sub(pattern, replacer, content, flags=re.DOTALL)

with open("frontend/static/js/i18n.js", "w", encoding="utf-8") as f:
    f.write(content)

print("Category translations injected successfully!")
