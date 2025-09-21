// -------- Config --------
const DEFAULT_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbxvWkS412y8w0jKhBsg8B7FqB5NuXWgbgH97-vxouuCOIcwhQp_4qHsd58JJ_HGOBskMQ/exec";
const state = {
  endpoint: localStorage.getItem("cc_endpoint") || DEFAULT_ENDPOINT,
  employees: JSON.parse(localStorage.getItem("cc_employees") || "[]"),
  orders: JSON.parse(localStorage.getItem("cc_orders") || "[]"),
  products: JSON.parse(localStorage.getItem("cc_products") || "[]"),
  loadingCount: 0,
};
const $ = (id) => document.getElementById(id);

// Spinner control
function showLoading(on = true) {
  state.loadingCount += on ? 1 : -1;
  state.loadingCount = Math.max(0, state.loadingCount);
  const el = $("globalLoading");
  if (state.loadingCount > 0) {
    el.classList.remove("hidden");
    el.classList.add("flex");
  } else {
    el.classList.add("hidden");
    el.classList.remove("flex");
  }
}

// Tabs
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => {
      b.classList.remove("active", "bg-indigo-500", "text-white");
      b.classList.add("bg-slate-800/70");
    });
    btn.classList.add("active", "bg-indigo-500", "text-white");
    btn.classList.remove("bg-slate-800/70");
    const tab = btn.dataset.tab;
    document
      .querySelectorAll(".tab-panel")
      .forEach((p) => p.classList.add("hidden"));
    document.getElementById(`tab-${tab}`).classList.remove("hidden");
    if (tab === "orders" || tab === "commission") populateEmployeeSelects();
  });
});

// Config UI
$("configEndpoint").value = state.endpoint;
$("btnSaveConfig").addEventListener("click", () => {
  const val = $("configEndpoint").value.trim();
  if (!val) return;
  state.endpoint = val;
  localStorage.setItem("cc_endpoint", val);
  Swal.fire({
    icon: "success",
    title: "บันทึกแล้ว",
    text: "อัปเดต URL เรียบร้อย",
    timer: 1500,
    showConfirmButton: false,
  });
});

// -------- Helpers --------
function uid() {
  return "OD" + Math.random().toString(36).slice(2, 8).toUpperCase();
}
function toDateInputValue(d) {
  const pad = (n) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function parseThaiNumber(str) {
  if (!str) return 0;
  const clean = (str + "").replace(/[^\d.,-]/g, "").replace(/,/g, "");
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : n;
}
function formatCurrency(n) {
  return (n || 0).toLocaleString("th-TH");
}
function saveLocal() {
  localStorage.setItem("cc_employees", JSON.stringify(state.employees));
  localStorage.setItem("cc_orders", JSON.stringify(state.orders));
  localStorage.setItem("cc_products", JSON.stringify(state.products));
}

// JSONP call
function callJSONP(params) {
  return new Promise((resolve, reject) => {
    const cbName = "jsonp_cb_" + Math.random().toString(36).slice(2);
    const url = new URL(state.endpoint);
    Object.keys(params).forEach((k) =>
      url.searchParams.append(
        k,
        typeof params[k] === "object" ? JSON.stringify(params[k]) : params[k]
      )
    );
    url.searchParams.append("callback", cbName);

    const script = document.createElement("script");
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("timeout"));
    }, 12000);
    function cleanup() {
      clearTimeout(timeout);
      delete window[cbName];
      script.remove();
    }
    window[cbName] = (data) => {
      cleanup();
      resolve(data);
    };
    script.onerror = () => {
      cleanup();
      reject(new Error("network error"));
    };
    script.src = url.toString();
    document.body.appendChild(script);
  });
}

// -------- Employees --------
function renderEmployees() {
  const tbody = $("employeeTable");
  tbody.innerHTML = "";
  state.employees.forEach((emp) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
          <td class="py-2">${emp.id}</td>
          <td class="py-2">${emp.name}</td>
          <td class="py-2">${emp.commission ?? 0}</td>
          <td class="py-2">${emp.phone || ""}</td>
          <td class="py-2 text-right">
            <button class="bg-amber-500 hover:bg-amber-600 px-3 py-1 rounded-lg text-xs mr-2" data-edit="${
              emp.id
            }">แก้ไข</button>
            <button class="bg-rose-600 hover:bg-rose-700 px-3 py-1 rounded-lg text-xs" data-del="${
              emp.id
            }">ลบ</button>
          </td>
        `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const emp = state.employees.find((e) => e.id === btn.dataset.edit);
      if (!emp) return;
      $("empId").value = emp.id;
      $("empName").value = emp.name;
      $("empCommission").value = emp.commission ?? 0;
      $("empPhone").value = emp.phone || "";
    });
  });
  tbody.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.del;
      const ok = await Swal.fire({
        icon: "warning",
        title: "ลบพนักงาน?",
        text: id,
        showCancelButton: true,
        confirmButtonText: "ลบ",
        cancelButtonText: "ยกเลิก",
      });
      if (!ok.isConfirmed) return;
      const idx = state.employees.findIndex((e) => e.id === id);
      if (idx >= 0) {
        state.employees.splice(idx, 1);
        saveLocal();
        renderEmployees();
        populateEmployeeSelects();
      }
    });
  });
}

$("formEmployee").addEventListener("submit", (e) => {
  e.preventDefault();
  const id = $("empId").value.trim();
  const name = $("empName").value.trim();
  const commission = parseFloat($("empCommission").value) || 0;
  const phone = $("empPhone").value.trim();
  if (!id || !name) return;

  const exist = state.employees.find((e) => e.id === id);
  if (exist) {
    exist.name = name;
    exist.commission = commission;
    exist.phone = phone;
  } else {
    state.employees.push({ id, name, commission, phone });
  }
  saveLocal();
  renderEmployees();
  populateEmployeeSelects();
  $("formEmployee").reset();
  Swal.fire({
    icon: "success",
    title: "บันทึกแล้ว",
    timer: 1200,
    showConfirmButton: false,
  });
});
$("btnResetEmp").addEventListener("click", () => $("formEmployee").reset());

// Sync employees
$("btnSaveEmployees").addEventListener("click", async () => {
  try {
    showLoading(true);
    Swal.fire({
      title: "กำลังบันทึก...",
      didOpen: () => Swal.showLoading(),
      allowOutsideClick: false,
    });
    const res = await callJSONP({
      action: "saveEmployees",
      data: state.employees,
    });
    Swal.close();
    Swal.fire({
      icon: res?.success ? "success" : "error",
      title: res?.message || "บันทึกเสร็จ",
      timer: 1500,
      showConfirmButton: false,
    });
  } catch {
    Swal.close();
    Swal.fire({
      icon: "error",
      title: "บันทึกล้มเหลว",
      text: "ตรวจสอบ Apps Script URL",
    });
  } finally {
    showLoading(false);
  }
});
$("btnSyncEmployees").addEventListener("click", async () => {
  try {
    showLoading(true);
    Swal.fire({
      title: "กำลังเรียกดู...",
      didOpen: () => Swal.showLoading(),
      allowOutsideClick: false,
    });
    const res = await callJSONP({ action: "listEmployees" });
    if (Array.isArray(res?.data)) {
      state.employees = res.data;
      saveLocal();
      renderEmployees();
      populateEmployeeSelects();
    }
    Swal.close();
    Swal.fire({
      icon: "success",
      title: "โหลดเสร็จ",
      timer: 1000,
      showConfirmButton: false,
    });
  } catch {
    Swal.close();
    Swal.fire({
      icon: "error",
      title: "โหลดล้มเหลว",
      text: "ใช้ข้อมูลในเครื่องแทน",
    });
    renderEmployees();
  } finally {
    showLoading(false);
  }
});

function populateEmployeeSelects() {
  const opts = ['<option value="">เลือกพนักงาน</option>']
    .concat(state.employees.map((e) => `<option>${e.name}</option>`))
    .join("");
  $("adminName").innerHTML = opts;
  const comSel = $("comEmployee");
  const comOpts = ['<option value="">ทั้งหมด</option>']
    .concat(state.employees.map((e) => `<option>${e.name}</option>`))
    .join("");
  comSel.innerHTML = comOpts;
}

// -------- Orders --------
function renderItems(items) {
  const tbody = $("itemsTable");
  tbody.innerHTML = "";
  items.forEach((it) => {
    const tr = document.createElement("tr");
    tr.dataset.id = it._id;
    tr.innerHTML = `
          <td class="py-2"><input value="${
            it.name || ""
          }" class="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-2 py-1 item-name"></td>
          <td class="py-2 w-20"><input type="number" min="1" value="${
            it.qty || 1
          }" class="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-2 py-1 item-qty"></td>
          <td class="py-2 w-28"><input type="number" min="0" step="0.01" value="${
            it.price || 0
          }" class="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-2 py-1 item-price"></td>
          <td class="py-2 w-28"><input type="number" min="0" step="0.01" value="${
            it.total || it.qty * it.price || 0
          }" class="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-2 py-1 item-total"></td>
          <td class="py-2 text-right w-24">
            <button class="bg-rose-600 hover:bg-rose-700 px-3 py-1 rounded-lg text-xs" data-del="${
              it._id
            }">ลบ</button>
          </td>
        `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll(".item-qty, .item-price").forEach((inp) => {
    inp.addEventListener("input", () => {
      const tr = inp.closest("tr");
      const qty = parseFloat(tr.querySelector(".item-qty").value) || 0;
      const price = parseFloat(tr.querySelector(".item-price").value) || 0;
      tr.querySelector(".item-total").value = (qty * price).toFixed(2);
      recalcFromItems();
    });
  });
  tbody.querySelectorAll(".item-total").forEach((inp) => {
    inp.addEventListener("input", () => recalcFromItems());
  });
  tbody.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.del;
      const idx = currentItems.findIndex((i) => i._id === id);
      if (idx >= 0) {
        currentItems.splice(idx, 1);
        renderItems(currentItems);
        recalcFromItems();
      }
    });
  });
}

let currentItems = [];
function addItemRow(item = {}) {
  const row = {
    _id: "IT" + Math.random().toString(36).slice(2, 8),
    name: item.name || "",
    qty: item.qty || 1,
    price: item.price || 0,
    total: item.total || 0,
  };
  currentItems.push(row);
  renderItems(currentItems);
}
function collectItems() {
  const rows = Array.from($("itemsTable").querySelectorAll("tr"));
  return rows.map((tr) => ({
    _id: tr.dataset.id,
    name: tr.querySelector(".item-name").value.trim(),
    qty: parseFloat(tr.querySelector(".item-qty").value) || 0,
    price: parseFloat(tr.querySelector(".item-price").value) || 0,
    total: parseFloat(tr.querySelector(".item-total").value) || 0,
  }));
}
function recalcFromItems() {
  const items = collectItems();
  const sum = items.reduce((a, b) => a + (parseFloat(b.total) || 0), 0);
  const ship = parseFloat($("shippingFee").value) || 0;
  const discount = parseFloat($("discountTotal").value) || 0;
  $("grandTotal").value = Math.max(0, sum + ship - discount).toFixed(2);
  const rate = parseFloat($("thbRate").value) || 1;
  $("thaiAmount").value = Math.round(parseFloat($("grandTotal").value) * rate);
}
$("btnAddItem").addEventListener("click", () => addItemRow());
$("discountTotal").addEventListener("input", recalcFromItems);
$("shippingFee").addEventListener("input", recalcFromItems);
$("thbRate").addEventListener("input", recalcFromItems);
$("grandTotal").addEventListener("input", () => {
  const rate = parseFloat($("thbRate").value) || 1;
  $("thaiAmount").value = Math.round(
    parseFloat($("grandTotal").value || 0) * rate
  );
});

function renderOrders(list = state.orders) {
  const keyword = ($("searchOrders").value || "").trim().toLowerCase();
  const tbody = $("ordersTable");
  tbody.innerHTML = "";
  list
    .filter((o) => {
      if (!keyword) return true;
      return (
        (o.orderNo || "").toLowerCase().includes(keyword) ||
        (o.customerName || "").toLowerCase().includes(keyword)
      );
    })
    .forEach((o) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
          <td class="py-2">${o.orderNo}</td>
          <td class="py-2">${o.orderDate}</td>
          <td class="py-2">${o.customerName || ""}</td>
          <td class="py-2">${o.adminName || ""}</td>
          <td class="py-2">${o.shippingName || ""} (${
        o.shippingType || ""
      })</td>
          <td class="py-2">${formatCurrency(o.grandTotal || 0)}</td>
          <td class="py-2 text-right">
            <button class="bg-amber-500 hover:bg-amber-600 px-3 py-1 rounded-lg text-xs mr-2" data-edit="${
              o.orderNo
            }">แก้ไข</button>
            <button class="bg-rose-600 hover:bg-rose-700 px-3 py-1 rounded-lg text-xs" data-del="${
              o.orderNo
            }">ลบ</button>
          </td>
        `;
      tbody.appendChild(tr);
    });

  tbody.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const od = state.orders.find((x) => x.orderNo === btn.dataset.edit);
      if (!od) return;
      loadOrderToForm(od);
      document.querySelector('[data-tab="orders"]').click();
    });
  });
  tbody.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.del;
      const ok = await Swal.fire({
        icon: "warning",
        title: "ลบออเดอร์?",
        text: id,
        showCancelButton: true,
        confirmButtonText: "ลบ",
        cancelButtonText: "ยกเลิก",
      });
      if (!ok.isConfirmed) return;
      const idx = state.orders.findIndex((o) => o.orderNo === id);
      if (idx >= 0) {
        state.orders.splice(idx, 1);
        saveLocal();
        renderOrders();
      }
    });
  });
}
$("searchOrders").addEventListener("input", () => renderOrders());
function newOrderNo() {
  return uid();
}
function resetOrderForm() {
  $("formOrder").reset();
  $("orderNo").value = newOrderNo();
  $("orderDate").value = toDateInputValue(new Date());
  currentItems = [];
  renderItems(currentItems);
}
$("btnResetOrder").addEventListener("click", resetOrderForm);
resetOrderForm();

function loadOrderToForm(o) {
  $("orderNo").value = o.orderNo;
  $("orderDate").value = o.orderDate;
  $("customerName").value = o.customerName || "";
  $("adminName").value = o.adminName || "";
  $("shippingName").value = o.shippingName || "7-11";
  $("shippingFee").value = o.shippingFee || 0;
  $("shippingType").value = o.shippingType || "ธรรมดา";
  $("customerAddress").value = o.customerAddress || "";
  $("grandTotal").value = o.grandTotal || 0;
  $("discountTotal").value = o.discountTotal || 0;
  $("thbRate").value = o.thbRate || 1;
  $("thaiAmount").value = o.thaiAmount || 0;
  currentItems = (o.items || []).map((x) => ({
    ...x,
    _id: x._id || "IT" + Math.random().toString(36).slice(2, 8),
  }));
  renderItems(currentItems);
  recalcFromItems();
}

$("formOrder").addEventListener("submit", (e) => {
  e.preventDefault();
  const data = {
    orderNo: $("orderNo").value.trim() || newOrderNo(),
    orderDate: $("orderDate").value,
    customerName: $("customerName").value.trim(),
    adminName: $("adminName").value,
    shippingName: $("shippingName").value,
    shippingFee: parseFloat($("shippingFee").value) || 0,
    shippingType: $("shippingType").value,
    customerAddress: $("customerAddress").value.trim(),
    items: collectItems(),
    grandTotal: parseFloat($("grandTotal").value) || 0,
    discountTotal: parseFloat($("discountTotal").value) || 0,
    thbRate: parseFloat($("thbRate").value) || 1,
    thaiAmount: parseFloat($("thaiAmount").value) || 0,
  };
  const idx = state.orders.findIndex((o) => o.orderNo === data.orderNo);
  if (idx >= 0) state.orders[idx] = data;
  else state.orders.unshift(data);
  saveLocal();
  renderOrders();
  Swal.fire({
    icon: "success",
    title: "บันทึกออเดอร์ (ภายใน)",
    timer: 1200,
    showConfirmButton: false,
  });
});

// Export Orders JSON
$("btnExportOrders").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state.orders, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "orders.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

// Sync Orders
$("btnSaveOrders").addEventListener("click", async () => {
  try {
    showLoading(true);
    Swal.fire({
      title: "กำลังบันทึก...",
      didOpen: () => Swal.showLoading(),
      allowOutsideClick: false,
    });
    const res = await callJSONP({
      action: "saveOrders",
      data: state.orders,
    });
    Swal.close();
    Swal.fire({
      icon: res?.success ? "success" : "error",
      title: res?.message || "บันทึกเสร็จ",
      timer: 1500,
      showConfirmButton: false,
    });
  } catch {
    Swal.close();
    Swal.fire({
      icon: "error",
      title: "บันทึกล้มเหลว",
      text: "ตรวจสอบ Apps Script URL",
    });
  } finally {
    showLoading(false);
  }
});
$("btnSyncOrders").addEventListener("click", async () => {
  try {
    showLoading(true);
    Swal.fire({
      title: "กำลังเรียกดู...",
      didOpen: () => Swal.showLoading(),
      allowOutsideClick: false,
    });
    const res = await callJSONP({ action: "listOrders" });
    if (Array.isArray(res?.data)) {
      state.orders = res.data;
      saveLocal();
      renderOrders();
    }
    Swal.close();
    Swal.fire({
      icon: "success",
      title: "โหลดเสร็จ",
      timer: 1000,
      showConfirmButton: false,
    });
  } catch {
    Swal.close();
    Swal.fire({
      icon: "error",
      title: "โหลดล้มเหลว",
      text: "ใช้ข้อมูลในเครื่องแทน",
    });
    renderOrders();
  } finally {
    showLoading(false);
  }
});

// Parse raw text
$("btnParse").addEventListener("click", () => {
  const raw = ($("rawText").value || "").trim();
  if (!raw) return;
  const parsed = parseCustomerText(raw);
  loadOrderToForm({
    orderNo: newOrderNo(),
    orderDate: parsed.orderDate || toDateInputValue(new Date()),
    customerName: parsed.customerName || "",
    adminName: "",
    shippingName: parsed.shippingName || "7-11",
    shippingFee: parsed.shippingFee || 0,
    shippingType: parsed.shippingType || "ธรรมดา",
    customerAddress: parsed.customerAddress || "",
    items: parsed.items || [],
    grandTotal: parsed.grandTotal || 0,
    discountTotal: 0,
    thbRate: parsed.thbRate || 1,
    thaiAmount: parsed.thaiAmount || 0,
  });
  Swal.fire({
    icon: "success",
    title: "แปรงข้อความเสร็จ",
    timer: 1200,
    showConfirmButton: false,
  });
});
$("btnClearRaw").addEventListener("click", () => ($("rawText").value = ""));

function parseCustomerText(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Date dd/mm/yy
  let orderDate = "";
  for (const l of lines) {
    const m = l.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (m) {
      let y = parseInt(m[3], 10);
      if (y < 100) {
        y = 2000 + y;
      }
      const d = new Date(y, parseInt(m[2]) - 1, parseInt(m[1]));
      orderDate = toDateInputValue(d);
      break;
    }
  }

  // Shipping name
  let shippingName = "";
  if (lines.some((l) => /ส่ง\s*7[\-\s]?11/i.test(l))) shippingName = "7-11";
  if (lines.some((l) => /ส่ง\s*แมวดำ|แมวดำ/i.test(l))) shippingName = "แมวดำ";
  if (lines.some((l) => /ส่ง\s*แฟมิลี่|แฟมิลี่/i.test(l)))
    shippingName = "แฟมิลี่";

  // Shipping type
  const shippingType = lines.some((l) => /เย็น/i.test(l)) ? "เย็น" : "ธรรมดา";

  // Shipping fee
  let shippingFee = 0;
  for (const l of lines) {
    const m = l.match(/ค่าส่ง\s*([^\d]*)([\d,\.]+)/i);
    if (m) {
      shippingFee = parseThaiNumber(m[2]);
      break;
    }
  }

  // Grand total
  let grandTotal = 0;
  for (const l of lines) {
    const m = l.match(
      /(ยอดรวมปลายทาง|ยอดปลายทาง|ยอดรวม|รวม)\s*([=\:：]?\s*)?([\d,\.]+)/i
    );
    if (m) {
      grandTotal = parseThaiNumber(m[3]);
      break;
    }
  }

  // Thai amount and rate
  let thaiAmount = 0,
    thbRate = 1;
  for (const l of lines) {
    if (/ยอดไทย/i.test(l)) {
      const n = parseThaiNumber(l);
      if (n > 0) thaiAmount = n;
    }
  }

  // Customer name: after "ออเดอร์ " or "ชื่อเฟส"
  let customerName = "";
  for (const l of lines) {
    const m1 = l.match(/ออเดอร์\s*(.+)$/i);
    if (m1) {
      customerName = m1[1].trim();
      break;
    }
    const m2 = l.match(/ชื่อเฟส\s*[=:\-]?\s*(.+)$/i);
    if (m2) {
      customerName = m2[1].trim();
      break;
    }
  }

  // Items: from after date line until before "ค่าส่ง"
  const dateIdx = lines.findIndex((l) =>
    /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(l)
  );
  const feeIdx = lines.findIndex((l) => /ค่าส่ง/i.test(l));
  const itemsLines = lines.slice(
    dateIdx >= 0 ? dateIdx + 1 : 0,
    feeIdx >= 0 ? feeIdx : lines.length
  );
  const items = [];
  for (const l of itemsLines) {
    if (/^ออเดอร์\b/i.test(l)) break;
    if (/^ส่ง\b/i.test(l)) continue;
    const parsedItem = parseItemLine(l);
    if (parsedItem)
      items.push({
        ...parsedItem,
        _id: "IT" + Math.random().toString(36).slice(2, 8),
      });
  }

  // Address: lines after total
  let addr = "";
  let totalIdx = lines.findIndex((l) =>
    /(ยอดรวมปลายทาง|ยอดปลายทาง|ยอดรวม|รวม)/i.test(l)
  );
  if (totalIdx < 0) totalIdx = feeIdx;
  if (totalIdx >= 0) {
    const after = lines.slice(totalIdx + 1);
    const filtered = after.filter((l) => !/^(ส่ง|ออเดอร์)\b/i.test(l));
    addr = filtered.join("\n").trim();
  }

  if (!grandTotal && thaiAmount) {
    grandTotal = thaiAmount;
    thbRate = 1;
  }
  return {
    orderDate,
    shippingName,
    shippingType,
    shippingFee,
    grandTotal,
    thaiAmount,
    thbRate,
    customerName,
    customerAddress: addr,
    items,
  };
}
function parseItemLine(l) {
  const line = l.replace(/\s+/g, " ").trim();
  if (!line) return null;
  let m = line.match(
    /^(.+?)\s+(\d+)\s*[x\*]\s*(\d+(?:\.\d+)?)\s*(?:[= ]\s*)?(\d+(?:\.\d+)?)?/i
  );
  if (m) {
    const name = m[1].replace(/ราคา$/, "").trim();
    const qty = parseFloat(m[2]) || 1;
    const price = parseFloat(m[3]) || 0;
    const total = m[4] ? parseFloat(m[4]) : qty * price;
    return { name, qty, price, total };
  }
  m = line.match(/^(.+?)\s+(\d+(?:\.\d+)?)$/);
  if (m) {
    const name = m[1].trim();
    const price = parseFloat(m[2]) || 0;
    return { name, qty: 1, price, total: price };
  }
  return null;
}

// -------- Commission --------
function calcCommission(orders, employees, start, end, filterEmp = "") {
  const byEmp = {};
  const inRange = (dstr) => {
    if (!dstr) return false;
    const d = new Date(dstr);
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  };
  orders.forEach((o) => {
    if (!inRange(o.orderDate)) return;
    if (filterEmp && o.adminName !== filterEmp) return;
    const empName = o.adminName || "ไม่ระบุ";
    const net = (o.grandTotal || 0) - (o.shippingFee || 0);
    if (!byEmp[empName]) byEmp[empName] = { salesNet: 0, count: 0 };
    byEmp[empName].salesNet += net;
    byEmp[empName].count += 1;
  });
  const rows = [];
  Object.keys(byEmp).forEach((name) => {
    const emp = employees.find((e) => e.name === name);
    const pct = emp?.commission ?? 0;
    const pay = byEmp[name].salesNet * (pct / 100);
    rows.push({
      name,
      salesNet: byEmp[name].salesNet,
      pct,
      pay,
      count: byEmp[name].count,
    });
  });
  return rows.sort((a, b) => b.salesNet - a.salesNet);
}
function renderCommissionTable(rows) {
  const tbody = $("commissionTable");
  tbody.innerHTML = "";
  rows.forEach((r) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
          <td class="py-2">${r.name}</td>
          <td class="py-2">${formatCurrency(r.salesNet)}</td>
          <td class="py-2">${r.pct}</td>
          <td class="py-2">${formatCurrency(r.pay)}</td>
          <td class="py-2">${r.count}</td>
        `;
    tbody.appendChild(tr);
  });
}
$("btnLoadCommission").addEventListener("click", async () => {
  try {
    showLoading(true);
    Swal.fire({
      title: "กำลังโหลด...",
      didOpen: () => Swal.showLoading(),
      allowOutsideClick: false,
    });
    const [ordersRes, empRes] = await Promise.all([
      callJSONP({ action: "listOrders" }),
      callJSONP({ action: "listEmployees" }),
    ]);
    if (Array.isArray(ordersRes?.data)) state.orders = ordersRes.data;
    if (Array.isArray(empRes?.data)) state.employees = empRes.data;
    saveLocal();
    renderOrders();
    renderEmployees();
    populateEmployeeSelects();
    Swal.close();
    Swal.fire({
      icon: "success",
      title: "โหลดเสร็จ",
      timer: 1000,
      showConfirmButton: false,
    });
  } catch {
    Swal.close();
    Swal.fire({
      icon: "error",
      title: "โหลดล้มเหลว",
      text: "ใช้ข้อมูลในเครื่องแทน",
    });
  } finally {
    showLoading(false);
  }
});
$("btnCalcCommission").addEventListener("click", () => {
  const s = $("comStart").value ? new Date($("comStart").value) : null;
  const e = $("comEnd").value ? new Date($("comEnd").value) : null;
  const emp = $("comEmployee").value || "";
  const rows = calcCommission(state.orders, state.employees, s, e, emp);
  renderCommissionTable(rows);
});
$("btnExportCommission").addEventListener("click", () => {
  const rows = Array.from($("commissionTable").querySelectorAll("tr")).map(
    (tr) => Array.from(tr.children).map((td) => td.textContent)
  );
  const csv = [
    [
      "พนักงาน",
      "ยอดขายสุทธิ",
      "ค่าคอม (%)",
      "ค่าคอมที่ต้องจ่าย",
      "จำนวนออเดอร์",
    ],
  ]
    .concat(rows)
    .map((r) => r.join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "commission.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

// -------- Monthly Report --------
function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(key) {
  const [y, m] = key.split("-");
  const months = [
    "ม.ค.",
    "ก.พ.",
    "มี.ค.",
    "เม.ย.",
    "พ.ค.",
    "มิ.ย.",
    "ก.ค.",
    "ส.ค.",
    "ก.ย.",
    "ต.ค.",
    "พ.ย.",
    "ธ.ค.",
  ];
  return `${months[parseInt(m) - 1]} ${y}`;
}
function calcMonthly(orders, products, start, end) {
  const map = {};
  const shipNames = ["7-11", "แฟมิลี่", "แมวดำ"];
  const prodAgg = {};
  orders.forEach((o) => {
    const d = o.orderDate ? new Date(o.orderDate) : null;
    if (!d) return;
    if (start && d < start) return;
    if (end && d > end) return;
    const k = monthKey(d);
    if (!map[k])
      map[k] = {
        total: 0,
        count: 0,
        ship: {
          "7-11": { sum: 0, cnt: 0 },
          แฟมิลี่: { sum: 0, cnt: 0 },
          แมวดำ: { sum: 0, cnt: 0 },
        },
        profit: 0,
        loss: 0,
      };
    map[k].total += o.grandTotal || 0;
    map[k].count += 1;
    const sn = shipNames.includes(o.shippingName)
      ? o.shippingName
      : shipNames[0];
    map[k].ship[sn].sum += o.grandTotal || 0;
    map[k].ship[sn].cnt += 1;

    const items = o.items || [];
    items.forEach((it) => {
      const rev = it.total || (it.qty || 0) * (it.price || 0);
      const prd = products.find(
        (p) => p.name && it.name && p.name.trim() === it.name.trim()
      );
      const costPer = prd ? parseFloat(prd.cost) || 0 : 0;
      const cost = costPer * (it.qty || 0);
      const margin = rev - cost;
      if (!prodAgg[it.name || ""]) prodAgg[it.name || ""] = 0;
      prodAgg[it.name || ""] += it.qty || 0;
      if (margin >= 0) map[k].profit += margin;
      else map[k].loss += -margin;
    });
  });
  const rows = Object.keys(map)
    .sort()
    .map((k) => ({ key: k, ...map[k] }));
  const top = Object.entries(prodAgg)
    .filter(([n]) => n)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 9)
    .map(([name, qty]) => ({ name, qty }));
  return { rows, top };
}
$("btnLoadMonthly").addEventListener("click", async () => {
  try {
    showLoading(true);
    Swal.fire({
      title: "กำลังโหลด...",
      didOpen: () => Swal.showLoading(),
      allowOutsideClick: false,
    });
    const [ordersRes, prdRes] = await Promise.all([
      callJSONP({ action: "listOrders" }),
      callJSONP({ action: "listProducts" }),
    ]);
    if (Array.isArray(ordersRes?.data)) state.orders = ordersRes.data;
    if (Array.isArray(prdRes?.data)) state.products = prdRes.data;
    saveLocal();
    renderOrders();
    renderProducts();
    Swal.close();
    Swal.fire({
      icon: "success",
      title: "โหลดเสร็จ",
      timer: 1000,
      showConfirmButton: false,
    });
  } catch {
    Swal.close();
    Swal.fire({
      icon: "error",
      title: "โหลดล้มเหลว",
      text: "ใช้ข้อมูลในเครื่องแทน",
    });
  } finally {
    showLoading(false);
  }
});
$("btnCalcMonthly").addEventListener("click", () => {
  const s = $("monthlyStart").value ? new Date($("monthlyStart").value) : null;
  const e = $("monthlyEnd").value ? new Date($("monthlyEnd").value) : null;
  const { rows, top } = calcMonthly(state.orders, state.products, s, e);

  const tbody = $("monthlyTable");
  tbody.innerHTML = "";
  rows.forEach((r) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
          <td class="py-2">${monthLabel(r.key)}</td>
          <td class="py-2">${formatCurrency(r.total)}</td>
          <td class="py-2">${r.count}</td>
          <td class="py-2">${formatCurrency(r.ship["7-11"].sum)} / ${
      r.ship["7-11"].cnt
    }</td>
          <td class="py-2">${formatCurrency(r.ship["แฟมิลี่"].sum)} / ${
      r.ship["แฟมิลี่"].cnt
    }</td>
          <td class="py-2">${formatCurrency(r.ship["แมวดำ"].sum)} / ${
      r.ship["แมวดำ"].cnt
    }</td>
          <td class="py-2 text-emerald-300">${formatCurrency(r.profit)}</td>
          <td class="py-2 text-rose-300">${formatCurrency(r.loss)}</td>
        `;
    tbody.appendChild(tr);
  });

  const grid = $("topProducts");
  grid.innerHTML = "";
  top.forEach((t) => {
    const card = document.createElement("div");
    card.className = "bg-slate-900/40 border border-slate-700 rounded-xl p-3";
    card.innerHTML = `<div class="text-base">${t.name}</div><div class="text-sm text-slate-400">ยอดรวม: ${t.qty}</div>`;
    grid.appendChild(card);
  });
});

// -------- Products --------
function renderProducts() {
  const tbody = $("productsTable");
  const keyword = ($("searchProducts").value || "").trim();
  tbody.innerHTML = "";
  state.products
    .filter((p) => {
      if (!keyword) return true;
      const k = keyword.toLowerCase();
      return (
        (p.id || "").toLowerCase().includes(k) ||
        (p.name || "").toLowerCase().includes(k)
      );
    })
    .forEach((p) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
          <td class="py-2">${p.id}</td>
          <td class="py-2">${p.name || ""}</td>
          <td class="py-2">${p.cost ?? 0}</td>
          <td class="py-2">${p.retail ?? 0}</td>
          <td class="py-2">${p.stock ?? 0}</td>
          <td class="py-2">${p.barcode || ""}</td>
          <td class="py-2 text-right">
            <button class="bg-amber-500 hover:bg-amber-600 px-3 py-1 rounded-lg text-xs mr-2" data-edit="${
              p.id
            }">แก้ไข</button>
            <button class="bg-rose-600 hover:bg-rose-700 px-3 py-1 rounded-lg text-xs" data-del="${
              p.id
            }">ลบ</button>
          </td>
        `;
      tbody.appendChild(tr);
    });

  tbody.querySelectorAll("[data-edit]").forEach((b) => {
    b.addEventListener("click", () => {
      const p = state.products.find((x) => x.id === b.dataset.edit);
      if (!p) return;
      $("prdId").value = p.id;
      $("prdName").value = p.name || "";
      $("prdWeight").value = p.weight || "";
      $("prdCost").value = p.cost || 0;
      $("prdRetail").value = p.retail || 0;
      $("prdWholesale").value = p.wholesale || 0;
      $("prdSet").value = p.setPrice || 0;
      $("prdIn").value = p.inQty || 0;
      $("prdStock").value = p.stock || 0;
      $("prdBarcode").value = p.barcode || "";
    });
  });
  tbody.querySelectorAll("[data-del]").forEach((b) => {
    b.addEventListener("click", async () => {
      const id = b.dataset.del;
      const ok = await Swal.fire({
        icon: "warning",
        title: "ลบสินค้า?",
        text: id,
        showCancelButton: true,
        confirmButtonText: "ลบ",
        cancelButtonText: "ยกเลิก",
      });
      if (!ok.isConfirmed) return;
      const idx = state.products.findIndex((p) => p.id === id);
      if (idx >= 0) {
        state.products.splice(idx, 1);
        saveLocal();
        renderProducts();
      }
    });
  });
}

$("formProduct").addEventListener("submit", (e) => {
  e.preventDefault();
  const p = {
    id: $("prdId").value.trim(),
    name: $("prdName").value.trim(),
    weight: $("prdWeight").value.trim(),
    cost: parseFloat($("prdCost").value) || 0,
    retail: parseFloat($("prdRetail").value) || 0,
    wholesale: parseFloat($("prdWholesale").value) || 0,
    setPrice: parseFloat($("prdSet").value) || 0,
    inQty: parseFloat($("prdIn").value) || 0,
    stock: parseFloat($("prdStock").value) || 0,
    barcode: $("prdBarcode").value.trim(),
  };
  if (!p.id || !p.name) return;
  const idx = state.products.findIndex((x) => x.id === p.id);
  if (idx >= 0) state.products[idx] = p;
  else state.products.push(p);
  saveLocal();
  renderProducts();
  $("formProduct").reset();
  Swal.fire({
    icon: "success",
    title: "บันทึกสินค้า",
    timer: 1200,
    showConfirmButton: false,
  });
});
$("btnResetPrd").addEventListener("click", () => $("formProduct").reset());
$("searchProducts").addEventListener("input", renderProducts);

// Sync products
$("btnSaveProducts").addEventListener("click", async () => {
  try {
    showLoading(true);
    Swal.fire({
      title: "กำลังบันทึก...",
      didOpen: () => Swal.showLoading(),
      allowOutsideClick: false,
    });
    const res = await callJSONP({
      action: "saveProducts",
      data: state.products,
    });
    Swal.close();
    Swal.fire({
      icon: res?.success ? "success" : "error",
      title: res?.message || "บันทึกเสร็จ",
      timer: 1500,
      showConfirmButton: false,
    });
  } catch {
    Swal.close();
    Swal.fire({
      icon: "error",
      title: "บันทึกล้มเหลว",
      text: "ตรวจสอบ Apps Script URL",
    });
  } finally {
    showLoading(false);
  }
});
$("btnSyncProducts").addEventListener("click", async () => {
  try {
    showLoading(true);
    Swal.fire({
      title: "กำลังเรียกดู...",
      didOpen: () => Swal.showLoading(),
      allowOutsideClick: false,
    });
    const res = await callJSONP({ action: "listProducts" });
    if (Array.isArray(res?.data)) {
      state.products = res.data;
      saveLocal();
      renderProducts();
    }
    Swal.close();
    Swal.fire({
      icon: "success",
      title: "โหลดเสร็จ",
      timer: 1000,
      showConfirmButton: false,
    });
  } catch {
    Swal.close();
    Swal.fire({
      icon: "error",
      title: "โหลดล้มเหลว",
      text: "ใช้ข้อมูลในเครื่องแทน",
    });
    renderProducts();
  } finally {
    showLoading(false);
  }
});

// -------- Init --------
function firstLoad() {
  if (state.employees.length === 0) {
    state.employees = [
      {
        id: "E001",
        name: "แอดมิน A",
        commission: 5,
        phone: "0900000001",
      },
      {
        id: "E002",
        name: "แอดมิน B",
        commission: 7.5,
        phone: "0900000002",
      },
    ];
  }
  saveLocal();
  renderEmployees();
  renderOrders();
  renderProducts();
  populateEmployeeSelects();
}
firstLoad();
