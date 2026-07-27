import { StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Quotation } from "@/services/quotations";
import { formatExchangeRate, shouldShowExchangeRate } from "@/lib/money";

const toNumber = (value: unknown, fallback = 0) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const formatAmount = (value: unknown) => toNumber(value).toFixed(2);

export default function QuotationPdf({
  quotation,
}: {
  quotation: Partial<Quotation>;
}) {
  const products = Array.isArray(quotation.products)
    ? quotation.products
    : [];
  const productsSubtotal = products.reduce(
    (sum, product) =>
      sum + toNumber(product?.qty) * toNumber(product?.sellPrice),
    0,
  );
  const subtotal = toNumber(quotation.subtotal, productsSubtotal) || productsSubtotal;
  const discount = toNumber(quotation.discount);
  const discountPercent = toNumber(quotation.discountPercent);
  const discountAmountUSD = toNumber(quotation.discountAmountUSD);
  const discountDetails = [
    discountPercent > 0 ? `${discountPercent.toFixed(2)}%` : "",
    discountAmountUSD > 0 ? `${discountAmountUSD.toFixed(2)}` : "",
  ]
    .filter(Boolean)
    .join(" + ");
  const totalPrice =
    quotation.totalPrice === undefined
      ? Math.max(subtotal - discount, 0)
      : toNumber(quotation.totalPrice);
  const quotationCurrency = quotation.currency || "USD";
  const showExchangeRate = shouldShowExchangeRate({
    currency: quotationCurrency,
  });

  return (
    <View style={styles.container}>
      <Text style={styles.brand}>Daher-Net</Text>
      <Text style={styles.title}>عرض سعر</Text>
      <Text style={styles.notice}>هذا العرض لا يعتبر فاتورة بيع نهائية</Text>

      <View style={styles.section}>
        <View style={styles.infoRow}>
          <Text>اسم الزبون:</Text>
          <Text>{quotation.customerName || "-"}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text>رقم العرض:</Text>
          <Text style={styles.ltr}>{quotation.number || "-"}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text>التاريخ:</Text>
          <Text style={styles.ltr}>
            {quotation.date
              ? new Date(quotation.date).toLocaleDateString("en-GB")
              : new Date().toLocaleDateString("en-GB")}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text>صالح لغاية:</Text>
          <Text style={styles.ltr}>{quotation.validUntil || "-"}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text>العملة:</Text>
          <Text style={styles.ltr}>{quotationCurrency}</Text>
        </View>
        {showExchangeRate && (
          <View style={styles.infoRow}>
            <Text>سعر الصرف:</Text>
            <Text style={styles.ltr}>
              {formatExchangeRate(quotation.exchangeRate)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.table}>
        <View style={[styles.row, styles.rowHeader]}>
          <Text style={styles.cellHeader}>المنتج</Text>
          <Text style={styles.cellHeader}>السعر × الكمية</Text>
          <Text style={styles.cellHeader}>الإجمالي</Text>
        </View>

        {products.map((product, index) => (
          <View key={`${product.id}-${index}`} style={styles.row}>
            <Text style={styles.cell}>{product.name}</Text>
            <View style={styles.cellRow}>
              <Text style={styles.ltr}>{formatAmount(product.sellPrice)}</Text>
              <Text> × </Text>
              <Text style={styles.ltr}>{formatAmount(product.qty)}</Text>
            </View>
            <Text style={styles.cell}>
              {formatAmount(toNumber(product.qty) * toNumber(product.sellPrice))}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.totalContainer}>
        <Text style={styles.totalLabel}>المجموع قبل الحسم:</Text>
        <Text style={styles.totalAmount}>{formatAmount(subtotal)}</Text>
      </View>

      {discount > 0 && (
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>الحسم:</Text>
          <Text style={styles.totalAmount}>
            {formatAmount(discount)}
            {discountDetails ? ` (${discountDetails})` : ""}
          </Text>
        </View>
      )}

      <View style={[styles.totalContainer, styles.finalTotal]}>
        <Text style={styles.totalLabel}>المجموع النهائي:</Text>
        <Text style={styles.totalAmount}>{formatAmount(totalPrice)}</Text>
      </View>

      {quotation.note && (
        <View style={styles.noteBox}>
          <Text style={styles.noteTitle}>ملاحظات:</Text>
          <Text>{quotation.note}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    fontFamily: "Amiri",
    fontSize: 12,
    padding: 20,
    backgroundColor: "#fff",
    direction: "rtl",
  },
  brand: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    textAlign: "center",
    marginBottom: 4,
  },
  notice: {
    textAlign: "center",
    color: "#555",
    marginBottom: 18,
  },
  section: {
    marginBottom: 15,
    textAlign: "right",
  },
  infoRow: {
    flexDirection: "row-reverse",
    justifyContent: "flex-start",
    gap: 4,
    marginBottom: 4,
  },
  table: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 15,
  },
  row: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  rowHeader: {
    backgroundColor: "#f5f5f5",
    borderBottomWidth: 2,
    borderColor: "#ccc",
  },
  cell: {
    fontSize: 12,
    width: "33%",
    textAlign: "right",
  },
  cellHeader: {
    fontSize: 13,
    fontWeight: "bold",
    width: "33%",
    textAlign: "right",
  },
  cellRow: {
    flexDirection: "row-reverse",
    width: "33%",
    justifyContent: "flex-start",
  },
  totalContainer: {
    flexDirection: "row-reverse",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  finalTotal: {
    borderTopWidth: 2,
    borderColor: "#ccc",
    paddingTop: 6,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "bold",
    marginRight: 8,
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: "bold",
  },
  noteBox: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 8,
  },
  noteTitle: {
    fontWeight: "bold",
    marginBottom: 4,
  },
  ltr: {
    direction: "ltr",
  },
});
