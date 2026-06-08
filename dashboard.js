// استدعاء الفايربيز بشكل مباشر
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, query, where } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// إعدادات الـ Firebase الخاصة بمشروعك
const firebaseConfig = {
  apiKey: "AIzaSyC55Q7Te75KsJlml7-9t2Fym_N3u_hiSB8",
  authDomain: "pharmacy-4048a.firebaseapp.com",
  projectId: "pharmacy-4048a",
  storageBucket: "pharmacy-4048a.firebasestorage.app",
  messagingSenderId: "695826631472",
  appId: "1:695826631472:web:8f2217c8ca43cb7aea16f5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// عناصر الصفحة الأساسية
const todayActiveList = document.getElementById("todayActiveList");
const missedActionList = document.getElementById("missedActionList");

// دالة مساعدة للحصول على التاريخ بصيغة (YYYY-MM-DD) المتوافقة مع الـ input date
function getFormattedDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// ==========================================
// 1. جلب وعرض المواعيد في القوائم (اليوم، الغد، الفائتة)
// ==========================================
async function loadDashboardLists() {
    try {
        // حساب التواريخ
        const todayStr = getFormattedDate(new Date());
        
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = getFormattedDate(tomorrow);

        // جلب كل المواعيد المعلقة (pending) من الفايربيز
        const q = query(collection(db, "appointments"), where("status", "==", "pending"));
        const querySnapshot = await getDocs(q);

        // جلب بيانات جميع المرضى لربط الأسماء بالـ ID
        const patientsSnapshot = await getDocs(collection(db, "patients"));
        const patientsMap = {};
        patientsSnapshot.forEach(doc => {
            const pData = doc.data();
            patientsMap[pData.customId] = pData.name; // ربط الـ ID بالاسم
        });

        // تصفير القوائم قبل العرض
        todayActiveList.innerHTML = "";
        missedActionList.innerHTML = "";

        let hasTodayData = false;
        let hasMissedData = false;

        querySnapshot.forEach((docSnap) => {
            const appointment = docSnap.data();
            const appointmentId = docSnap.id; // رقم مستند الزيارة في فايربيز عشان التحديث
            const pName = patientsMap[appointment.patientId] || "مريض غير معروف";

            // تصميم شكل كارت المريض في القائمة مع الأزرار
            const cardHtml = `
                <div class="patient-item" id="item-${appointmentId}" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #f8f9fa; border-right: 4px solid #007bff; border-radius: 6px; margin-bottom: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                    <div class="patient-info">
                        <h4 style="margin:0 0 5px 0;">${pName}</h4>
                        <p style="margin:0; font-size:13px; color:#666;">ID: ${appointment.patientId} | الموعد: ${appointment.nextDate}</p>
                    </div>
                    <div class="action-buttons">
                        <button class="btn-done" data-id="${appointmentId}" style="background:#28a745; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; margin-left:5px;"><i class="fa-solid fa-check"></i> Done</button>
                        <button class="btn-view" onclick="window.location.href='patient.html?id=${appointment.patientId}'" style="background:#007bff; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer;"><i class="fa-solid fa-eye"></i> عرض</button>
                    </div>
                </div>
            `;

            // تصنيف المواعيد بناءً على التاريخ
            if (appointment.nextDate === todayStr || appointment.nextDate === tomorrowStr) {
                // مواعيد اليوم أو الغد
                todayActiveList.insertAdjacentHTML("beforeend", cardHtml);
                hasTodayData = true;
            } else if (appointment.nextDate < todayStr) {
                // مواعيد عدت وتأخرت (Overdue / الفائتة)
                missedActionList.insertAdjacentHTML("beforeend", cardHtml);
                hasMissedData = true;
            }
        });

        // لو القوائم فاضية، نعرض رسالة واضحة
        if (!hasTodayData) todayActiveList.innerHTML = `<p class="empty-text" style="color:#888; font-style:italic; text-align:center; margin-top:20px;">لا يوجد مواعيد اليوم أو غداً.</p>`;
        if (!hasMissedData) missedActionList.innerHTML = `<p class="empty-text" style="color:#888; font-style:italic; text-align:center; margin-top:20px;">لا يوجد مواعيد فائتة متأخرة.</p>`;

        // ربط حدث الضغط على زرار Done لتحديث الحالة وإخفاء الكارت
        activateDoneButtons();

    } catch (error) {
        console.error("خطأ أثناء تحميل القوائم: ", error);
    }
}

// دالة لتشغيل أزرار الـ Done
function activateDoneButtons() {
    const doneButtons = document.querySelectorAll(".btn-done");
    doneButtons.forEach(button => {
        button.addEventListener("click", async (e) => {
            const appId = e.target.getAttribute("data-id") || e.target.parentElement.getAttribute("data-id");
            if (!appId) return;

            try {
                // تحديث حالة الموعد في الفايربيز لـ attended عشان يختفي
                const appRef = doc(db, "appointments", appId);
                await updateDoc(appRef, {
                    status: "attended"
                });

                // إخفاء الكارت من الشاشة فوراً بأنيميشن خفيف
                const card = document.getElementById(`item-${appId}`);
                if (card) {
                    card.style.transition = "all 0.3s ease";
                    card.style.opacity = "0";
                    setTimeout(() => card.remove(), 300);
                }
            } catch (error) {
                alert("حدث خطأ أثناء تحديث حالة الموعد.");
            }
        });
    });
}

// ==========================================
// 2. منطق التحكم في النافذة المنبثقة (Modal)
// ==========================================
const addPatientModal = document.getElementById("addPatientModal");
const openAddModalBtn = document.getElementById("openAddModalBtn");
const closeModalBtn = document.getElementById("closeModalBtn");
const addPatientForm = document.getElementById("addPatientForm");

if (openAddModalBtn) openAddModalBtn.onclick = () => addPatientModal.style.display = "block";
if (closeModalBtn) closeModalBtn.onclick = () => addPatientModal.style.display = "none";
window.onclick = (event) => {
    if (event.target === addPatientModal) addPatientModal.style.display = "none";
};

// حفظ مريض جديد
if (addPatientForm) {
    addPatientForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("pName").value.trim();
        const patientId = document.getElementById("pId").value.trim();
        const phone = document.getElementById("pPhone").value.trim();
        const dob = document.getElementById("pDob").value;
        const diagnosis = document.getElementById("pDiagnosis").value.trim();

        try {
            await addDoc(collection(db, "patients"), {
                customId: patientId, 
                name: name,
                phone: phone,
                dob: dob,
                diagnosis: diagnosis,
                createdAt: new Date().toISOString()
            });
            alert("تم حفظ المريض بنجاح!");
            addPatientForm.reset();
            addPatientModal.style.display = "none";
            window.open(`card.html?id=${patientId}&name=${encodeURIComponent(name)}`, '_blank');
            loadDashboardLists(); // إعادة تحميل القوائم بالداشبورد
        } catch (error) {
            alert("حدث خطأ أثناء الحفظ.");
        }
    });
}

// ==========================================
// 3. منطق البحث بالاسم أو الـ ID أو التليفون
// ==========================================
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");

async function performSearch() {
    const searchText = searchInput.value.trim();
    if (searchText === "") {
        alert("يرجى كتابة كلمة للبحث عنها أولاً!");
        return;
    }

    try {
        let found = false;
        let patientData = null;

        const qId = query(collection(db, "patients"), where("customId", "==", searchText));
        const querySnapshotId = await getDocs(qId);
        if (!querySnapshotId.empty) {
            querySnapshotId.forEach(doc => { patientData = doc.data(); });
            found = true;
        } 
        
        if (!found) {
            const qName = query(collection(db, "patients"), where("name", "==", searchText));
            const querySnapshotName = await getDocs(qName);
            if (!querySnapshotName.empty) {
                querySnapshotName.forEach(doc => { patientData = doc.data(); });
                found = true;
            }
        }

        if (!found) {
            const qPhone = query(collection(db, "patients"), where("phone", "==", searchText));
            const querySnapshotPhone = await getDocs(qPhone);
            if (!querySnapshotPhone.empty) {
                querySnapshotPhone.forEach(doc => { patientData = doc.data(); });
                found = true;
            }
        }

        if (found && patientData) {
            window.location.href = `patient.html?id=${patientData.customId}`;
        } else {
            alert("لم يتم العثور على مريض بهذه البيانات.");
        }
    } catch (error) {
        alert("حدث خطأ في الاتصال بالـ Firebase.");
    }
}
// ==========================================
// تشغيل كاميرا الـ QR Code من الداشبورد (نسخة جيت هاب والموبايل المضمونة)
// ==========================================
const scanQRBtn = document.getElementById("scanQRBtn");
let html5QrCode = null; // استخدام الكائن الاحترافي المباشر

if (scanQRBtn) {
    scanQRBtn.addEventListener("click", async () => {
        const readerElement = document.getElementById("qr-reader");
        
        // 1. لو الكاميرا شباكة بالفعل وضغطنا تاني، نقفلها ونعمل سد (Toggle)
        if (readerElement.style.display === "block") {
            if (html5QrCode && html5QrCode.isScanning) {
                try {
                    await html5QrCode.stop();
                } catch(e) { console.log(e); }
            }
            readerElement.style.display = "none";
            readerElement.innerHTML = ""; // تصفير المحتوى
            return;
        }

        // 2. إظهار مربع الكاميرا وتجهيزه
        readerElement.style.display = "block";
        readerElement.innerHTML = `<div id="camera-preview" style="width: 100%; height: 280px;"></div>`;
        
        // 3. تشغيل الكاميرا بإجبار الموبايل على استخدام الكاميرا الخلفية
        try {
            html5QrCode = new Html5Qrcode("camera-preview");
            
            const config = { 
                fps: 15, 
                qrbox: { width: 220, height: 220 } 
            };

            // الـ environment بتجبر الموبايل يفتح الكاميرا اللي ورا علطول
            await html5QrCode.start(
                { facingMode: "environment" }, 
                config, 
                (decodedText) => {
                    // أول ما يلقط الـ QR بنجاح
                    html5QrCode.stop().then(() => {
                        readerElement.style.display = "none";
                        readerElement.innerHTML = "";
                        
                        // التحويل لصفحة المريض
                        if (decodedText.includes("patient.html") || decodedText.includes("?id=")) {
                            window.location.href = decodedText;
                        } else {
                            window.location.href = `patient.html?id=${decodedText.trim()}`;
                        }
                    }).catch(err => console.error(err));
                },
                (errorMessage) => {
                    // تتبع صامت أثناء عدم اللقط
                }
            );

        } catch (error) {
            console.error("خطأ في تشغيل الكاميرا:", error);
            readerElement.innerHTML = `
                <div style="padding: 15px; text-align: center; color: red; font-size: 14px;">
                    <i class="fa-solid fa-circle-exclamation"></i> فشل فتح الكاميرا.<br>
                    تأكد من إعطاء صلاحية الكاميرا للمتصفح في الموبايل.
                </div>
            `;
        }
    });
}
if (searchBtn) searchBtn.addEventListener("click", performSearch);
if (searchInput) {
    searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") performSearch();
    });
}

// تشغيل جلب القوائم فور فتح الداشبورد تلقائياً
loadDashboardLists();
