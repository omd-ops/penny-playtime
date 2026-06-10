import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const systemInstruction = `You are the SpendWise (Penny Pay) AI Intent Agent.
Your job is to understand natural language user requests and extract their intents, actions, and relevant parameters into structured JSON.

We support the following intents:
1. "add_expense" - The user spent money on something (cash-out).
2. "add_income" - The user received or deposited money (cash-in).
3. "toggle_daily_habits" - The user mentions completing their daily habits/checklist (e.g. "I did my habits", "Mark habits done").
4. "add_day_goal" - The user wants to set a specific task/goal for a specific day (e.g., "Set goal buy milk for tomorrow").
5. "add_habit_plan" - The user wants to add a new daily habit line item (e.g., "Add gym to daily habits").
6. "add_important_note" - The user wants to note something down (e.g., "Rent due on the 1st").
7. "add_reminder_time" - The user wants to configure a reminder alert time (e.g., "Set reminder for 8 PM").
8. "set_budget_target" - The user wants to set a spending cap/budget (e.g., "Set daily budget limit to 1000").
9. "unsupported" - If the input does not map to any of these features.

Supported Categories for Expenses/Income:
- "food" (Food & Drinks, restaurant, dinner, groceries, coffee, cafe, snacking)
- "transport" (Transport, uber, taxi, train, bus, metro, fuel, gas, parking)
- "shopping" (Shopping, clothing, shoes, amazon, electronics, furniture, books)
- "bills" (Bills & Utilities, rent, wifi, electricity, water, internet, phone bill, subscription)
- "entertainment" (Entertainment, movie, netflix, game, gig, concert, theater, party)
- "health" (Health, medicine, doctor, dentist, gym membership, clinic, pharmacy)
- "education" (Education, tuition, book, course, class, school fees)
- "other" (Other, general, cash withdrawal, everything else)

Rules for Date Extraction:
- Always output the date in YYYY-MM-DD format.
- Calculate relative dates relative to the context date provided in the user message (e.g., if today is June 10, 2026, then "yesterday" is "2026-06-09", "last Friday" is "2026-06-05", "tomorrow" is "2026-06-11").
- If no date is mentioned, default to the context date.

Rules for Times:
- Times should be in HH:mm 24-hour format (e.g., "8 PM" -> "20:00", "9:30 AM" -> "09:30").

Rules for Budget Target Period:
- Must be one of "daily", "monthly", "yearly".

Provide a short, clear, friendly explanation in the "explanation" field describing what was understood and will be executed (e.g., "Logging cash-out of $15.50 for lunch in Food & Drinks today").`;

const responseSchema: any = {
  type: "object",
  properties: {
    success: { type: "boolean" },
    intent: {
      type: "string",
      enum: [
        "add_expense",
        "add_income",
        "toggle_daily_habits",
        "add_day_goal",
        "add_habit_plan",
        "add_important_note",
        "add_reminder_time",
        "set_budget_target",
        "unsupported",
      ],
    },
    confidence: { type: "number" },
    data: {
      type: "object",
      properties: {
        amount: { type: "number" },
        type: { type: "string", enum: ["cash-in", "cash-out"] },
        categoryId: {
          type: "string",
          enum: [
            "food",
            "transport",
            "shopping",
            "bills",
            "entertainment",
            "health",
            "education",
            "other",
          ],
        },
        note: { type: "string" },
        date: { type: "string", description: "YYYY-MM-DD format" },
        text: { type: "string" },
        title: { type: "string" },
        time: { type: "string", description: "HH:mm format" },
        period: { type: "string", enum: ["daily", "monthly", "yearly"] },
      },
    },
    explanation: { type: "string" },
  },
  required: ["success", "intent", "confidence", "explanation"],
};

export async function POST(request: Request) {
  try {
    const { prompt, currentDate, currentDayOfWeek, aiApiKey, aiModelName } = await request.json();

    const apiKey = aiApiKey?.trim() || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key is not configured" }, { status: 500 });
    }

    const modelName = aiModelName?.trim() || process.env.GEMINI_MODEL_NAME || "gemini-2.5-flash";

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Prompt is required and must be a string" },
        { status: 400 },
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: systemInstruction,
    });

    const userContext = `Context: Today is ${currentDate} (${currentDayOfWeek}).
User Input: "${prompt}"`;

    let result;
    let attempts = 3;
    let delay = 1000;

    for (let i = 0; i < attempts; i++) {
      try {
        result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: userContext }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
            temperature: 0.1,
          },
        });
        break;
      } catch (error: any) {
        const isTransient =
          error.status === 503 ||
          error.status === 429 ||
          error.message?.includes("503") ||
          error.message?.includes("Service Unavailable") ||
          error.message?.includes("429") ||
          error.message?.includes("Too Many Requests");

        if (isTransient && i < attempts - 1) {
          console.warn(
            `Transient error on attempt ${i + 1}. Retrying in ${delay}ms...`,
            error.message,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
        } else {
          throw error;
        }
      }
    }

    if (!result) {
      throw new Error("Failed to generate content: empty response");
    }

    const responseText = result.response.text();
    const parsedData = JSON.parse(responseText);

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error("Error in POST /api/agent:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process request with AI agent" },
      { status: 500 },
    );
  }
}
