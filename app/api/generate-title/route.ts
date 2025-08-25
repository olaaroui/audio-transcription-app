import { type NextRequest, NextResponse } from "next/server"

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

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 50,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error("[v0] Groq API error:", response.status, errorData)
      throw new Error(`Groq API error: ${response.status} - ${errorData}`)
    }

    const data = await response.json()
    const title = data.choices[0]?.message?.content?.trim()

    if (!title) {
      throw new Error("No title generated")
    }

    console.log("[v0] Generated title:", title)

    return NextResponse.json({ title })
  } catch (error) {
    console.error("[v0] Title generation error:", error)
    return NextResponse.json({ error: "Failed to generate title" }, { status: 500 })
  }
}
