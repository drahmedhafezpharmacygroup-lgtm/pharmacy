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
                
                // [تعديل مضاف] عرض النقاط من حقل المريض الأساسي في العنصر الجديد
                const pointsElement = document.getElementById("patientPoints");
                if (pointsElement) {
                    pointsElement.innerText = data.points || 0;
                }
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
            
            // [تعديل مضاف] جعل العرض الإجمالي يقرأ القيمة المعتمدة من حقل الشاشة الأساسي حتى لا يختل عند التصفير والتعديل
            const pointsElement = document.getElementById("patientPoints");
            if (viewTotalPoints) { 
                viewTotalPoints.innerText = pointsElement ? `${pointsElement.innerText} نقطة` : `${totalPoints} نقطة`; 
            }
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

            // [تعديل مضاف] زيادة نقاط الزيارة الجديدة على رصيد المريض الحالي أوتوماتيكياً
            const currentPointsElement = document.getElementById("patientPoints");
            const currentPoints = parseInt(currentPointsElement.innerText) || 0;
            const addedPoints = parseInt(points) || 0;
            const finalPoints = currentPoints + addedPoints;

            const pQuery = query(collection(db, "patients"), where("customId", "==", patientCustomId));
            const pSnapshot = await getDocs(pQuery);
            if (!pSnapshot.empty) {
                const pDocId = pSnapshot.docs[0].id;
                await updateDoc(doc(db, "patients", pDocId), { points: finalPoints });
                if (currentPointsElement) currentPointsElement.innerText = finalPoints;
            }

            alert("تم تسجيل الإجراء بتاريخ اليوم بنجاح، وتحديد الموعد القادم!");
            visitForm.reset();
            loadVisitsHistory();
        } catch (error) {
            alert("فشل في حفظ بيانات الزيارة.");
        }
    });
}

// ==========================================
// 4. منطق حذف المريض النهائي وكافة سجلاته (مطور ومضمون)
// ==========================================
if (deletePatientBtn) {
    deletePatientBtn.addEventListener("click", async () => {if (patientCustomId === "1") {
            alert("عذراً، لا يمكن حذف السجل الأساسي (رقم 1) لأنه يمثل جذر النظام وقاعدة بياناته.");
            return; 
        }
        const confirmDelete = confirm(`هل أنت متأكد تماماً من حذف المريض نهائياً؟ لا يمكن التراجع عن هذه الخطوة.`);
        if (!confirmDelete) return;

        try {
            // 1. جلب مستند المريض الأساسي
            const pQuery = query(collection(db, "patients"), where("customId", "==", patientCustomId));
            const pSnapshot = await getDocs(pQuery);
            
            // مصفوفة لتجميع كل وعود الحذف (Promises)
            const deletePromises = [];

            pSnapshot.forEach((docSnap) => {
                // إضافة أمر حذف المريض للمصفوفة
                deletePromises.push(deleteDoc(doc(db, "patients", docSnap.id)));
            });

            // 2. جلب وحذف كل الزيارات والمواعيد المرتبطة بهذا المريض تماماً عشان ميتوجبش في البحث
            const appQuery = query(collection(db, "appointments"), where("patientId", "==", patientCustomId));
            const appSnapshot = await getDocs(appQuery);
            
            appSnapshot.forEach((docSnap) => {
                // إضافة أمر حذف مواعيده للمصفوفة
                deletePromises.push(deleteDoc(doc(db, "appointments", docSnap.id)));
            });

            // هنا السر: إجبار السيستم على الانتظار حتى تنفيذ كافة عمليات الحذف بنجاح في السيرفر
            await Promise.all(deletePromises);

            alert("تم حذف المريض وكافة سجلاته ومواعيده نهائياً من قاعدة البيانات.");
            
            // التحويل للرئيسية بعد التأكد من الحذف الفعلي
            window.location.href = "index.html";
            
        } catch (error) {
            console.error("خطأ أثناء الحذف الحقيقي:", error);
            alert("حدث خطأ أثناء محاولة الحذف، يرجى المحاولة مرة أخرى.");
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
// ==========================================
// نظام التحكم بالنقاط (تعديل وتصفير)
// ==========================================
const updatePointsBtn = document.getElementById("updatePointsBtn");
const resetPointsBtn = document.getElementById("resetPointsBtn");

// 1. منطق تعديل النقاط (إضافة أو خصم)
if (updatePointsBtn) {
    updatePointsBtn.addEventListener("click", async () => {
        if (patientCustomId === "1") {
            alert("عذراً، لا يمكن تعديل نقاط السجل الأساسي (رقم 1) لأسباب تتعلق بأمان النظام.");
            return;
        }
        const currentPoints = parseInt(document.getElementById("patientPoints").innerText) || 0;
        const newPointsInput = prompt("أدخل عدد النقاط الجديد الإجمالي للمريض:", currentPoints);
        
        // التأكد من أن المستخدم كتب رقم مش فاضي وداس OK
        if (newPointsInput === null || newPointsInput.trim() === "") return;
        const newPoints = parseInt(newPointsInput);
        if (isNaN(newPoints) || newPoints < 0) {
            alert("يرجى إدخال رقم صحيح أكبر من أو يساوي الصفر.");
            return;
        }

        try {
            // جلب مستند المريض وتحديث خانة الـ points
            const q = query(collection(db, "patients"), where("customId", "==", patientCustomId));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const docId = querySnapshot.docs[0].id;
                const patientRef = doc(db, "patients", docId);
                
                await updateDoc(patientRef, { points: newPoints });
                
                // تحديث الرقم على الشاشة فوراً
                document.getElementById("patientPoints").innerText = newPoints;
                if (viewTotalPoints) { viewTotalPoints.innerText = `${newPoints} نقطة`; }
                alert(`تم تحديث نقاط المريض بنجاح إلى: ${newPoints} نقطة.`);
            }
        } catch (error) {
            console.error("خطأ أثناء تحديث النقاط:", error);
            alert("حدث خطأ أثناء تعديل النقاط.");
        }
    });
}

// 2. منطق تصفير النقاط تماماً (Reset)
if (resetPointsBtn) {
    resetPointsBtn.addEventListener("click", async () => {
        const confirmReset = confirm("هل أنت متأكد من تصفير نقاط هذا العميل بالكامل؟");
        if (!confirmReset) return;

        try {
            const q = query(collection(db, "patients"), where("customId", "==", patientCustomId));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const docId = querySnapshot.docs[0].id;
                const patientRef = doc(db, "patients", docId);
                
                // تحديث القيمة لـ 0 في الفايربيز
                await updateDoc(patientRef, { points: 0 });
                
                // تحديث الرقم على الشاشة فوراً
                document.getElementById("patientPoints").innerText = 0;
                if (viewTotalPoints) { viewTotalPoints.innerText = "0 نقطة"; }
                alert("تم تصفير نقاط المريض بنجاح.");
            }
        } catch (error) {
            console.error("خطأ أثناء تصفير النقاط:", error);
            alert("حدث خطأ أثناء تصفير النقاط.");
        }
    });
}