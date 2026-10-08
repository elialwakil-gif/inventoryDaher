import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  Legend,
  LabelList,
  AreaChart,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ChartData {
  name: string;
  [key: string]: string | number;
}

interface ChartContainerProps {
  title: string;
  data: ChartData[];
  type: "line" | "bar" | "pie" | "stackBar" | "area";
  dataKey?: string;
  className?: string;
  desc? : string
  dataKey2?: string
  dataName?: string
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--secondary))",
];

export function ChartContainer({
  title,
  data,
  type,
  dataKey = "revenue",
  className,
  desc,
  dataKey2,
  dataName,
}: ChartContainerProps) {
  const renderChart = () => {
    switch (type) {
      case "line":
        return (
          <div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis
                  dataKey="id"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />

                {/* المحور الأيسر للـ total */}
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />

                {/* المحور الأيمن للـ count */}
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />

                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                />

                {/* الخط الأول - total */}
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey={dataKey}
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: "hsl(var(--primary))" }}
                  fill="hsl(var(--primary))"
                  fillOpacity={0.5}
                  />

                {/* الخط الثاني - count */}
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey={dataKey2}
                  stroke="hsl(var(--accent))"
                  fill="hsl(var(--accent))"
                  fillOpacity={0.5}
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--accent))", strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
                
           {/* هنا تضيف النص أسفل الرسم */}
            <p className="text-foreground/80" style={{ marginTop: "5px", fontWeight: "bold", fontSize: "22px" }}>
              {Number(desc).toLocaleString("En-SY", {
                style: "currency",
                currency: "SYP",
                minimumFractionDigits: 0,
              })}
            </p>
          </div>
        );

      case "bar":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 14 }}
                tickLine={false}
                axisLine={true}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={true}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                }}
              />
              <Bar
                dataKey={dataKey}
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
              {dataKey2 && <Bar
                dataKey={dataKey2}
                fill="hsl(var(--accent))"
                radius={[4, 4, 0, 0]}
              />}
            </BarChart>
          </ResponsiveContainer>
        );

      case "pie":
        const pieData = data.map((item, index) => ({
          name: item.name,
          value: item[dataKey as keyof ChartData] as number,
          fill: COLORS[index % COLORS.length],
        }));

        return (
          <div style={{ width: "100%", textAlign: "center" }}>
            <ResponsiveContainer width="100%" height={340}>
              <PieChart>
                <Pie
                  label
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius="72%"
                  innerRadius="35%"
                  cornerRadius={8}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>

                <Tooltip />
              </PieChart>
            </ResponsiveContainer>

            {/* هنا تضيف النص أسفل الرسم */}
            <p
              className="text-foreground/80"
              style={{ marginTop: "5px", fontWeight: "bold", fontSize: "18px" }}
            >
              {desc}
            </p>
          </div>
        );
      
        case 'stackBar': {

          function transformData(rawData: any) {
            const result = [];
          
            for (const [date, usersData] of Object.entries(rawData)) {
              const dayEntry: Record<string, any> = { date };
            
              for (const [user, entries] of Object.entries(usersData)) {
                if (user === "mahal") continue; // تجاهل mahal
              
                const totalAmount = Object.values(entries).reduce((sum, entry: any) => {
                  const hasAndre = entry.details?.some((d: any) =>
                    Object.values(d).some((val: any) =>
                      typeof val === "string" && val.includes("اندريه")
                    )
                  );
                  return hasAndre ? sum : sum + (entry.amount || 0);
                }, 0);
              
                dayEntry[user] = totalAmount;
              }
            
              result.push(dayEntry);
            }
          
            return result;
          }
        
          const stackData = transformData(data);
          const users = Array.from(
            new Set(stackData.flatMap(day => Object.keys(day)).filter(k => k !== 'date'))
          );
        
          function getColor(user: string) {
            const colors: Record<string, string> = {
              mahal: "hsl(var(--primary))",
              razan: "hsl(var(--primary)/0.5)",
              maher: "hsl(var(--secondary)/0.8)",
              Basel: "hsl(var(--secondary)/0.4)",
              elidaher: "hsl(var(--accent))",
              sara: "hsl(var(--accent)/0.8)",
              nader: "hsl(var(--neutral-400))",
              fadi: "hsl(var(--neutral-500))",
            };
            return colors[user] || "hsl(var(--foreground)/0.8)";
          }
        
          const CustomTooltip = ({ active, payload, label }: any) => {
            if (active && payload && payload.length) {
              const total = payload.reduce((sum: number, item: any) => sum + (item.value || 0), 0);
              return (
                <div style={{
                  background: "white",
                  border: "1px solid #ccc",
                  padding: "10px",
                  borderRadius: "6px"
                }}>
                  <p><strong>{label}</strong></p>
                  {payload.map((entry: any, i: number) => (
                    <p key={i} style={{ color: entry.color }}>
                      {entry.name}: {Number(entry.value).toLocaleString("en-SY")}
                    </p>
                  ))}
                  <hr />
                  <p><strong>المجموع:</strong> {Number(total).toLocaleString("en-SY")}</p>
                </div>
              );
            }
          
            
            return null;
          };
          const monthlyTotal = stackData.reduce((total, day) => {
            // مجموع عمليات اليوم (نجمع قيم كل المستخدمين في ذلك اليوم)
            const dayTotal = users.reduce((sum, user) => sum + (day[user] || 0), 0);
            return total + dayTotal;
          }, 0);
        
          // حساب المتوسط الشهري (المجموع ÷ عدد الأيام)
          const averageMonthly = stackData.length ? monthlyTotal / stackData.length : 0;
        
          return (
            <div>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={stackData}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {users.map(user => (
                  <Bar key={user} dataKey={user} stackId="a" fill={getColor(user)}>
                    <LabelList dataKey={user} content={() => (
                      <text
                        x={0}
                        y={0}
                        dy={-10}
                        fill="#000"
                        fontSize={12}
                        textAnchor="middle"
                      >
                        {user[0]?.toUpperCase()}
                      </text>
                    )} />
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
              <div style={{ textAlign: "center", marginTop: "10px", fontWeight: "bold", fontSize: 18 }}>
                <p>المجموع الشهري: {monthlyTotal.toLocaleString("en-SY")}</p>
                <p>المتوسط اليومي: {Number(averageMonthly.toFixed(0)).toLocaleString("en-SY")}</p>
              </div>
            </div>
          );
        }

        case "area":
          return (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPrimary" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorAccent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey={dataName ? dataName : "name"}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey={dataKey}
                  stroke="hsl(var(--primary))"
                  fillOpacity={1}
                  fill="url(#colorPrimary)"
                  name={dataKey}
                />
                {dataKey2 && (
                  <Area
                    type="monotone"
                    dataKey={dataKey2}
                    stroke="hsl(var(--accent))"
                    fillOpacity={1}
                    fill="url(#colorAccent)"
                    name={dataKey2}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          );


      default:
        return null;
    }
  };

  return (
    <Card className={`chart-container min-w-0 overflow-hidden ${className || ""}`}>
      <CardHeader>
        <CardTitle className="break-words text-lg sm:text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>{renderChart()}</CardContent>
    </Card>
  );
}
