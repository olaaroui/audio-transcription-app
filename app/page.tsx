"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Mic, Square, Upload, Loader2, Play, Pause, Save, BookOpen, Trash2, Edit3, ArrowLeft } from "lucide-react"

interface KeyPoint {
  title: string
  description: string
}

interface Analysis {
  keyPoints: KeyPoint[]
  projectAnalysis?: string
  constraintQuestions?: string[]
}

interface SavedNote {
  id: string
  title: string
  transcription: string
  analysis: Analysis
  createdAt: string
}

export default function AudioNotesApp() {
  const [currentView, setCurrentView] = useState<"record" | "notes">("record")
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [transcription, setTranscription] = useState("")
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [savedNotes, setSavedNotes] = useState<SavedNote[]>([])
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false)
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const chunksRef = useRef<Blob[]>([])

  useEffect(() => {
    const saved = localStorage.getItem("audioNotes")
    if (saved) {
      setSavedNotes(JSON.parse(saved))
    }
  }, [])

  useEffect(() => {
    localStorage.setItem("audioNotes", JSON.stringify(savedNotes))
  }, [savedNotes])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" })
        setAudioBlob(blob)
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error("Error starting recording:", error)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const processAudio = async () => {
    if (!audioBlob) return

    setIsProcessing(true)
    try {
      console.log("[v0] Starting audio processing")
      console.log("[v0] Audio blob details:", {
        size: audioBlob.size,
        type: audioBlob.type,
      })

      const formData = new FormData()
      formData.append("audio", audioBlob, "recording.webm")

      console.log("[v0] Sending transcription request")
      const transcribeResponse = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      })

      console.log("[v0] Transcription response status:", transcribeResponse.status)

      if (!transcribeResponse.ok) {
        const errorText = await transcribeResponse.text()
        console.log("[v0] Transcription error response:", errorText)
        throw new Error(`Transcription failed: ${transcribeResponse.status} - ${errorText}`)
      }

      const transcribeResult = await transcribeResponse.json()
      console.log("[v0] Transcription result:", transcribeResult)

      const { transcription: text } = transcribeResult
      setTranscription(text)

      console.log("[v0] Starting analysis")
      const analyzeResponse = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })

      if (!analyzeResponse.ok) {
        const errorText = await analyzeResponse.text()
        console.log("[v0] Analysis error response:", errorText)
        throw new Error(`Analysis failed: ${analyzeResponse.status}`)
      }

      const analysisResult = await analyzeResponse.json()
      console.log("[v0] Analysis result:", analysisResult)
      setAnalysis(analysisResult)
    } catch (error) {
      console.error("[v0] Error processing audio:", error)
      alert(`Error processing audio: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const playAudio = () => {
    if (audioBlob && !isPlaying) {
      const audioUrl = URL.createObjectURL(audioBlob)
      audioRef.current = new Audio(audioUrl)
      audioRef.current.play()
      setIsPlaying(true)

      audioRef.current.onended = () => {
        setIsPlaying(false)
        URL.revokeObjectURL(audioUrl)
      }
    } else if (audioRef.current && isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith("audio/")) {
      setAudioBlob(file)
    }
  }

  const resetApp = () => {
    setAudioBlob(null)
    setTranscription("")
    setAnalysis(null)
    setIsPlaying(false)
    if (audioRef.current) {
      audioRef.current.pause()
    }
  }

  const saveNote = async () => {
    if (!transcription || !analysis) {
      alert("Please complete transcription and analysis first")
      return
    }

    setIsGeneratingTitle(true)
    try {
      console.log("[v0] Generating AI title")

      const titleResponse = await fetch("/api/generate-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcription,
          keyPoints: analysis.keyPoints,
        }),
      })

      if (!titleResponse.ok) {
        throw new Error("Failed to generate title")
      }

      const { title } = await titleResponse.json()
      console.log("[v0] Generated title:", title)

      const newNote: SavedNote = {
        id: Date.now().toString(),
        title: title,
        transcription,
        analysis,
        createdAt: new Date().toISOString(),
      }

      setSavedNotes((prev) => [newNote, ...prev])
      alert("Note saved successfully!")

      resetApp()
    } catch (error) {
      console.error("[v0] Error saving note:", error)
      alert("Failed to save note. Please try again.")
    } finally {
      setIsGeneratingTitle(false)
    }
  }

  const deleteNote = (id: string) => {
    if (confirm("Are you sure you want to delete this note?")) {
      setSavedNotes((prev) => prev.filter((note) => note.id !== id))
    }
  }

  const updateNoteTitle = (id: string, newTitle: string) => {
    setSavedNotes((prev) => prev.map((note) => (note.id === id ? { ...note, title: newTitle } : note)))
    setEditingNoteId(null)
  }

  if (currentView === "notes") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-accent/5 p-4">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-4xl font-black text-foreground tracking-tight">My Notes</h1>
              <p className="text-muted-foreground text-lg">Manage your saved audio insights</p>
            </div>
            <Button
              onClick={() => setCurrentView("record")}
              variant="outline"
              className="glass-effect hover:bg-accent/10 transition-all duration-200"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Recording
            </Button>
          </div>

          {savedNotes.length === 0 ? (
            <Card className="glass-effect border-0 shadow-2xl note-card-enter">
              <CardContent className="text-center py-16">
                <div className="w-20 h-20 bg-gradient-to-br from-accent/20 to-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <BookOpen className="h-10 w-10 text-accent" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-3">No notes yet</h3>
                <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
                  Start recording to create your first intelligent note with AI-powered insights
                </p>
                <Button
                  onClick={() => setCurrentView("record")}
                  className="bg-accent hover:bg-accent/90 text-accent-foreground px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Mic className="h-5 w-5 mr-3" />
                  Start Recording
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {savedNotes.map((note, index) => (
                <Card
                  key={note.id}
                  className={`glass-effect border-0 shadow-xl hover:shadow-2xl transition-all duration-300 note-card-enter ${
                    expandedNoteId === note.id ? "ring-2 ring-accent/20" : ""
                  }`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        {editingNoteId === note.id ? (
                          <Input
                            defaultValue={note.title}
                            onBlur={(e) => updateNoteTitle(note.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                updateNoteTitle(note.id, e.currentTarget.value)
                              }
                            }}
                            className="text-xl font-bold bg-transparent border-2 border-accent/30 focus:border-accent"
                            autoFocus
                          />
                        ) : (
                          <CardTitle
                            className="text-xl font-bold text-foreground cursor-pointer hover:text-accent transition-colors duration-200 leading-tight"
                            onClick={() => setEditingNoteId(note.id)}
                          >
                            {note.title}
                          </CardTitle>
                        )}

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-accent rounded-full"></div>
                            <span className="font-medium">
                              {new Date(note.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-muted-foreground/40 rounded-full"></div>
                            <span>
                              {new Date(note.createdAt).toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>

                        {expandedNoteId !== note.id && (
                          <div className="space-y-3">
                            <p className="text-muted-foreground leading-relaxed">
                              {note.transcription.length > 120
                                ? `${note.transcription.substring(0, 120)}...`
                                : note.transcription}
                            </p>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs font-medium">
                                {note.analysis.keyPoints.length} key points
                              </Badge>
                              {note.analysis.constraintQuestions && note.analysis.constraintQuestions.length > 0 && (
                                <Badge
                                  variant="outline"
                                  className="text-xs font-medium border-amber-200 text-amber-700"
                                >
                                  {note.analysis.constraintQuestions.length} considerations
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingNoteId(note.id)}
                          className="hover:bg-accent/10 hover:text-accent transition-all duration-200"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteNote(note.id)}
                          className="hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  {expandedNoteId === note.id ? (
                    <CardContent className="space-y-6 note-expand">
                      <div className="bg-muted/30 rounded-xl p-6 space-y-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-3 h-3 bg-accent rounded-full"></div>
                          <h4 className="font-bold text-foreground text-lg">Full Transcription</h4>
                        </div>
                        <p className="text-foreground leading-relaxed text-base">{note.transcription}</p>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-3 h-3 bg-chart-1 rounded-full"></div>
                          <h4 className="font-bold text-foreground text-lg">Key Insights</h4>
                        </div>
                        <div className="grid gap-4">
                          {note.analysis.keyPoints.map((point, index) => (
                            <div
                              key={index}
                              className="bg-card/50 rounded-xl p-5 border border-border/50 hover:border-accent/30 transition-colors duration-200"
                            >
                              <div className="flex items-start gap-4">
                                <div className="w-8 h-8 bg-gradient-to-br from-accent to-accent/80 rounded-full flex items-center justify-center text-accent-foreground font-bold text-sm flex-shrink-0">
                                  {index + 1}
                                </div>
                                <div className="space-y-2 flex-1">
                                  <h5 className="font-bold text-foreground text-base">{point.title}</h5>
                                  <p className="text-muted-foreground leading-relaxed">{point.description}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {note.analysis.projectAnalysis && (
                        <div className="bg-gradient-to-r from-chart-2/10 to-chart-2/5 rounded-xl p-6 border border-chart-2/20">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="w-3 h-3 bg-chart-2 rounded-full"></div>
                            <h4 className="font-bold text-foreground text-lg">Project Analysis</h4>
                          </div>
                          <p className="text-foreground leading-relaxed text-base">{note.analysis.projectAnalysis}</p>
                        </div>
                      )}

                      {note.analysis.constraintQuestions && note.analysis.constraintQuestions.length > 0 && (
                        <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10 rounded-xl p-6 border border-amber-200/50 dark:border-amber-700/30">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                            <h4 className="font-bold text-foreground text-lg">Critical Considerations</h4>
                          </div>
                          <div className="space-y-4">
                            {note.analysis.constraintQuestions.map((question, index) => (
                              <div key={index} className="flex items-start gap-4">
                                <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                  Q{index + 1}
                                </div>
                                <p className="text-foreground flex-1 leading-relaxed font-medium">{question}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="pt-4 border-t border-border/50">
                        <Button
                          variant="outline"
                          onClick={() => setExpandedNoteId(null)}
                          className="w-full glass-effect hover:bg-accent/10 transition-all duration-200 py-3 font-semibold"
                        >
                          Collapse Note
                        </Button>
                      </div>
                    </CardContent>
                  ) : (
                    <CardContent className="pt-0">
                      <Button
                        variant="outline"
                        onClick={() => setExpandedNoteId(note.id)}
                        className="w-full glass-effect hover:bg-accent/10 hover:border-accent/30 transition-all duration-200 py-3 font-semibold"
                      >
                        View Full Details
                      </Button>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <h1 className="text-3xl font-bold text-slate-900">Audio Notes</h1>
            <p className="text-slate-600">Record, transcribe, and analyze your ideas</p>
          </div>
          <Button onClick={() => setCurrentView("notes")} variant="outline">
            <BookOpen className="h-4 w-4 mr-2" />
            My Notes ({savedNotes.length})
          </Button>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-blue-600" />
              Record Audio
            </CardTitle>
            <CardDescription>Record your voice notes or upload an audio file</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              {!isRecording ? (
                <Button onClick={startRecording} className="flex-1 bg-blue-600 hover:bg-blue-700" size="lg">
                  <Mic className="h-4 w-4 mr-2" />
                  Start Recording
                </Button>
              ) : (
                <Button onClick={stopRecording} variant="destructive" className="flex-1" size="lg">
                  <Square className="h-4 w-4 mr-2" />
                  Stop Recording
                </Button>
              )}

              <div className="relative">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Button variant="outline" size="lg">
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {audioBlob && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <Button onClick={playAudio} variant="outline" size="sm">
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <span className="text-sm text-slate-600">Audio ready</span>
                <Button
                  onClick={processAudio}
                  disabled={isProcessing}
                  className="ml-auto bg-green-600 hover:bg-green-700"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Analyze Audio"
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {transcription && (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-slate-900">Transcription</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 leading-relaxed">{transcription}</p>
            </CardContent>
          </Card>
        )}

        {analysis && (
          <div className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-slate-900">Key Points</CardTitle>
                <CardDescription>Main ideas extracted from your audio</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {analysis.keyPoints.map((point, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-start gap-3">
                      <Badge variant="secondary" className="mt-1">
                        {index + 1}
                      </Badge>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900">{point.title}</h4>
                        <p className="text-slate-600 text-sm mt-1">{point.description}</p>
                      </div>
                    </div>
                    {index < analysis.keyPoints.length - 1 && <Separator />}
                  </div>
                ))}
              </CardContent>
            </Card>

            {analysis.projectAnalysis && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-slate-900">Project Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-700 leading-relaxed">{analysis.projectAnalysis}</p>
                </CardContent>
              </Card>
            )}

            {analysis.constraintQuestions && analysis.constraintQuestions.length > 0 && (
              <Card className="border-0 shadow-lg border-l-4 border-l-amber-500">
                <CardHeader>
                  <CardTitle className="text-slate-900">Important Considerations</CardTitle>
                  <CardDescription>Key questions to address for your project</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {analysis.constraintQuestions.map((question, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <Badge variant="outline" className="mt-1 border-amber-500 text-amber-700">
                        Q{index + 1}
                      </Badge>
                      <p className="text-slate-700 flex-1">{question}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {transcription && analysis && (
          <Card className="border-0 shadow-lg border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle className="text-slate-900 flex items-center gap-2">
                <Save className="h-5 w-5 text-green-600" />
                Save Note
              </CardTitle>
              <CardDescription>AI will automatically generate a title for your note</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Button
                  onClick={saveNote}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={isGeneratingTitle}
                >
                  {isGeneratingTitle ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating Title & Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Note with AI Title
                    </>
                  )}
                </Button>
                <Button onClick={resetApp} variant="outline">
                  Start New Recording
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {(transcription || analysis) && (
          <div className="text-center">
            <Button onClick={resetApp} variant="outline">
              Start New Recording
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
