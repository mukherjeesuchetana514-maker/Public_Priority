import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp, getDocs, deleteDoc, doc, updateDoc, setDoc, getDoc, query, where, increment, orderBy, limit, arrayUnion } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, signOut, onAuthStateChanged, sendEmailVerification } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

// ============================================
// 📱 SMART DEVICE DETECTION
// ============================================
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 800;
console.log("Device Detected:", isMobile ? "Mobile (Lite Mode)" : "Desktop (Pro Mode)");

// ============================================
// 🛑 YOUR FIREBASE KEYS
// ============================================

const firebaseConfig = {
    apiKey: "AIzaSyCAueBHGfZhXDiTBpV54tLgwHzo3bs8VVY",
    authDomain: "public-priority-db.firebaseapp.com",
    projectId: "public-priority-db",
    storageBucket: "public-priority-db.firebasestorage.app",
    messagingSenderId: "1006933089317",
    appId: "1:1006933089317:web:efeff71f9021e4474cf3cc",
    measurementId: "G-KF5CJDLZWK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ============================================
// 🌍 GLOBAL LANGUAGE TRANSLATION LOGIC
// ============================================
window.addEventListener('DOMContentLoaded', () => {
    const langSet = localStorage.getItem('appLanguage');
    if (!langSet) {
        // Show modal if user has never selected a language
        setTimeout(() => {
            const modalEl = document.getElementById('languageModal');
            if (modalEl) {
                const langModal = new bootstrap.Modal(modalEl);
                langModal.show();
            }
        }, 800); // slight delay to let UI render nicely behind
    }
});

window.saveLanguageAndReload = function() {
    const selectedLang = document.getElementById('appLanguageSelect').value;
    localStorage.setItem('appLanguage', selectedLang);
    
    // Use the native i18n changeLanguage function
    if (typeof changeLanguage === 'function') {
        changeLanguage(selectedLang);
    }
    
    // Hide the modal
    const modalEl = document.getElementById('languageModal');
    if (modalEl) {
        const langModal = bootstrap.Modal.getInstance(modalEl);
        if (langModal) langModal.hide();
    }
}

// Variables
const cameraInput = document.getElementById('cameraInput');
const preview = document.getElementById('preview');
const reportBtn = document.getElementById('reportBtn');
const loading = document.getElementById('loading');
const resultDiv = document.getElementById('result');
const aiText = document.getElementById('aiText');
let fileToAnalyze = null;
let currentUser = null;
let currentLoginType = 'citizen';




const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

const recognition = new SpeechRecognition();

recognition.lang = "en-IN";          // English (India)
recognition.interimResults = true;   // Show text while speaking
recognition.continuous = false;      // Stop after one sentence


// ============================================
// 🟢 SESSION RESTORER
// ============================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            currentUser.role = userData.role;
            currentUser.org = userData.org || "";
            currentUser.zone_name = userData.zone_name || "";

            if (userData.role === 'official') {
                currentLoginType = 'official';
                document.getElementById('nav-citizen').style.display = 'none';
                document.getElementById('nav-official').style.display = 'flex';
                const orgDisplay = document.getElementById('org-name-display');
                if (orgDisplay) orgDisplay.innerText = `🏛️ ${userData.org || userData.zone_name}`;
            } else {
                currentLoginType = 'citizen';
                document.getElementById('loginBtn').style.display = 'none';
                document.getElementById('logoutBtn').style.display = 'block';

                const pointsEl = document.getElementById("civic-points");
                if (pointsEl) pointsEl.innerText = userData.civicPoints || 0;
            }
        }
    } else {
        currentUser = null;
    }
});

// ============================================
// 1. UI HELPERS
// ============================================

const showPopup = (title, text, icon) => {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: title,
            text: text,
            icon: icon,
            confirmButtonColor: '#198754',
            borderRadius: '20px'
        });
    } else {
        alert(`${title}: ${text}`);
    }
};

window.forgotPassPopup = () => {
    const modelel = document.getElementById('loginModal');
    const model = bootstrap.Modal.getInstance(modelel);
    if (model) model.hide();

    Swal.fire({
        title: 'Reset Password',
        input: 'email',
        inputPlaceholder: 'Enter your email address',
        showCancelButton: true,
        confirmButtonText: 'Send Link',
        confirmButtonColor: '#198754',
    }).then((result) => {
        if (result.isConfirmed) {
            handleReset(result.value);
        }
    });
};

window.openImage = function (imgData) {
    if (!imgData || imgData === '#' || imgData.length < 100) {
        showPopup("No Image", "This report has no valid image.", "info");
        return;
    }
    const w = window.open("");
    w.document.write(`<img src="${imgData}" style="width:100%; max-width:800px;">`);
}

// 🟢 SMART COMPRESSION
const compressImage = async (file) => {
    const targetWidth = isMobile ? 400 : 800;

    if (window.createImageBitmap) {
        try {
            const bitmap = await createImageBitmap(file, {
                resizeWidth: targetWidth,
                resizeQuality: 'medium'
            });

            const canvas = document.createElement('canvas');
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(bitmap, 0, 0);

            bitmap.close();
            return canvas.toDataURL('image/jpeg', 0.6);
        } catch (e) {
            console.log("Bitmap method failed, using fallback.");
        }
    }

    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.src = url;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const scaleSize = targetWidth / img.width;

            if (img.width > targetWidth) {
                canvas.width = targetWidth;
                canvas.height = img.height * scaleSize;
            } else {
                canvas.width = img.width;
                canvas.height = img.height;
            }

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.onerror = (error) => reject(error);
    });
};

window.setLoginType = function (type) {
    currentLoginType = type;
    const btn = document.getElementById('loginSubmitBtn');
    const orgInput = document.getElementById('orgInputGroup');
    const createLink = document.getElementById('createAccountLink');
    const tabCitizen = document.getElementById('tab-citizen');
    const tabOfficial = document.getElementById('tab-official');

    if (type === 'official') {
        btn.innerText = "Login to Dashboard";
        btn.className = "btn btn-dark-official w-100 rounded-pill py-3 fw-bold shadow-sm";
        orgInput.style.display = 'block';
        createLink.style.display = 'block';
        tabCitizen.classList.remove('active');
        tabOfficial.classList.add('active');
    } else {
        btn.innerText = "Login as Citizen";
        btn.className = "btn btn-enchanting w-100 rounded-pill py-3 fw-bold shadow-sm";
        orgInput.style.display = 'none';
        createLink.style.display = 'block';
        tabCitizen.classList.add('active');
        tabOfficial.classList.remove('active');
    }
}

window.prepareSignupModal = function () {
    // const orgGroup = document.getElementById('signupOrgGroup');
    const title = document.getElementById('signupTitle');
    const btn = document.getElementById('signupSubmitBtn');
    const z = document.getElementById('zonename');
    const z_type = document.getElementById('signupZoneType');
    const z_name = document.getElementById('signupZoneName');
    if (currentLoginType === 'official') {
        z.style.display = 'block';
        z_type.disabled = false;
        z_name.disabled = false;
        // orgGroup.style.display = 'block';
        title.innerText = "Official Registration 🏛️";
        btn.innerText = "Create Official Account";
        btn.className = "btn btn-dark-official w-100 rounded-pill py-3 fw-bold";
    } else {
        z.style.display = 'none';
        z_type.disabled = true;
        z_name.disabled = true;
        // orgGroup.style.display = 'none';
        title.innerText = "Join the Movement 🌍";
        btn.innerText = "Create Citizen Account";
        btn.className = "btn btn-enchanting w-100 rounded-pill py-3 fw-bold";
    }
}

window.showSection = function (sectionId) {
    document.querySelectorAll('.section-view').forEach(el => el.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
    const navbarToggler = document.querySelector('.navbar-toggler');
    const navbarCollapse = document.querySelector('.navbar-collapse');
    if (navbarCollapse.classList.contains('show')) navbarToggler.click();

    if (sectionId === 'citizen-heatmap-section' && typeof window.initCitizenHeatmap === 'function') {
        window.initCitizenHeatmap();
    }
}


window.loadLeaderboard = async function () {
    const tableBody = document.getElementById('leaderboard-body');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="4" class="text-center p-4">Loading top contributors...</td></tr>';

    try {
        const q = query(
            collection(db, "users"),
            where("role", "==", "citizen"),
            orderBy("civicPoints", "desc"),
            limit(50)
        );

        const querySnapshot = await getDocs(q);
        let rowsHtml = '';
        let rank = 1;
        let count = 0;

        if (querySnapshot.empty) {
            rowsHtml = `<tr><td colspan="4" class="text-center p-4 text-muted">No contributors found yet.</td></tr>`;
        } else {
            const myZone = currentUser.role === 'official' ? (currentUser.zone_name || "").toLowerCase().trim() : null;

            querySnapshot.forEach((doc) => {
                const user = doc.data();
                const userZone = (user.zone_name || "").toLowerCase().trim();
                const points = user.civicPoints || 0;

                let showUser = true;
                if (currentUser.role === 'official') {
                    if (!userZone.includes(myZone) && !myZone.includes(userZone)) {
                        showUser = false;
                    }
                }

                if (showUser && count < 10) {
                    count++;
                    rowsHtml += `
                        <tr>
                            <td class="p-3 fw-bold">#${rank++}</td>
                            <td class="p-3">
                                <div class="d-flex align-items-center">
                                    <div class="bg-light rounded-circle d-flex align-items-center me-2" style="width: 35px; height: 35px; justify-content:center;">
                                        <i class="bi bi-person-fill text-secondary"></i>
                                    </div>
                                    ${user.name}
                                </div>
                            </td>
                            <td class="p-3"><span class="badge bg-warning text-dark rounded-pill px-3">🏆 ${points}</span></td>
                            <td class="p-3 text-muted small">${user.email || "No Email"}</td>
                        </tr>`;
                }
            });
        }

        if (rowsHtml === '') {
            rowsHtml = `<tr><td colspan="4" class="text-center p-4 text-muted">No contributors found in your zone yet.</td></tr>`;
        }

        tableBody.innerHTML = rowsHtml;

    } catch (error) {
        console.error("Error loading leaderboard:", error);
        if (error.message.includes("index")) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center p-4">
                        <span class="text-danger fw-bold">⚠️ Database Index Missing</span><br>
                        <small>Open your Desktop Browser Console (F12) and click the <a href="#" onclick="alert('Open Console (F12) to click the blue link!')">Long Blue Link</a> to create it.</small>
                        <br><br>
                        <small class="text-muted">${error.message}</small>
                    </td>
                </tr>`;
        } else {
            tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger p-3">Error: ${error.message}</td></tr>`;
        }
    }
}

let map;

window.initMap = async function () {
    if (map) {
        setTimeout(() => map.invalidateSize(), 100);
        return;
    }

    if (!currentUser) {
        showPopup("Login Required", "Please login to view the map.", "warning");
        return;
    }

    map = L.map('civicMap').setView([22.75, 88.34], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    try {
        const q = query(collection(db, "reports"), where("zone_name", "==", currentUser.zone_name));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            showPopup("No Data", "No reports found for the map.", "info");
        }

        querySnapshot.forEach((doc) => {
            const report = doc.data();
            if (report.location && report.location.lat && report.location.lng) {
                const markerColor = report.status === 'Solved' ? 'green' : 'red';
                const marker = L.marker([report.location.lat, report.location.lng]).addTo(map);
                marker.bindPopup(`
                    <b>Issue:</b> ${report.issue}<br>
                    <b>Status:</b> <span style="color:${markerColor}">${report.status}</span><br>
                    <small>${new Date(report.timestamp.seconds * 1000).toLocaleDateString()}</small><br>
                    <img src="${report.imageUrl}" style="width:100px; margin-top:5px; border-radius:5px;">
                `);
            }
        });
    } catch (error) {
        console.error("Error loading map data:", error);
    }
}

window.checkAuthAndShow = function (sectionId) {
    if (!currentUser) {
        showPopup("Access Restricted", "Please Login to report issues.", "warning");
        const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
        loginModal.show();
    } else {
        showSection(sectionId);
        if (sectionId === 'user-dashboard-section') loadUserDashboard();
        if (sectionId === 'leaderboard-section') loadLeaderboard();
    }
}

// Global variables to store detected location
window.detectedGlobalLocation = null;
window.detectedGlobalSource = "Manual/None";
window.detectedGlobalZone = "Unknown Zone";

async function reverseGeocodeAndSetLocation(lat, lng, source) {
    let detectedZone = "Unknown Zone";
    const locInput = document.getElementById('devLocation');
    try {
        const geoUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
        const geoResponse = await fetch(geoUrl);
        const geoData = await geoResponse.json();

        detectedZone = geoData.locality || geoData.city || geoData.principalSubdivision || geoData.countryName || "Unknown Zone";
        detectedZone = detectedZone.trim();
        if (locInput) locInput.value = detectedZone;
        
        window.detectedGlobalLocation = { lat, lng };
        window.detectedGlobalSource = source;
        window.detectedGlobalZone = detectedZone;
    } catch (e) {
        console.log("Zone detection failed", e);
        detectedZone = `Zone (${lat.toFixed(2)}, ${lng.toFixed(2)})`;
        if (locInput) locInput.value = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        window.detectedGlobalLocation = { lat, lng };
        window.detectedGlobalSource = source;
        window.detectedGlobalZone = detectedZone;
    }
}

function autoDetectLocation(file) {
    const locInput = document.getElementById('devLocation');
    if (locInput) locInput.value = "Detecting location...";

    function getDeviceLocation() {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => reverseGeocodeAndSetLocation(pos.coords.latitude, pos.coords.longitude, "Device GPS"),
                (err) => {
                    if (locInput) locInput.value = "";
                },
                { enableHighAccuracy: true, timeout: 5000 }
            );
        }
    }

    if (file && typeof EXIF !== 'undefined') {
        EXIF.getData(file, function () {
            const lat = EXIF.getTag(this, "GPSLatitude");
            const lng = EXIF.getTag(this, "GPSLongitude");

            if (lat && lng) {
                const finalLat = convertDMSToDD(lat, EXIF.getTag(this, "GPSLatitudeRef"));
                const finalLng = convertDMSToDD(lng, EXIF.getTag(this, "GPSLongitudeRef"));
                reverseGeocodeAndSetLocation(finalLat, finalLng, "Image Data (EXIF)");
            } else {
                getDeviceLocation();
            }
        });
    } else {
        getDeviceLocation();
    }
}

if (cameraInput) {
    cameraInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            fileToAnalyze = file;
            preview.src = URL.createObjectURL(file);
            preview.style.display = 'block';
            const aiAnalyzeBtn = document.getElementById('aiAnalyzeBtn');
            if (aiAnalyzeBtn) aiAnalyzeBtn.style.display = 'block';
            reportBtn.style.display = 'block';
            
            // Auto detect location immediately
            autoDetectLocation(file);
        }
    });
}

const aiAnalyzeBtn = document.getElementById('aiAnalyzeBtn');
const aiLoading = document.getElementById('aiLoading');
const devTitle = document.getElementById('devTitle');
const devDescription = document.getElementById('devDescription');
const devCategory = document.getElementById('devCategory');

if (aiAnalyzeBtn) {
    aiAnalyzeBtn.addEventListener('click', async () => {
        if (!fileToAnalyze) return;
        
        const API_KEY = (window.CONFIG && window.CONFIG.GEMINI_API_KEY) ? window.CONFIG.GEMINI_API_KEY : "KEY_NOT_FOUND";
        if (API_KEY === "KEY_NOT_FOUND" || API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
            showPopup("Error", "Gemini API Key not found in config.js", "error");
            return;
        }

        aiAnalyzeBtn.style.display = 'none';
        if (aiLoading) aiLoading.style.display = 'block';

        try {
            const compressedImage = await compressImage(fileToAnalyze);
            const genAI = new GoogleGenerativeAI(API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
            const base64Data = compressedImage.split(',')[1];
            
            const prompt = "Analyze this image of a civic issue (e.g., garbage, pothole). Provide a short title, a detailed description, and the category it belongs to. Valid categories are: Infrastructure, Environment, Education, Health, Other. Return strictly in JSON format like this: {\"title\": \"Short Title Here\", \"description\": \"Detailed description here.\", \"category\": \"Environment\"}";
            const imagePart = { inlineData: { data: base64Data, mimeType: "image/jpeg" } };
            
            const result = await model.generateContent([prompt, imagePart]);
            let textResult = (await result.response).text();
            
            textResult = textResult.replace(/```json/g, '').replace(/```/g, '').trim();
            const aiData = JSON.parse(textResult);
            
            if (devTitle) devTitle.value = aiData.title || "";
            if (devDescription) devDescription.value = aiData.description || "";
            if (devCategory && aiData.category) {
                const validCategories = ["Infrastructure", "Environment", "Education", "Health", "Other"];
                const matchedCategory = validCategories.find(c => c.toLowerCase() === aiData.category.toLowerCase());
                if (matchedCategory) devCategory.value = matchedCategory;
            }
            
            showPopup("AI Analysis Complete", "Details have been auto-filled.", "success");
        } catch (error) {
            console.error("AI Analysis Error:", error);
            showPopup("Error", "Could not analyze image. Please try again.", "error");
        } finally {
            if (aiLoading) aiLoading.style.display = 'none';
            aiAnalyzeBtn.style.display = 'block';
        }
    });
}

// ============================================
// 🤖 TENSORFLOW (SMART LOADING)
// ============================================
let tfModel = null;
if (!isMobile && typeof cocoSsd !== 'undefined') {
    console.log("🖥️ Desktop detected: Loading TensorFlow...");
    cocoSsd.load().then(loadedModel => {
        tfModel = loadedModel;
        console.log("⚡ TensorFlow Edge Model Loaded!");
    }).catch(err => console.log("TensorFlow failed:", err));
} else {
    console.log("📱 Mobile detected: Skipped TensorFlow to save memory.");
}

async function addCivicPoints(user, points = 10) {
    if (!user) return;
    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            const currentPoints = userSnap.data().civicPoints || 0;
            await updateDoc(userRef, { civicPoints: currentPoints + points });
        }
    } catch (e) { console.log("Error adding points:", e); }
}

// 🟢 NEW: HELPER FOR EXIF DATA
function convertDMSToDD(coords, ref) {
    let dd = coords[0] + coords[1] / 60 + coords[2] / 3600;
    if (ref == "S" || ref == "W") dd = dd * -1;
    return dd;
}

// 🟢 REPORT ACTION
if (reportBtn) {
    reportBtn.addEventListener('click', async () => {
        // UI Updates
        loading.style.display = 'block';
        reportBtn.disabled = true;
        reportBtn.innerText = "Submitting...";

        try {
            const title = document.getElementById('devTitle').value || "Untitled Report";
            const category = document.getElementById('devCategory').value || "Other";
            const description = document.getElementById('devDescription').value || "";
            const transcript = window.transcript || "";
            const locationStr = document.getElementById('devLocation').value || "Unknown Location";
            
            let lat = 0; let lng = 0;
            let detectedZone = locationStr;
            let locationSource = "Manual Entry";
            
            if (window.detectedGlobalLocation) {
                lat = window.detectedGlobalLocation.lat;
                lng = window.detectedGlobalLocation.lng;
                detectedZone = window.detectedGlobalZone;
                locationSource = window.detectedGlobalSource;
            }

            // VACATION CHECK (Home vs Detected)
            if (currentUser && currentUser.zone_name) {
                const userHomeZone = currentUser.zone_name.trim();
                if (userHomeZone.toLowerCase() !== detectedZone.toLowerCase() && detectedZone !== "Unknown Zone") {
                    showPopup("📍 Outside Home Zone", `You are currently in ${detectedZone}. This report will be sent to ${detectedZone} officials, not ${userHomeZone}.`, "info");
                }
            }

            // COMPRESS & SAVE TO FIREBASE
            let compressedImage = "";
            let tfResultText = "Skipped";
            if (fileToAnalyze) {
                compressedImage = await compressImage(fileToAnalyze);
                if (tfModel) {
                    try {
                        const imgForTf = document.getElementById('preview');
                        const predictions = await tfModel.detect(imgForTf);
                        if (predictions.length > 0) tfResultText = `Found: ${predictions.map(p => p.class).join(", ")}`;
                        else tfResultText = "No specific objects found.";
                    } catch (e) { console.log("TF Skipped", e); }
                }
            }

            let geminiText = (title && description) ? `${title} - ${description}` : "User Report without details";
            const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;

            await addDoc(collection(db, "reports"), {
                issue: geminiText,
                imageUrl: compressedImage,
                tf_detection: tfResultText,
                title: title,
                category: category,
                description: description,
                transcript: transcript,
                severity: "High",
                status: "Pending",
                adminComment: "",
                location: { lat: lat, lng: lng },
                locationSource: locationSource,
                zone_name: detectedZone,
                googleMapsLink: mapUrl,
                timestamp: serverTimestamp(),
                vote: 0,
                votedBy: [],
                userEmail: currentUser ? currentUser.email : "Anonymous"
            });

            if (currentUser && currentUser.uid) {
                await addCivicPoints(currentUser, 10);
            }

            // UI Finalize
            aiText.innerHTML = `
                <div class="alert alert-secondary py-1 mb-2" style="font-size:0.9em">⚡ <strong>Edge AI:</strong> ${tfResultText}</div>
                <strong>Details:</strong> ${title}<br>
                <small class="text-muted">📍 Location: ${detectedZone} (${locationSource})</small><br><br>
                <p>This report is sent to ${detectedZone} Corporation</p>
                <a href="${mapUrl}" target="_blank" style="color:var(--primary-color);">View Map</a>
                <p style="color:rgb(20,231,20); font-weight: bolder;">REPORT SENT! +10 POINTS</P>
            `;

            loading.style.display = 'none';
            resultDiv.style.display = 'block';
            showPopup("Report Filed! ✅", `Your report has been sent to the ${detectedZone} Corporation/Official. (+10 Points)`, "success");
            reportBtn.innerText = "Report Issue";
            reportBtn.disabled = false;

        } catch (error) {
            console.error("Error:", error);
            loading.style.display = 'none';
            showPopup("Error", "Debug: " + error.message, "error");
            reportBtn.innerText = "Report Issue";
            reportBtn.disabled = false;
        }
    });
}

// ... (Rest of Auth/Dashboard handlers) ...

window.handleLogin = async function () {
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPass').value;
    const role = document.getElementById('tab-official') && document.getElementById('tab-official').classList.contains('active') ? 'official' : 'citizen';
    const btn = document.getElementById('loginSubmitBtn');
    const originalText = btn.innerText;

    btn.innerText = "Verifying...";
    btn.disabled = true;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        const user = userCredential.user;

        // 🟢 SECURITY: CHECK VERIFICATION
        if (!user.emailVerified) {
            await signOut(auth);
            throw new Error("Please verify your email address before logging in. Check your inbox.");
        }

        const userDoc = await getDoc(doc(db, "users", user.uid));

        if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.role !== role) throw new Error(`Please login as ${data.role}`);

            currentUser = { uid: user.uid, name: data.name, email: email, role: data.role, zone_name: data.zone_name, zone_type: data.zone_type };
            localStorage.setItem('user', JSON.stringify(currentUser));

            const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
            if (modal) modal.hide();
            showPopup("Welcome!", `Logged in as ${data.role}`, "success");

            if (currentUser.role === 'official') {
                document.getElementById('nav-citizen').style.display = 'none';
                document.getElementById('nav-official').style.display = 'flex';
                document.getElementById('org-name-display').innerText = `🏛️ ${currentUser.zone_name}`;
                showSection('admin-section');
                loadDashboard();
                officialMenu('dash');
                dashbord();
            } else {
                document.getElementById('nav-citizen').style.display = 'flex';
                document.getElementById('nav-official').style.display = 'none';
                document.getElementById('loginBtn').style.display = 'none';
                document.getElementById('logoutBtn').style.display = 'block';
                showSection('home-section');
                loadUserDashboard();
            }
        } else { throw new Error("User record not found."); }
    } catch (error) { showPopup("Login Failed", error.message, "error"); } finally { btn.innerText = originalText; btn.disabled = false; }
}

window.handleSignup = async function () {
    const email = document.getElementById('signupEmail').value;
    const pass = document.getElementById('signupPass').value;
    const name = document.getElementById('signupName').value;


    // 🟢 SECURITY: STRONG PASSWORD CHECK
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!strongPasswordRegex.test(pass)) {
        showPopup("Weak Password", "Password must be 8+ chars, with Uppercase, Number & Symbol.", "error");
        return;
    }

    try {

        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const uid = userCredential.user.uid;
        // 🟢 SECURITY: SEND VERIFICATION EMAIL
        await sendEmailVerification(userCredential.user);

        const commonData = { name: name, email: email, createdAt: serverTimestamp() };

        if (currentLoginType === 'official') {
            const zoneType = document.getElementById('signupZoneType').value;
            const zoneName = document.getElementById('signupZoneName').value;

            if (!name || !email || !pass || !zoneName) throw new Error("Please fill in all fields.");

            await setDoc(doc(db, "users", uid), { ...commonData, zone_type: zoneType, zone_name: zoneName, role: 'official', organization: zoneName });
        } else {

            if (!name || !email || !pass) throw new Error("Please fill in all fields.");



            await setDoc(doc(db, "users", uid), { ...commonData, role: 'citizen', civicPoints: 0 });
        }

        // 🟢 LOGOUT IMMEDIATELY FOR VERIFICATION
        await signOut(auth);

        const modal = bootstrap.Modal.getInstance(document.getElementById('signupModal'));
        if (modal) modal.hide();
        showPopup("Registration Successful", `Verification link sent to ${email}. Please verify before logging in.`, "success");

    } catch (error) { showPopup("Signup Failed", error.message, "error"); }
}

// 🟢 NEW: AUTO DETECT ZONE FOR SIGNUP
window.detectSignupLocation = function () {
    const btn = document.querySelector('button[onclick="detectSignupLocation()"]');
    if (btn) btn.innerText = "Locating...";

    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
            try {
                // const { latitude, longitude, accuracy } = pos.coords;

                const latitude = pos.coords.latitude;
                const longitude = pos.coords.longitude;


                const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
                const response = await fetch(url);
                const data = await response.json();

                const zone = data.address.city || data.address.town || data.address.village || data.address.state_district || data.address.county || "Unknown";
                console.log(data.address.state_district);
                console.log(latitude);
                console.log(longitude);
                // console.log("accuracy ",accuracy, "meter");
                document.getElementById('signupZoneName').value = zone;
                if (btn) {
                    btn.innerText = "✅ Found";
                    btn.className = "btn btn-success";
                }
            } catch (e) {
                if (btn) btn.innerText = "❌ Failed";
                alert("Could not detect. Please type manually.");
            }
        }, console.error, { enableHighAccuracy: true });
    } else {
        alert("Geolocation not supported.");
    }
}

window.handleLogout = async function () {
    await signOut(auth);
    currentUser = null;
    localStorage.removeItem('user');
    showPopup("Logged Out", "See you next time!", "info");
    setTimeout(() => window.location.reload(), 1500);
}

window.handleReset = async function (email) {
    if (!email) return;
    try {
        await sendPasswordResetEmail(auth, email);
        showPopup("Email Sent", "Check your inbox.", "success");
    } catch (error) {
        showPopup("Error", error.message, "error");
    }
}

window.loadUserDashboard = async function () {
    if (!currentUser) return;
    const container = document.getElementById('user-reports-container');
    container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-success"></div></div>';

    try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        const pointsEl = document.getElementById("civic-points");
        if (pointsEl && userDoc.exists()) pointsEl.innerText = userDoc.data().civicPoints || 0;
    } catch (e) { }

    try {
        const q = query(
            collection(db, "reports"),
            where("userEmail", "==", currentUser.email),
            orderBy("timestamp", "desc")
        );
        const querySnapshot = await getDocs(q);
        let html = "";

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const date = data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleDateString() : "Just now";
            let statusColor = data.status === "Resolved" ? "bg-success" : (data.status === "In Progress" ? "bg-primary" : "bg-warning");
            let bgImage = data.imageUrl || 'https://via.placeholder.com/600x400?text=No+Image';
            let replyHtml = `<div class="p-3 bg-light rounded text-muted small text-center mt-3">Waiting for official response...</div>`;
            if (data.adminComment && data.adminComment.trim() !== "") {
                replyHtml = `<div class="p-3 bg-info bg-opacity-10 border border-info rounded mt-3"><strong>🏛️ Official Reply:</strong><p class="mb-0 mt-1 text-dark">${data.adminComment}</p></div>`;
            }

            html += `
            <div class="col-md-6 mb-4">
                <div class="card h-100 shadow-sm border-0 rounded-4">
                    <div style="height: 220px; background-image: url('${bgImage}'); background-size: cover; background-position: center; border-radius: 16px 16px 0 0; position: relative;">
                        <span class="badge ${statusColor} position-absolute top-0 end-0 m-3 px-3 py-2 shadow-sm">${data.status || "Pending"}</span>
                    </div>
                    <div class="card-body">
                        <small class="text-muted d-block mb-2">📅 ${date} • 📍 ${data.zone_name || "Unknown"}</small>
                        <h5 class="card-title text-capitalize fw-bold">${(data.issue || "Issue").substring(0, 40)}...</h5>
                        <p class="text-muted small">${data.issue}</p>
                        ${replyHtml}
                    </div>
                </div>
            </div>`;
        });
        container.innerHTML = html || '<div class="text-center text-muted mt-5"><h5>No reports found.</h5></div>';
    } catch (e) {
        container.innerHTML = '<p class="text-danger text-center">Error loading history.</p>';
        console.error(e);
    }
}


window.toggle_official_sidebar = async function () {
    
    const sidebar = document.getElementById("official-sidebar");
    const toggle = document.getElementById("toggleSidebar");

    sidebar.classList.toggle("open");

    if (sidebar.classList.contains("open")) {
        toggle.innerHTML = "◀";
    } else {
        toggle.innerHTML = "▶";
    }
}


window.loadDashboard = async function () {
    const container = document.getElementById('reports-container');
    container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>';

    if (!currentUser || currentUser.role !== 'official') {
        container.innerHTML = '<div class="text-center text-danger py-5">Access Denied.</div>';
        return;
    }

    const myZone = (currentUser.zone_name || "").toLowerCase().trim();

    try {

        const q = query(collection(db, "reports"), orderBy("timestamp", "desc"));


        const querySnapshot = await getDocs(q);
        let html = "";
        let count = 0;

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const reportZone = (data.zone_name || "").toLowerCase().trim();

            if (reportZone && (myZone.includes(reportZone) || reportZone.includes(myZone))) {
                count++;
                const date = data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleDateString() : "Just now";
                let statusColor = data.status === "In Progress" ? "bg-primary" : (data.status === "Resolved" ? "bg-success" : "bg-warning");
                let bgImage = data.imageUrl || 'https://via.placeholder.com/600x400';

                html += `
                <div class="col-md-6 mb-4">
                    <div class="card h-100 shadow-sm border-0 rounded-4">
                        <div style="height: 220px; background-image: url('${bgImage}'); background-size: cover; position: relative;">
                            <span class="badge ${statusColor} position-absolute top-0 end-0 m-3" id="badge-${doc.id}">${data.status}</span>
                        </div>
                        <div class="card-body">
                            <div class="d-flex justify-content-between"><small>📅 ${date}</small><small class="text-primary fw-bold">📍 ${data.zone_name}</small></div>
                            <h5 class="card-title text-capitalize">${(data.issue || "Issue").substring(0, 40)}...</h5>
                            <div class="d-flex gap-2 mb-3">
                                <a href="${data.googleMapsLink}" target="_blank" class="btn btn-sm btn-outline-primary w-50 rounded-pill">View Map</a>
                                <button onclick="details('${doc.id}','loadDashboard','reports-container')" class="btn btn-sm btn-outline-secondary w-50 rounded-pill">Details</button>
                            </div>
                            <div class="bg-light p-3 rounded-4">
                                <select class="form-select form-select-sm mb-2 rounded-pill" onchange="updateStatus('${doc.id}', this.value)">
                                    <option value="Pending" ${data.status === 'Pending' ? 'selected' : ''}>⏳ Pending</option>
                                    <option value="In Progress" ${data.status === 'In Progress' ? 'selected' : ''}>🛠️ In Progress</option>
                                    <option value="Resolved" ${data.status === 'Resolved' ? 'selected' : ''}>✅ Resolved</option>
                                </select>
                                <div class="input-group input-group-sm">
                                    <input type="text" class="form-control rounded-start-pill" placeholder="Reply..." id="comment-${doc.id}" value="${data.adminComment || ''}">
                                    <button class="btn btn-secondary rounded-end-pill" onclick="saveComment('${doc.id}')">Save</button>
                                </div>
                                <button class="btn btn-outline-danger btn-sm mt-2 w-100 rounded-pill" onclick="deleteReport('${doc.id}')">Delete</button>
                            </div>
                        </div>
                    </div>
                </div>`;
            }
        });
        container.innerHTML = html || '<div class="text-center py-5"><h3>No reports found for this zone.</h3></div>';
        const totalCounter = document.getElementById('total-reports');
        if (totalCounter) totalCounter.innerText = count;
    } catch (e) {
        console.error(e);
        container.innerHTML = '<p class="text-danger text-center">Error loading data.</p>';
    }
}


window.details = async function(id,p,container_name) {
    const container = document.getElementById(container_name);
    const sync = await getDoc(doc(db, "reports", id));

    if (!sync.exists()) return;

    const data = sync.data();
            const reportZone = (data.zone_name || "").toLowerCase().trim();

            
                const date = data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleDateString() : "Just now";
                let statusColor = data.status === "In Progress" ? "bg-primary" : (data.status === "Resolved" ? "bg-success" : "bg-warning");
                let bgImage = data.imageUrl || 'https://via.placeholder.com/600x400';
                let html ="";
                html += `
<div class="container py-4">

    <div class="card shadow-lg border-0 rounded-4 overflow-hidden">

        <!-- Image -->
        <img src="${bgImage}"
             class="card-img-top"
             style="height:350px;object-fit:cover;">

        <span class="badge ${statusColor} position-absolute top-0 end-0 m-3 px-3 py-2 fs-6">
            ${data.status}
        </span>

        <div class="card-body p-4">

            <!-- Title -->
            <h2 class="fw-bold mb-3">
                ${data.issue || "Issue"}
            </h2>

            <!-- Info -->
            <div class="row g-3 mb-4">

                <div class="col-md-6">
                    <div class="bg-light rounded-3 p-3">
                        <small class="text-muted">📅 Report Date</small>
                        <div class="fw-semibold">${date}</div>
                    </div>
                </div>

                <div class="col-md-6">
                    <div class="bg-light rounded-3 p-3">
                        <small class="text-muted">📍 Zone</small>
                        <div class="fw-semibold">${data.zone_name}</div>
                    </div>
                </div>

                <div class="col-md-6">
                    <div class="bg-light rounded-3 p-3">
                        <small class="text-muted">📂 Category</small>
                        <div class="fw-semibold">${data.category || "-"}</div>
                    </div>
                </div>

                <div class="col-md-6">
                    <div class="bg-light rounded-3 p-3">
                        <small class="text-muted">🚦 Status</small>
                        <div class="fw-semibold">${data.status}</div>
                    </div>
                </div>

            </div>

            <!-- Description -->
            <div class="mb-4">
                <h4 class="fw-bold">Description</h4>
                <div class="bg-light rounded-3 p-3">
                    ${data.description || "No description provided."}
                </div>
            </div>

            <!-- Buttons -->
            <div class="d-flex flex-wrap gap-3">

                <a href="${data.googleMapsLink}"
                   target="_blank"
                   class="btn btn-primary rounded-pill px-4">
                    📍 View Location
                </a>

                <button
                    class="btn btn-outline-secondary rounded-pill px-4"
                    onclick="openImage('${data.imageUrl}')">
                    🖼 View Photo
                </button>

                <button
                    class="btn btn-outline-dark rounded-pill px-4"
                    onclick="detail_back('${p}')">
                    ← Back
                </button>

            </div>

        </div>

    </div>

</div>
`;
            container.innerHTML = html || '<div class="text-center py-5"><h3>No reports found for this zone.</h3></div>';
            }




window.detail_back= function(p){
    if(p==='loadDashboard'){
        loadDashboard();
    }else if(p==='recomended'){
        recomended();
    }
}
// window.suggestion = async function(){
//     document.getElementById('admin-section').style.display ="none";
//     document.getElementById('suggestion').style.display ="block";

// }

window.officialMenu = async function(page){

    // Hide every admin page
    document.querySelectorAll(".official-page").forEach(item=>{
        item.classList.remove("active");
    });

    // Show selected page
    document.getElementById(page).classList.add("active");

    if (page === 'heatmap') {
        if (typeof window.initOfficialHeatmap === 'function') {
            window.initOfficialHeatmap();
        }
    }
}


window.dashbord = async function() {
    const total_reports = document.getElementById('development_suggstion');
    const approve = document.getElementById('approve_project');
    const pending_review = document.getElementById('pending_review');

    const snapshot = await getDocs(collection(db, "reports"));

    let totalReports = 0;
    let approvedReports = 0;
    let pendingReports = 0;

    snapshot.forEach((doc) => {
        totalReports++;

        const data = doc.data();

        if (data.status === "Resolved") {
            approvedReports++;
        } else if (data.status === "Pending") {
            pendingReports++;
        }
    });

    // Update the dashboard
    total_reports.innerText = totalReports;
    approve.innerText = approvedReports;
    pending_review.innerText = pendingReports;

}




// function for community suggstion

window.community = async function () {
    const container = document.getElementById('community-reports-container');
    container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>';


    
    try {

        const q = query(collection(db, "reports"), orderBy("timestamp", "desc"));


        const querySnapshot = await getDocs(q);
        let html = "";
        let count = 0;
        const myZone = (currentUser.zone_name || "").toLowerCase().trim();

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const reportZone = (data.zone_name || "").toLowerCase().trim();
            const hasVoted = data.votedBy?.includes(currentUser.uid);
            const time = timeAgo(data.timestamp);
            if (reportZone && (myZone.includes(reportZone) || reportZone.includes(myZone))) {
                count++;
                const date = data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleDateString() : "Just now";
                let statusColor = data.status === "In Progress" ? "bg-primary" : (data.status === "Resolved" ? "bg-success" : "bg-warning");
                let bgImage = data.imageUrl || 'https://via.placeholder.com/600x400';

                html += `<div class="col-md-6 col-lg-4">

                <div class="glass-card p-4 rounded-4 shadow-sm h-100 d-flex flex-column"
                    style="background: white;">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <span class="badge rounded-pill bg-primary-subtle text-primary fw-bold px-3 py-2" data-i18n="cat-infra-badge">
                            ${data.category}
                        </span>
                        <span class="badge rounded-pill bg-light text-muted small" data-i18n="time-2days">
                            ${time}
                        </span>
                    </div>
                    <h5 class="fw-bold text-dark mb-2" data-i18n="comm-card1-title">
                        ${data.title}
                    </h5>
                    <p class="text-muted small mb-3 flex-grow-1" data-i18n="comm-card1-desc">
                        ${data.description}
                    </p>
                    <div class="d-flex align-items-center text-muted small mb-3">
                        <i class="bi bi-geo-alt-fill me-1 text-danger"></i>
                        <span data-i18n="comm-card1-loc">
                            ${data.zone_name}
                        </span>
                    </div>
                    <hr class="my-2">
                    <div class="d-flex justify-content-between align-items-center">
                        <button
                            id="vote-btn-${doc.id}"
                            onclick="${hasVoted ? '' : `voteSuggestion('${doc.id}')`}"
                            class="btn ${hasVoted ? 'btn-success' : 'btn-outline-success'} rounded-pill px-3 fw-bold"
                            ${hasVoted ? 'disabled' : ''}>

                            <i class="bi ${hasVoted ? 'bi-check-lg' : 'bi-hand-thumbs-up-fill'} me-1"></i>

                            ${hasVoted ? 'Supported' : 'Support'}

                            <span class="badge bg-success rounded-pill ms-2">
                                ${data.vote}
                            </span>

                        </button>

                        <span class="small fw-bold ${hasVoted ? '' : 'd-none'}">
                            <i class="bi bi-check-circle-fill me-1"></i>
                            You supported this
                        </span>
                        <span id="status-${doc.id}" class="small fw-bold voting-status d-none">
                            <i class="bi bi-check-circle-fill me-1"></i>
                            You supported this
                        </span>
                    </div>
                </div>
            </div>

                `;
            }
        });
        container.innerHTML = html || '<div class="text-center py-5"><h3>No reports found for this zone.</h3></div>';
        const totalCounter = document.getElementById('total-reports');
        if (totalCounter) totalCounter.innerText = count;
    } catch (e) {
        console.error(e);
        container.innerHTML = '<p class="text-danger text-center">Error loading data.</p>';
    }
}


window.voteSuggestion = async function(id) {

    const reportRef = doc(db, "reports", id);

    await updateDoc(reportRef, {
        vote: increment(1),
        votedBy: arrayUnion(currentUser.uid)
    });

    community();
}

function timeAgo(timestamp) {
    if (!timestamp) return "Just now";

    const date = timestamp.toDate(); // Firestore Timestamp
    const now = new Date();

    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) {
        return `${diff} second${diff !== 1 ? "s" : ""} ago`;
    }

    const minutes = Math.floor(diff / 60);
    if (minutes < 60) {
        return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
    }

    const days = Math.floor(hours / 24);
    if (days < 7) {
        return `${days} day${days !== 1 ? "s" : ""} ago`;
    }

    const weeks = Math.floor(days / 7);
    if (weeks < 5) {
        return `${weeks} week${weeks !== 1 ? "s" : ""} ago`;
    }

    const months = Math.floor(days / 30);
    if (months < 12) {
        return `${months} month${months !== 1 ? "s" : ""} ago`;
    }

    const years = Math.floor(days / 365);
    return `${years} year${years !== 1 ? "s" : ""} ago`;
}



// AI analysis of Suggestion at official
window.analysis = async function() {
    
    try{
        const genAI_2 = new GoogleGenerativeAI("GEMINI_API_kET");

        const model_Official = genAI_2.getGenerativeModel({
            model: "gemini-2.5-flash"
        });


        const reports = [];

        const q = query(collection(db, "reports"));
        const snapshot = await getDocs(q);


        snapshot.forEach(doc => {
            const data = doc.data();

            if (data.analyzed !== true && data.description) {

                reports.push({
                    id: doc.id,
                    description: doc.data().description
                });

            }
        });

        if (reports.length === 0) {
            alert("All reports have already been analyzed.");
            return;
        }

        const prompt = `
            You are an AI assistant for a municipal corporation.

            Analyze ALL the following civic reports.

            For each report determine:

            - severity (1-10)
            - priorityScore (1-100)
            - department
            - summary

            Return ONLY this JSON array:

            [
            {
                "id": "",
                "severity": 0,
                "priorityScore": 0,
                "department": "",
                "summary": ""
            }
            ]

            Reports:

            ${reports.map(r => `
            ID: ${r.id}
            Description: ${r.description}
            `).join("\n")}

            IMPORTANT:
            - Respond ONLY with valid JSON.
            - Do NOT use markdown.
            - Do NOT wrap the JSON in ````json.
            - Do NOT include explanations.
            `;


        const result = await model_Official.generateContent(prompt);
        const response = result.response;
        const text = response.text();
        const cleanText = text
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();
        
        if (!cleanText) {
            console.error("Gemini returned an empty response.");
            return;
        }
        let aiReports;

        try {
            aiReports = JSON.parse(cleanText);
        } catch (e) {
            console.error("Invalid JSON from Gemini");
            console.log(cleanText);
            return;
        }

        for (const report of aiReports) {
            if (
                !report.id ||
                report.severity === undefined ||
                report.priorityScore === undefined
            ) {
                continue;
            }

            await updateDoc(doc(db, "reports", report.id), {

                severity: report.severity,

                priorityScore: report.priorityScore,

                department: report.department,

                summary: report.summary,

                analyzed: true,

                analyzedAt: serverTimestamp()

            });

            recomended();

        }       

    }catch(err) {

        console.error(err);
    


}

}

window.recomended = async function () {
    const container = document.getElementById('recommend-container');
    container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>';


    
    try {

        const q = query(collection(db, "reports"), orderBy("priorityScore", "desc"));


        const querySnapshot = await getDocs(q);
        let html = "";
        let count = 0;
        const myZone = (currentUser.zone_name || "").toLowerCase().trim();

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const reportZone = (data.zone_name || "").toLowerCase().trim();
            const hasVoted = data.votedBy?.includes(currentUser.uid);
            const time = timeAgo(data.timestamp);
            if (reportZone && (myZone.includes(reportZone) || reportZone.includes(myZone))) {
                count++;
                const date = data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleDateString() : "Just now";
                const priorityColor = data.priorityScore >= 80 ? 'danger' : data.priorityScore >= 50 ? 'warning' : 'success';
const severityColor = data.severity >= 8 ? 'danger' : data.severity >= 5 ? 'warning' : 'secondary';

html += `
<div class="card shadow-sm border-0 mb-3 official-recommend-card position-relative overflow-hidden">

    <div class="position-absolute top-0 start-0 h-100 bg-${priorityColor}" style="width: 5px;"></div>

    <div class="card-body ps-4">

        <div class="d-flex justify-content-between align-items-start mb-2">

            <div class="d-flex align-items-center gap-2 flex-wrap">
                <span class="badge bg-${priorityColor}-subtle text-${priorityColor}-emphasis px-3 py-2 fw-semibold">
                    <i class="bi bi-lightning-charge-fill me-1"></i>Priority ${data.priorityScore}
                </span>

                <span class="badge bg-light text-dark border">
                    <i class="bi bi-building me-1"></i>${data.department}
                </span>
            </div>

            <span class="badge bg-secondary-subtle text-secondary-emphasis">
                <i class="bi bi-robot me-1"></i>AI Recommended
            </span>

        </div>

        <h5 class="fw-bold mb-3">
            ${data.summary}
        </h5>

        <div class="row g-2 text-center mb-1">

            <div class="col-6">
                <div class="p-2 rounded bg-light">
                    <small class="text-muted d-block mb-1">Severity</small>
                    <span class="badge bg-${severityColor} fs-6">${data.severity}/10</span>
                </div>
            </div>

            <div class="col-6">
                <div class="p-2 rounded bg-light">
                    <small class="text-muted d-block mb-1">Priority Score</small>
                    <span class="badge bg-${priorityColor} fs-6">${data.priorityScore}/100</span>
                </div>
            </div>

        </div>

        <div class="d-flex justify-content-end mt-3">
            <button
                onclick="details('${doc.id}','recomended','recommend-container')"
                class="btn btn-primary rounded-pill px-4">
                <i class="bi bi-eye"></i> View Details
            </button>
        </div>

    </div>

</div>
`;
            }
        });
        container.innerHTML = html || '<div class="text-center py-5"><h3>No reports found for this zone.</h3></div>';
        const totalCounter = document.getElementById('total-reports');
        if (totalCounter) totalCounter.innerText = count;
    } catch (e) {
        console.error(e);
        container.innerHTML = '<p class="text-danger text-center">Error loading data.</p>';
    }
}










window.updateStatus = async function (docId, newStatus) {
    try {
        await updateDoc(doc(db, "reports", docId), { status: newStatus });
        const badge = document.getElementById(`badge-${docId}`);
        badge.innerText = newStatus;
        badge.className = `badge ${newStatus === 'Resolved' ? 'bg-success' : (newStatus === 'In Progress' ? 'bg-primary' : 'bg-warning')} position-absolute top-0 end-0 m-3 px-3 py-2 shadow-sm`;
        showPopup("Updated", "Status changed successfully.", "success");
    } catch (e) { showPopup("Error", e.message, "error"); }
}

window.saveComment = async function (docId) {
    const comment = document.getElementById(`comment-${docId}`).value;
    try {
        await updateDoc(doc(db, "reports", docId), { adminComment: comment });
        showPopup("Success", "Official comment saved!", "success");
    } catch (e) { showPopup("Error", e.message, "error"); }
}

window.deleteReport = function (docId) {
    Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to recover this report!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, delete it!',
        borderRadius: '20px'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                await deleteDoc(doc(db, "reports", docId));
                loadDashboard();
                Swal.fire('Deleted!', 'The report has been removed.', 'success')
            } catch (e) { showPopup("Error", e.message, "error"); }
        }
    });
}


// speech recoding and convertion 

// language map
const speechLanguageMap = {
    en: "en-IN",
    hi: "hi-IN",
    bn: "bn-IN",
    te: "te-IN",
    ta: "ta-IN",
    es: "es-ES",
    fr: "fr-FR"
};

let isRecording = false;

recordBtn.addEventListener("click", () => {

    if (!isRecording) {

        


        console.log("Selected:", localStorage.getItem("appLanguage"));
        console.log("Mapped:", speechLanguageMap[localStorage.getItem("appLanguage")]);

        recognition.lang = speechLanguageMap[localStorage.getItem("appLanguage")] || "en-IN";

        console.log("Recognition:", recognition.lang);
        recognition.start();

        isRecording = true;

        recordStatus.innerText = "Listening...";

        recordBtn.classList.remove("btn-danger");
        recordBtn.classList.add("btn-success");

        micIcon.classList.remove("bi-mic-fill");
        micIcon.classList.add("bi-stop-fill");

    } else {

        recognition.stop();

    }

});



recognition.onstart = () => {
    console.log("🎤 Recognition started");
};

recognition.onspeechstart = () => {
    console.log("🗣️ Speech detected");
};

recognition.onresult = (event) => {
    console.log("✅ Result received");

    window.transcript = event.results[0][0].transcript;

    console.log("Transcript:", transcript);

    recordStatus.innerText = transcript;
    
}
recognition.onerror = (event) => {
    console.log("❌ Error:", event.error);
};

recognition.onend = async () => {
    console.log("🔚 Recognition ended");
    isRecording = false;

    recordBtn.classList.remove("btn-success");
    recordBtn.classList.add("btn-danger");
    micIcon.classList.remove("bi-stop-fill");
    micIcon.classList.add("bi-mic-fill");

    // 🟢 VOICE AI ANALYSIS
    if (window.transcript) {
        const API_KEY = (window.CONFIG && window.CONFIG.GEMINI_API_KEY) ? window.CONFIG.GEMINI_API_KEY : "KEY_NOT_FOUND";
        if (API_KEY !== "KEY_NOT_FOUND") {
            recordStatus.innerText = "Analyzing voice note...";
            try {
                const genAI = new GoogleGenerativeAI(API_KEY);
                const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
                const prompt = `Analyze this civic issue report transcript: "${window.transcript}". Provide a short title, a detailed description, and the category it belongs to. Valid categories are: Infrastructure, Environment, Education, Health, Other. Return strictly in JSON format like this: {"title": "Short Title Here", "description": "Detailed description here.", "category": "Environment"}`;
                
                const result = await model.generateContent([prompt]);
                let textResult = (await result.response).text();
                
                textResult = textResult.replace(/```json/g, '').replace(/```/g, '').trim();
                const aiData = JSON.parse(textResult);
                
                const devTitle = document.getElementById('devTitle');
                const devDescription = document.getElementById('devDescription');
                const devCategory = document.getElementById('devCategory');

                if (devTitle) devTitle.value = aiData.title || "";
                if (devDescription) devDescription.value = aiData.description || "";
                if (devCategory && aiData.category) devCategory.value = aiData.category;
                
                recordStatus.innerText = "Voice analysis complete! Form auto-filled.";
            } catch (e) {
                console.error("Voice AI Error:", e);
                recordStatus.innerText = "Voice recorded (AI auto-fill failed).";
            }
        } else {
            recordStatus.innerText = "Voice recorded (API Key missing for auto-fill).";
        }
    }
};





// 🟢 Location Detection for Dev Form
window.detectDevLocation = function () {
    const locInput = document.getElementById('devLocation');
    if (!locInput) return;

    locInput.value = "Locating...";

    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
            try {
                const latitude = pos.coords.latitude;
                const longitude = pos.coords.longitude;
                const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
                const response = await fetch(url);
                const data = await response.json();

                const locationStr = data.address.city || data.address.town || data.address.village || data.address.state_district || data.address.county || `${latitude}, ${longitude}`;
                locInput.value = locationStr;
            } catch (e) {
                locInput.value = `${pos.coords.latitude}, ${pos.coords.longitude}`;
            }
        }, (err) => {
            locInput.value = "";
            showPopup("Location Error", "Could not detect location. Please type manually.", "error");
        }, { enableHighAccuracy: true });
    } else {
        locInput.value = "";
        showPopup("Error", "Geolocation not supported.", "error");
    }
}

// ============================================
// 🔥 CITIZEN HEAT MAP INTEGRATION (FIREBASE)
// ============================================
let citizenMap = null;
let categoryChartInstance = null;
let resolutionChartInstance = null;

window.initCitizenHeatmap = async function () {
    // Small delay to ensure DOM #citizenHeatmap is visible for Leaflet size calculations
    setTimeout(async () => {
        try {
            // 1. Initialize Map
            if (!citizenMap && typeof L !== 'undefined') {
                citizenMap = L.map('citizenHeatmap').setView([22.5958, 88.3110], 11);
                L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                    attribution: '&copy; OpenStreetMap',
                    maxZoom: 19
                }).addTo(citizenMap);
            } else if (citizenMap) {
                citizenMap.invalidateSize();
            }

            // 2. Fetch Firebase Data
            const querySnapshot = await getDocs(collection(db, "reports"));
            const heatPoints = [];
            
            const lang = document.documentElement.lang || 'en';
            
            // Generate month keys dynamically based on the current language
            const monthKeys = [];
            for (let i = 0; i < 12; i++) {
                const tempDate = new Date(2000, i, 1);
                const localMonth = tempDate.toLocaleString(lang, { month: 'short' });
                monthKeys.push(localMonth);
            }
            
            const categoryStats = {};
            
            let pendingCount = 0;
            let inProgressCount = 0;
            let resolvedCount = 0;

            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();

                // Extract GPS Coordinates for Heat Map
                if (data.location && data.location.lat && data.location.lng) {
                    // Heat intensity (0.5 to 1.0)
                    heatPoints.push([data.location.lat, data.location.lng, 0.8]);
                }
                
                const category = data.category || 'Other';
                if (!categoryStats[category]) {
                    categoryStats[category] = {};
                    monthKeys.forEach(m => categoryStats[category][m] = 0);
                }

                // Extract Timestamp for "Issues Arising" Graph
                if (data.timestamp) {
                    const date = data.timestamp.toDate();
                    const month = date.toLocaleString(lang, { month: 'short' });
                    if (categoryStats[category][month] !== undefined) {
                        categoryStats[category][month]++;
                    }
                }

                // Extract Status for "Resolution Status" Graph
                if (data.status) {
                    if (data.status.toLowerCase().includes("pending")) pendingCount++;
                    else if (data.status.toLowerCase().includes("progress")) inProgressCount++;
                    else if (data.status.toLowerCase().includes("resolv")) resolvedCount++;
                }
            });

            // 3. Render Heat Map Layer
            if (typeof L !== 'undefined') {
                // Clear existing layers if re-rendering
                citizenMap.eachLayer((layer) => {
                    if (layer instanceof L.Circle || (layer.options && layer.options.blur)) {
                        citizenMap.removeLayer(layer);
                    }
                });

                if (typeof L.heatLayer !== 'undefined') {
                    L.heatLayer(heatPoints, { radius: 25, blur: 15, maxZoom: 14, gradient: { 0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1.0: 'red' } }).addTo(citizenMap);
                } else {
                    heatPoints.forEach(p => L.circle([p[0], p[1]], { color: 'red', fillColor: '#f03', fillOpacity: 0.5, radius: 200 * p[2] }).addTo(citizenMap));
                }
            }

            // 4. Render Chart.js Graphs
            if (typeof Chart !== 'undefined') {
                Chart.defaults.font.family = "'Poppins', sans-serif";
                Chart.defaults.color = '#6c757d';
                
                // Get localized Status Labels
                const getTrans = (key, defaultStr) => (typeof translations !== 'undefined' && translations[lang] && translations[lang][key]) ? translations[lang][key] : defaultStr;
                const labelPending = getTrans('status-pending', 'Pending');
                const labelInProgress = getTrans('status-progress', 'In Progress');
                const labelResolved = getTrans('status-resolved', 'Resolved');
                
                // Predefined colors for categories
                const catColors = {
                    'Water': { border: 'rgba(54, 162, 235, 1)', bg: 'rgba(54, 162, 235, 0.1)' }, // Blue
                    'Roads': { border: 'rgba(108, 117, 125, 1)', bg: 'rgba(108, 117, 125, 0.1)' }, // Grey
                    'Infrastructure': { border: 'rgba(255, 159, 64, 1)', bg: 'rgba(255, 159, 64, 0.1)' }, // Orange
                    'Environment': { border: 'rgba(75, 192, 192, 1)', bg: 'rgba(75, 192, 192, 0.1)' }, // Teal
                    'Education': { border: 'rgba(153, 102, 255, 1)', bg: 'rgba(153, 102, 255, 0.1)' }, // Purple
                    'Health': { border: 'rgba(255, 99, 132, 1)', bg: 'rgba(255, 99, 132, 0.1)' } // Pink
                };
                
                const getCatColor = (cat, idx) => {
                    if (catColors[cat]) return catColors[cat];
                    const hue = (idx * 137.5) % 360;
                    return { border: `hsl(${hue}, 70%, 50%)`, bg: `hsl(${hue}, 70%, 50%, 0.1)` };
                };
                
                const lineDatasets = Object.keys(categoryStats).map((cat, idx) => {
                    const color = getCatColor(cat, idx);
                    return {
                        label: getTrans('cat-' + cat.toLowerCase().replace(/ /g, '-'), cat), 
                        data: monthKeys.map(m => categoryStats[cat][m]),
                        borderColor: color.border,
                        backgroundColor: color.bg,
                        fill: true,
                        tension: 0.4,
                        borderWidth: 2
                    };
                });

                const catCtx = document.getElementById('categoryChart');
                if (catCtx) {
                    if (categoryChartInstance) categoryChartInstance.destroy();
                    categoryChartInstance = new Chart(catCtx, {
                        type: 'line',
                        data: {
                            labels: monthKeys,
                            datasets: lineDatasets
                        },
                        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } } }, scales: { y: { beginAtZero: true, suggestedMax: 5 }, x: { grid: { display: false } } } }
                    });
                }

                const resCtx = document.getElementById('resolutionChart');
                if (resCtx) {
                    if (resolutionChartInstance) resolutionChartInstance.destroy();
                    resolutionChartInstance = new Chart(resCtx, {
                        type: 'bar',
                        data: {
                            labels: [labelPending, labelInProgress, labelResolved],
                            datasets: [{ label: getTrans('heatmap-chart2-title', 'Status Count'), data: [pendingCount, inProgressCount, resolvedCount], backgroundColor: ['rgba(220, 53, 69, 0.8)', 'rgba(255, 193, 7, 0.8)', 'rgba(25, 135, 84, 0.8)'], borderRadius: 8 }]
                        },
                        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, suggestedMax: 5 }, x: { grid: { display: false } } } }
                    });
                }
            }
        } catch (err) {
            console.error("Error fetching Firebase Heat Map data:", err);
        }
    }, 300);
}

// ============================================
// 🤖 GLOBAL AI CHATBOT WIDGET
// ============================================

window.toggleChatbot = function() {
    const chatWindow = document.getElementById('chatbot-window');
    chatWindow.classList.toggle('d-none');
}

window.sendChatbotQuestion = function(questionText) {
    const inputField = document.getElementById('chatbot-input-field');
    inputField.value = questionText;
    processChatbotInput();
}

window.processChatbotInput = async function() {
    const inputField = document.getElementById('chatbot-input-field');
    const messagesContainer = document.getElementById('chatbot-messages');
    const userText = inputField.value.trim();
    
    if (!userText) return;
    
    // Add user message to UI
    const userMsgHtml = `
        <div class="d-flex flex-column align-items-end mt-2">
            <div class="bg-primary text-white p-2 rounded-3 small shadow-sm" style="max-width: 85%;">
                <span>${userText}</span>
            </div>
        </div>
    `;
    messagesContainer.insertAdjacentHTML('beforeend', userMsgHtml);
    inputField.value = '';
    
    // Auto-scroll
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Show typing indicator
    const typingId = 'typing-' + Date.now();
    const lang = document.documentElement.lang || 'en';
    const typingText = (translations && translations[lang] && translations[lang]['chatbot-typing']) ? translations[lang]['chatbot-typing'] : 'Typing...';

    const typingHtml = `
        <div id="${typingId}" class="d-flex flex-column align-items-start mt-2">
            <div class="bg-light text-dark p-2 rounded-3 small shadow-sm text-muted" style="max-width: 85%;">
                <em>${typingText}</em>
            </div>
        </div>
    `;
    messagesContainer.insertAdjacentHTML('beforeend', typingHtml);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Simulate API delay or hook up to Gemini
    setTimeout(() => {
        document.getElementById(typingId).remove();
        
        let reply = (translations && translations[lang] && translations[lang]['chatbot-reply-default']) ? translations[lang]['chatbot-reply-default'] : "I am a helpful civic AI. I've noted your question and can guide you through the platform!";
        
        // Match against common keywords from the hardcoded English buttons
        if (userText.toLowerCase().includes("report") || userText.toLowerCase().includes("pothole")) {
            reply = (translations && translations[lang] && translations[lang]['chatbot-reply-report']) ? translations[lang]['chatbot-reply-report'] : "To report an issue, click on 'Suggest Development' in the top navigation bar. You can upload a photo and our AI will automatically fill in the details for you!";
        } else if (userText.toLowerCase().includes("points")) {
            reply = (translations && translations[lang] && translations[lang]['chatbot-reply-points']) ? translations[lang]['chatbot-reply-points'] : "You earn Civic Points every time you submit a valid report or upvote community suggestions. Officials can see your points on the leaderboard!";
        } else if (userText.toLowerCase().includes("review") || userText.toLowerCase().includes("who")) {
            reply = (translations && translations[lang] && translations[lang]['chatbot-reply-review']) ? translations[lang]['chatbot-reply-review'] : "Your suggestions are sent directly to the verified official dashboard for your respective zone or ward. They review and update the status in real time.";
        }
        
        const aiMsgHtml = `
            <div class="d-flex flex-column align-items-start mt-2">
                <div class="bg-light text-dark p-2 rounded-3 small shadow-sm" style="max-width: 85%;">
                    <span>${reply}</span>
                </div>
            </div>
        `;
        messagesContainer.insertAdjacentHTML('beforeend', aiMsgHtml);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
    }, 1200);
}

// ============================================
// 🗺️ OFFICIAL HEAT MAP
// ============================================
let officialMap = null;
let officialCategoryChartInstance = null;
let officialZoneChartInstance = null;

window.initOfficialHeatmap = async function () {
    setTimeout(async () => {
        try {
            if (!officialMap && typeof L !== 'undefined') {
                officialMap = L.map('officialHeatmap').setView([22.5958, 88.3110], 11);
                L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                    attribution: '&copy; OpenStreetMap',
                    maxZoom: 19
                }).addTo(officialMap);
            } else if (officialMap) {
                officialMap.invalidateSize();
            }

            const querySnapshot = await getDocs(collection(db, "reports"));
            const heatPoints = [];
            const categoryStats = {};
            const zoneStats = {};

            // Clear existing layers
            officialMap.eachLayer((layer) => {
                if (layer instanceof L.Circle || layer instanceof L.CircleMarker || (layer.options && layer.options.blur)) {
                    officialMap.removeLayer(layer);
                }
            });

            // Predefined colors for categories
            const catColors = {
                'Water': 'blue', 
                'Roads': 'gray', 
                'Infrastructure': 'orange', 
                'Environment': 'teal', 
                'Education': 'purple', 
                'Health': 'pink',
                'Other': 'red'
            };

            const bgColors = {
                'Water': 'rgba(54, 162, 235, 0.6)',
                'Roads': 'rgba(108, 117, 125, 0.6)',
                'Infrastructure': 'rgba(255, 159, 64, 0.6)',
                'Environment': 'rgba(75, 192, 192, 0.6)',
                'Education': 'rgba(153, 102, 255, 0.6)',
                'Health': 'rgba(255, 99, 132, 0.6)',
                'Other': 'rgba(220, 53, 69, 0.6)'
            };

            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const category = data.category || 'Other';
                const zone = data.zone_name || 'Unknown';

                if (data.location && data.location.lat && data.location.lng) {
                    heatPoints.push([data.location.lat, data.location.lng, 0.8]);

                    // Visual indicator to distinguish problem type
                    const markerColor = catColors[category] || 'red';
                    if (typeof L !== 'undefined') {
                        L.circleMarker([data.location.lat, data.location.lng], {
                            radius: 8,
                            fillColor: markerColor,
                            color: '#fff',
                            weight: 1,
                            opacity: 1,
                            fillOpacity: 0.8
                        }).addTo(officialMap).bindPopup(`<b>${data.issue}</b><br>${category}`);
                    }
                }
                
                categoryStats[category] = (categoryStats[category] || 0) + 1;
                zoneStats[zone] = (zoneStats[zone] || 0) + 1;
            });

            // Add Heat Layer to highlight heavily affected zones
            if (typeof L !== 'undefined' && typeof L.heatLayer !== 'undefined') {
                L.heatLayer(heatPoints, { radius: 30, blur: 20, maxZoom: 12, gradient: { 0.4: 'cyan', 0.6: 'lime', 0.8: 'yellow', 1.0: 'red' } }).addTo(officialMap);
            }

            if (typeof Chart !== 'undefined') {
                Chart.defaults.font.family = "'Poppins', sans-serif";

                const catCtx = document.getElementById('officialCategoryChart');
                if (catCtx) {
                    if (officialCategoryChartInstance) officialCategoryChartInstance.destroy();
                    officialCategoryChartInstance = new Chart(catCtx, {
                        type: 'doughnut',
                        data: {
                            labels: Object.keys(categoryStats),
                            datasets: [{
                                data: Object.values(categoryStats),
                                backgroundColor: Object.keys(categoryStats).map(c => bgColors[c] || 'rgba(220, 53, 69, 0.6)')
                            }]
                        },
                        options: { responsive: true, maintainAspectRatio: false }
                    });
                }

                const zoneCtx = document.getElementById('officialZoneChart');
                if (zoneCtx) {
                    if (officialZoneChartInstance) officialZoneChartInstance.destroy();
                    officialZoneChartInstance = new Chart(zoneCtx, {
                        type: 'bar',
                        data: {
                            labels: Object.keys(zoneStats),
                            datasets: [{
                                label: 'Issue Count',
                                data: Object.values(zoneStats),
                                backgroundColor: 'rgba(25, 135, 84, 0.8)'
                            }]
                        },
                        options: { responsive: true, maintainAspectRatio: false }
                    });
                }
            }
        } catch (err) {
            console.error("Error fetching Official Heat Map data:", err);
        }
    }, 300);
}