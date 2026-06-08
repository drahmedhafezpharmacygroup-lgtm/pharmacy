// استدعاء الفايربيز بشكل مباشر مضافاً إليه دالة التحديث updateDoc
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

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

// قراءة الـ ID من الرابط
const urlParams = new URLSearchParams(window.location.search);
const patientCustomId = urlParams.get('id');

// عناصر الصفحة
const viewName = document.getElementById("view-name");
const viewId = document.getElementById("view-id");
const viewPhone = document.getElementById("view-phone");
const viewDob = document.getElementById("view-dob");
const viewDiagnosis = document.getElementById("view-diagnosis");
const viewTotalPoints = document.getElementById("view-total-points");
const visitsTimeline = document.getElementById("visitsTimeline");
const visitForm = document.getElementById("visitForm");
const deletePatientBtn = document.getElementById("deletePatientBtn");

// دالة مساعدة للحصول على تاريخ اليوم بصيغة YYYY-MM-DD
function getTodayDateString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function calculateAge(birthDate) {
    if(!birthDate) return "-";
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) { age--; }
    return age;
}

// 1. جلب بيانات المريض الأساسية
async function loadPatientData() {
    if (!patientCustomId) {
        alert("لم يتم العثور على معرف المريض!");
        window.location.href = "index.html";
        return;
    }
    try {
        const q = query(collection(db, "patients"), where("customId", "==", patientCustomId));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                viewName.innerText = data.name;
                viewId.innerText = data.customId;
                viewPhone.innerText = data.phone;
                viewDob.innerText = `${data.dob} (${calculateAge(data.dob)} سنة)`;
                viewDiagnosis.innerText = data.diagnosis;
            });
            loadVisitsHistory();
        } else {
            alert("المريض غير مسجل!");
            window.location.href = "index.html";
        }
    } catch (error) {
        alert("حدث خطأ في تحميل بيانات المريض.");
    }
}

// 2. جلب سجل الزيارات وحساب إجمالي النقاط وتفعيل أزرار الـ Done الداخلية
async function loadVisitsHistory() {
    try {
        const q = query(collection(db, "appointments"), where("patientId", "==", patientCustomId));
        const querySnapshot = await getDocs(q);
        
        let totalPoints = 0;

        if (visitsTimeline) {
            visitsTimeline.innerHTML = "";
            if (!querySnapshot.empty) {
                let visitsHtml = "";
                querySnapshot.forEach((docSnap) => {
                    const visit = docSnap.data();
                    const visitDocId = docSnap.id; // آي دي المستند عشان زرار Done

                    if (visit.points) { totalPoints += parseInt(visit.points); }
                    
                    // تحديد شارة الحالة (هل الموعد انتهى أم لا زال معلقاً)
                    const isAttended = visit.status === "attended";
                    const statusBadge = isAttended 
                        ? `<span style="background:#28a745; color:white; padding:2px 8px; border-radius:4px; font-size:12px;">تمت بالكامل</span>`
                        : `<span style="background:#ffc107; color:#212529; padding:2px 8px; border-radius:4px; font-size:12px;">موعد معلّق</span>`;

                    visitsHtml += `
                        <div class="visit-history-item" style="padding: 15px; background: #f8f9fa; border-right: 4px solid ${isAttended ? '#28a745' : '#ffc107'}; border-radius: 6px; margin-bottom: 12px; position: relative;">
                            
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                                <span style="font-size:13px; color:#555;"><strong>تاريخ الكشف/الزيارة الحالية:</strong> ${visit.visitDate || 'غير مسجل'}</span>
                                ${statusBadge}
                            </div>
                            
                            <h5 style="margin: 5px 0;"><i class="fa-solid fa-calendar-check"></i> الموعد القادم المحدد: ${visit.nextDate}</h5>
                            <p style="margin: 5px 0;"><strong>العلاج والجرعات:</strong> ${visit.medication}</p>
                            <p style="margin: 5px 0;"><strong>النقاط المعطاة:</strong> <span style="color:green; font-weight:bold;">+${visit.points} نقطة</span></p>
                            ${visit.notes ? `<p style="margin: 5px 0; color:#666; font-style:italic;"><strong>ملحوظة:</strong> ${visit.notes}</p>` : ''}
                            
                            ${!isAttended ? `
                                <button class="inner-done-btn" data-id="${visitDocId}" style="position: absolute; left: 15px; bottom: 15px; background: #28a745; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: bold;">
                                    <i class="fa-solid fa-check"></i> تم ميعاد الزيارة
                                </button>
                            ` : ''}
                        </div>
                    `;
                });
                visitsTimeline.innerHTML = visitsHtml;
                
                // تشغيل الأزرار الداخلية بعد الحقن في الـ HTML
                activateInnerDoneButtons();
                
            } else {
                visitsTimeline.innerHTML = `<p class="empty-text" style="color:#888; font-style:italic;">لا يوجد زيارات مسجلة مسبقاً لهذا المريض.</p>`;
            }
            if (viewTotalPoints) { viewTotalPoints.innerText = `${totalPoints} نقطة`; }
        }
    } catch (error) {
        console.error("خطأ في جلب السجل: ", error);
    }
}

// دالة لتشغيل زرار "تم ميعاد الزيارة" من جوه صفحة البيشنت
function activateInnerDoneButtons() {
    const buttons = document.querySelectorAll(".inner-done-btn");
    buttons.forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const docId = e.target.getAttribute("data-id") || e.target.parentElement.getAttribute("data-id");
            if (!docId) return;

            try {
                const docRef = doc(db, "appointments", docId);
                await updateDoc(docRef, { status: "attended" });
                alert("تم تحديث حالة الموعد إلى (تمت)، ولن تظهر في الأوفر ديو بالداشبورد.");
                loadVisitsHistory(); // تحديث الصفحة فوراً
            } catch (err) {
                alert("حدث خطأ أثناء التحديث.");
            }
        });
    });
}

// 3. حفظ زيارة جديدة (بتسجيل تاريخ اليوم تلقائياً وتحديد الموعد القادم)
if (visitForm) {
    visitForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const nextDate = document.getElementById("nextVisitDate").value; // تاريخ المرة الجاية من الـ Input
        const medication = document.getElementById("visitMedication").value.trim();
        const points = document.getElementById("visitPoints").value;
        const notes = document.getElementById("visitNotes").value.trim();
        
        const todayStr = getTodayDateString(); // توليد تاريخ اليوم الحقيقي تلقائياً

        try {
            await addDoc(collection(db, "appointments"), {
                patientId: patientCustomId,
                visitDate: todayStr,     // حفظ الإجراء بتاريخ النهاردة بالظبط
                nextDate: nextDate,      // ميعاد الجلسة القادمة
                medication: medication,
                points: parseInt(points) || 0,
                notes: notes,
                status: "pending",       // بيبدأ معلق عشان يظهر في جدول الداشبورد
                createdAt: new Date().toISOString()
            });

            alert("تم تسجيل الإجراء بتاريخ اليوم بنجاح، وتحديد الموعد القادم!");
            visitForm.reset();
            loadVisitsHistory();
        } catch (error) {
            alert("فشل في حفظ بيانات الزيارة.");
        }
    });
}

// 4. منطق حذف المريض
if (deletePatientBtn) {
    deletePatientBtn.addEventListener("click", async () => {
        const confirmDelete = confirm(`هل أنت متأكد تماماً من حذف المريض نهائياً؟`);
        if (!confirmDelete) return;

        try {
            const pQuery = query(collection(db, "patients"), where("customId", "==", patientCustomId));
            const pSnapshot = await getDocs(pQuery);
            pSnapshot.forEach(async (docSnap) => { await deleteDoc(doc(db, "patients", docSnap.id)); });

            const appQuery = query(collection(db, "appointments"), where("patientId", "==", patientCustomId));
            const appSnapshot = await getDocs(appQuery);
            appSnapshot.forEach(async (docSnap) => { await deleteDoc(doc(db, "appointments", docSnap.id)); });

            alert("تم حذف المريض وكافة سجلاته.");
            window.location.href = "index.html";
        } catch (error) {
            alert("حدث خطأ أثناء الحذف.");
        }
    });
}

// تشغيل جلب البيانات فوراً
loadPatientData();
// ==========================================
// دالة توليد الـ QR Code الخاص بالمريض تلقائياً
// ==========================================
// ==========================================
// دالة توليد الـ QR Code المشفر برقم المريض فقط (شبه سيستم الجيم)
// ==========================================
function generatePatientQRCode() {
    const qrContainer = document.getElementById("patient-qrcode");
    
    if (qrContainer && patientCustomId) {
        qrContainer.innerHTML = ""; // تصفير المكان
        
        // هنا السر: الـ QR جواه رقم الـ ID فقط وليس رابط كامل!
        new QRCode(qrContainer, {
            text: patientCustomId.trim(), // القيمة هي الـ ID الحقيقي للمريض فقط
            width: 150,
            height: 150,
            colorDark : "#1f2937", // لون داكن احترافي
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H
        });
    }
}

// تشغيل الدالة
generatePatientQRCode();
