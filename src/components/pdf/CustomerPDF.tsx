import { Text, View, StyleSheet } from "@react-pdf/renderer";

export interface Operations {
  details: string;
  date: string;
  toTheCustoemr: number;
  fromCustomer: number;
}

interface CustomerPDFProp {
  customerName: string;
  balance: number;
  operations: Operations[];
}

export default function CustomerPDF({
  customerName,
  balance,
  operations,
}: CustomerPDFProp) {
  return (
    <View style={styles.container}>
      {/* Header */}
      <Text style={styles.header}>Daher-Net</Text>
      <Text style={styles.title}>بيان حساب الزبون</Text>

      {/* Customer Info */}
      <View style={styles.section}>
        <View style={styles.infoRow}>
          <Text>:اسم الزبون</Text>
          <Text>{customerName}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text>:رصيد الحساب (USD)</Text>
          <Text style={styles.ltr}>{balance}</Text>
        </View>
      </View>

      {/* Operations Table */}
      <View style={styles.table}>
        {/* Table Header */}
        <View style={[styles.row, styles.rowHeader]}>
          <Text style={styles.cellDetails}>تفاصيل</Text>
          <Text style={styles.cellDate}>تاريخ الدفعة</Text>
          <Text style={styles.cellFromCustomer}>دفعات من الزبون</Text>
          <Text style={styles.cellToCustomer}>فواتير ودفعات للزبون</Text>
        </View>

        {/* Table Rows */}
        {operations.map((p, i) => (
          <View key={i} style={styles.row}>
            <Text style={styles.cellDetails}>{p?.details}</Text>
            <Text style={styles.cellDate}>{p?.date}</Text>
            <Text style={styles.cellFromCustomer}>{p?.fromCustomer}</Text>
            <Text style={styles.cellToCustomer}>{p?.toTheCustoemr}</Text>
          </View>
        ))}
      </View>

      {/* Discount */}
      {0 > 0 && (
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>الحسم:</Text>
          <Text style={styles.totalAmount}>{"0.00"}</Text>
        </View>
      )}

      {/* Total */}
      {/* <View style={styles.totalContainer}>
        <Text style={styles.totalLabel}>المجموع:</Text>
        <Text style={styles.totalAmount}>{"0.00"}</Text>
      </View> */}

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
    textAlign: "center",
  },

  // أعمدة الجدول
  cellDetails: {
    flex: 3,
    textAlign: "right",
    paddingHorizontal: 4,
    flexWrap: "wrap",
  },
  cellDate: {
    flex: 2,
    textAlign: "center",
    paddingHorizontal: 4,
    flexWrap: "wrap",
  },
  cellFromCustomer: {
    flex: 2,
    textAlign: "center",
    paddingHorizontal: 4,
    flexWrap: "wrap",
  },
  cellToCustomer: {
    flex: 2,
    textAlign: "center",
    paddingHorizontal: 4,
    flexWrap: "wrap",
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
});
