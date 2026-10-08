import apiClient from "@/lib/axios";
import axios from "axios";

export interface AiReportSection {
  title?: string;
  content?: string;
  items?: string[];
  order?: number;
}

export interface AiReportEntry {
  title?: string;
  summary?: string;
  rawText?: string;
  sections?: AiReportSection[];
  createdAt?: string;
  updatedAt?: string;
  entryId?: string | null;
}

export interface AiReportResponse {
  data?: AiReportEntry | null;
  entryId?: string | null;
  updatedAt?: string;
}

interface AiReportEnvelope {
  data?: AiReportEntry | null;
  entryId?: string | null;
  updatedAt?: string;
}

type AiReportApiResponse = AiReportEntry | AiReportEnvelope | null | undefined;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const normalizeAiReport = (
  payload: AiReportApiResponse,
): AiReportEntry | null => {
  if (!isObject(payload)) return null;

  const envelope = payload as AiReportEnvelope;
  const nestedReport = isObject(envelope.data) ? envelope.data : null;
  const report = nestedReport || (payload as AiReportEntry);

  return {
    ...report,
    entryId: typeof report.entryId === "string" ? report.entryId : typeof envelope.entryId === "string" ? envelope.entryId : null,
    updatedAt: typeof report.updatedAt === "string" ? report.updatedAt : typeof envelope.updatedAt === "string" ? envelope.updatedAt : undefined,
  };
};

export default async function getAiReport(): Promise<AiReportResponse> {
  try {
    const res = await apiClient.get<AiReportApiResponse>("/api/ai/latest");
    console.log("Response from AI report API:", res.data);
    const report = normalizeAiReport(res.data);

    return {
      data: report,
      entryId: report?.entryId ?? null,
      updatedAt: report?.updatedAt,
    };
  } catch (err) {
    console.error("خطأ في جلب التقرير:", err);
    throw new Error("خطأ أثناء جلب التقرير");
  }
}

export async function refreshAiReport(): Promise<AiReportResponse> {
  try {
    // إرسال الطلب إلى webhook الـ n8n
const n8nWebhookUrl = "https://andrehdaher.app.n8n.cloud/webhook-test/refresh-ai";
    const res = await axios.post<AiReportApiResponse>(n8nWebhookUrl);
    console.log("Response from AI report refresh via N8N webhook:", res.data);
    const report = normalizeAiReport(res.data);

    return {
      data: report,
      entryId: report?.entryId ?? null,
      updatedAt: report?.updatedAt,
    };
  } catch (err) {
    console.error("خطأ في تحديث التقرير عبر N8N:", err);
    throw new Error("خطأ أثناء تحديث التقرير");
  }
}
