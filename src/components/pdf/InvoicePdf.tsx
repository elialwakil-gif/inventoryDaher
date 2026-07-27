import { Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatExchangeRate, shouldShowExchangeRate } from "@/lib/money";

export default function InvoicePdf({ sell }: { sell: any }) {
  const toNumber = (value: unknown, fallback = 0) => {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : fallback;
  };
  const productsSubtotal = Array.isArray(sell?.products)
    ? sell.products.reduce(
        (sum: number, product: any) =>
          sum + toNumber(product?.qty) * toNumber(product?.sellPrice),
        0,
      )
    : 0;
  const productsTotal = toNumber(sell?.subtotalUSD, productsSubtotal) || productsSubtotal;
  const savedDiscount = toNumber(sell?.discountUSD ?? sell?.discount);
  const inferredDiscount = Math.max(
    productsTotal - toNumber(sell?.totalPrice),
    0,
  );
  const discount = savedDiscount > 0 ? savedDiscount : inferredDiscount;
  const discountPercent = toNumber(sell?.discountPercent);
  const discountAmountUSD = toNumber(sell?.discountAmountUSD);
  const discountDetails = [
    discountPercent > 0 ? `${discountPercent.toFixed(2)}%` : "",
    discountAmountUSD > 0 ? `${discountAmountUSD.toFixed(2)}` : "",
  ]
    .filter(Boolean)
    .join(" + ");
  const totalPrice = toNumber(sell?.totalPrice);
  const invoiceCurrency = sell?.paymentCurrency || sell?.currency || "USD";
  const showExchangeRate = shouldShowExchangeRate({ currency: invoiceCurrency });

  return (
    <View style={styles.container}>
      {/* Header */}
      <Text style={styles.header}>Daher-Net</Text>
      <Text style={styles.title}>فاتورة بيع</Text>

      {/* Customer Info */}
      <View style={styles.section}>
        <View style={styles.infoRow}>
          <Text>:اسم الزبون</Text>
          <Text>{sell.customerName}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text>:التاريخ</Text>
          <Text style={styles.ltr}>{sell.date}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text>:العملة</Text>
          <Text style={styles.ltr}>{invoiceCurrency}</Text>
        </View>

        {showExchangeRate && (
          <View style={styles.infoRow}>
            <Text>:سعر الصرف</Text>
            <Text style={styles.ltr}>
              {formatExchangeRate(sell?.exchangeRate)}
            </Text>
          </View>
        )}

        <View style={styles.infoRow}>
          <Text>:رقم الفاتورة</Text>
          <Text style={styles.ltr}>{sell.id}</Text>
        </View>
      </View>

      {/* Products Table */}
      <View style={styles.table}>
        {/* Table Header */}
        <View style={[styles.row, styles.rowHeader]}>
          <Text style={styles.cellHeader}>المنتج</Text>
          <Text style={styles.cellHeader}>السعر × الكمية</Text>
          <Text style={styles.cellHeader}>الإجمالي</Text>
        </View>

        {/* Table Rows */}
        {sell.products.map((p: any, i: number) => (
          <View key={i} style={styles.row}>
            <Text style={styles.cell}>{p.name}</Text>

            <View style={styles.cellRow}>
              <Text style={styles.ltr}>
                {p?.sellPrice?.toFixed(2) || "0.00"}
              </Text>
              <Text> × </Text>
              <Text style={styles.ltr}>{p.qty}</Text>
            </View>

            <Text style={styles.cell}>
              {(p.qty * p?.sellPrice)?.toFixed(2) || "0.00"}
            </Text>
          </View>
        ))}
      </View>

      {/* Discount */}
      {discount > 0 && (
        <>
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>المجموع قبل الحسم:</Text>
            <Text style={styles.totalAmount}>{productsTotal.toFixed(2)}</Text>
          </View>

          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>الحسم:</Text>
            <Text style={styles.totalAmount}>
              {discount.toFixed(2)}
              {discountDetails ? ` (${discountDetails})` : ""}
            </Text>
          </View>
        </>
      )}

      {/* Total */}
      <View style={styles.totalContainer}>
        <Text style={styles.totalLabel}>المجموع:</Text>
        <Text style={styles.totalAmount}>{totalPrice.toFixed(2)}</Text>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>شكراً لتعاملكم معنا</Text>
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

  header: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    textAlign: "center",
    marginBottom: 20,
    color: "#333",
  },
  section: {
    marginBottom: 15,
    textAlign: "right",
  },
  infoText: {
    fontSize: 12,
    marginBottom: 2,
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
  totalContainer: {
    flexDirection: "row-reverse",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 4,
    marginTop: 10,
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
    color: "#000",
  },
  footer: {
    textAlign: "center",
    fontSize: 13,
    color: "#555",
    marginTop: 20,
  },
  infoRow: {
    flexDirection: "row-reverse",
    justifyContent: "flex-start",
    gap: 4,
    marginBottom: 4,
  },

  ltr: {
    direction: "ltr",
  },

  cellRow: {
    flexDirection: "row-reverse",
    width: "33%",
    justifyContent: "flex-start",
  },
});
