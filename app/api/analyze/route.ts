import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 })
    }

    // Get user's country from headers (approximate)
    const country = request.headers.get("cf-ipcountry") || request.headers.get("x-vercel-ip-country") || "your country"

    const result = await generateText({
      model: groq("llama-3.1-8b-instant"),
      prompt: `
        Analyze the following transcribed text and extract key insights. Return your response as valid JSON only, no other text:

        "${text}"

        Please return a JSON object with this exact structure:
        {
          "keyPoints": [
            {
              "title": "A concise title for the key point",
              "description": "A brief description explaining the key point"
            }
          ],
          "projectAnalysis": "Analysis if this appears to be a project idea (optional)",
          "constraintQuestions": ["Important constraint questions if this is a project idea (optional)"]
        }

        Requirements:
        1. Extract 3-7 main key points with clear titles and descriptions
        2. If this appears to be a project idea, provide a brief analysis
        3. If it's a project idea, generate 2-4 important constraint questions the person should consider, particularly relevant to ${country}

        Focus on practical, actionable insights. For constraint questions, consider:
        - Legal and regulatory aspects in ${country}
        - Market competition
        - Technical feasibility
        - Financial requirements
        - Timeline constraints
        - Resource availability

        Return ONLY valid JSON, no markdown or other formatting.
      `,
    })

    try {
      const parsedResult = JSON.parse(result.text)
      return NextResponse.json(parsedResult)
    } catch (parseError) {
      console.error("JSON parsing error:", parseError)
      console.error("Raw response:", result.text)
      return NextResponse.json({ error: "Failed to parse analysis response" }, { status: 500 })
    }
  } catch (error) {
    console.error("Analysis error:", error)
    return NextResponse.json({ error: "Failed to analyze text" }, { status: 500 })
  }
}
