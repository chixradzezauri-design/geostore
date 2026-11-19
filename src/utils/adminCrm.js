const normalizeEmail = value => String(value || '').trim().toLowerCase();
const normalizePhone = value => {
  const digits = String(value || '').replace(/\D/g, '');
  // Treat Georgian mobile numbers in local 9-digit and +995 international
  // formats as the same customer identity, while preserving other numbers.
  if (digits.length === 9 && digits.startsWith('5')) return `995${digits}`;
  return digits;
};

const getCustomerKeys = customer => {
  const email = normalizeEmail(customer?.email || customer?.user_email || customer?.customer_email);
  const phone = normalizePhone(customer?.phone);
  return {
    email: email || '',
    phone: phone || '',
    keys: [
      ...(email ? [`email:${email}`] : []),
      ...(phone ? [`phone:${phone}`] : [])
    ]
  };
};

export const mergeCrmCustomersFromOrders = (legacyUsers = [], orders = []) => {
  const customers = [];
  const indexByKey = new Map();
  const registerKeys = (customer, index) => {
    const { keys } = getCustomerKeys(customer);
    keys.forEach(key => indexByKey.set(key, index));
  };

  (Array.isArray(legacyUsers) ? legacyUsers : []).forEach((legacy, index) => {
    if (!legacy || typeof legacy !== 'object' || Array.isArray(legacy)) return;
    const keys = getCustomerKeys(legacy);
    const matchIndex = keys.keys.map(key => indexByKey.get(key)).find(value => value !== undefined);
    if (matchIndex !== undefined) {
      customers[matchIndex] = {
        ...customers[matchIndex],
        ...legacy,
        isLocalCrmRecord: true,
        orderCount: 0,
        totalSpent: 0,
        lastOrderAt: null,
        lastOrderId: null
      };
      registerKeys(customers[matchIndex], matchIndex);
      return;
    }
    const customer = {
      ...legacy,
      id: legacy.id || `legacy-crm-${index}`,
      isLocalCrmRecord: true,
      isOrderDerived: false,
      orderCount: 0,
      totalSpent: 0,
      lastOrderAt: null,
      lastOrderId: null
    };
    customers.push(customer);
    registerKeys(customer, customers.length - 1);
  });

  const seenOrderIds = new Set();
  (Array.isArray(orders) ? orders : []).forEach(order => {
    if (!order || typeof order !== 'object' || Array.isArray(order)) return;
    const orderId = String(order.id ?? '').trim();
    if (orderId && seenOrderIds.has(orderId)) return;
    if (orderId) seenOrderIds.add(orderId);

    const keys = getCustomerKeys(order);
    const matchIndex = keys.keys.map(key => indexByKey.get(key)).find(value => value !== undefined);
    const fallbackKey = orderId ? `order:${orderId}` : '';
    if (matchIndex === undefined && keys.keys.length === 0 && !fallbackKey) return;

    const targetIndex = matchIndex === undefined ? customers.length : matchIndex;
    const existing = matchIndex === undefined ? {} : customers[targetIndex];
    const amountValue = Number(order.totalGEL ?? order.total_gel);
    const amount = Number.isFinite(amountValue) && amountValue > 0 ? amountValue : 0;
    const createdAt = String(order.created_at || order.createdAt || '').trim();
    const previousTime = Date.parse(existing.lastOrderAt || '') || 0;
    const currentTime = Date.parse(createdAt) || 0;
    const isLatest = currentTime >= previousTime;
    const customer = {
      ...existing,
      id: existing.id || `order-customer-${keys.email || keys.phone || orderId}`,
      name: (isLatest && (order.customerName || order.customer_name)) || existing.name || 'მომხმარებელი',
      email: keys.email || existing.email || '',
      phone: order.phone || existing.phone || '',
      orderCount: (Number(existing.orderCount) || 0) + 1,
      totalSpent: (Number(existing.totalSpent) || 0) + amount,
      lastOrderAt: isLatest && createdAt ? createdAt : existing.lastOrderAt || null,
      lastOrderId: isLatest && orderId ? orderId : existing.lastOrderId || null,
      isOrderDerived: true,
      isLocalCrmRecord: Boolean(existing.isLocalCrmRecord)
    };
    if (matchIndex === undefined) customers.push(customer);
    else customers[targetIndex] = customer;
    registerKeys(customer, targetIndex);
    if (fallbackKey) indexByKey.set(fallbackKey, targetIndex);
  });

  return customers.sort((left, right) => {
    const leftTime = Date.parse(left.lastOrderAt || '') || 0;
    const rightTime = Date.parse(right.lastOrderAt || '') || 0;
    return rightTime - leftTime || String(left.name || '').localeCompare(String(right.name || ''), 'ka');
  });
};
