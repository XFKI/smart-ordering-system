// =================== 图片管理 ====================
// 优先使用本地图片（快速加载），然后才是云端 URL（跨设备同步）
function getMenuImageUrl(dish) {
    // 1. 首先尝试本地图片（最快）
    const localUrl = localImageManager.getLocalImageUrl(dish.id);
    if (localUrl) return localUrl;
    
    // 2. 其次使用云端 Cloudinary URL（已同步）
    if ((dish.img || '').trim()) return dish.img;
    
    // 3. 最后使用占位符
    return 'https://via.placeholder.com/120?text='+encodeURIComponent(dish.name);
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

// ================ 本地图片文件夹处理 ================
// 批量处理本地图片文件，自动匹配菜品名和图片文件名
function processLocalImageBatch(files) {
    if (!files.length) return;
    
    showNotification(`⏳ 正在导入 ${files.length} 张图片...`, 'info');
    
    let successCount = 0;
    let failureCount = 0;
    const matchResults = [];
    
    files.forEach(file => {
        // 从文件名中提取菜品名称（支持：菜品名.jpg 或 菜品名_jpg）
        let filename = file.name.toLowerCase();
        let dishName = filename
            .replace(/\.(jpg|jpeg|png|gif|webp)$/i, '')  // 移除扩展名
            .replace(/_/g, ' ')  // 下划线转空格
            .replace(/-/g, ' ')  // 短划线转空格
            .trim();
        
        // 查找匹配的菜品
        const matchedDish = state.menu.find(d => 
            d.name.toLowerCase().includes(dishName) || 
            dishName.includes(d.name.toLowerCase())
        );
        
        if (matchedDish) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                const base64Data = evt.target.result;
                localImageManager.addLocalImage(matchedDish.id, file.name, base64Data);
                successCount++;
                matchResults.push({ dishName: matchedDish.name, filename: file.name, status: '✅' });
                
                // 如果全部处理完毕，显示结果
                if (successCount + failureCount === files.length) {
                    showImportResults(successCount, failureCount, matchResults);
                    renderApp();
                }
            };
            reader.onerror = () => {
                failureCount++;
                matchResults.push({ dishName: matchedDish.name, filename: file.name, status: '❌' });
                if (successCount + failureCount === files.length) {
                    showImportResults(successCount, failureCount, matchResults);
                }
            };
            reader.readAsDataURL(file);
        } else {
            failureCount++;
            matchResults.push({ dishName: '未匹配', filename: file.name, status: '⚠️' });
            if (successCount + failureCount === files.length) {
                showImportResults(successCount, failureCount, matchResults);
            }
        }
    });
}

// 显示导入结果
function showImportResults(success, failure, results) {
    const summary = `✅ 已导入 ${success} 张，⚠️ 未匹配 ${failure} 张`;
    
    console.log('=== 本地图片导入结果 ===');
    console.log(summary);
    results.forEach(r => {
        console.log(`${r.status} ${r.dishName} ← ${r.filename}`);
    });
    console.log('========================');
    
    showNotification(summary, success > 0 ? 'success' : 'warning', 3000);
}


const categoryIcons = {
  '主菜': '🥘', '海鲜': '🦞', '素菜': '🥦', '主食': '🍚', '甜品': '🍨', '汤品': '🍜', '小食': '🥢'
};
const defaultCategory = "主菜";

const initialMenu = [
    { 
        id: 1, name: '全能炒面', price: 19, category: '主食', stock: 99, img: 'images/全能炒面.jpg',
        description: '香喷喷的炒面，配菜丰富，是快手美食',
        method: '1. 面条煮软沥干 2. 油热下锅快炒 3. 加入配菜翻炒 4. 调味即可',
        ingredients: '面条200g、蔬菜、鸡蛋、豉油',
        spicy: '', taste: '香', options: []
    },
    { 
        id: 2, name: '可乐鸡翅', price: 19, category: '主菜', stock: 99, img: 'images/可乐鸡翅.jpg',
        description: '甜蜜的可乐味，鸡翅嫩滑，大人小孩都爱',
        method: '1. 鸡翅焯水 2. 可乐加酱油炖40分钟 3. 收汁即可',
        ingredients: '鸡翅600g、可乐、酱油、生姜',
        spicy: '', taste: '甜蜜', options: []
    },
    { 
        id: 3, name: '小蒋炒米粉', price: 19, category: '主食', stock: 99, img: 'images/小蒋炒米粉.jpg',
        description: '经典炒米粉，火候足，粒粒分明',
        method: '1. 米粉泡软 2. 高温炒香 3. 加调味料翻炒 4. 装盘即可',
        ingredients: '米粉200g、豆芽、葱段、酱油',
        spicy: '微辣', taste: '香', options: []
    },
    { 
        id: 4, name: '清炒时蔬', price: 19, category: '素菜', stock: 99, img: 'images/清炒时蔬.jpg',
        description: '精选当季蔬菜，清炒清甜，健康美味',
        method: '1. 蔬菜切块 2. 油热下锅快炒 3. 加盐调味即可',
        ingredients: '油麦菜、胡萝卜、黄瓜、玉米粒',
        spicy: '', taste: '清甜', options: []
    },
    { 
        id: 5, name: '焦香排骨', price: 19, category: '主菜', stock: 99, img: 'images/焦香排骨.jpg',
        description: '外焦里嫩的排骨，香气扑鼻',
        method: '1. 排骨腌制30分钟 2. 高温炸至焦香 3. 裹蜜汁沙司 4. 装盘即可',
        ingredients: '排骨600g、蜂蜜、酱油、生姜、蒜',
        spicy: '', taste: '焦香', options: []
    },
    { 
        id: 6, name: '爆辣猪耳', price: 19, category: '主菜', stock: 99, img: 'images/爆辣猪耳.jpg',
        description: '脆爽猪耳朵，麻辣开胃，下酒好菜',
        method: '1. 猪耳焯水 2. 冷水过凉 3. 切丝加麻辣料拌匀 4. 冷藏后享用',
        ingredients: '猪耳200g、干辣椒、花椒、醋、盐',
        spicy: '重辣', taste: '麻辣', options: []
    },
    { 
        id: 7, name: '独门炒饭', price: 19, category: '主食', stock: 99, img: 'images/独门炒饭.jpg',
        description: '秘制配方，米粒飘香，一口一个惊喜',
        method: '1. 米饭冷硬最佳 2. 高温快炒 3. 加入肉类和蔬菜 4. 调味出锅',
        ingredients: '米饭200g、鸡蛋、叉烧、豌豆、胡萝卜',
        spicy: '', taste: '香', options: []
    },
    { 
        id: 8, name: '粉藕排骨汤', price: 19, category: '汤品', stock: 99, img: 'images/粉藕排骨汤.jpg',
        description: '清汤汤底，莲藕软粉，排骨鲜美',
        method: '1. 排骨焯水 2. 清水煮30分钟 3. 加入莲藕再煮20分钟 4. 调味即可',
        ingredients: '排骨300g、莲藕200g、红枣、冰糖、盐',
        spicy: '', taste: '清甜', options: []
    },
    { 
        id: 9, name: '老干妈炒火腿', price: 19, category: '主菜', stock: 99, img: 'images/老干妈炒火腿.jpg',
        description: '老干妈的辣味，火腿的香味，完美搭配',
        method: '1. 火腿切块 2. 油热炒香 3. 加老干妈酱炒匀 4. 装盘即可',
        ingredients: '火腿200g、老干妈豆豉酱、青葱、生姜',
        spicy: '中辣', taste: '豉香', options: []
    },
    { 
        id: 10, name: '蒋氏红烧肉', price: 19, category: '主菜', stock: 99, img: 'images/蒋氏红烧肉.jpg',
        description: '秘制酱料，入口即化，肥而不腻',
        method: '1. 猪肉焯水 2. 冰糖炒糖色 3. 加秘制酱料炖45分钟 4. 收汁出锅',
        ingredients: '猪肋条500g、冰糖、酱油、八角、桂皮、生姜',
        spicy: '', taste: '甜咸', options: []
    },
    { 
        id: 11, name: '虫草花炖鸡汤', price: 19, category: '汤品', stock: 99, img: 'images/虫草花炖鸡汤.jpg',
        description: '名贵虫草花，滋补鸡汤，养生佳品',
        method: '1. 鸡块焯水 2. 清水煮30分钟 3. 加虫草花再炖20分钟 4. 调味即可',
        ingredients: '鸡块400g、虫草花20g、红枣、冰糖、盐',
        spicy: '', taste: '清鲜', options: []
    },
    { 
        id: 12, name: '辣椒肉末盖码粉', price: 19, category: '主食', stock: 99, img: 'images/辣椒肉末盖码粉.jpg',
        description: '米粉软滑，肉末鲜香，辣椒提味',
        method: '1. 米粉烫软 2. 肉末炒香加辣椒 3. 浇在米粉上 4. 调味即可',
        ingredients: '米粉200g、肉末150g、辣椒油、葱段、蒜',
        spicy: '中辣', taste: '辣香', options: []
    },
    { 
        id: 13, name: '酸萝卜牛肚', price: 19, category: '主菜', stock: 99, img: 'images/酸萝卜牛肚.jpg',
        description: '爽脆牛肚，酸爽萝卜，开胃一绝',
        method: '1. 牛肚焯水切丝 2. 酸萝卜切块 3. 快速炒匀 4. 调味即可',
        ingredients: '牛肚200g、酸萝卜200g、干辣椒、醋、盐',
        spicy: '中辣', taste: '酸辣', options: []
    },
    { 
        id: 14, name: '酸辣土豆丝', price: 19, category: '素菜', stock: 99, img: 'images/酸辣土豆丝.jpg',
        description: '脆口土豆丝，酸辣开胃，下饭一绝',
        method: '1. 土豆切丝浸水 2. 高温油炸至脆 3. 加醋、辣椒炒匀 4. 装盘即可',
        ingredients: '土豆500g、醋、干辣椒、花椒、盐',
        spicy: '中辣', taste: '酸辣', options: []
    },
    { 
        id: 15, name: '酸辣藕丁', price: 19, category: '素菜', stock: 99, img: 'images/酸辣藕丁.jpg',
        description: '莲藕爽脆，酸辣诱人，下饭首选',
        method: '1. 莲藕切丁浸水 2. 高温快炒 3. 加醋和辣椒翻炒 4. 装盘即可',
        ingredients: '莲藕300g、醋、干辣椒、花椒、盐',
        spicy: '中辣', taste: '酸辣', options: []
    },
    { 
        id: 16, name: '青椒炒蛋', price: 19, category: '主菜', stock: 99, img: 'images/青椒炒蛋.jpg',
        description: '嫩滑鸡蛋，爽脆青椒，家常快手菜',
        method: '1. 鸡蛋炒散 2. 青椒切块 3. 快速炒匀 4. 调味即可',
        ingredients: '鸡蛋3个、青椒200g、盐、油',
        spicy: '', taste: '清香', options: []
    },
    { 
        id: 17, name: '鲜香鱼汤', price: 19, category: '汤品', stock: 99, img: 'images/鲜香鱼汤.jpg',
        description: '鱼汤鲜美，豆腐软嫩，热汤暖胃',
        method: '1. 鱼块焯水 2. 清水煮30分钟 3. 加豆腐再煮10分钟 4. 调味即可',
        ingredients: '鲜鱼400g、豆腐200g、生姜、葱段、盐',
        spicy: '', taste: '鲜香', options: []
    }
];

// =================== 菜品映射管理系统 ====================
// 用于快速编辑菜品参数和管理图片上传队列
class LocalImageManager {
    constructor() {
        this.imageMap = {}; // { dishId: { localPath, filename, uploadedToCloud, cloudUrl } }
        this.loadImageMap();
    }
    
    // 从 localStorage 加载本地图片映射
    loadImageMap() {
        const saved = localStorage.getItem('imageMap');
        if (saved) {
            this.imageMap = JSON.parse(saved);
        }
    }
    
    // 保存本地图片映射到 localStorage
    saveImageMap() {
        localStorage.setItem('imageMap', JSON.stringify(this.imageMap));
    }
    
    // 添加本地图片映射
    addLocalImage(dishId, filename, base64Data) {
        this.imageMap[dishId] = {
            filename,
            base64Data,
            uploadedToCloud: false,
            cloudUrl: null,
            localLoadTime: Date.now()
        };
        this.saveImageMap();
    }
    
    // 获取本地图片 URL
    getLocalImageUrl(dishId) {
        const img = this.imageMap[dishId];
        if (img && img.base64Data) {
            return img.base64Data; // 返回 base64 数据 URL
        }
        return null;
    }
    
    // 标记图片已上传到云端
    markAsCloudUploaded(dishId, cloudUrl) {
        if (this.imageMap[dishId]) {
            this.imageMap[dishId].uploadedToCloud = true;
            this.imageMap[dishId].cloudUrl = cloudUrl;
            this.imageMap[dishId].uploadTime = Date.now();
            this.saveImageMap();
        }
    }
    
    // 获取所有映射统计
    getStats() {
        return {
            total: Object.keys(this.imageMap).length,
            uploadedToCloud: Object.values(this.imageMap).filter(img => img.uploadedToCloud).length,
            localOnly: Object.values(this.imageMap).filter(img => !img.uploadedToCloud).length
        };
    }
}

// 云端上传队列管理
class RecipeMapManager {
    constructor() {
        this.uploadQueue = []; // 待上传的图片队列
        this.uploading = false;
        this.recipeMap = {}; // { dishId: { img_url, upload_time, version } }
    }
    
    // 添加图片到上传队列
    queueImageUpload(dishId, file) {
        this.uploadQueue.push({ dishId, file, status: 'pending' });
        this.processQueue();
    }
    
    // 处理上传队列（一次上传一个，防止浏览器瓶颈）
    async processQueue() {
        if (this.uploading || this.uploadQueue.length === 0) return;
        
        this.uploading = true;
        const job = this.uploadQueue.shift();
        
        try {
            showNotification(`⏳ 正在上传 ${job.dishId}...`, 'info', 1000);
            const url = await uploadImageToHost(job.file);
            
            if (url) {
                job.status = 'success';
                this.recipeMap[job.dishId] = {
                    img_url: url,
                    upload_time: Date.now(),
                    version: (this.recipeMap[job.dishId]?.version || 0) + 1
                };
                
                // 更新到 state.menu
                const dish = state.menu.find(d => d.id == job.dishId);
                if (dish) dish.img = url;
                
                // 标记本地图片为已上传云端
                localImageManager.markAsCloudUploaded(job.dishId, url);
                
                showNotification(`✅ ${job.dishId} 上传成功`, 'success', 1500);
                await saveRemoteData();
            } else {
                job.status = 'failed';
                showNotification(`❌ ${job.dishId} 上传失败，稍后重试`, 'warning', 2000);
                // 重新加入队列，稍后重试
                setTimeout(() => this.uploadQueue.push(job), 3000);
            }
        } catch (e) {
            job.status = 'failed';
            console.error('上传错误:', e);
            setTimeout(() => this.uploadQueue.push(job), 3000);
        }
        
        this.uploading = false;
        // 继续处理下一个
        if (this.uploadQueue.length > 0) {
            setTimeout(() => this.processQueue(), 500);
        }
    }
    
    // 获取上传队列状态
    getQueueStatus() {
        return {
            total: this.uploadQueue.length,
            pending: this.uploadQueue.filter(j => j.status === 'pending').length,
            uploading: this.uploading
        };
    }
}

const recipeManager = new RecipeMapManager();
const localImageManager = new LocalImageManager();

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
    // 缓存分类数据，避免重复计算
    const cachedByCategory = state.menu.reduce((acc, item) => {
        acc[item.category] = acc[item.category] || [];
        acc[item.category].push(item);
        return acc;
    }, {});
    
    const categories = Object.keys(cachedByCategory).sort();
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
        ${(cachedByCategory[activeCategory] || []).map(item => {
            const imgSrc = getMenuImageUrl(item);
            return `
          <div class="bg-white rounded-lg shadow hover:shadow-md transition overflow-hidden flex flex-col">
            <div class="relative h-24 bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center border-b overflow-hidden">
              <img src="${imgSrc}" alt="${item.name}" class="w-20 h-20 object-cover rounded" loading="lazy" />
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
        ${(cachedByCategory[activeCategory] || []).length === 0 ? '<div class="text-center text-gray-400 py-8">该分类暂无菜品</div>' : ''}
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
      
      // 收集选中的选项 - 从对话框内选择
      const selectedOptions = [];
      const dialogContent = document.getElementById('dish-detail-dialog-content');
      if (dialogContent) {
        dialogContent.querySelectorAll('.dish-option:checked').forEach(cb => {
          const optName = cb.dataset.option;
          if (optName && !selectedOptions.includes(optName)) {
            selectedOptions.push(optName);
          }
        });
      }
      
      // 更新购物车 - 每次加入时用最新的选项（不是累加）
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
                const imgSrc = getMenuImageUrl(i);
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
                    <div class="bg-gray-50 rounded-lg p-3 border-l-4 ${getOrderStatusClass(o.status)}">
                      <div class="flex justify-between items-start gap-2 mb-2">
                        <div>
                          <span class="font-bold">订单 #${o.id}</span>
                          <span class="ml-2 text-xs px-2 py-0.5 rounded font-semibold ${getOrderStatusBadgeClass(o.status)}">${statusMap[o.status]||'未知'}</span>
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

// =================== 辅助工具函数 ====================
function getOrderStatusClass(status) {
    const map = {
        'Completed': 'border-green-500',
        'Processing': 'border-yellow-500',
        'Pending': 'border-red-400'
    };
    return map[status] || 'border-gray-400';
}

function getOrderStatusBadgeClass(status) {
    const map = {
        'Completed': 'bg-green-100 text-green-700',
        'Processing': 'bg-yellow-100 text-yellow-700',
        'Pending': 'bg-red-100 text-red-700'
    };
    return map[status] || 'bg-gray-100 text-gray-600';
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
          <div class="flex flex-wrap gap-2 mb-3">
            <button id="add-dish-btn" class="bg-green-500 hover:bg-green-600 text-white rounded px-4 py-2 font-semibold text-sm">➕ 添加菜品</button>
            <button id="import-images-folder-btn" class="bg-indigo-500 hover:bg-indigo-600 text-white rounded px-4 py-2 font-semibold text-sm">📁 导入本地图片</button>
            <button id="export-image-map-btn" class="bg-cyan-500 hover:bg-cyan-600 text-white rounded px-4 py-2 font-semibold text-sm">🗺️ 导出图片映射</button>
            <button id="clear-local-images-btn" class="bg-orange-500 hover:bg-orange-600 text-white rounded px-4 py-2 font-semibold text-sm">🗑️ 清空缓存</button>
            <button id="export-recipes-btn" class="bg-blue-500 hover:bg-blue-600 text-white rounded px-4 py-2 font-semibold text-sm">📥 导出菜品映射</button>
            <button id="import-recipes-btn" class="bg-purple-500 hover:bg-purple-600 text-white rounded px-4 py-2 font-semibold text-sm">📤 导入菜品映射</button>
          </div>
          ${renderImageStats()}
          ${renderKitchenMenuTable()}
        </section>
      </div>
      ${renderMenuEditDialog()}
    `;
}

// 本地图片统计显示
function renderImageStats() {
    const stats = localImageManager.getStats();
    return `<div class="mb-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-indigo-200">
      <div class="text-sm font-semibold text-indigo-800">
        📊 本地图片统计: 总计 ${stats.total} 张 
        | 💾 本地缓存 ${stats.localOnly} 张 
        | ☁️ 已上传云端 ${stats.uploadedToCloud} 张
      </div>
    </div>`;
}

function renderKitchenMenuTable() {
    if (!state.menu.length) return '<p class="text-gray-400">暂无菜品，点击下方添加。</p>';
    
    if (!state.menu.length) return '<p class="text-gray-400">暂无菜品，点击下方添加。</p>';
    
    const queueStatus = recipeManager.getQueueStatus();
    const queueIndicator = queueStatus.total > 0 ? 
        `<div class="mb-3 p-2 bg-yellow-100 text-yellow-800 rounded text-sm">
          📤 上传队列: ${queueStatus.pending} 待上传，${queueStatus.uploading ? '1 上传中...' : '就绪'}
         </div>` : '';
    
    return `<div class="w-full bg-white shadow rounded-xl overflow-hidden">
      ${queueIndicator}
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-indigo-600 text-white sticky top-0">
              <th class="p-2 text-left">图片</th>
              <th class="p-2 text-left">菜名</th>
              <th class="p-2 text-center">价格</th>
              <th class="p-2 text-center">库存</th>
              <th class="p-2 text-center">类别</th>
              <th class="p-2 text-center">操作</th>
            </tr>
          </thead>
          <tbody>
            ${state.menu.map(item => {
              const imgSrc = getMenuImageUrl(item);
              const queueJob = recipeManager.uploadQueue.find(j => j.dishId == item.id);
              const localImage = localImageManager.imageMap[item.id];
              
              // 构建徽章：显示队列状态和本地图片状态
              let badge = '';
              if (queueJob) {
                badge = `<span class="text-xs px-1 py-0.5 rounded ${queueJob.status === 'uploading' ? 'bg-blue-200 text-blue-700' : 'bg-yellow-200 text-yellow-700'}">
                  ${queueJob.status === 'uploading' ? '⏳' : '⏱️'}
                </span>`;
              } else if (localImage) {
                if (localImage.uploadedToCloud) {
                  badge = `<span class="text-xs px-1 py-0.5 rounded bg-green-200 text-green-700" title="已上传云端">☁️✅</span>`;
                } else {
                  badge = `<span class="text-xs px-1 py-0.5 rounded bg-blue-200 text-blue-700" title="仅本地缓存">💾</span>`;
                }
              }
              
              return `<tr class="border-b hover:bg-gray-50 transition" data-item-id="${item.id}">
                <td class="p-2 relative">
                  <div class="relative group">
                    <img class="w-12 h-12 object-cover rounded border cursor-pointer hover:opacity-80" 
                         src="${imgSrc}" alt="${item.name}" title="点击上传新图片" />
                    <div class="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100">
                      ${badge}
                    </div>
                  </div>
                </td>
                <td class="p-2">
                  <input type="text" class="quick-edit-name border rounded px-2 py-1 text-sm w-20" 
                         value="${item.name}" data-id="${item.id}" placeholder="菜名" />
                </td>
                <td class="p-2 text-center">
                  <input type="number" class="quick-edit-price border rounded px-2 py-1 text-sm w-16 text-center" 
                         value="${item.price}" data-id="${item.id}" placeholder="价格" />
                </td>
                <td class="p-2 text-center">
                  <input type="number" class="quick-edit-stock border rounded px-2 py-1 text-sm w-16 text-center" 
                         value="${item.stock}" data-id="${item.id}" placeholder="库存" />
                </td>
                <td class="p-2 text-center">
                  <select class="quick-edit-category border rounded px-2 py-1 text-sm" data-id="${item.id}">
                    ${Object.keys(categoryIcons).map(cat => 
                      `<option value="${cat}" ${item.category === cat ? 'selected' : ''}>${categoryIcons[cat]} ${cat}</option>`
                    ).join('')}
                  </select>
                </td>
                <td class="p-2 text-center space-x-1">
                  <button class="menu-quick-upload px-2 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-xs" data-id="${item.id}">📸</button>
                  <button class="menu-edit-btn px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs" data-id="${item.id}">📝</button>
                  <button class="menu-quick-delete-btn px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs" data-id="${item.id}">🗑️</button>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
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
  const currImg = d.img || null;
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
    const imgSrc = getMenuImageUrl(d);
    return `
  <div id="dish-detail-dialog-content" class="fixed bg-black bg-opacity-40 z-50 left-0 top-0 right-0 bottom-0 flex justify-center items-center p-4 overflow-y-auto">
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
  </div>
    `;
}
function attachKitchenEventListeners() {
    const addDishBtn = document.getElementById('add-dish-btn');
    if (addDishBtn) addDishBtn.onclick = ()=>{
        state.menuEditDialog = {isNew:true, name:'', price:'', category:defaultCategory, stock:10, img:'', method:'', ingredients:'', spicy:'', taste:'', description:'', options:[]}; 
        renderApp();
        setTimeout(attachMenuEditDialogEvent,10);
    };
    
    // === 快速编辑菜名 ===
    document.querySelectorAll('.quick-edit-name').forEach(input => {
        input.onchange = async () => {
            const id = parseInt(input.dataset.id);
            const dish = state.menu.find(d => d.id == id);
            if (dish) {
                dish.name = input.value.trim() || dish.name;
                await saveRemoteData();
                showNotification('✅ 菜名已更新', 'success', 1000);
            }
        };
    });
    
    // === 快速编辑价格 ===
    document.querySelectorAll('.quick-edit-price').forEach(input => {
        input.onchange = async () => {
            const id = parseInt(input.dataset.id);
            const dish = state.menu.find(d => d.id == id);
            if (dish) {
                const price = parseFloat(input.value);
                if (price > 0) {
                    dish.price = price;
                    await saveRemoteData();
                    showNotification('✅ 价格已更新', 'success', 1000);
                }
            }
        };
    });
    
    // === 快速编辑库存 ===
    document.querySelectorAll('.quick-edit-stock').forEach(input => {
        input.onchange = async () => {
            const id = parseInt(input.dataset.id);
            const dish = state.menu.find(d => d.id == id);
            if (dish) {
                const stock = parseInt(input.value);
                if (stock >= 0) {
                    dish.stock = stock;
                    await saveRemoteData();
                    showNotification('✅ 库存已更新', 'success', 1000);
                }
            }
        };
    });
    
    // === 快速编辑分类 ===
    document.querySelectorAll('.quick-edit-category').forEach(select => {
        select.onchange = async () => {
            const id = parseInt(select.dataset.id);
            const dish = state.menu.find(d => d.id == id);
            if (dish) {
                dish.category = select.value;
                await saveRemoteData();
                showNotification('✅ 分类已更新', 'success', 1000);
            }
        };
    });
    
    // === 快速上传图片到队列（本地+云端） ===
    document.querySelectorAll('.menu-quick-upload').forEach(btn => {
        btn.onclick = () => {
            const itemId = parseInt(btn.dataset.id);
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    // 1. 先存储到本地（快速显示）
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        const base64Data = evt.target.result;
                        localImageManager.addLocalImage(itemId, file.name, base64Data);
                        showNotification(`✅ 本地图片已保存 (${file.name})`, 'success', 1500);
                        renderApp();
                        
                        // 2. 同时加入云端上传队列
                        recipeManager.queueImageUpload(itemId, file);
                        setTimeout(() => renderApp(), 100);
                    };
                    reader.readAsDataURL(file);
                }
            };
            input.click();
        };
    });
    
    // === 批量导入本地图片文件夹 ===
    const importFolderBtn = document.getElementById('import-images-folder-btn');
    if (importFolderBtn) {
        importFolderBtn.onclick = () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.accept = 'image/*';
            input.onchange = (e) => {
                const files = Array.from(e.target.files);
                processLocalImageBatch(files);
            };
            input.click();
        };
    }
    
    // === 清空本地图片缓存 ===
    const clearLocalImagesBtn = document.getElementById('clear-local-images-btn');
    if (clearLocalImagesBtn) {
        clearLocalImagesBtn.onclick = () => {
            if (confirm('确定要清空所有本地图片缓存吗？这不会影响云端的图片。')) {
                localStorage.removeItem('imageMap');
                localImageManager.imageMap = {};
                showNotification('✅ 本地图片缓存已清空', 'success', 1500);
                renderApp();
            }
        };
    }
    
    // === 导出图片映射关系 ===
    const exportImageMapBtn = document.getElementById('export-image-map-btn');
    if (exportImageMapBtn) {
        exportImageMapBtn.onclick = () => {
            const mapData = {
                exportTime: new Date().toISOString(),
                stats: localImageManager.getStats(),
                imageMap: Object.entries(localImageManager.imageMap).map(([dishId, img]) => ({
                    dishId: parseInt(dishId),
                    filename: img.filename,
                    uploadedToCloud: img.uploadedToCloud,
                    cloudUrl: img.cloudUrl || '',
                    dishName: state.menu.find(d => d.id == dishId)?.name || '未知菜品'
                }))
            };
            
            const blob = new Blob([JSON.stringify(mapData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `image-map-${Date.now()}.json`;
            link.click();
            URL.revokeObjectURL(url);
            showNotification('✅ 图片映射关系已导出', 'success', 1500);
        };
    }
    
    // === 编辑完整信息 ===
    document.querySelectorAll('.menu-edit-btn').forEach(btn=>{
      btn.onclick = ()=>{
        const dish = state.menu.find(x=>String(x.id)===String(btn.dataset.id));
        if(!dish) return console.warn('menu-edit: 未找到菜品', btn.dataset.id);
        state.menuEditDialog = {...dish, isNew:false}; 
        renderApp(); 
        setTimeout(attachMenuEditDialogEvent,10);
      };
    });
    
    // === 删除菜品 ===
    document.querySelectorAll('.menu-quick-delete-btn').forEach(btn=>{
        btn.onclick = async ()=>{
            if(confirm('确定要删除此菜品吗？')){
                state.menu = state.menu.filter(x=>String(x.id)!==String(btn.dataset.id));
                await saveRemoteData(); 
                renderApp();
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
    
    // === 导出菜品映射为 JSON ===
    const exportBtn = document.getElementById('export-recipes-btn');
    if (exportBtn) {
        exportBtn.onclick = () => {
            const recipeMap = {};
            state.menu.forEach(dish => {
                recipeMap[dish.id] = {
                    name: dish.name,
                    price: dish.price,
                    stock: dish.stock,
                    category: dish.category,
                    img_url: dish.img || '',
                    img_upload_time: recipeManager.recipeMap[dish.id]?.upload_time || null,
                    img_version: recipeManager.recipeMap[dish.id]?.version || 0,
                    notes: dish.description || ''
                };
            });
            
            const exportData = {
                version: '1.0',
                lastUpdated: new Date().toISOString(),
                recipes: recipeMap
            };
            
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `recipe-map-${Date.now()}.json`;
            link.click();
            URL.revokeObjectURL(url);
            showNotification('✅ 菜品映射已导出', 'success', 1500);
        };
    }
    
    // === 导入菜品映射 JSON ===
    const importBtn = document.getElementById('import-recipes-btn');
    if (importBtn) {
        importBtn.onclick = () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                try {
                    const text = await file.text();
                    const importData = JSON.parse(text);
                    const recipes = importData.recipes || {};
                    
                    let updated = 0;
                    let errors = [];
                    
                    for (const [dishId, data] of Object.entries(recipes)) {
                        const dish = state.menu.find(d => d.id == dishId);
                        if (dish) {
                            if (data.name) dish.name = data.name;
                            if (data.price !== undefined) dish.price = data.price;
                            if (data.stock !== undefined) dish.stock = data.stock;
                            if (data.category) dish.category = data.category;
                            if (data.img_url) dish.img = data.img_url;
                            updated++;
                        } else {
                            errors.push(`菜品 ${dishId} 不存在`);
                        }
                    }
                    
                    await saveRemoteData();
                    showNotification(`✅ 已更新 ${updated} 个菜品${errors.length > 0 ? `，${errors.length} 个错误` : ''}`, 'success', 2000);
                    renderApp();
                } catch (err) {
                    showNotification(`❌ 文件格式错误: ${err.message}`, 'error', 2000);
                }
            };
            input.click();
        };
    }
}
function attachMenuEditDialogEvent() {
    const dialog = document.getElementById("menu-form-dialog");
    dialog.onsubmit = async function(e) {
        e.preventDefault();
        const fd = new FormData(dialog);
        // 编辑时保留原有图片，只有上传新图片才更新
        const oldImg = state.menuEditDialog.img || '';
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
          img: oldImg, // 默认保留原有图片
          options: state.menuEditDialog.options || []
        };
        const file = fd.get('imgfile');
        if(file && file.size>0){
          // 强制上传到 Cloudinary（不再使用本地缓存）
          try {
            showNotification('⏳ 上传中...', 'info', 1000);
            const uploadedUrl = await uploadImageToHost(file);
            if (uploadedUrl) {
              obj.img = uploadedUrl;
              showNotification('✅ 图片已上传到云端', 'success', 1500);
            } else {
              showNotification('⚠️ 图片上传失败，请检查网络', 'warning', 2000);
            }
          } catch (e) {
            console.error('图片上传错误:', e);
            showNotification('❌ 图片上传失败：' + e.message, 'error', 2000);
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


// =================== 初始化 ====================
window.onload = async () => {
    document.getElementById('customer-view-btn').onclick = ()=>{state.currentView="customer"; renderApp();}
    document.getElementById('kitchen-view-btn').onclick = ()=>{state.currentView="kitchen"; renderApp();}
    
    // 使用本地菜品数据（优先级高于云端）
    state.menu = JSON.parse(JSON.stringify(initialMenu));
    state.orders = [];
    state.isLoaded = true;
    
    // 立即保存到云端以同步
    await saveRemoteData();
    
    renderApp();
    
    setInterval(checkRemoteUpdates, 5000);
};
