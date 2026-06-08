// استدعاء الفايربيز بشكل مباشر مضافاً إليه دالات الحذف (deleteDoc)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

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
const deletePatientBtn = document.getElementById("deletePatientBtn"); // زرار الحذف الجديد

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

// 2. جلب سجل الزيارات وحساب إجمالي النقاط تلقائياً
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
                    if (visit.points) { totalPoints += parseInt(visit.points); }
                    visitsHtml += `
                        <div class="visit-history-item" style="padding: 15px; background: #f8f9fa; border-right: 4px solid #28a745; border-radius: 6px; margin-bottom: 10px;">
                            <h5><i class="fa-solid fa-calendar-check"></i> موعد الزيارة القادمة المحدد: ${visit.nextDate}</h5>
                            <p style="margin: 5px 0;"><strong>العلاج والجرعات:</strong> ${visit.medication}</p>
                            <p style="margin: 5px 0;"><strong>النقاط المعطاة:</strong> <span style="color:green; font-weight:bold;">+${visit.points} نقطة</span></p>
                            ${visit.notes ? `<p style="margin: 5px 0; color:#666; font-style:italic;"><strong>ملحوظة:</strong> ${visit.notes}</p>` : ''}
                        </div>
                    `;
                });
                visitsTimeline.innerHTML = visitsHtml;
            } else {
                visitsTimeline.innerHTML = `<p class="empty-text" style="color:#888; font-style:italic;">لا يوجد زيارات مسجلة مسبقاً لهذا المريض.</p>`;
            }
            if (viewTotalPoints) { viewTotalPoints.innerText = `${totalPoints} نقطة`; }
        }
    } catch (error) {
        console.error("خطأ في جلب السجل: ", error);
    }
}

// 3. حفظ زيارة جديدة وموعد جديد
if (visitForm) {
    visitForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const nextDate = document.getElementById("nextVisitDate").value;
        const medication = document.getElementById("visitMedication").value.trim();
        const points = document.getElementById("visitPoints").value;
        const notes = document.getElementById("visitNotes").value.trim();

        try {
            await addDoc(collection(db, "appointments"), {
                patientId: patientCustomId,
                nextDate: nextDate,
                medication: medication,
                points: parseInt(points) || 0,
                notes: notes,
                status: "pending",
                createdAt: new Date().toISOString()
            });
            alert("تم تسجيل الزيارة بنجاح!");
            visitForm.reset();
            loadVisitsHistory();
        } catch (error) {
            alert("فشل في حفظ بيانات الزيارة.");
        }
    });
}

// ==========================================
// 4. منطق حذف المريض وسجله بالكامل نهائياً
// ==========================================
if (deletePatientBtn) {
    deletePatientBtn.addEventListener("click", async () => {
        // رسالة تحذيرية للتأكيد قبل الحذف الفعلي
        const confirmDelete = confirm(`هل أنت متأكد تماماً من حذف المريض (${viewName.innerText}) نهائياً؟\nسيؤدي هذا لحذف كل سجلات زياراته وأدوية المريض الموصوفة ولا يمكن التراجع عن هذا الإجراء!`);
        
        if (!confirmDelete) return; // لو كنسل الإجراء نوقف هنا

        try {
            // أ. حذف المريض من كولكشن patients
            const pQuery = query(collection(db, "patients"), where("customId", "==", patientCustomId));
            const pSnapshot = await getDocs(pQuery);
            pSnapshot.forEach(async (docSnap) => {
                await deleteDoc(doc(db, "patients", docSnap.id));
            });

            // ب. حذف جميع الزيارات والمواعيد المرتبطة بهذا المريض من كولكشن appointments
            const appQuery = query(collection(db, "appointments"), where("patientId", "==", patientCustomId));
            const appSnapshot = await getDocs(appQuery);
            appSnapshot.forEach(async (docSnap) => {
                await deleteDoc(doc(db, "appointments", docSnap.id));
            });

            alert("تم حذف المريض وكافة سجلاته بنجاح من النظام.");
            
            // تحويل المستخدم تلقائياً للداشبورد الرئيسية بعد الحذف
            window.location.href = "index.html";

        } catch (error) {
            console.error("خطأ أثناء عملية الحذف: ", error);
            alert("حدث خطأ، فشل حذف المريض بالكامل.");
        }
    });
}

// تشغيل جلب البيانات فوراً
loadPatientData();