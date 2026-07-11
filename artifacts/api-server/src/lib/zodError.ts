import type { ZodError } from "zod";

const arabicFieldNames: Record<string, string> = {
  name:           "الاسم",
  code:           "الرمز",
  category:       "التصنيف",
  unit:           "الوحدة",
  minQuantity:    "الحد الأدنى",
  quantity:       "الكمية",
  branchId:       "الفرع",
  employeeId:     "الموظف",
  amount:         "المبلغ",
  reason:         "السبب",
  date:           "التاريخ",
  installment:    "القسط",
  ratePerHour:    "سعر الساعة",
  effectiveFrom:  "تاريخ السريان",
  username:       "اسم المستخدم",
  password:       "كلمة المرور",
  fullName:       "الاسم الكامل",
  role:           "الصلاحية",
  startDate:      "تاريخ البداية",
  endDate:        "تاريخ النهاية",
  days:           "عدد الأيام",
  type:           "النوع",
  status:         "الحالة",
  checkIn:        "وقت الدخول",
  checkOut:       "وقت الخروج",
  employeeNumber: "الرقم الوظيفي",
  baseSalary:     "الراتب الأساسي",
  contractType:   "نوع العقد",
  hireDate:       "تاريخ التعيين",
  department:     "القسم",
  jobTitle:       "المسمى الوظيفي",
  itemId:         "الصنف",
  month:          "الشهر",
  year:           "السنة",
};

const arabicMessages: Record<string, string> = {
  "Required":                           "هذا الحقل مطلوب",
  "Invalid type":                       "قيمة غير صحيحة",
  "Expected string":                    "يجب أن تكون قيمة نصية",
  "Expected number":                    "يجب أن تكون قيمة رقمية",
  "String must contain at least":       "يجب أن يحتوي على حرف واحد على الأقل",
  "Number must be greater than":        "يجب أن تكون القيمة أكبر من صفر",
  "Invalid enum value":                 "قيمة غير مسموح بها",
  "too_small":                          "القيمة أصغر من الحد المسموح",
  "too_big":                            "القيمة أكبر من الحد المسموح",
  "invalid_type":                       "نوع البيانات غير صحيح",
};

export function formatZodError(error: ZodError): string {
  const issues = error.issues;
  if (!issues || issues.length === 0) return "بيانات غير صحيحة";

  const messages = issues.map((issue) => {
    const field = issue.path[issue.path.length - 1];
    const fieldName = field ? (arabicFieldNames[String(field)] ?? String(field)) : "";

    let msg = issue.message;
    for (const [key, val] of Object.entries(arabicMessages)) {
      if (msg.includes(key) || issue.code === key) {
        msg = val;
        break;
      }
    }
    if (msg === "Required") msg = "هذا الحقل مطلوب";

    return fieldName ? `${fieldName}: ${msg}` : msg;
  });

  return messages[0] ?? "بيانات غير صحيحة";
}
