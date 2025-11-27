// =================== 本地存储管理 ====================
// 图片存储在 localStorage 中，避免云端大小限制
function saveMenuImageToLocal(dishId, imgData) {
    if (!imgData) return;
    try {
        localStorage.setItem(`dish_img_${dishId}`, imgData);
    } catch (e) {
        if (e.name === 'QuotaExceededError') {
            alert('本地存储已满，请清理浏览器缓存后重试');
        }
    }
}
function getMenuImageFromLocal(dishId) {
    try {
        return localStorage.getItem(`dish_img_${dishId}`);
    } catch (e) {
        return null;
    }
}
function clearMenuImagesFromLocal() {
    try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('dish_img_')) {
                localStorage.removeItem(key);
            }
        });
    } catch (e) {
        console.warn('清理本地图片失败:', e);
    }
}

// ================ 可选：上传图片到第三方托管服务 ================
async function uploadImageToHost(file) {
  if (!file) return null;
  if (!IMAGE_UPLOAD_PROVIDER) return null;
  try {
    if (IMAGE_UPLOAD_PROVIDER === 'cloudinary') {
      if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
        console.warn('Cloudinary 未配置，请设置 CLOUDINARY_CLOUD_NAME 和 CLOUDINARY_UPLOAD_PRESET');
        return null;
      }
      const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      const res = await fetch(url, { method: 'POST', body: fd });
      if (!res.ok) throw new Error('上传失败:' + res.status);
      const json = await res.json();
      return json.secure_url || json.url || null;
    }
    if (IMAGE_UPLOAD_PROVIDER === 'imgur') {
      if (!IMGUR_CLIENT_ID) {
        console.warn('Imgur 未配置，请设置 IMGUR_CLIENT_ID');
        return null;
      }
      // Imgur expects base64 image data
      const base64 = await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = e => resolve(e.target.result.split(',')[1]);
        fr.onerror = () => reject(new Error('读取图片失败'));
        fr.readAsDataURL(file);
      });
      const res = await fetch('https://api.imgur.com/3/image', {
        method: 'POST',
        headers: { 'Authorization': 'Client-ID ' + IMGUR_CLIENT_ID, 'Content-Type':'application/json' },
        body: JSON.stringify({ image: base64, type: 'base64' })
      });
      if (!res.ok) throw new Error('上传失败:' + res.status);
      const json = await res.json();
      return json.data?.link || null;
    }
    return null;
  } catch (e) {
    console.warn('uploadImageToHost 错误:', e);
    return null;
  }
}


// =================== 配置与初始数据 ====================
const BIN_ID_PLACEHOLDER = '6925c53943b1c97be9c47908'; 
const API_URL = `https://api.jsonbin.io/v3/b/${BIN_ID_PLACEHOLDER}`;
const API_KEY = '$2a$10$7V/NRmimLv7l/.73eHxqRe3gWuyzb3JRm7UkE0i0Y164VD608Ktri';

// ================ 图片上传/托管配置（可选） ================
// 如果想实现跨设备访问（手机可见），请配置一个图片托管服务并选择 provider。
// 支持 providers: 'cloudinary' (推荐), 'imgur'
// 说明：需要在代码中或环境变量中填入相应的凭证（仅在受信任环境中）
const IMAGE_UPLOAD_PROVIDER = 'cloudinary'; // set to 'cloudinary' or 'imgur' to enable
const CLOUDINARY_CLOUD_NAME = 'dlosu5b6j';
// 请确认这个 preset 已在 Cloudinary 后台创建，且设置为 unsigned（如果打算在浏览器端直接上传）
const CLOUDINARY_UPLOAD_PRESET = 'Cooking23';
const IMGUR_CLIENT_ID = '';


const categoryIcons = {
  '主菜': '🥘', '海鲜': '🦞', '素菜': '🥦', '主食': '🍚', '甜品': '🍨', '汤品': '🍜', '小食': '🥢'
};
const defaultCategory = "主菜";

const initialMenu = [
    { 
        id: 1, name: '招牌红烧肉', price: 48, category: '主菜', stock: 10, img: '',
        description: '选用上等猪肋条，用秘制酱料慢火炖制，入味可口',
        method: '1. 猪肉焯水后沥干 2. 冰糖炒糖色 3. 放入肉炒香 4. 加酱油、料酒炖40分钟',
        ingredients: '猪肋条500g、酱油、冰糖、八角、桂皮',
        spicy: '', taste: '', options: []
    },
    { 
        id: 2, name: '蒜蓉蒸扇贝', price: 68, category: '海鲜', stock: 15, img: '',
        description: '新鲜扇贝铺满香蒜和粉丝，蒸至鲜嫩多汁',
        method: '1. 扇贝清洗沥干 2. 铺粉丝垫底 3. 撒蒜蓉和油 4. 蒸8-10分钟即可',
        ingredients: '新鲜扇贝8个、蒜15粒、粉丝100g、青葱',
        spicy: '', taste: '', options: []
    },
    { 
        id: 3, name: '清炒时蔬', price: 22, category: '素菜', stock: 20, img: '',
        description: '精选当季蔬菜，清炒清甜，健康美味',
        method: '1. 蔬菜切块 2. 油热下锅快炒 3. 加盐调味即可',
        ingredients: '油麦菜、胡萝卜、黄瓜、玉米粒',
        spicy: '', taste: '', options: []
    },
    { 
        id: 4, name: '酸辣土豆丝', price: 18, category: '素菜', stock: 25, img: '',
        description: '脆口土豆丝，酸辣开胃，下饭一绝',
        method: '1. 土豆切丝浸水 2. 高温油炸至脆 3. 加醋、辣椒炒匀',
        ingredients: '土豆500g、醋、干辣椒、花椒',
        spicy: '中辣', taste: '酸辣', options: []
    },
    { 
        id: 5, name: '皮蛋瘦肉粥', price: 15, category: '主食', stock: 30, img: '',
        description: '软糯粥配皮蛋和瘦肉，营养丰富',
        method: '1. 米洗净煮粥 2. 加猪瘦肉和皮蛋 3. 煮至软糯，撒青葱即可',
        ingredients: '米、瘦肉200g、皮蛋2个、青葱',
        spicy: '', taste: '', options: []
    },
    { 
        id: 6, name: '香草冰淇淋', price: 20, category: '甜品', stock: 50, img: '',
        description: '顺滑香甜的冰淇淋，夏日清凉必选',
        method: '1. 蛋黄和糖打发 2. 加淡奶油混合 3. 冷冻6小时即可',
        ingredients: '蛋黄、牛奶、淡奶油、香草精',
        spicy: '', taste: '', options: []
    },
    { 
        id: 7, name: '番茄鸡蛋面', price: 16, category: '主食', stock: 35, img: '',
        description: '家常面食，酸酸的番茄配软嫩鸡蛋，清汤爽口',
        method: '1. 鸡蛋炒散 2. 番茄切块炒出汁 3. 下面条煮2分钟 4. 调味即可',
        ingredients: '鸡蛋2个、番茄2个、面条100g、青葱',
        spicy: '', taste: '酸鲜', options: []
    },
    { 
        id: 8, name: '宫保鸡丁', price: 38, category: '主菜', stock: 18, img: '',
        description: '传统家常菜，鸡丁爽脆，花生香脆，酸辣适口',
        method: '1. 鸡胸肉切丁 2. 炒至变白 3. 加花生和辣椒 4. 调味即可',
        ingredients: '鸡胸肉300g、花生100g、干辣椒、醋、糖',
        spicy: '中辣', taste: '酸辣', options: []
    },
    { 
        id: 9, name: '麻婆豆腐', price: 28, category: '主菜', stock: 22, img: '',
        description: '家常经典，豆腐软嫩，麻辣味重，下饭绝品',
        method: '1. 豆腐切块 2. 肉末炒香 3. 加豆腐和麻辣酱 4. 炖5分钟',
        ingredients: '豆腐400g、猪肉末150g、豆瓣酱、花椒、辣椒油',
        spicy: '重辣', taste: '麻辣', options: []
    },
    { 
        id: 10, name: '鱼香肉丝', price: 32, category: '主菜', stock: 20, img: '',
        description: '鱼香味型经典，肉丝爽脆，酸辣开胃',
        method: '1. 猪肉切丝 2. 快速炒至变白 3. 加入鱼香酱炒匀 4. 装盘即可',
        ingredients: '猪肉300g、豆瓣酱、醋、糖、干辣椒、青葱',
        spicy: '中辣', taste: '鱼香', options: []
    },
    { 
        id: 11, name: '辣子鸡', price: 42, category: '主菜', stock: 15, img: '',
        description: '四川家常菜，香辣脆，满眼都是红辣椒，重口味',
        method: '1. 鸡块炸至辣脆 2. 干辣椒炒香 3. 加入鸡块翻炒 4. 加花椒盐即可',
        ingredients: '鸡块600g、干辣椒150g、花椒、姜蒜',
        spicy: '重辣', taste: '麻辣', options: []
    },
    { 
        id: 12, name: '番茄汤', price: 12, category: '汤品', stock: 40, img: '',
        description: '清汤汤底，番茄酸甜，清爽开胃',
        method: '1. 番茄切块 2. 烧水煮番茄 3. 加盐调味即可',
        ingredients: '番茄3个、清水1升、盐',
        spicy: '', taste: '酸甜', options: []
    },
    { 
        id: 13, name: '鸡汤', price: 15, category: '汤品', stock: 30, img: '',
        description: '家常鸡汤，清汤鲜美，温暖舒适',
        method: '1. 鸡块焯水 2. 高汤煮30分钟 3. 加盐调味即可',
        ingredients: '鸡块400g、清水2升、红枣、冰糖',
        spicy: '', taste: '清鲜', options: []
    },
    { 
        id: 14, name: '炸春卷', price: 14, category: '小食', stock: 50, img: '',
        description: '酥脆外壳，馅料丰富，香喷喷的家常小食',
        method: '1. 春卷皮包馅 2. 油温180度炸2分钟 3. 沥油即可',
        ingredients: '春卷皮、肉末、蔬菜、鸡蛋',
        spicy: '', taste: '', options: []
    },
    { 
        id: 15, name: '炸丸子', price: 12, category: '小食', stock: 45, img: '',
        description: '家常零食，外脆里嫩，热呼呼的',
        method: '1. 肉末混合调料擀圆 2. 油温165度炸3分钟 3. 沥油即可',
        ingredients: '猪肉末300g、淀粉、鸡蛋、盐',
        spicy: '', taste: '', options: []
    }
];

let state = {
    menu: JSON.parse(JSON.stringify(initialMenu)),
    orders: [],
    trash: [], // 回收站中的已删除订单
    currentCart: {}, // { itemId: { quantity, selectedOptions: [...] } }
    isLoaded: false,
    currentView: "customer", // "customer"|"kitchen"
    customerTab: "menu", // "menu" | "cart" | "orders"
    menuCategory: null, // 选中的菜单分类
    kitchenTab: "orders", // "orders" | "trash"
    menuEditDialog: null,
    dishDetailDialog: null, // for viewing dish details
    collapsedOrderDates: {} // 折叠订单的日期状态
};
// =================== 云端数据同步 ====================
async function loadRemoteData() {
    try {
        const res = await fetch(API_URL, {
            method: 'GET', headers: { 'X-Access-Key': API_KEY, 'Content-Type': 'application/json' }
        });
        if (res.ok) {
            const json = await res.json();
            return json.record || { menu: initialMenu, orders: [] };
        }
        return { menu: initialMenu, orders: [] };
    } catch {
        return { menu: initialMenu, orders: [] };
    }
}
async function saveRemoteData() {
    try {
        const res = await fetch(API_URL, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-Access-Key': API_KEY },
            body: JSON.stringify({ menu: state.menu, orders: state.orders })
        });
        if (!res.ok) {
            const txt = await res.text().catch(()=>'');
            console.error('同步失败，服务器返回:', res.status, txt);
            // 如果是 413 Payload Too Large，提示用户图片过大
            if (res.status === 413) {
                showNotification('❌ 数据过大，请删除或压缩图片后重试', 'error', 5000);
            }
        } else {
            console.log('✅ 数据同步成功');
        }
    } catch (e) { 
        console.error("同步失败：", e);
        showNotification('❌ 网络连接失败，数据已保存到本地', 'warning', 3000);
    }
}// =================== 通知系统 ====================
function showNotification(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `notification-toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('out');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// =================== 主界面渲染入口 ====================
function renderApp() {
    if (!state.isLoaded) {
        document.getElementById('content-area').innerHTML = '<div class="loader mt-20 mx-auto"></div>';
        return;
    }
    document.body.classList.toggle('kitchen', state.currentView === "kitchen");
    document.getElementById('customer-view-btn').className =
        'px-4 py-2 rounded-lg font-semibold shadow-md ' + (state.currentView === 'customer' ? 'bg-indigo-600 text-white' : 'bg-gray-200');
    document.getElementById('kitchen-view-btn').className =
        'px-4 py-2 rounded-lg font-semibold shadow-md ' + (state.currentView === 'kitchen' ? 'bg-indigo-600 text-white' : 'bg-gray-200');
    if (state.currentView === "customer") {
        renderCustomerTab();
    } else {
        renderKitchenView();
        attachKitchenEventListeners();
    }
    attachCustomerTabListeners(); // 每次都绑定Tab栏
}

// =================== 顾客三栏Tab ====================
function renderCustomerTab() {
  // 始终使用底部三栏标签页切换（菜单/购物车/订单）
  if (state.customerTab === "menu") {
    document.getElementById('content-area').innerHTML = renderMenuTab() + renderDishDetailDialog();
    attachMenuEventListeners();
    attachDishDetailEventListeners();
  } else if (state.customerTab === "cart") {
    document.getElementById('content-area').innerHTML = renderCartTab();
    attachCartEventListeners();
  } else if (state.customerTab === "orders") {
    document.getElementById('content-area').innerHTML = renderOrdersTab();
    attachOrdersEventListeners();
  }
  updateTabBarActive();
  updateTabBadges();
}
function updateTabBarActive() {
    ["tab-menu", "tab-cart", "tab-orders"].forEach(tab => {
        document.getElementById(tab).classList.remove("text-indigo-600", "font-bold");
    });
    document.getElementById('tab-' + state.customerTab).classList.add("text-indigo-600", "font-bold");
}
function updateTabBadges() {
    // 购物车标签显示商品数量
    const cartBtn = document.getElementById('tab-cart');
    const cartCount = Object.keys(state.currentCart).reduce((sum, id) => sum + (state.currentCart[id].quantity || 0), 0);
    let cartBadge = cartBtn.querySelector('.tab-badge');
    if (cartCount > 0) {
        if (!cartBadge) {
            cartBadge = document.createElement('span');
            cartBadge.className = 'tab-badge';
            cartBtn.appendChild(cartBadge);
        }
        cartBadge.textContent = cartCount;
    } else if (cartBadge) {
        cartBadge.remove();
    }
    // 订单标签显示待处理/制作中订单数
    const ordersBtn = document.getElementById('tab-orders');
    const pendingCount = state.orders.filter(o => o.status !== 'Completed').length;
    let ordersBadge = ordersBtn.querySelector('.tab-badge');
    if (pendingCount > 0) {
        if (!ordersBadge) {
            ordersBadge = document.createElement('span');
            ordersBadge.className = 'tab-badge';
            ordersBtn.appendChild(ordersBadge);
        }
        ordersBadge.textContent = pendingCount;
    } else if (ordersBadge) {
        ordersBadge.remove();
    }
}
function attachCustomerTabListeners() {
    document.getElementById('tab-menu').onclick = () => { state.customerTab = "menu"; renderApp(); };
    document.getElementById('tab-cart').onclick = () => { state.customerTab = "cart"; renderApp(); };
    document.getElementById('tab-orders').onclick = () => { state.customerTab = "orders"; renderApp(); };
}
function renderMenuTab() {
    const menuByCategory = state.menu.reduce((acc, item) => {
        acc[item.category] = acc[item.category] || [];
        acc[item.category].push(item);
        return acc;
    }, {});
    
    const categories = Object.keys(menuByCategory).sort((a, b) => (categoryIcons[a] || '').localeCompare(categoryIcons[b] || ''));
    const activeCategory = state.menuCategory || categories[0];
    
    return `
    <div class="max-w-6xl mx-auto w-full">
      <div class="sticky top-0 bg-white z-20 py-2 border-b shadow-sm">
        <div class="flex gap-2 overflow-x-auto px-3 pb-2">
          ${categories.map(cat => `
            <button class="category-btn px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${activeCategory === cat ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}" data-category="${cat}">
              ${categoryIcons[cat] || ''} ${cat}
            </button>
          `).join('')}
        </div>
      </div>
      
      <div class="p-3">
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        ${(menuByCategory[activeCategory] || []).map(item => {
            const imgSrc = (item.img || '').trim() ? item.img : (getMenuImageFromLocal(item.id) || 'https://via.placeholder.com/120?text='+encodeURIComponent(item.name));
            return `
          <div class="bg-white rounded-lg shadow hover:shadow-md transition-all overflow-hidden flex flex-col cursor-pointer group">
            <div class="relative h-24 bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center border-b overflow-hidden">
              <img src="${imgSrc}" alt="${item.name}" class="w-20 h-20 object-cover rounded group-hover:scale-110 transition-transform" loading="lazy" />
              <span class="absolute top-1 right-1 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">库存${item.stock}</span>
            </div>
            <div class="p-2 flex flex-col flex-grow">
              <h3 class="text-sm font-bold mb-0.5 text-gray-800 line-clamp-1">${item.name}</h3>
              <p class="text-xs text-gray-500 mb-1 line-clamp-1">${item.description}</p>
              <span class="text-sm font-extrabold text-red-600 mb-2">¥${item.price}</span>
              <div class="mt-auto flex gap-1">
                <button data-id="${item.id}" class="view-dish-btn flex-1 px-1 py-1 text-indigo-600 border border-indigo-600 rounded text-xs font-semibold hover:bg-indigo-50">详情</button>
                <button data-id="${item.id}" class="add-to-cart-btn flex-1 px-1 py-1 text-white rounded bg-indigo-500 hover:bg-indigo-600 text-xs font-semibold">加入</button>
              </div>
            </div>
          </div>
        `;
        }).join('')}
        </div>
        ${(menuByCategory[activeCategory] || []).length === 0 ? '<div class="text-center text-gray-400 py-8">该分类暂无菜品</div>' : ''}
      </div>
    </div>
    `;
}
function attachMenuEventListeners() {
  // 分类按钮监听
  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.onclick = () => {
      state.menuCategory = btn.dataset.category;
      renderApp();
    };
  });
  
  document.querySelectorAll('.view-dish-btn').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      const item = state.menu.find(m=>String(m.id)===String(id));
      if (!item) return console.warn('菜品不存在', id);
      state.dishDetailDialog = item;
      renderApp();
    };
  });
  
  document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      const item = state.menu.find(m=>String(m.id)===String(id));
      if (!item) return console.warn('add-to-cart: 未找到菜品', id);
      const cur = state.currentCart[id] || { quantity: 0, selectedOptions: [] };
      if (typeof item.stock === 'number' && cur.quantity + 1 > item.stock) {
        return alert('库存不足');
      }
      state.currentCart[id] = { 
        quantity: cur.quantity + 1, 
        selectedOptions: [] 
      };
      showNotification(`➕ 已添加 ${item.name}`, 'info', 1500);
      renderApp();
    };
  });
}
function attachDishDetailEventListeners() {
  const closeBtn = document.getElementById('dish-detail-close');
  if (closeBtn) closeBtn.onclick = () => {
    state.dishDetailDialog = null;
    renderApp();
  };
  
  const addBtn = document.getElementById('dish-detail-add-btn');
  if (addBtn) {
    addBtn.onclick = () => {
      const id = addBtn.dataset.id;
      const item = state.menu.find(m=>String(m.id)===String(id));
      if (!item) return console.warn('菜品不存在', id);
      
      const cur = state.currentCart[id] || { quantity: 0, selectedOptions: [] };
      if (typeof item.stock === 'number' && cur.quantity + 1 > item.stock) {
        return alert('库存不足');
      }
      
      // 收集选中的选项
      const selectedOptions = [];
      document.querySelectorAll('.dish-option:checked').forEach(cb => {
        selectedOptions.push(cb.dataset.option);
      });
      
      state.currentCart[id] = {
        quantity: cur.quantity + 1,
        selectedOptions: selectedOptions
      };
      
      showNotification(`✅ 已添加 ${item.name}${selectedOptions.length > 0 ? '（' + selectedOptions.join('、') + '）' : ''}`, 'success', 2000);
      state.dishDetailDialog = null;
      renderApp();
    };
  }
}

function getCartDetails() {
    const res = [];
    for (const id in state.currentCart) {
        const cartItem = state.currentCart[id];
        const item = state.menu.find(m => String(m.id) === String(id));
        if (item && cartItem.quantity > 0) {
            res.push({ 
                id: item.id, 
                name: item.name, 
                price: item.price, 
                quantity: cartItem.quantity, 
                img: item.img,
                selectedOptions: cartItem.selectedOptions || []
            });
        }
    }
    return res;
}
function renderCartTab() {
    const cartItems = getCartDetails();
    const total = cartItems.reduce((a, b) => a + b.price * b.quantity, 0);
    return `
    <div class="max-w-2xl mx-auto w-full p-3">
      <div class="bg-white rounded-xl shadow-lg p-5">
        <h2 class="text-2xl font-bold mb-5 flex items-center"><span class="text-2xl mr-3">🛒</span>购物车</h2>
        <div class="space-y-3 max-h-96 overflow-y-auto">
          ${
            cartItems.length ? 
              cartItems.map((i, idx) => {
                const imgSrc = (i.img || '').trim() ? i.img : (getMenuImageFromLocal(i.id) || 'https://via.placeholder.com/60?text=+');
                return `
                <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <img src="${imgSrc}" alt="${i.name}" class="w-16 h-16 object-cover rounded border" />
                  <div class="flex-1">
                    <span class="font-bold text-gray-800">${i.name}</span>
                    ${i.selectedOptions && i.selectedOptions.length > 0 ? `<div class="text-xs text-gray-500">${i.selectedOptions.join('、')}</div>` : ''}
                    <span class="text-sm text-gray-600">¥${i.price} × ${i.quantity}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <button class="cart-qty-btn px-2 py-1 bg-gray-200 rounded text-sm" data-id="${i.id}" data-action="minus">−</button>
                    <span class="w-6 text-center font-semibold">${i.quantity}</span>
                    <button class="cart-qty-btn px-2 py-1 bg-gray-200 rounded text-sm" data-id="${i.id}" data-action="plus">+</button>
                  </div>
                  <button class="cart-delete-btn px-3 py-1 bg-red-500 text-white rounded text-sm" data-id="${i.id}">删除</button>
                </div>
              `;
              }).join('') : '<p class="text-gray-400 text-center py-8">购物车为空</p>'
          }
        </div>
        <div class="border-t mt-4 pt-4 flex justify-between items-center font-bold">
          <span class="text-lg">合计：</span>
          <span class="text-2xl text-red-500">¥${total.toFixed(2)}</span>
        </div>
        <button id='submit-order-btn' class='mt-5 w-full text-white py-3 rounded-lg bg-green-500 hover:bg-green-600 font-bold text-lg transition transform hover:scale-105 ${cartItems.length?'':'opacity-60 cursor-not-allowed'}' ${cartItems.length?'':'disabled'}>
          提交订单
        </button>
      </div>
    </div>
    `;
}
function attachCartEventListeners() {
    const submitBtn = document.getElementById('submit-order-btn');
    if (submitBtn) submitBtn.onclick = submitOrder;
    
    document.querySelectorAll('.cart-qty-btn').forEach(btn => {
        btn.onclick = () => {
            const id = btn.dataset.id;
            const action = btn.dataset.action;
            const cart = state.currentCart[id];
            if (!cart) return;
            if (action === 'plus') {
                const item = state.menu.find(m=>String(m.id)===String(id));
                if (item && cart.quantity >= item.stock) {
                    return alert('库存不足');
                }
                cart.quantity++;
            } else if (action === 'minus' && cart.quantity > 1) {
                cart.quantity--;
            }
            renderApp();
        };
    });
    
    document.querySelectorAll('.cart-delete-btn').forEach(btn => {
        btn.onclick = () => {
            const id = btn.dataset.id;
            delete state.currentCart[id];
            renderApp();
        };
    });
}
function attachOrdersEventListeners() {
    // 订单日期折叠按钮
    document.querySelectorAll('.order-date-btn').forEach(btn => {
        btn.onclick = () => {
            const date = btn.dataset.date;
            state.collapsedOrderDates[date] = !state.collapsedOrderDates[date];
            renderApp();
        };
    });
}
function renderOrdersTab() {
    const statusMap = { Pending: "等待制作", Processing: "制作中", Completed: "已完成" };
    if (!state.orders.length) return `<div class="p-10 text-center text-gray-400">暂无订单</div>`;
    
    // 按日期分组
    const ordersByDate = {};
    state.orders.forEach(o => {
        const dateStr = new Date(o.timestamp).toLocaleDateString('zh-CN');
        if (!ordersByDate[dateStr]) ordersByDate[dateStr] = [];
        ordersByDate[dateStr].push(o);
    });
    
    return `<div class="max-w-2xl mx-auto w-full space-y-3 p-3">
        ${Object.entries(ordersByDate).sort((a, b) => new Date(b[0]) - new Date(a[0])).map(([dateStr, orders]) => {
            const isCollapsed = state.collapsedOrderDates[dateStr];
            const orderCount = orders.length;
            return `
            <div class="bg-white rounded-lg shadow-md overflow-hidden">
              <button class="order-date-btn w-full px-4 py-3 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-blue-50 hover:from-indigo-100 hover:to-blue-100 transition font-semibold text-gray-800 border-b" data-date="${dateStr}">
                <span>📅 ${dateStr} (${orderCount}个订单)</span>
                <span class="text-lg transition-transform ${isCollapsed ? '' : 'rotate-180'}">${isCollapsed ? '▼' : '▲'}</span>
              </button>
              <div class="${isCollapsed ? 'hidden' : ''} space-y-2 p-3">
                ${orders.sort((a,b) => b.timestamp - a.timestamp).map(o => `
                    <div class="bg-gray-50 rounded-lg p-3 border-l-4 ${o.status==='Completed' ? 'border-green-500' : (o.status==='Processing' ? 'border-yellow-500' : 'border-red-400')}">
                      <div class="flex justify-between items-start gap-2 mb-2">
                        <div>
                          <span class="font-bold">订单 #${o.id}</span>
                          <span class="ml-2 text-xs px-2 py-0.5 rounded font-semibold ${o.status==='Completed'
                            ? 'bg-green-100 text-green-700'
                            : (o.status==='Processing'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700')}"
                          >${statusMap[o.status]||'未知'}</span>
                        </div>
                        <div class="text-right">
                          <div class="font-bold text-red-600">¥${o.total}</div>
                          <div class="text-xs text-gray-500">${new Date(o.timestamp).toLocaleTimeString()}</div>
                        </div>
                      </div>
                      <div class="text-xs space-y-1">
                        ${o.items.map(i => `<div class="text-gray-700">🍽️ ${i.name} ×${i.quantity}</div>`).join('')}
                      </div>
                    </div>
                  `).join('')}
              </div>
            </div>
        `}).join('')}
      </div>`;
}
async function submitOrder() {
    const items = getCartDetails();
    if (!items.length) return alert('购物车为空');
    const total = items.reduce((a, b) => a + b.price * b.quantity, 0);
    const newOrder = {
        id: Date.now(),
        items, total,
        status: 'Pending',
        timestamp: Date.now()
    };
    state.orders.push(newOrder);
    state.currentCart = {};
    await saveRemoteData();
    showNotification(`✅ 订单已提交！订单号: #${newOrder.id}`, 'success');
    state.customerTab = "orders";
    renderApp();
}

// =================== 厨房界面功能 ====================
function renderKitchenView() {
    document.getElementById('content-area').innerHTML = `
      <div class="space-y-10">
        <section>
          <h2 class="text-2xl font-extrabold mb-2 flex items-center"><span class="mr-2">🍳</span> 订单管理</h2>
          <div class="flex gap-2 mb-4">
            <button id="kitchen-tab-orders" class="px-4 py-2 rounded font-semibold ${state.kitchenTab==='orders'?'bg-indigo-600 text-white':'bg-gray-200'}">📥 活跃订单</button>
            <button id="kitchen-tab-trash" class="px-4 py-2 rounded font-semibold ${state.kitchenTab==='trash'?'bg-indigo-600 text-white':'bg-gray-200'}">🗑️ 回收站 (${state.trash.length})</button>
          </div>
          ${state.kitchenTab === 'orders' ? renderKitchenOrders() : renderKitchenTrash()}
        </section>
        <section>
          <h2 class="text-2xl font-extrabold mb-2 flex items-center"><span class="mr-2">📋</span> 菜品管理</h2>
          ${renderKitchenMenuTable()}
          <button id="add-dish-btn" class="mt-3 bg-green-500 hover:bg-green-600 text-white rounded px-4 py-2 font-semibold">添加菜品</button>
        </section>
      </div>
      ${renderMenuEditDialog()}
    `;
}
function renderKitchenMenuTable() {
    if (!state.menu.length) return '<p class="text-gray-400">暂无菜品，点击下方添加。</p>';
    return `<table class="w-full bg-white shadow rounded-xl overflow-hidden text-center"><thead>
      <tr class="bg-gray-100 text-gray-800">
        <th class="p-2">图片</th><th>名称</th><th>价格</th><th>类别</th><th>库存</th><th>操作</th>
      </tr></thead><tbody>
      ${
        state.menu.map(item => {
          const imgSrc = (item.img || '').trim() ? item.img : (getMenuImageFromLocal(item.id) || 'https://via.placeholder.com/56?text=+');
          return `<tr class="border-b">
            <td class="p-2"><img class="w-14 h-14 object-cover rounded mx-auto border" src="${imgSrc}" alt="${item.name}"></td>
            <td>${item.name}</td>
            <td>¥${item.price}</td>
            <td>${categoryIcons[item.category]||''} ${item.category}</td>
            <td>${item.stock}</td>
            <td>
              <button class="menu-edit-btn text-blue-500 underline mr-2" data-id="${item.id}">编辑</button>
              <button class="menu-delete-btn text-red-500 underline" data-id="${item.id}">删除</button>
            </td>
          </tr>`;
        }).join('')
      }
    </tbody></table>`;
}
function renderKitchenOrders() {
    const statusMap = { Pending: "待处理", Processing: "制作中", Completed: "已完成" };
    
    // 按日期分组
    const ordersByDate = {};
    state.orders.forEach(o => {
        const dateStr = new Date(o.timestamp).toLocaleDateString('zh-CN');
        if (!ordersByDate[dateStr]) ordersByDate[dateStr] = [];
        ordersByDate[dateStr].push(o);
    });
    
    return `<div class="space-y-3">
      ${Object.entries(ordersByDate).sort((a, b) => new Date(b[0]) - new Date(a[0])).map(([dateStr, orders]) => {
            const isCollapsed = state.collapsedOrderDates[dateStr];
            const statuses = { Pending: [], Processing: [], Completed: [] };
            orders.forEach(o => statuses[o.status].push(o));
            return `
            <div class="bg-white rounded-lg shadow-md overflow-hidden">
              <button class="kitchen-date-btn w-full px-4 py-3 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-blue-50 hover:from-indigo-100 hover:to-blue-100 transition font-semibold text-gray-800 border-b" data-date="${dateStr}">
                <span>📅 ${dateStr} (待处理:${statuses.Pending.length} 制作中:${statuses.Processing.length} 已完成:${statuses.Completed.length})</span>
                <span class="text-lg transition-transform ${isCollapsed ? '' : 'rotate-180'}">${isCollapsed ? '▼' : '▲'}</span>
              </button>
              <div class="${isCollapsed ? 'hidden' : ''} p-3">
                <div class="grid md:grid-cols-3 gap-4">
                  ${['Pending', 'Processing', 'Completed'].map(status => `
                    <div>
                      <div class="font-bold mb-2 px-3 py-2 rounded text-sm ${
                        status === 'Pending' ? 'bg-red-100 text-red-700' :
                        status === 'Processing' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }">${statusMap[status]} (${statuses[status].length})</div>
                      <div class="space-y-2">
                        ${statuses[status].length > 0 ?
                          statuses[status].sort((a, b) => b.timestamp - a.timestamp).map(o => `
                            <div class="bg-gray-50 rounded p-3 border-l-4 ${
                              status === 'Completed' ? 'border-green-500' :
                              status === 'Processing' ? 'border-yellow-500' :
                              'border-red-500'
                            }">
                              <div class="font-bold text-sm mb-2">#${o.id}</div>
                              <ul class="text-xs space-y-1 mb-2">
                                ${o.items.map(i => `<li>🍽️ ${i.name} ×${i.quantity}</li>`).join('')}
                              </ul>
                              <div class="flex justify-between items-center text-xs mb-2">
                                <span class="text-gray-500">${new Date(o.timestamp).toLocaleTimeString()}</span>
                                <span class="font-bold text-red-600">¥${o.total}</span>
                              </div>
                              ${status !== 'Completed' ? 
                                `<button class="order-action-btn w-full px-2 py-1 bg-indigo-600 text-white rounded text-xs font-semibold hover:bg-indigo-700" data-id="${o.id}" data-action="${status==='Pending'?'start':'complete'}">
                                  ${status==='Pending'?'🔨 开始':'✅ 完成'}
                                </button>` : 
                                `<button class="order-delete-btn w-full px-2 py-1 bg-red-500 text-white rounded text-xs font-semibold hover:bg-red-600" data-id="${o.id}">🗑️ 删除</button>`
                              }
                            </div>
                          `).join('')
                          : `<div class="text-gray-400 text-xs italic text-center py-4">暂无${statusMap[status]}订单</div>`
                        }
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
        `}).join('')}
    </div>`;
}
function renderKitchenTrash() {
    if (state.trash.length === 0) {
        return '<p class="text-gray-400 text-center py-8">回收站为空</p>';
    }
    return `<div class="space-y-4">
        ${state.trash.map(o => `
          <div class="bg-white rounded-lg shadow-md p-4 border-l-4 border-gray-400">
            <div class="flex justify-between items-start mb-2">
              <div class="font-bold">#${o.id}</div>
              <span class="text-xs text-gray-500">${new Date(o.timestamp).toLocaleString('zh-CN')}</span>
            </div>
            <ul class="text-xs space-y-1 mb-3">
              ${o.items.map(i => `<li class="text-gray-700">📍 ${i.name} ×${i.quantity}</li>`).join('')}
            </ul>
            <div class="flex justify-between items-center mb-3">
              <span class="font-bold text-indigo-600">¥${o.total}</span>
              <span class="text-xs px-2 py-1 bg-gray-100 rounded">状态: ${o.status}</span>
            </div>
            <div class="flex gap-2">
              <button class="order-restore-btn flex-1 px-2 py-2 bg-blue-500 text-white rounded text-xs font-semibold hover:bg-blue-600" data-id="${o.id}">♻️ 恢复</button>
              <button class="order-clear-btn flex-1 px-2 py-2 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700" data-id="${o.id}">⛔ 彻底删除</button>
            </div>
          </div>
        `).join('')}
    </div>`;
}
function renderMenuEditDialog() {
    if (!state.menuEditDialog) return "";
    const d = state.menuEditDialog;
  const currImg = (d.img || '').trim() ? d.img : getMenuImageFromLocal(d.id);
    return `
  <div class="fixed bg-black bg-opacity-30 z-50 left-0 top-0 right-0 bottom-0 flex justify-center items-center p-4 overflow-y-auto">
    <form id="menu-form-dialog" class="w-full max-w-sm bg-white shadow-lg rounded-xl p-5 relative my-8 max-h-[90vh] overflow-y-auto" enctype="multipart/form-data" autocomplete="off">
      <h2 class="text-lg font-bold mb-3 sticky top-0 bg-white z-10">${d.isNew?"添加":"编辑"}菜品</h2>
      <label class="block mb-2 text-sm"><span class="font-semibold">菜名</span><input required name="name" value="${d.name||''}" class="input block border rounded w-full p-2 mt-1 text-sm"></label>
      <label class="block mb-2 text-sm"><span class="font-semibold">价格</span><input required type="number" min="0" name="price" value="${d.price||''}" class="input block border rounded w-full p-2 mt-1 text-sm"></label>
      <label class="block mb-2 text-sm"><span class="font-semibold">类别</span>
        <select name="category" class="block p-2 border rounded w-full mt-1 text-sm">
        ${Object.keys(categoryIcons).map(cat=>
          `<option value="${cat}" ${d.category===cat?'selected':''}>${categoryIcons[cat]} ${cat}</option>`
        ).join("")}
        </select>
      </label>
      <label class="block mb-2 text-sm"><span class="font-semibold">库存</span><input required type="number" min="0" name="stock" value="${d.stock||''}" class="input block border rounded w-full p-2 mt-1 text-sm"></label>
      <label class="block mb-2 text-sm"><span class="font-semibold">菜品描述</span>
        <textarea name="description" class="input block border rounded w-full p-2 mt-1 text-sm" rows="1" placeholder="简要介绍菜品">${d.description||''}</textarea>
      </label>
      <label class="block mb-2 text-sm"><span class="font-semibold">制作方法</span>
        <textarea name="method" class="input block border rounded w-full p-2 mt-1 text-sm" rows="1">${d.method||''}</textarea>
      </label>
      <label class="block mb-2 text-sm"><span class="font-semibold">原材料</span>
        <input name="ingredients" value="${d.ingredients||''}" class="input block border rounded w-full p-2 mt-1 text-sm">
      </label>
      <label class="block mb-2 text-sm"><span class="font-semibold">辣度</span>
        <input name="spicy" value="${d.spicy||''}" placeholder="如 微辣/中辣/重辣/不辣" class="input block border rounded w-full p-2 mt-1 text-sm">
      </label>
      <label class="block mb-2 text-sm"><span class="font-semibold">口味</span>
        <input name="taste" value="${d.taste||''}" placeholder="如 咸鲜/酸甜/麻辣/清淡" class="input block border rounded w-full p-2 mt-1 text-sm">
      </label>
      <label class="block mb-3 text-sm"><span class="font-semibold">菜品图片</span>
        <input name="imgfile" type="file" accept="image/*" class="block mt-2 text-xs">
        ${currImg?`<img src="${currImg}" class="mt-2 block w-20 h-20 object-cover border rounded">`:''}
        <p class="text-xs text-gray-500 mt-1">若配置了图片托管（Cloudinary/Imgur），图片将上传并生成 URL，可跨设备访问；否则仅存本地。</p>
      </label>
      <div class="flex gap-2 sticky bottom-0 bg-white z-10 mt-3">
        <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded font-bold flex-1 text-sm">${d.isNew?"添加":"保存"}</button>
        <button type="button" id="menu-cancel-btn" class="bg-gray-500 text-white px-4 py-2 rounded flex-1 text-sm">取消</button>
      </div>
    </form>
  </div>
    `;
}
function renderDishDetailDialog() {
    if (!state.dishDetailDialog) return "";
    const d = state.dishDetailDialog;
    const imgSrc = (d.img || '').trim() ? d.img : (getMenuImageFromLocal(d.id) || 'https://via.placeholder.com/200?text='+encodeURIComponent(d.name));
    return `
  <div class="fixed bg-black bg-opacity-40 z-50 left-0 top-0 right-0 bottom-0 flex justify-center items-center p-4 overflow-y-auto">
    <div class="w-full max-w-md bg-white shadow-2xl rounded-2xl p-6 my-8 relative max-h-[85vh] overflow-y-auto">
      <button id="dish-detail-close" class="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl">×</button>
      <div class="text-center mb-4">
        <img src="${imgSrc}" alt="${d.name}" class="w-40 h-40 object-cover rounded-lg mx-auto border" />
      </div>
      <h2 class="text-2xl font-bold mb-2 text-center">${d.name}</h2>
      <div class="text-red-600 font-bold text-center text-2xl mb-4">¥${d.price}</div>
      
      <div class="mb-3 p-3 bg-blue-50 rounded-lg">
        <p class="text-sm text-gray-700"><strong>📝 介绍：</strong></p>
        <p class="text-xs text-gray-600 mt-1">${d.description||'暂无说明'}</p>
      </div>
      
      <div class="mb-3 p-3 bg-green-50 rounded-lg">
        <p class="text-sm text-gray-700"><strong>🍳 制作方法：</strong></p>
        <p class="text-xs text-gray-600 mt-1 whitespace-pre-wrap">${d.method||'暂无说明'}</p>
      </div>
      
      <div class="mb-3 p-3 bg-yellow-50 rounded-lg">
        <p class="text-sm text-gray-700"><strong>🥘 原材料：</strong></p>
        <p class="text-xs text-gray-600 mt-1">${d.ingredients||'暂无信息'}</p>
      </div>
      
      ${d.spicy ? `<div class="mb-3 p-3 bg-orange-50 rounded-lg border border-orange-200"><p class="text-sm text-gray-700"><strong>🌶️ 辣度建议：</strong> <span class="text-orange-600 font-semibold">${d.spicy}</span></p></div>` : ''}
      ${d.taste ? `<div class="mb-3 p-3 bg-pink-50 rounded-lg border border-pink-200"><p class="text-sm text-gray-700"><strong>👅 口味：</strong> <span class="text-pink-600 font-semibold">${d.taste}</span></p></div>` : ''}
      
      <div class="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
        <p class="text-sm font-bold mb-3 text-purple-900">🍴 您的选择（可多选）：</p>
        <div class="space-y-2">
          <label class="flex items-center text-sm cursor-pointer hover:bg-purple-100 p-2 rounded transition">
            <input type="checkbox" class="dish-option w-4 h-4 rounded" data-option="加辣" data-price="0" />
            <span class="ml-3 flex-1 font-medium text-gray-800">加辣</span>
            <span class="text-xs text-gray-400">免费</span>
          </label>
          <label class="flex items-center text-sm cursor-pointer hover:bg-purple-100 p-2 rounded transition">
            <input type="checkbox" class="dish-option w-4 h-4 rounded" data-option="香菜多" data-price="0" />
            <span class="ml-3 flex-1 font-medium text-gray-800">香菜多</span>
            <span class="text-xs text-gray-400">免费</span>
          </label>
          <label class="flex items-center text-sm cursor-pointer hover:bg-purple-100 p-2 rounded transition">
            <input type="checkbox" class="dish-option w-4 h-4 rounded" data-option="葱多点" data-price="0" />
            <span class="ml-3 flex-1 font-medium text-gray-800">葱多点</span>
            <span class="text-xs text-gray-400">免费</span>
          </label>
          ${d.options && d.options.map((opt, idx) => `
            <label class="flex items-center text-sm cursor-pointer hover:bg-purple-100 p-2 rounded transition">
              <input type="checkbox" class="dish-option w-4 h-4 rounded" data-option="${opt.name}" data-price="${opt.price||0}" value="${idx}" />
              <span class="ml-3 flex-1 font-medium text-gray-800">${opt.name}</span>
              ${opt.price ? `<span class="text-xs text-red-600 font-bold">+¥${opt.price}</span>` : '<span class="text-xs text-gray-400">免费</span>'}
            </label>
          `).join('') || ''}
        </div>
      </div>
      
      <button id="dish-detail-add-btn" data-id="${d.id}" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg mt-4 transition transform hover:scale-105 active:scale-95 shadow-lg">
        ✅ 加入购物车
      </button>
    </div>
  </div>
    `;
}
function attachKitchenEventListeners() {
    const addDishBtn = document.getElementById('add-dish-btn');
    if (addDishBtn) addDishBtn.onclick = ()=>{
        state.menuEditDialog = {isNew:true, name:'', price:'', category:defaultCategory, stock:10, img:'', method:'', ingredients:'', spicy:'', taste:'', description:'', options:[]}; renderApp();
        setTimeout(attachMenuEditDialogEvent,10);
    };
    document.querySelectorAll('.menu-edit-btn').forEach(btn=>{
      btn.onclick = ()=>{
        const dish = state.menu.find(x=>String(x.id)===String(btn.dataset.id));
        if(!dish) return console.warn('menu-edit: 未找到菜品', btn.dataset.id);
        state.menuEditDialog = {...dish, isNew:false}; renderApp(); setTimeout(attachMenuEditDialogEvent,10);
      };
    });
    document.querySelectorAll('.menu-delete-btn').forEach(btn=>{
        btn.onclick = async ()=>{
            if(confirm('确定要删除此菜品吗？')){
                state.menu = state.menu.filter(x=>String(x.id)!==String(btn.dataset.id));
                await saveRemoteData(); renderApp();
            }
        }
    });
    // 厨房订单标签页切换
    const ordersTabBtn = document.getElementById('kitchen-tab-orders');
    const trashTabBtn = document.getElementById('kitchen-tab-trash');
    if (ordersTabBtn) ordersTabBtn.onclick = () => { state.kitchenTab = 'orders'; renderApp(); };
    if (trashTabBtn) trashTabBtn.onclick = () => { state.kitchenTab = 'trash'; renderApp(); };
    
    // 厨房订单日期折叠
    document.querySelectorAll('.kitchen-date-btn').forEach(btn => {
        btn.onclick = () => {
            const date = btn.dataset.date;
            state.collapsedOrderDates[date] = !state.collapsedOrderDates[date];
            renderApp();
        };
    });
    
    // 订单操作（开始制作、标记完成）
    document.querySelectorAll('.order-action-btn').forEach(btn=>{
      btn.onclick = async ()=>{
        const order = state.orders.find(o=>String(o.id)===String(btn.dataset.id));
        if(!order) return console.warn('order-action: 未找到订单', btn.dataset.id);
        if(btn.dataset.action === 'start') {
            order.status = 'Processing';
            showNotification(`🍳 订单 #${order.id} 开始制作`, 'info');
        }
        if(btn.dataset.action === 'complete') {
            order.status = 'Completed';
            showNotification(`✅ 订单 #${order.id} 已完成！`, 'success');
        }
        await saveRemoteData(); renderApp();
      };
    });
    
    // 删除已完成订单至回收站
    document.querySelectorAll('.order-delete-btn').forEach(btn=>{
      btn.onclick = async ()=>{
        const order = state.orders.find(o=>String(o.id)===String(btn.dataset.id));
        if(!order) return;
        state.orders = state.orders.filter(o=>String(o.id)!==String(btn.dataset.id));
        state.trash.push(order);
        showNotification(`📦 订单 #${order.id} 已移至回收站`, 'info', 2000);
        await saveRemoteData(); renderApp();
      };
    });
    
    // 回收站：恢复订单
    document.querySelectorAll('.order-restore-btn').forEach(btn=>{
      btn.onclick = async ()=>{
        const order = state.trash.find(o=>String(o.id)===String(btn.dataset.id));
        if(!order) return;
        state.trash = state.trash.filter(o=>String(o.id)!==String(btn.dataset.id));
        state.orders.push(order);
        showNotification(`♻️ 订单 #${order.id} 已恢复`, 'success', 2000);
        await saveRemoteData(); renderApp();
      };
    });
    
    // 回收站：彻底删除
    document.querySelectorAll('.order-clear-btn').forEach(btn=>{
      btn.onclick = async ()=>{
        const orderId = btn.dataset.id;
        if(confirm('确定要彻底删除此订单吗？此操作无法撤销。')){
          state.trash = state.trash.filter(o=>String(o.id)!==String(orderId));
          showNotification(`⛔ 订单 #${orderId} 已永久删除`, 'warning', 2000);
          await saveRemoteData(); renderApp();
        }
      };
    });
}
function attachMenuEditDialogEvent() {
    const dialog = document.getElementById("menu-form-dialog");
    dialog.onsubmit = async function(e) {
        e.preventDefault();
        const fd = new FormData(dialog);
        const obj = {
          id: state.menuEditDialog.isNew ? Date.now() : state.menuEditDialog.id,
          name: fd.get('name').trim(),
          price: Number(fd.get('price')),
          category: fd.get('category'),
          stock: Number(fd.get('stock')),
          description: fd.get('description')||'',
          method: fd.get('method')||'',
          ingredients: fd.get('ingredients')||'',
          spicy: fd.get('spicy')||'',
          taste: fd.get('taste')||'',
          img: "", // 不再将图片存在 menu 中，改用 localStorage
          options: state.menuEditDialog.options || []
        };
        const file = fd.get('imgfile');
        if(file && file.size>0){
          let dataurl = null;
          try {
            dataurl = await new Promise((r, reject)=>{
              const fr = new FileReader();
              fr.onload = ev=>r(ev.target.result);
              fr.onerror = () => reject(new Error('图片读取失败'));
              fr.readAsDataURL(file);
            });
          } catch(e) {
            console.error('图片读取失败:', e);
            showNotification('图片读取失败：' + e.message, 'error', 2000);
          }
          // 优先尝试上传到远端托管（如果配置）
          let uploadedUrl = null;
          try {
            uploadedUrl = await uploadImageToHost(file);
          } catch (e) {
            console.warn('远端上传错误:', e);
          }
          if (uploadedUrl) {
            obj.img = uploadedUrl; // 远端 URL 用于跨设备访问
            // 如有 dataurl，也把本地 base64 保存一份用于离线显示
            if (dataurl) saveMenuImageToLocal(obj.id, dataurl);
            showNotification('图片已上传并保存', 'success', 2000);
          } else {
            // 仅保存到本地（默认行为），远端将不会有图片
            if (dataurl) {
              saveMenuImageToLocal(obj.id, dataurl);
              showNotification('图片保存在本地（未上传到远端）', 'info', 2000);
            }
          }
        }
        if(state.menuEditDialog.isNew) {
            state.menu.push(obj);
        } else {
            const idx = state.menu.findIndex(m=>String(m.id)===String(obj.id));
            if(idx > -1) state.menu[idx] = obj;
        }
        state.menuEditDialog = null;
        await saveRemoteData(); 
        renderApp();
    };
    document.getElementById('menu-cancel-btn').onclick = ()=>{
        state.menuEditDialog = null; 
        renderApp();
    };
}

// =================== 云端订单轮询 ====================
async function checkRemoteUpdates() {
    const remote = await loadRemoteData();
    // 只更新菜单，订单由本地管理（避免频繁覆盖）
    // 如需同步订单，改为只合并新订单而不覆盖现有状态
    if (JSON.stringify(remote.menu) !== JSON.stringify(state.menu)) {
        // 只在厨房管理端更新菜单
        if (state.currentView === "kitchen") {
          state.menu = Array.isArray(remote.menu) ? remote.menu : state.menu;
          await cacheRemoteMenuImages(state.menu);
          renderApp();
        }
    }
}

// 如果远端图片是 URL，尝试把它下载并缓存到 localStorage 中（用于离线与速度）
async function cacheRemoteMenuImages(menu) {
  if (!menu || !menu.length) return;
  for (const item of menu) {
    if (item.img && item.id) {
      const key = `dish_img_${item.id}`;
      // 若 localStorage 中已有，则跳过
      if (localStorage.getItem(key)) continue;
      try {
        const res = await fetch(item.img, { mode: 'cors' });
        if (!res.ok) continue;
        const blob = await res.blob();
        // 只缓存较小的图片（限制 1MB 以防止 localStorage 超限）
        if (blob.size > 1024 * 1024) continue;
        const dataurl = await new Promise((r, rej) => {
          const fr = new FileReader();
          fr.onload = e => r(e.target.result);
          fr.onerror = () => rej(new Error('读取远端图片失败'));
          fr.readAsDataURL(blob);
        });
        saveMenuImageToLocal(item.id, dataurl);
      } catch (e) {
        // 忽略错误，不影响主流程
        console.warn('缓存远端图片失败:', e);
      }
    }
  }
}

// =================== 初始化 ====================
window.onload = async () => {
    document.getElementById('customer-view-btn').onclick = ()=>{state.currentView="customer"; renderApp();}
    document.getElementById('kitchen-view-btn').onclick = ()=>{state.currentView="kitchen"; renderApp();}
    const cloud = await loadRemoteData();
    state.menu = Array.isArray(cloud.menu) ? cloud.menu : initialMenu;
    state.orders = Array.isArray(cloud.orders) ? cloud.orders : [];
    // 如果远端包含图片 URL，尝试缓存到 localStorage 用于离线显示
    cacheRemoteMenuImages(state.menu);
    state.isLoaded = true;
    renderApp();
    setInterval(checkRemoteUpdates, 5000);
};
