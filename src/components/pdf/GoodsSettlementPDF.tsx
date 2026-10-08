import { StyleSheet, Text, View } from "@react-pdf/renderer";
import { goodsPaymentLabel } from "@/lib/goodsSettlements";
import { formatMoney } from "@/lib/money";
import type { Payment } from "@/services/payments";

const styles = StyleSheet.create({
  title: { textAlign: "right", fontSize: 20, marginBottom: 12 },
  line: { textAlign: "right", fontSize: 11, marginBottom: 5 },
  table: { marginTop: 12, marginBottom: 12 },
  row: {
    flexDirection: "row",
    borderBottom: "1 solid #ddd",
    paddingVertical: 8,
  },
  cell: { width: "20%", fontSize: 10, textAlign: "right", padding: 3 },
  name: { width: "40%", fontSize: 10, textAlign: "right", padding: 3 },
});

export default function GoodsSettlementPDF({
  payment,
  partyName,
}: {
  payment: Payment;
  partyName: string;
}) {
  const currency = payment.paymentCurrency || payment.currency;
  return (
    <View>
      <Text style={styles.title}>{goodsPaymentLabel(payment)}</Text>
      <Text style={styles.line}>الطرف: {partyName}</Text>
      <Text style={styles.line}>رقم السند: {payment.id}</Text>
      <Text style={styles.line}>
        التاريخ: {payment.date} · المستودع: {payment.warehouse}
      </Text>
      {(payment.sellId || payment.purchaseId) && (
        <Text style={styles.line}>
          الفاتورة: {payment.sellId || payment.purchaseId}
        </Text>
      )}
      {payment.reversalOf && (
        <Text style={styles.line}>عكس السند: {payment.reversalOf}</Text>
      )}
      {payment.reversedBy && (
        <Text style={styles.line}>ملغى بالسند: {payment.reversedBy}</Text>
      )}
      <View style={styles.table}>
        <View style={styles.row}>
          <Text style={styles.cell}>الإجمالي</Text>
          <Text style={styles.cell}>السعر المتفق عليه</Text>
          <Text style={styles.cell}>الكمية</Text>
          <Text style={styles.name}>الصنف</Text>
        </View>
        {(payment.goodsItems || []).map((item) => (
          <View key={item.productId} style={styles.row}>
            <Text style={styles.cell}>
              {formatMoney(item.lineTotalOriginal, currency)}
            </Text>
            <Text style={styles.cell}>
              {formatMoney(item.settlementPrice, currency)}
            </Text>
            <Text style={styles.cell}>
              {item.quantity} {item.unit || ""}
            </Text>
            <Text style={styles.name}>
              {item.name} · {item.code}
            </Text>
          </View>
        ))}
      </View>
      <Text style={styles.line}>
        قيمة التسوية:{" "}
        {formatMoney(
          Math.abs(payment.amountOriginal ?? payment.amount_base),
          currency,
        )}
      </Text>
      <Text style={styles.line}>
        القيمة بالدولار:{" "}
        {formatMoney(Math.abs(payment.amountUSD ?? payment.amount), "USD")}
      </Text>
      {currency === "SYP" && (
        <Text style={styles.line}>
          سعر الصرف: {payment.exchangeRate} SYP / USD
        </Text>
      )}
      <Text style={styles.line}>
        أثر الرصيد:{" "}
        {formatMoney(
          payment.balanceUSDChange ?? payment.amountUSD ?? payment.amount,
          "USD",
        )}
      </Text>
      <Text style={styles.line}>الملاحظات: {payment.note || "-"}</Text>
      <Text style={styles.line}>المنفذ: {payment.actorName || "-"}</Text>
    </View>
  );
}
