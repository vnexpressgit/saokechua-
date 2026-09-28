const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const rawData = [
  { date: "01/09/2026", content: "vinamilk", category: "Siêu thị, chợ", source: "TpBank tín dụng", amount: 147000 },
  { date: "01/09/2026", content: "túi niêm phong", category: "mua sắm", source: "TpBank tín dụng", amount: 103000 },
  { date: "01/09/2026", content: "the pasta house", category: "Ăn hàng", source: "TpBank tài khoản", amount: 530000 },
  { date: "02/09/2026", content: "ADC book", category: "Siêu thị, chợ", source: "TpBank tín dụng", amount: 126000 },
  { date: "02/09/2026", content: "rửa xe", category: "Xăng xe", source: "TpBank tài khoản", amount: 40000 },
  { date: "02/09/2026", content: "phở hiệu duy tân", category: "Ăn hàng", source: "TpBank tài khoản", amount: 165000 },
  { date: "02/09/2026", content: "cafe ccđ", category: "Ăn hàng", source: "TpBank tài khoản", amount: 95000 },
  { date: "02/09/2026", content: "tào phớ", category: "Ăn hàng", source: "TpBank tài khoản", amount: 60000 },
  { date: "02/09/2026", content: "nướng lẩu bùm gầm cầu", category: "Ăn hàng", source: "TpBank tài khoản", amount: 300000 },
  { date: "02/09/2026", content: "sữa chua", category: "Siêu thị, chợ", source: "TpBank tài khoản", amount: 30000 },
  { date: "03/09/2026", content: "2lands", category: "Ăn hàng", source: "TpBank tài khoản", amount: 45000 },
  { date: "03/09/2026", content: "cước gửi đồ về nhà", category: "Phí dịch vụ", source: "TpBank tài khoản", amount: 56000 },
  { date: "04/09/2026", content: "becberin", category: "Sức khỏe", source: "TpBank tài khoản", amount: 24000 },
  { date: "04/09/2026", content: "nạp utop", category: "Ăn hàng", source: "TpBank tài khoản", amount: 50000 },
  { date: "04/09/2026", content: "2lands", category: "Ăn hàng", source: "TpBank tài khoản", amount: 45000 },
  { date: "05/09/2026", content: "kfc", category: "Ăn hàng", source: "TpBank tài khoản", amount: 129000 },
  { date: "05/09/2026", content: "sách tiếng anh lớp 5", category: "mua sắm", source: "TpBank tài khoản", amount: 65000 },
  { date: "05/09/2026", content: "sách giao khoa", category: "mua sắm", source: "TpBank tín dụng", amount: 25000 },
  { date: "06/09/2026", content: "phí dịch vụ", category: "Nhà cửa", source: "TpBank tài khoản", amount: 635000 },
  { date: "08/09/2026", content: "winmart", category: "Siêu thị, chợ", source: "TpBank tài khoản", amount: 50000 },
  { date: "08/09/2026", content: "khoai trứng", category: "Ăn hàng", source: "TpBank tài khoản", amount: 20000 },
  { date: "08/09/2026", content: "2lands", category: "Ăn hàng", source: "TpBank tài khoản", amount: 45000 },
  { date: "08/09/2026", content: "2 áo Shh", category: "mua sắm", source: "TpBank tài khoản", amount: 127000 },
  { date: "09/09/2026", content: "phí ship thẻ hsbc", category: "Tín dụng", source: "Tiền mặt", amount: 30000 },
  { date: "09/09/2026", content: "tiền điện", category: "Phí dịch vụ", source: "TpBank tài khoản", amount: 986000 },
  { date: "09/09/2026", content: "internet", category: "Phí dịch vụ", source: "TpBank tài khoản", amount: 215000 },
  { date: "10/09/2026", content: "xăng xe sh", category: "Xăng xe", source: "TpBank tài khoản", amount: 160000 },
  { date: "10/09/2026", content: "đàn badon c170", category: "mua sắm", source: "TpBank tài khoản", amount: 1400000 },
  { date: "11/09/2026", content: "hoa quả", category: "Siêu thị, chợ", source: "TpBank tài khoản", amount: 60000 },
  { date: "11/09/2026", content: "hoa, tiền vàng", category: "Siêu thị, chợ", source: "TpBank tài khoản", amount: 40000 },
  { date: "11/09/2026", content: "mì tôm", category: "Siêu thị, chợ", source: "TpBank tài khoản", amount: 61000 },
  { date: "11/09/2026", content: "khoai trứng", category: "Ăn hàng", source: "TpBank tài khoản", amount: 20000 },
  { date: "11/09/2026", content: "2lands", category: "Ăn hàng", source: "TpBank tài khoản", amount: 45000 },
  { date: "11/09/2026", content: "2lands tặng vogia", category: "Ăn hàng", source: "TpBank tín dụng", amount: 57000 },
  { date: "11/09/2026", content: "winmart", category: "Siêu thị, chợ", source: "TpBank tín dụng", amount: 355000 },
  { date: "12/09/2026", content: "bún cá duy tân", category: "Ăn hàng", source: "TpBank tài khoản", amount: 100000 },
  { date: "12/09/2026", content: "tào phớ", category: "Ăn hàng", source: "TpBank tài khoản", amount: 30000 },
  { date: "12/09/2026", content: "winmart", category: "Siêu thị, chợ", source: "TpBank tín dụng", amount: 15000 },
  { date: "13/09/2026", content: "bami", category: "Ăn hàng", source: "TpBank tài khoản", amount: 35000 },
  { date: "13/09/2026", content: "cafe hanoi neighbors tuệ tĩnh", category: "Ăn hàng", source: "TpBank tài khoản", amount: 198000 },
  { date: "13/09/2026", content: "vé chơi tàu điện cv thống nhất", category: "Vui chơi", source: "TpBank tài khoản", amount: 25000 },
  { date: "13/09/2026", content: "vé tàu hỏa cv thống nhất", category: "Vui chơi", source: "TpBank tài khoản", amount: 90000 },
  { date: "13/09/2026", content: "nước sấu, mơ, bimbim cv thống nhấ", category: "Ăn hàng", source: "TpBank tài khoản", amount: 60000 },
  { date: "13/09/2026", content: "vé cưỡi ngựa hoa", category: "Vui chơi", source: "TpBank tài khoản", amount: 20000 },
  { date: "13/09/2026", content: "bánh bao thủy đồ", category: "Ăn hàng", source: "TpBank tài khoản", amount: 60000 },
  { date: "13/09/2026", content: "bánh da lợn trong hội chợ cv nghĩa đ", category: "Ăn hàng", source: "TpBank tài khoản", amount: 60000 },
  { date: "13/09/2026", content: "Bít tết hôm đi chơi với nhà Vân", category: "Ăn hàng", source: "TpBank tài khoản", amount: 70000 },
  { date: "14/09/2026", content: "thanh toán dư nợ sc", category: "Tín dụng", source: "TpBank tài khoản", amount: 722000 },
  { date: "14/09/2026", content: "nạp utop", category: "Ăn hàng", source: "TpBank tài khoản", amount: 50000 },
  { date: "14/09/2026", content: "giấy thơm quần áo", category: "mua sắm", source: "TpBank tín dụng", amount: 60000 },
  { date: "15/09/2026", content: "nạp utop", category: "Ăn hàng", source: "TpBank tài khoản", amount: 50000 },
  { date: "15/09/2026", content: "cọc xe vf6", category: "Di chuyển", source: "TpBank tài khoản", amount: 1000000 },
  { date: "15/09/2026", content: "thanh toán dư nợ jcb", category: "Tín dụng", source: "TpBank tài khoản", amount: 2579000 },
  { date: "15/09/2026", content: "winmart", category: "Siêu thị, chợ", source: "TpBank tài khoản", amount: 75000 },
  { date: "16/09/2026", content: "khoai trứng", category: "Ăn hàng", source: "TpBank tài khoản", amount: 20000 },
  { date: "16/09/2026", content: "không nhớ mua gì", category: "Chưa phân loại", source: "TpBank tài khoản", amount: 22000 },
  { date: "17/09/2026", content: "2lands", category: "Ăn hàng", source: "TpBank tài khoản", amount: 45000 },
  { date: "17/09/2026", content: "winmart", category: "Siêu thị, chợ", source: "TpBank tài khoản", amount: 60000 },
  { date: "17/09/2026", content: "bánh trung thu bếp hoa", category: "Ăn hàng", source: "TpBank tài khoản", amount: 276000 },
  { date: "18/09/2026", content: "2lands", category: "Ăn hàng", source: "TpBank tài khoản", amount: 45000 },
  { date: "18/09/2026", content: "2lands", category: "Ăn hàng", source: "TpBank tín dụng", amount: 57000 }
];

async function insertData() {
  // 1. Get all existing categories
  const { data: existingCategories, error: catError } = await supabase.from('categories').select('*');
  if (catError) {
    console.error('Error fetching categories:', catError);
    return;
  }

  const categoryMap = new Map();
  existingCategories.forEach(c => categoryMap.set(c.name.toLowerCase(), c.id));

  // 2. Identify missing categories
  const newCatNames = [...new Set(rawData.map(d => d.category))];
  const catsToInsert = newCatNames
    .filter(name => !categoryMap.has(name.toLowerCase()))
    .map(name => ({ name, color: '#64748b' }));

  if (catsToInsert.length > 0) {
    const { data: insertedCats, error: insertCatError } = await supabase
      .from('categories')
      .insert(catsToInsert)
      .select();
    
    if (insertCatError) {
      console.error('Error inserting categories:', insertCatError);
      return;
    }
    insertedCats.forEach(c => categoryMap.set(c.name.toLowerCase(), c.id));
  }

  // 3. Format and insert transactions
  const transactionsToInsert = rawData.map(d => {
    // Convert DD/MM/YYYY to ISO
    const [day, month, year] = d.date.split('/');
    const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0);
    
    return {
      amount: d.amount,
      type: 'OUT',
      content: d.content,
      category_id: categoryMap.get(d.category.toLowerCase()),
      note: d.source,
      gateway: d.source,
      transaction_date: dateObj.toISOString(),
      created_at: new Date().toISOString()
    };
  });

  const { error: txError } = await supabase.from('transactions').insert(transactionsToInsert);
  if (txError) {
    console.error('Error inserting transactions:', txError);
    return;
  }

  console.log(`Successfully inserted ${transactionsToInsert.length} transactions.`);
}

insertData();
