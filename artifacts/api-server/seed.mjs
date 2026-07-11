import dns from "node:dns";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// استخدام Google DNS لتجاوز حجب الشبكة المحلية
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

const MONGODB_URI  = process.env.MONGODB_URI;
const GM_USERNAME  = process.env.GM_USERNAME  ?? "admin";
const GM_PASSWORD  = process.env.GM_PASSWORD  ?? "admin123";
const GM_FULL_NAME = process.env.GM_FULL_NAME ?? "المدير العام";

if (!MONGODB_URI) throw new Error("MONGODB_URI غير موجود في .env");

console.log("⏳ جاري الاتصال بـ MongoDB Atlas...");
await mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 15000,
  connectTimeoutMS: 15000,
});
console.log("✅ اتصال بـ MongoDB ناجح");

const Branch = mongoose.models["branches"] ?? mongoose.model("branches",
  new mongoose.Schema({ name: String })
);

const User = mongoose.models["users"] ?? mongoose.model("users",
  new mongoose.Schema({
    username:     String,
    passwordHash: String,
    fullName:     String,
    role:         String,
    branchId:     { type: mongoose.Schema.Types.ObjectId, default: null },
    active:       { type: Boolean, default: true },
    createdAt:    { type: Date, default: Date.now },
  })
);

// حذف الفرع الرئيسي إذا كان موجوداً
const mainBranch = await Branch.findOne({ name: "الفرع الرئيسي" });
if (mainBranch) {
  await Branch.deleteOne({ name: "الفرع الرئيسي" });
  console.log("🗑️  تم حذف الفرع الرئيسي");
}

// الفروع الثلاثة
const branchNames = ["سحاب", "النزهة", "طبربور"];
for (const name of branchNames) {
  const exists = await Branch.findOne({ name });
  if (!exists) {
    await Branch.create({ name });
    console.log("✅ تم إنشاء الفرع:", name);
  } else {
    console.log("ℹ️  الفرع موجود:", name);
  }
}

// حذف المدير العام القديم وإعادة إنشائه
await User.deleteOne({ role: "general_manager" });
const passwordHash = await bcrypt.hash(GM_PASSWORD, 10);
await User.create({
  username:     GM_USERNAME,
  passwordHash,
  fullName:     GM_FULL_NAME,
  role:         "general_manager",
  branchId:     null,
  active:       true,
});

console.log("✅ تم إنشاء حساب المدير العام:");
console.log(`   اسم المستخدم : ${GM_USERNAME}`);
console.log(`   كلمة المرور  : ${GM_PASSWORD}`);
console.log(`   الاسم الكامل : ${GM_FULL_NAME}`);

await mongoose.disconnect();
console.log("✅ اكتمل!");
