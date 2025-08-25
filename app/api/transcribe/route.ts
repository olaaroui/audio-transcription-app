import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Starting transcription request")
    console.log("[v0] Environment check - API key exists:", !!process.env.GROQ_API_KEY)

    const formData = await request.formData()
    const audioFile = formData.get("audio") as File

    if (!audioFile) {
      console.log("[v0] No audio file provided")
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 })
    }

    console.log("[v0] Audio file received:", {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size,
    })

    if (audioFile.size > 25 * 1024 * 1024) {
      console.log("[v0] File too large:", audioFile.size)
      return NextResponse.json({ error: "Audio file too large. Maximum size is 25MB." }, { status: 400 })
    }

    console.log("[v0] Creating FormData for Groq API")
    const groqFormData = new FormData()
    groqFormData.append("file", audioFile)
    groqFormData.append("model", "whisper-large-v3-turbo")
    groqFormData.append("response_format", "text")
    groqFormData.append("language", "en")

    console.log("[v0] Making multipart API call to Groq")
    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: groqFormData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] Groq API error:", response.status, errorText)
      return NextResponse.json(
        {
          error: `Groq API error: ${response.status} - ${errorText}`,
        },
        { status: 500 },
      )
    }

    const transcriptionText = await response.text()
    console.log("[v0] Transcription successful:", transcriptionText.substring(0, 100))

    return NextResponse.json({ transcription: transcriptionText })
  } catch (error) {
    console.error("[v0] Transcription error:", error)

    if (error instanceof Error) {
      console.error("[v0] Error message:", error.message)
      console.error("[v0] Error stack:", error.stack)
      return NextResponse.json({ error: `Transcription failed: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ error: "Failed to transcribe audio. Please try again." }, { status: 500 })
  }
}
