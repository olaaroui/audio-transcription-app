import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 })
    }

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
            content: `
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
              3. If it's a project idea, generate 2-4 unique, specific constraint questions based on the actual content. 
                 DO NOT use generic questions. Focus on the specific challenges this particular idea would face.
                 Consider aspects like: target market validation, technical implementation challenges, 
                 competitive differentiation, scalability concerns, user adoption barriers, or resource requirements.

              Make each constraint question specific to the content discussed, not generic business advice.
              Return ONLY valid JSON, no markdown or other formatting.
            `,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error("Groq API error:", response.status, errorData)
      return NextResponse.json({ error: "Failed to analyze text" }, { status: 500 })
    }

    const data = await response.json()
    const analysisText = data.choices[0].message.content

    try {
      const parsedResult = JSON.parse(analysisText)
      return NextResponse.json(parsedResult)
    } catch (parseError) {
      console.error("JSON parsing error:", parseError)
      console.error("Raw response:", analysisText)
      return NextResponse.json({ error: "Failed to parse analysis response" }, { status: 500 })
    }
  } catch (error) {
    console.error("Analysis error:", error)
    return NextResponse.json({ error: "Failed to analyze text" }, { status: 500 })
  }
}
