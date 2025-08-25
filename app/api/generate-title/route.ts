import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Starting title generation")

    if (!process.env.GROQ_API_KEY) {
      console.log("[v0] Missing GROQ_API_KEY environment variable")
      return NextResponse.json({ error: "API configuration error" }, { status: 500 })
    }

    const { transcription, keyPoints } = await request.json()

    if (!transcription) {
      return NextResponse.json({ error: "Transcription is required" }, { status: 400 })
    }

    console.log("[v0] Generating title for transcription")

    const prompt = `Based on the following transcription and key points, generate a concise, descriptive title (maximum 8 words) that captures the main topic or idea:

Transcription: "${transcription}"

Key Points: ${keyPoints?.map((point: any, index: number) => `${index + 1}. ${point.title}`).join("\n") || "None provided"}

Generate only the title, nothing else. Make it clear and professional.`

    const { text: title } = await generateText({
      model: groq("llama-3.1-8b-instant"),
      prompt,
      maxTokens: 50,
    })

    console.log("[v0] Generated title:", title)

    return NextResponse.json({ title: title.trim() })
  } catch (error) {
    console.error("[v0] Title generation error:", error)
    return NextResponse.json({ error: "Failed to generate title" }, { status: 500 })
  }
}
