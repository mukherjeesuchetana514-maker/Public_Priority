import sys

with open("frontend/static/js/i18n.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

# Find the start of the function changeLanguage
start_idx = -1
for i, line in enumerate(lines):
    if line.startswith("function changeLanguage"):
        start_idx = i
        break

if start_idx == -1:
    print("Could not find changeLanguage")
    sys.exit(1)

# Keep everything before changeLanguage
new_content = "".join(lines[:start_idx])

# Append the correct code
correct_code = """function changeLanguage(lang) {
  if (!translations[lang]) return;

  const elements = document.querySelectorAll("[data-i18n]");
  
  elements.forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (translations[lang][key]) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = translations[lang][key];
      } else if (el.tagName === 'OPTION') {
        el.textContent = translations[lang][key];
      } else {
        let hasIcon = el.querySelector('i');
        if (hasIcon) {
           for (let i = 0; i < el.childNodes.length; i++) {
             if (el.childNodes[i].nodeType === 3 && el.childNodes[i].nodeValue.trim() !== '') {
               el.childNodes[i].nodeValue = " " + translations[lang][key] + " ";
               break;
             }
           }
        } else {
           el.textContent = translations[lang][key];
        }
      }
    }
  });

  document.documentElement.lang = lang;

  // Trigger Chart.js and Maps re-renders if available
  if (typeof window.initCitizenHeatmap === 'function') {
      const heatmapSection = document.getElementById('citizen-heatmap-section');
      if (heatmapSection && heatmapSection.style.display !== 'none') {
          window.initCitizenHeatmap();
      }
  }
}

document.addEventListener("DOMContentLoaded", () => {
    const savedLang = localStorage.getItem('appLanguage') || 'en';
    if (savedLang !== 'en') {
        changeLanguage(savedLang);
    }
});
"""

with open("frontend/static/js/i18n.js", "w", encoding="utf-8") as f:
    f.write(new_content + correct_code)

print("Fixed i18n.js logic successfully!")
