/* =====================================================================
 🧠【核心配置区】
 说明：你只需要替换 JSONBin 的 Bin ID。其他保持不变。
===================================================================== */

const appId = 'smart-ordering-system-v1';

/* 🚨 用户必须替换 Bin ID，否则系统不会保存到云端 */
const BIN_ID_PLACEHOLDER = '6925c53943b1c97be9c47908';

/* JSONBin 固定 API 路径（你已经提供） */
const API_URL = `https://api.jsonbin.io/v3/b/${BIN_ID_PLACEHOLDER}`;

/* JSONBin Master Key（你已提供） */
const API_KEY = '$2a$10$7V/NRmimLv7l/.73eHxqRe3gWuyzb3JRm7UkE0i0Y164VD608Ktri';


/* =====================================================================
 🍱【初始化本地默认菜单】
===================================================================== */
const initialMenu = [
    { id: 1, name: '招牌红烧肉', price: 48, category: '主菜', stock: 10 },
    { id: 2, name: '蒜蓉蒸扇贝', price: 68, category: '海鲜', stock: 15 },
    { id: 3, name: '清炒时蔬', price: 22, category: '素菜', stock: 20 },
    { id: 4, name: '酸辣土豆丝', price: 18, category: '素菜', stock: 25 },
    { id: 5, name: '皮蛋瘦肉粥', price: 15, category: '主食', stock: 30 },
    { id: 6, name: '香草冰淇淋', price: 20, category: '甜品', stock: 50 },
];


/* =====================================================================
 📦【全局状态 State】
 用于保存：菜单、购物车、订单、当前视图、是否已加载云端数据
===================================================================== */
let state = {
    menu: initialMenu,
    orders: [],                    // 所有历史订单
    currentCart: {},               // 当前购物车
    currentView: 'customer',       // 当前视图
    isLoaded: false                // 是否已完成云端数据载入
};


/* =====================================================================
 ⬇️【从 JSONBin 载入云端数据】
===================================================================== */
async function loadRemoteData() {
    // 🔧 若用户未设置 Bin ID → 使用本地数据
    if (BIN_ID_PLACEHOLDER.includes('YOUR_')) {
        return { menu: initialMenu, orders: [] };
    }

    try {
        const res = await fetch(API_URL, {
            method: 'GET',
            headers: {
                'X-Access-Key': API_KEY,
                'Content-Type': 'application/json'
            }
        });

        if (res.ok) {
            const json = await res.json();
            return json.record || { menu: initialMenu, orders: [] };
        } else {
            return { menu: initialMenu, orders: [] };
        }
    } catch (e) {
        return { menu: initialMenu, orders: [] };
    }
}


/* =====================================================================
 ⬆️【将当前状态保存到 JSONBin】
===================================================================== */
async function saveRemoteData() {
    if (BIN_ID_PLACEHOLDER.includes('YOUR_')) return; // 用户未设置 Bin ID

    try {
        await fetch(API_URL, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Access-Key': API_KEY
            },
            body: JSON.stringify({ menu: state.menu, orders: state.orders })
        });
    } catch (e) {
        console.error("同步失败：", e);
    }
}


/* =====================================================================
 🎨【渲染主界面：根据 currentView 切换】
===================================================================== */
function renderApp() {
    const content = document.getElementById('content-area');

    // 若云端数据未加载 → 显示 Loading
    if (!state.isLoaded) {
        content.innerHTML = '<div class="loader mt-20"></div>';
        return;
    }

    // 动态切换按钮高亮样式
    document.getElementById('customer-view-btn').className =
        'px-4 py-2 rounded-lg font-semibold shadow-md ' +
        (state.currentView === 'customer' ? 'bg-indigo-600 text-white' : 'bg-gray-200');

    document.getElementById('kitchen-view-btn').className =
        'px-4 py-2 rounded-lg font-semibold shadow-md ' +
        (state.currentView === 'kitchen' ? 'bg-indigo-600 text-white' : 'bg-gray-200');

    // 渲染对应视图
    content.innerHTML = (state.currentView === 'customer')
        ? renderCustomerView()
        : renderKitchenView();

    // 绑定事件
    (state.currentView === 'customer')
        ? attachCustomerEventListeners()
        : attachKitchenEventListeners();
}


/* =====================================================================
 🍽️【渲染顾客视图】→ 菜单 / 购物车 / 历史订单
===================================================================== */
function renderCustomerView() {

    /* ---------- 🛒 获取购物车详情 ---------- */
    const cartItems = getCartDetails();
    const total = cartItems.reduce((a, b) => a + b.total, 0);

    /* ---------- 🗂️ 历史订单 ---------- */
    const historyHtml = state.orders
        .slice()
        .sort((a, b) => b.timestamp - a.timestamp)
        .map(o => `
            <div class='p-4 bg-white rounded-lg shadow mb-3'>
                <p class='font-bold'>订单 #${o.id}</p>
                <p class='text-sm text-gray-500'>${new Date(o.timestamp).toLocaleString()}</p>
                <ul>${o.items.map(i => `<li>${i.name} x ${i.quantity}</li>`).join('')}</ul>
                <p class='font-extrabold text-right text-indigo-600'>¥${o.total}</p>
            </div>`)
        .join('') || '<p class="text-gray-500 text-center">无订单</p>';

    /* ---------- 🍱 菜单分类渲染 ---------- */
    const menuByCategory = state.menu.reduce((acc, item) => {
        acc[item.category] = acc[item.category] || [];
        acc[item.category].push(item);
        return acc;
    }, {});

    const menuHtml = Object.entries(menuByCategory)
        .map(([category, items]) => `
            <h2 class='text-2xl font-bold mt-6 mb-3 border-b-2 border-indigo-400 pb-1'>${category}</h2>
            <div class='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
                ${items.map(item => `
                    <div class='bg-white p-5 rounded-xl shadow'>
                        <h3 class='text-xl font-bold'>${item.name}</h3>
                        <p class='text-sm text-gray-500 mt-1'>库存 ${item.stock}</p>
                        <div class='mt-4 flex justify-between'>
                            <span class='text-2xl font-extrabold text-red-600'>¥${item.price}</span>
                            <button data-id='${item.id}' class='add-to-cart-btn px-4 py-2 bg-indigo-500 text-white rounded'>加入购物车</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `).join('');

    /* ---------- 🖼️ 主 UI 布局 ---------- */
    return `
        <div class='grid grid-cols-1 lg:grid-cols-3 gap-8 w-full'>

            <!-- 左侧：菜单 -->
            <div class='lg:col-span-2'>
                <h1 class='text-3xl font-bold mb-4'>菜单</h1>
                ${menuHtml}
            </div>

            <!-- 右侧：购物车 + 历史订单 -->
            <div>
                <div class='bg-white p-6 rounded shadow'>
                    <h2 class='text-xl font-bold mb-3'>购物车</h2>
                    ${cartItems.map(i => `<p>${i.name} x ${i.quantity} - ¥${i.total}</p>`).join('') || '空'}
                    <p class='font-bold text-right mt-4'>总计 ¥${total}</p>
                    <button id='submit-order-btn' class='mt-4 w-full bg-green-500 text-white py-2 rounded'>提交订单</button>
                </div>

                <div class='bg-white p-6 rounded shadow mt-6'>
                    <h2 class='text-xl font-bold mb-3'>历史订单</h2>
                    ${historyHtml}
                </div>
            </div>
        </div>`;
}


/* =====================================================================
 🛒【获取购物车详细数据】
===================================================================== */
function getCartDetails() {
    const res = [];
    for (const id in state.currentCart) {
        const qty = state.currentCart[id];
        const item = state.menu.find(m => m.id == id);
        if (item) res.push({ id: item.id, name: item.name, price: item.price, quantity: qty, total: qty * item.price });
    }
    return res;
}


/* =====================================================================
 🧩【绑定顾客端按钮事件】
===================================================================== */
function attachCustomerEventListeners() {

    // 绑定加入购物车按钮
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            state.currentCart[id] = (state.currentCart[id] || 0) + 1;
            renderApp();
        });
    });

    // 绑定提交订单
    document.getElementById('submit-order-btn')?.addEventListener('click', submitOrder);
}


/* =====================================================================
 📤 提交订单（写入云端）
===================================================================== */
async function submitOrder() {
    const items = getCartDetails();
    if (!items.length) return alert('购物车为空');

    const total = items.reduce((a, b) => a + b.total, 0);

    // 构建新订单对象
    const newOrder = {
        id: Date.now(),
        items,
        total,
        status: 'Pending',
        timestamp: Date.now()
    };

    // 更新状态
    state.orders.push(newOrder);
    state.currentCart = {}; // 清空购物车

    await saveRemoteData(); // 保存到云端
    renderApp(); // 刷新界面
}


/* =====================================================================
 🔥【厨房管理面板】
===================================================================== */
function renderKitchenView() {

    // 根据状态分类订单
    const pending = state.orders.filter(o => o.status === 'Pending');
    const processing = state.orders.filter(o => o.status === 'Processing');
    const completed = state.orders.filter(o => o.status === 'Completed');

    // 为每一类订单生成 HTML
    function orderList(title, arr, showBtn) {
        return `
            <div class='bg-white p-4 rounded shadow'>
                <h2 class='text-xl font-bold mb-3'>${title} (${arr.length})</h2>
                ${arr.map(o => `
                    <div class='p-3 bg-gray-50 rounded mb-3'>
                        <p class='font-bold'>订单 #${o.id}</p>
                        <p class='text-sm text-gray-500'>${new Date(o.timestamp).toLocaleString()}</p>
                        <ul>${o.items.map(i => `<li>${i.name} x ${i.quantity}</li>`).join('')}</ul>
                        ${showBtn ? `<button data-id='${o.id}' data-action='${showBtn}' class='kitchen-action-btn mt-2 px-3 py-1 bg-blue-500 text-white rounded'>${showBtn}</button>` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }

    return `
        <div class='grid grid-cols-1 md:grid-cols-3 gap-6 w-full'>
            ${orderList('待处理', pending, 'start')}
            ${orderList('制作中', processing, 'complete')}
            ${orderList('已完成', completed, null)}
        </div>
    `;
}


/* =====================================================================
 🍳【处理厨房按钮事件：开始 / 完成】
===================================================================== */
function attachKitchenEventListeners() {
    document.querySelectorAll('.kitchen-action-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            const action = btn.dataset.action;
            const order = state.orders.find(o => o.id == id);

            // 状态迁移
            if (action === 'start') order.status = 'Processing';
            if (action === 'complete') order.status = 'Completed';

            await saveRemoteData();
            renderApp();
        });
    });
}


/* =====================================================================
 🔁【定时器：云端数据同步（每 5 秒）】
===================================================================== */
async function checkRemoteUpdates() {
    const remote = await loadRemoteData();
    if (JSON.stringify(remote.orders) !== JSON.stringify(state.orders)) {
        state.orders = remote.orders;
        renderApp();
    }
}


/* =====================================================================
 🚀【初始化流程】
===================================================================== */
window.onload = async () => {

    // 顶部按钮绑定视图切换
    document.getElementById('customer-view-btn').onclick = () => { state.currentView = 'customer'; renderApp(); };
    document.getElementById('kitchen-view-btn').onclick = () => { state.currentView = 'kitchen'; renderApp(); };

    // 拉取云端数据
    const cloud = await loadRemoteData();
    state.menu = cloud.menu;
    state.orders = cloud.orders;
    state.isLoaded = true;

    renderApp();

    // 每 5 秒检查云端更新（跨设备同步核心）
    setInterval(checkRemoteUpdates, 5000);
};