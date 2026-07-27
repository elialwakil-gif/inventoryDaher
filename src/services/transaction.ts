import apiClient from "@/lib/axios";

export type ProductPriceType =
  | "payPrice"
  | "wholesalePrice"
  | "superWholesalePrice"
  | "sellPrice"
  | "custom";

export interface sell {
  id?: string;
  customerId: string;
  totalPrice: number;
  paymentStatus: "cash" | "part" | "debt";
  remainingDebt: number;
  paymentAccountId?: string;
  receivableAccountId?: string;
  salesAccountId?: string;
  products: {
    productId?: string;
    code: string;
    id: string;
    name: string;
    warehouse: string;
    quantity?: number;
    reservedQuantity?: number;
    qty: number;
    sellPrice: number;
    unit?: string;
    totalPrice?: number;
    payPrice?: number;
    wholesalePrice?: number;
    superWholesalePrice?: number;
    category?: string;
    updatedDate?: string;
    alertQuantity?: number;
    selectedPriceType?: ProductPriceType;
  }[];
  date?: string;
  currency: string;
  exchangeRate: number;
  amount_base: number;
  priceCurrency?: "USD";
  paymentCurrency?: "USD" | "SYP";
  subtotalUSD?: number;
  totalUSD?: number;
  totalSYP?: number;
  totalOriginal?: number;
  paidUSD?: number;
  paidSYP?: number;
  paidOriginal?: number;
  remainingUSD?: number;
  remainingSYP?: number;
  remainingOriginal?: number;
  discountType?: "none" | "amount" | "percent" | "mixed";
  discountPercent?: number;
  discountPercentUSD?: number;
  discountAmountUSD?: number;
  discountUSD?: number;
  discountSYP?: number;
  discountOriginal?: number;
  partValue: number;
  discount?: number;
  vehicleId?: string;
  vehicleName?: string;
  driverId?: string;
  driverName?: string;
  sourceWarehouse?: string;
}

export interface returnData {
  productCode: string;
  productName?: string;
  customerName?: string;
  supplierName?: string;
  supplierId?: string;
  customerId?: string;
  warehouse: string;
  qty: number;
  returnValue: number;
  referenceId: string;
  productId: string;
  reason: string;
  inventoryAccountId?: string;
  payableAccountId?: string;
  paymentAccountId?: string;
  receivableAccountId?: string;
  salesAccountId?: string;
}

export interface Product {
  id: string;
  name: string;
  code: string;
  category: string;
  payPrice: number;
  wholesalePrice?: number;
  superWholesalePrice?: number;
  sellPrice: number;
  unit: string;
  quantity: number;
  reservedQuantity?: number;
  alertQuantity?: number;
  warehouse: string;
  updatedDate: string;
}

export interface purchase {
  id: string;
  supplierId: string;
  name?: string;
  code: string;
  warehouse: string;
  quantity: number;
  payPrice: number;
  totalPrice: number;
  paymentStatus: string;
  currency: string;
  exchangeRate: number;
  amount_base: number;
  priceCurrency?: "USD";
  paymentCurrency?: "USD" | "SYP";
  totalUSD?: number;
  totalSYP?: number;
  totalOriginal?: number;
  paidUSD?: number;
  paidSYP?: number;
  paidOriginal?: number;
  remainingUSD?: number;
  remainingSYP?: number;
  remainingOriginal?: number;
  partValue?: number;
  remainingDebt: number;
  inventoryAccountId: string;
  payableAccountId: string;
  paymentAccountId?: string;
  date: string;
  products?: Array<{
    id?: string;
    name: string;
    code: string;
    category?: string;
    warehouse: string;
    quantity: number;
    payPrice: number;
    wholesalePrice?: number;
    superWholesalePrice?: number;
    sellPrice: number;
    unit?: string;
    alertQuantity?: number;
    lineTotal?: number;
  }>;
}

export async function payNewProduct({
  newPurchase,
  newProduct,
}: {
  newPurchase: purchase;
  newProduct: Product;
}) {
  try {
    const response = await apiClient.post("/api/transactions/purchase", {
      newPurchase,
      newProduct,
    });
    return response.data;
  } catch (err: any) {
    console.error("خطأ في تسجيل الدخول:", err);

    if (err.response && err.response.data?.message) {
      throw new Error(err.response.data.message);
    }

    throw new Error("فشل الاتصال بالسيرفر");
  }
}

export async function purchaseInvoice({ newPurchase }: { newPurchase: any }) {
  try {
    const response = await apiClient.post("/api/transactions/purchase-invoice", {
      newPurchase,
    });
    return response.data;
  } catch (err: any) {
    console.error("Purchase invoice error:", err);

    if (err.response && err.response.data?.message) {
      throw new Error(err.response.data.message);
    }

    throw new Error("Failed to connect to server");
  }
}

export async function sellProducts({ newSell }: { newSell: sell }) {
  try {
    const response = await apiClient.post("/api/transactions/sell", {
      newSell,
    });
    return response.data;
  } catch (err: any) {
    console.error("خطأ في تسجيل الدخول:", err);

    if (err.response && err.response.data?.message) {
      throw new Error(err.response.data.message);
    }

    throw new Error("فشل الاتصال بالسيرفر");
  }
}

export async function endExchange({
  exchangeData,
  realRate,
  amount_final,
  id,
}: {
  exchangeData: any;
  realRate: number;
  amount_final: number;
  id: string;
}) {
  try {
    const response = await apiClient.post("/api/transactions/endExchange", {
      exchangeData,
      realRate,
      amount_final,
      id,
    });
    return response.data;
  } catch (err: any) {
    console.error("خطأ في تسجيل الدخول:", err);

    if (err.response && err.response.data?.message) {
      throw new Error(err.response.data.message);
    }

    throw new Error("فشل الاتصال بالسيرفر");
  }
}

export async function payCustomerDebt(dataToSend: {
  customerId: string;
  sellId?: string;
  amount: number;
  note: string;
  currency: string;
  exchangeRate: number;
  amount_base: number;
  amountUSD?: number;
  amountSYP?: number;
  amountOriginal?: number;
  paymentCurrency?: "USD" | "SYP";
  paymentAccountId: string;
  receivableAccountId: string;
}) {
  try {
    const response = await apiClient.post("/api/transactions/customerPayment", {
      paymentData: {
        customerId: dataToSend.customerId,
        sellId: dataToSend.sellId,
        amount: Number(dataToSend.amount),
        amountUSD: dataToSend.amountUSD,
        amountSYP: dataToSend.amountSYP,
        amountOriginal: dataToSend.amountOriginal,
        note: dataToSend.note,
        currency: dataToSend.currency,
        paymentCurrency: dataToSend.paymentCurrency,
        exchangeRate: dataToSend.exchangeRate,
        amount_base: dataToSend.amount_base,
        paymentAccountId: dataToSend.paymentAccountId,
        receivableAccountId: dataToSend.receivableAccountId,
        type: "income",
      },
    });
    return response.data;
  } catch (err: any) {
    console.error("خطأ :", err);

    if (err.response && err.response.data?.message) {
      throw new Error(err.response.data.message);
    }

    throw new Error("فشل الاتصال بالسيرفر");
  }
}

export async function paySupplierDebt(dataToSend: {
  supplierId: string;
  purchaseId?: string;
  amount: number;
  note: string;
  currency: string;
  exchangeRate: number;
  amount_base: number;
  amountUSD?: number;
  amountSYP?: number;
  amountOriginal?: number;
  paymentCurrency?: "USD" | "SYP";
  paymentAccountId: string;
  payableAccountId: string;
}) {
  try {
    const response = await apiClient.post("/api/transactions/supplierPayment", {
      paymentData: {
        supplierId: dataToSend.supplierId,
        purchaseId: dataToSend.purchaseId,
        amount: dataToSend.amount,
        amountUSD: dataToSend.amountUSD,
        amountSYP: dataToSend.amountSYP,
        amountOriginal: dataToSend.amountOriginal,
        note: dataToSend.note,
        currency: dataToSend.currency,
        paymentCurrency: dataToSend.paymentCurrency,
        exchangeRate: dataToSend.exchangeRate,
        amount_base: dataToSend.amount_base,
        paymentAccountId: dataToSend.paymentAccountId,
        payableAccountId: dataToSend.payableAccountId,
        type: "expense",
      },
    });
    return response.data;
  } catch (err: any) {
    console.error("خطأ :", err);

    if (err.response && err.response.data?.message) {
      throw new Error(err.response.data.message);
    }

    throw new Error("فشل الاتصال بالسيرفر");
  }
}

export async function handleCustomerReturn(newReturn: {
  productCode?: string;
  productName?: string;
  customerName?: string;
  customerId: string;
  warehouse?: string;
  qty?: number;
  returnValue?: number;
  referenceId: string;
  returnType: "debt" | "cash" | "part";
  partValue: number;
  productId?: string;
  products?: Array<{
    productCode?: string;
    code?: string;
    productId?: string;
    warehouse: string;
    qty: number;
  }>;
  reason: string;
  paymentAccountId?: string;
  receivableAccountId?: string;
  salesAccountId?: string;
}) {
  try {
    const response = await apiClient.post("/api/transactions/CustomerReturn", {
      newReturn: {
        productCode: newReturn.productCode,
        products: newReturn.products,
        productName: newReturn.productName,
        customerName: newReturn.customerName,
        customerId: newReturn.customerId,
        warehouse: newReturn.warehouse,
        qty: newReturn.qty,
        returnValue: newReturn.returnValue,
        referenceId: newReturn.referenceId,
        productId: newReturn.productId,
        returnType: newReturn.returnType,
        partValue: newReturn.partValue,
        reason: newReturn.reason,
        paymentAccountId: newReturn.paymentAccountId,
        receivableAccountId: newReturn.receivableAccountId,
        salesAccountId: newReturn.salesAccountId,
      },
    });
    return response.data;
  } catch (err: any) {
    console.error("خطأ :", err);

    if (err.response && err.response.data?.message) {
      throw new Error(err.response.data.message);
    }

    throw new Error("فشل الاتصال بالسيرفر");
  }
}

export async function handleSupplierReturn(newReturn: {
  productCode: string;
  productName?: string;
  supplierName?: string;
  supplierId: string;
  warehouse: string;
  qty: number;
  returnValue: number;
  referenceId: string;
  returnType: "debt" | "cash" | "part";
  partValue: number;
  productId: string;
  reason: string;
  inventoryAccountId?: string;
  payableAccountId?: string;
  paymentAccountId?: string;
}) {
  try {
    const response = await apiClient.post("/api/transactions/SupplierReturn", {
      newReturn: {
        productCode: newReturn.productCode,
        productName: newReturn.productName,
        supplierName: newReturn.supplierName,
        supplierId: newReturn.supplierId,
        warehouse: newReturn.warehouse,
        qty: newReturn.qty,
        returnValue: newReturn.returnValue,
        referenceId: newReturn.referenceId,
        productId: newReturn.productId,
        returnType: newReturn.returnType,
        partValue: newReturn.partValue,
        reason: newReturn.reason,
        inventoryAccountId: newReturn.inventoryAccountId,
        payableAccountId: newReturn.payableAccountId,
        paymentAccountId: newReturn.paymentAccountId,
      },
    });
    return response.data;
  } catch (err: any) {
    console.error("خطأ :", err);

    if (err.response && err.response.data?.message) {
      throw new Error(err.response.data.message);
    }

    throw new Error("فشل الاتصال بالسيرفر");
  }
}

export async function handleWarehouseTransfare(transferData: {
  productId: string;
  oldWarehouse: string;
  newWarehouse: string;
  exchangeRate: number;
  amount_base: number;
  amount: number;
  currency: string;
  quantity: number;
  note: string;
  newSellPrice?: number;
  paymentStatus?: "cash" | "part" | "debt";
  partValue?: number;
  expenseAccountId?: string;
  paymentAccountId?: string;
  payableAccountId?: string;
}) {
  try {
    const response = await apiClient.post(
      "/api/transactions/warehouseTransfer",
      {
        transferData,
      },
    );
    return response.data;
  } catch (err: any) {
    console.error("خطأ :", err);

    if (err.response && err.response.data?.message) {
      throw new Error(err.response.data.message);
    }

    throw new Error("فشل الاتصال بالسيرفر");
  }
}

export async function handleAfterSellDiscount({
  discount,
  sellId,
  customerId,
}: {
  discount: number;
  sellId: string;
  customerId: string;
}) {
  try {
    const response = await apiClient.post(
      "/api/transactions/afterSellDiscount",
      {
        discount,
        sellId,
        customerId,
      },
    );
    return response.data;
  } catch (err: any) {
    console.error("خطأ :", err);

    if (err.response && err.response.data?.message) {
      throw new Error(err.response.data.message);
    }

    throw new Error("فشل الاتصال بالسيرفر");
  }
}
