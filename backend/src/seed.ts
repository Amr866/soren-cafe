import { db } from "./db.ts";

export const initialProducts = [
  // --- دسته اول: قهوه‌ها (Coffees — ۶ محصول) ---
  {
    id: "prd_doppio",
    name: "اسپرسو دوپیو سورن (Soren Doppio)",
    category: "coffee",
    price: 75000,
    description: "اتیوپی یرگاچف، نت‌های یاس و مرکبات، عصاره‌گیری ۹ بار استاندارد",
    tags: "تک‌خاستگاه, ۹۳.۵°C",
    is_available: 1,
    image_url: "/assets/products/doppio.png",
  },
  {
    id: "prd_cortado",
    name: "کورتادو پارسه (Parseh Cortado)",
    category: "coffee",
    price: 95000,
    description: "اسپرسو با شیر بخارپز مخملی (نسبت ۱:۱)",
    tags: "میکروفوم, متعادل",
    is_available: 1,
    image_url: "/assets/products/cortado.png",
  },
  {
    id: "prd_flatwhite",
    name: "فلت‌وایت عسل و دارچین (Honey Cinnamon Flat White)",
    category: "coffee",
    price: 115000,
    description: "شیر جو دوسر، عسل طبیعی کوهستان، دارچین سیلان",
    tags: "شیر گیاهی, ادویه‌ای",
    is_available: 1,
    image_url: "/assets/products/flatwhite.png",
  },
  {
    id: "prd_geisha_v60",
    name: "پوراوور V60 کلمبیا (Colombia Geisha V60)",
    category: "coffee",
    price: 140000,
    description: "دم‌آوری دستی چکه‌ای، نت هلو، گل ساعتی و فینیش شفاف عسلی",
    tags: "دمی تخصصی, شفاف",
    is_available: 1,
    image_url: "/assets/products/v60.png",
  },
  {
    id: "prd_coldbrew",
    name: "کلد برو دودی زعفرانی (Saffron Smoked Cold Brew)",
    category: "coffee",
    price: 125000,
    description: "۱۸ ساعت دم‌آوری سرد با زعفران ممتاز قائنات و نت اسموکی ملایم",
    tags: "عصاره سرد, طبع گرم",
    is_available: 1,
    image_url: "/assets/products/coldbrew.png",
  },
  {
    id: "prd_matcha_latte",
    name: "ماچا لاته تشریفاتی (Ceremonial Matcha Latte)",
    category: "coffee",
    price: 135000,
    description: "ماچای خالص اوجی کیوتو با شیر بادام دست‌ساز و استویا",
    tags: "آنتی‌اکسیدان, بدون کافئین قهوه",
    is_available: 1,
    image_url: "/assets/products/matcha.png",
  },

  // --- دسته دوم: کیک و شیرینی‌ها (Cakes & Bakes — ۶ محصول) ---
  {
    id: "prd_basque",
    name: "چیزکیک سن‌سباستین پسته (Pistachio Basque)",
    category: "cake",
    price: 165000,
    description: "بافت خامه‌ای کاراملیزه با کرم پسته دست‌ساز دامغان و نمک مالدون",
    tags: "پرفروش, دست‌ساز",
    is_available: 1,
    image_url: "/assets/products/basque.png",
  },
  {
    id: "prd_honey_tart",
    name: "تارت عسل و گردوی باستانی (Ancient Honey Walnut Tart)",
    category: "cake",
    price: 135000,
    description: "خمیر سابله ترد فرانسوی، گردوی تویسرکان و عسل طبیعی",
    tags: "سنتی, مقوی",
    is_available: 1,
    image_url: "/assets/products/honey-tart.png",
  },
  {
    id: "prd_lime_meringue",
    name: "تارت لیمو امانی و مرنگ (Black Lime Meringue)",
    category: "cake",
    price: 120000,
    description: "کرم ترش و معطر لیمو امانی با مرنگ فرانسوی برشته شده",
    tags: "ترش و شیرین, بالانس",
    is_available: 1,
    image_url: "/assets/products/lime-tart.png",
  },
  {
    id: "prd_espresso_fudge",
    name: "کیک خیس شکلات تلخ و قهوه (Molten Espresso Fudge)",
    category: "cake",
    price: 145000,
    description: "شکلات بلژیکی ۷۰٪ همراه با شات اسپرسو تازه و گاناش داغ",
    tags: "گرم, شکلات تلخ",
    is_available: 1,
    image_url: "/assets/products/fudge.png",
  },
  {
    id: "prd_croissant",
    name: "کروسان بادام و بهارنارنج (Almond Orange Blossom Croissant)",
    category: "cake",
    price: 110000,
    description: "بافت لایه‌لایه کره‌ای، کرم بادام فرانسوی با عطر بهارنارنج شیراز",
    tags: "تازه پخت, عطری",
    is_available: 1,
    image_url: "/assets/products/croissant.png",
  },
  {
    id: "prd_banana_bread",
    name: "نان موزی برشته با کره قهوه (Toasted Banana Bread)",
    category: "cake",
    price: 95000,
    description: "نان موزی گردویی برشته شده، سرو همراه با کره فرم‌گرفته اسپرسو",
    tags: "عصرانه, کم‌شیرین",
    is_available: 1,
    image_url: "/assets/products/banana-bread.png",
  },

  // --- دسته سوم: شیک‌ها و نوشیدنی‌های خنک (Shakes & Frappes — ۶ محصول) ---
  {
    id: "prd_pistachio_shake",
    name: "شیک پسته و کارامل نمکی (Salted Caramel Pistachio)",
    category: "shake",
    price: 185000,
    description: "بستنی وانیل سنتی، سس کارامل نمکی دولچه دلچه، خلال پسته برشته",
    tags: "لوکس, پرطرفدار",
    is_available: 1,
    image_url: "/assets/products/pistachio-shake.png",
  },
  {
    id: "prd_hazelnut_mocha",
    name: "شیک موکا کرانچ فندقی (Hazelnut Mocha Crunch)",
    category: "shake",
    price: 170000,
    description: "دبل شات اسپرسو، نوتلا دست‌ساز کافه، پرالین فندق تست‌شده",
    tags: "انرژی‌بخش, کرانچی",
    is_available: 1,
    image_url: "/assets/products/hazelnut-shake.png",
  },
  {
    id: "prd_lotus_shake",
    name: "شیک لوتوس و اسپرسو (Lotus Biscoff Espresso)",
    category: "shake",
    price: 165000,
    description: "کرم بیسکویت لوتوس بلژیکی، سینگل شات اسپرسو، خامه ابریشمی",
    tags: "بیسکویتی, خامه‌ای",
    is_available: 1,
    image_url: "/assets/products/lotus-shake.png",
  },
  {
    id: "prd_saffron_velvet",
    name: "شیک زعفران و ماسکارپونه (Saffron Mascarpone Velvet)",
    category: "shake",
    price: 190000,
    description: "بستنی دست‌ساز خامه‌ای همراه با پنیر ماسکارپونه، زعفران و پودر هل",
    tags: "شاهانه, طعم اصیل",
    is_available: 1,
    image_url: "/assets/products/saffron-shake.png",
  },
  {
    id: "prd_coconut_frappe",
    name: "فراپه نارگیل و کلد برو (Cold Brew Coconut Frappe)",
    category: "shake",
    price: 140000,
    description: "قهوه سرددم ۱۸ ساعته، شیر نارگیل ارگانیک، سیروپ وانیل و یخ ریز",
    tags: "وگان, بدون لبنیات",
    is_available: 1,
    image_url: "/assets/products/coconut-frappe.png",
  },
  {
    id: "prd_berry_dark",
    name: "شیک دارک چاکلت و تمشک وحشی (Wild Berry Dark Choc)",
    category: "shake",
    price: 175000,
    description: "بستنی شکلات تلخ بلژیکی با پوره ملس تمشک جنگلی تازه",
    tags: "ملس, طعم عمیق",
    is_available: 1,
    image_url: "/assets/products/berry-shake.png",
  },

  // --- منوی اصلی فرانت‌اند (۱۸ محصول با قیمت‌های دقیق فرانت‌اند) ---
  // قهوه‌ها
  {
    id: "prd_latte",
    name: "لاته (Latte)",
    category: "coffee",
    price: 150000,
    description: "اسپرسو، شیر بخارپز مخملی و فوم شیر سبک",
    tags: "گرم, پرفروش",
    is_available: 1,
    image_url: "/images/products/coffee/latte.png",
  },
  {
    id: "prd_cappuccino",
    name: "کاپوچینو (Cappuccino)",
    category: "coffee",
    price: 140000,
    description: "ترکیب متعادل اسپرسو، شیر گرم و لایه متراکم کف شیر",
    tags: "گرم, کلاسیک",
    is_available: 1,
    image_url: "/images/products/coffee/cappuccino.png",
  },
  {
    id: "prd_espresso",
    name: "اسپرسو (Espresso)",
    category: "coffee",
    price: 90000,
    description: "شات غلیظ و خالص قهوه با کرمای طلایی و آرومای قوی",
    tags: "گرم, اصیل",
    is_available: 1,
    image_url: "/images/products/coffee/espresso.png",
  },
  {
    id: "prd_espresso_double",
    name: "اسپرسو دبل (Double Espresso)",
    category: "coffee",
    price: 95000,
    description: "شات دوبل تخصصی با کرمای غلیظ و عصاره‌گیری استاندارد ۹ بار",
    tags: "گرم, پرطرفدار",
    is_available: 1,
    image_url: "/images/products/coffee/double-espresso.png",
  },
  {
    id: "prd_americano",
    name: "آمریکانو (Americano)",
    category: "coffee",
    price: 110000,
    description: "اسپرسو تازه همراه با آب جوش تصفیه‌شده، شفاف و ملایم",
    tags: "گرم, ملایم",
    is_available: 1,
    image_url: "/images/products/coffee/americano.png",
  },
  {
    id: "prd_mocha",
    name: "موکا (Mocha)",
    category: "coffee",
    price: 160000,
    description: "اسپرسو، سس شکلات دست‌ساز بلژیکی و شیر فوم‌دار",
    tags: "گرم, شکلاتی",
    is_available: 1,
    image_url: "/images/products/coffee/mocha.png",
  },
  {
    id: "prd_iced_latte",
    name: "آیس لاته (Iced Latte)",
    category: "coffee",
    price: 170000,
    description: "اسپرسو دوبل سرد، شیر خنک و یخ قالبی کریستالی",
    tags: "خنک, تابستانی",
    is_available: 1,
    image_url: "/images/products/coffee/iced-latte.png",
  },
  // کیک و دسرها
  {
    id: "prd_cheesecake",
    name: "چیزکیک نیویورکی (New York Cheesecake)",
    category: "cake",
    price: 180000,
    description: "بافت خامه‌ای کاراملیزه همراه با پایه بیسکویت دست‌ساز",
    tags: "کلاسیک, محبوب",
    is_available: 1,
    image_url: "/images/products/cake/cheesecake.png",
  },
  {
    id: "prd_brownie",
    name: "براونی شکلاتی فاج (Fudge Brownie)",
    category: "cake",
    price: 130000,
    description: "براونی با مغز شکلات مذاب و گردوی بو داده",
    tags: "شکلاتی, سنگین",
    is_available: 1,
    image_url: "/images/products/cake/chocolate-fudge-brownie.png",
  },
  {
    id: "prd_choc_cake",
    name: "کیک دبل چاکلت (Double Chocolate Cake)",
    category: "cake",
    price: 150000,
    description: "کیک اسفنجی شکلات تلخ با گاناش دست‌ساز فرانسوی",
    tags: "شکلاتی, تازه",
    is_available: 1,
    image_url: "/images/products/cake/chocolate-cake.png",
  },
  {
    id: "prd_tiramisu",
    name: "تیرامیسو کلاسیک (Classic Tiramisu)",
    category: "cake",
    price: 170000,
    description: "لیدی فینگر خیسانده در اسپرسو سورن و کرم ماسکارپونه سنتی",
    tags: "ایتالیایی, پرطرفدار",
    is_available: 1,
    image_url: "/images/products/cake/tiramisu.png",
  },
  {
    id: "prd_carrot_cake",
    name: "کیک هویج و گردو (Carrot & Walnut Cake)",
    category: "cake",
    price: 140000,
    description: "پخته شده با دارچین سیلان، هویج تازه و فراستینگ پنیر خامه‌ای",
    tags: "عصری, معطر",
    is_available: 1,
    image_url: "/images/products/cake/carrot-walnut-cake.png",
  },
  {
    id: "prd_cookie",
    name: "کوکی چاکلت چانک (Chocolate Chunk Cookie)",
    category: "cake",
    price: 80000,
    description: "کوکی نرم با تکه‌های درشت شکلات بلژیکی ۷۰٪",
    tags: "ترد, سبک",
    is_available: 1,
    image_url: "/images/products/cake/chocolate-chunk-cookie.png",
  },
  // شیک‌ها
  {
    id: "prd_shake_choc",
    name: "شیک شکلات (Chocolate Shake)",
    category: "shake",
    price: 180000,
    description: "بستنی شکلاتی دست‌ساز، سس کاکائو هلندی و خامه فرم‌گرفته",
    tags: "شکلاتی, غلیظ",
    is_available: 1,
    image_url: "/images/products/shakes/chocolate-shake.png",
  },
  {
    id: "prd_shake_vanilla",
    name: "شیک وانیل (Vanilla Shake)",
    category: "shake",
    price: 160000,
    description: "بستنی وانیل ماداگاسکار با شیر پرچرب محلی",
    tags: "کلاسیک, لطیف",
    is_available: 1,
    image_url: "/images/products/shakes/vanilla-shake.png",
  },
  {
    id: "prd_shake_strawberry",
    name: "شیک توت‌فرنگی (Strawberry Shake)",
    category: "shake",
    price: 170000,
    description: "پوره توت‌فرنگی طبیعی همراه با بستنی خامه‌ای",
    tags: "میوه‌ای, شاداب",
    is_available: 1,
    image_url: "/images/products/shakes/strawberry-shake.png",
  },
  {
    id: "prd_shake_oreo",
    name: "شیک اورئو (Oreo Shake)",
    category: "shake",
    price: 190000,
    description: "بیسکویت اورئو خرد شده با بستنی کره‌ای و سس فندقی",
    tags: "محبوب, کرانچی",
    is_available: 1,
    image_url: "/images/products/shakes/oreo-shake.png",
  },
  {
    id: "prd_shake_banana",
    name: "شیک موز (Banana Shake)",
    category: "shake",
    price: 170000,
    description: "موز طبیعی و بستنی با خلال پسته یا عسل اختیاری",
    tags: "طبیعی, انرژی‌بخش",
    is_available: 1,
    image_url: "/images/products/shakes/banana-shake.png",
  },
  {
    id: "prd_shake_caramel",
    name: "شیک کارامل (Caramel Shake)",
    category: "shake",
    price: 185000,
    description: "سس دولچه دلچه کارامل نمکی با بستنی وانیلی",
    tags: "شیرین و نمکی, خاص",
    is_available: 1,
    image_url: "/images/products/shakes/caramel-shake.png",
  },
];

export function seedDatabase(resetOrders = false) {
  if (resetOrders) {
    db.exec("DELETE FROM order_items;");
    db.exec("DELETE FROM orders;");
    console.log("[RESET] Purged all test orders and reset active queues.");
  }

  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO products (
      id, name, category, price, description, tags, is_available, stock_count, image_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, -1, ?)
  `);

  const runSeed = db.transaction(() => {
    for (const p of initialProducts) {
      insertStmt.run(p.id, p.name, p.category, p.price, p.description, p.tags, p.is_available, p.image_url);
    }
  });

  runSeed();
  console.log(`[SEED] Successfully seeded ${initialProducts.length} authentic Soren Café products.`);
}

// Auto-run if executed directly
if (import.meta.main) {
  const isReset = process.argv.includes("--reset");
  seedDatabase(isReset);
  const count = db.prepare("SELECT COUNT(*) as count FROM products").get() as { count: number };
  console.log(`[DB] Total products in database: ${count.count}`);
}

