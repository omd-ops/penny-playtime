import { NextResponse } from "next/server";

const FETCH_TIMEOUT_MS = 15_000;

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function GET() {
  const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
  if (!scriptUrl) {
    return NextResponse.json({ error: "Google Script URL not configured" }, { status: 500 });
  }

  try {
    const res = await fetchWithTimeout(
      scriptUrl,
      { method: "GET", cache: "no-store" },
      FETCH_TIMEOUT_MS,
    );

    if (!res.ok) {
      throw new Error(`Google Apps Script returned status: ${res.status}`);
    }

    const data = await res.json();
    if (data && data.error) {
      throw new Error(data.error);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    if (error.name === "AbortError") {
      console.error("GET /api/sync timed out");
      return NextResponse.json({ error: "Google Sheets sync timed out" }, { status: 504 });
    }
    console.error("Error in GET /api/sync:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch data from Google Sheets" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
  if (!scriptUrl) {
    return NextResponse.json({ error: "Google Script URL not configured" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const res = await fetchWithTimeout(
      scriptUrl,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      FETCH_TIMEOUT_MS,
    );

    if (!res.ok) {
      throw new Error(`Google Apps Script returned status: ${res.status}`);
    }

    const data = await res.json();
    if (data && data.error) {
      throw new Error(data.error);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    if (error.name === "AbortError") {
      console.error("POST /api/sync timed out");
      return NextResponse.json({ error: "Google Sheets sync timed out" }, { status: 504 });
    }
    console.error("Error in POST /api/sync:", error);
    return NextResponse.json(
      { error: error.message || "Failed to sync data to Google Sheets" },
      { status: 500 },
    );
  }
}
