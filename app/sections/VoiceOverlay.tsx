'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { RiMic2Fill, RiStopCircleLine, RiSendPlaneFill, RiRepeatLine, RiCloseLine, RiFileCopyLine, RiRefreshLine, RiErrorWarningLine, RiLoader4Line } from 'react-icons/ri'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { callAIAgent } from '@/lib/aiAgent'
import parseLLMJson from '@/lib/jsonParser'
import { copyToClipboard } from '@/lib/clipboard'

interface HistoryItem {
  id: string
  command: string
  intent: string
  title: string
  content: string
  commandType: string
  timestamp: Date
}

interface VoiceOverlayProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (item: HistoryItem) => void
  initialCommand?: string
}

type OverlayState = 'RECORDING' | 'PREVIEW' | 'PROCESSING' | 'RESULT' | 'ERROR'

function getCommandTypeStyle(commandType: string): { textColor: string; bgColor: string } {
  const ct = (commandType ?? '').toLowerCase()
  if (ct === 'generate') return { textColor: 'text-primary', bgColor: 'bg-primary/15' }
  if (ct === 'rephrase') return { textColor: 'text-accent', bgColor: 'bg-accent/15' }
  if (ct === 'research') return { textColor: 'text-[hsl(191,97%,70%)]', bgColor: 'bg-[hsl(191,97%,70%)]/15' }
  return { textColor: 'text-[hsl(326,100%,68%)]', bgColor: 'bg-[hsl(326,100%,68%)]/15' }
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-sm mt-3 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## ')) return <h3 key={i} className="font-semibold text-base mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# ')) return <h2 key={i} className="font-bold text-lg mt-4 mb-2">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 list-disc text-sm">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal text-sm">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm">{formatInline(line)}</p>
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part
  )
}

const AGENT_ID = '69a280bb96ed232cfb0c7c82'

export default function VoiceOverlay({ isOpen, onClose, onComplete, initialCommand }: VoiceOverlayProps) {
  const [state, setState] = useState<OverlayState>('RECORDING')
  const [transcript, setTranscript] = useState('')
  const [elapsedTime, setElapsedTime] = useState(0)
  const [resultData, setResultData] = useState<{ intent: string; title: string; content: string; commandType: string } | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [copyFeedback, setCopyFeedback] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(true)

  const recognitionRef = useRef<any>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // If initialCommand is provided, skip to PREVIEW
  useEffect(() => {
    if (initialCommand) {
      setTranscript(initialCommand)
      setState('PREVIEW')
    } else {
      setState('RECORDING')
      setTranscript('')
    }
    setResultData(null)
    setErrorMsg('')
    setElapsedTime(0)
    setCopyFeedback(false)
  }, [initialCommand, isOpen])

  // Start/stop speech recognition
  useEffect(() => {
    if (state !== 'RECORDING') {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop() } catch {}
        recognitionRef.current = null
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      return
    }

    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognitionAPI) {
      setSpeechSupported(false)
      setState('PREVIEW')
      return
    }

    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: any) => {
      let fullTranscript = ''
      for (let i = 0; i < event.results.length; i++) {
        fullTranscript += event.results[i][0].transcript
      }
      setTranscript(fullTranscript)
    }

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-available') {
        setSpeechSupported(false)
        setState('PREVIEW')
      }
    }

    recognition.onend = () => {
      // auto-transition to preview if we have some text
    }

    try {
      recognition.start()
      recognitionRef.current = recognition
    } catch {
      setSpeechSupported(false)
      setState('PREVIEW')
    }

    // Elapsed timer
    setElapsedTime(0)
    timerRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1)
    }, 1000)

    return () => {
      try { recognition.stop() } catch {}
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [state])

  const handleStopRecording = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch {}
    }
    setState('PREVIEW')
  }, [])

  const handleSend = useCallback(async () => {
    if (!transcript.trim()) return
    setState('PROCESSING')
    setErrorMsg('')

    try {
      const result = await callAIAgent(transcript.trim(), AGENT_ID)
      if (result.success) {
        const parsed = parseLLMJson(result?.response?.result)
        const intent = parsed?.intent || 'assist'
        const title = parsed?.title || 'Response'
        const content = parsed?.content || result?.response?.message || ''
        const commandType = parsed?.command_type || 'Generate'

        const data = { intent, title, content, commandType }
        setResultData(data)
        setState('RESULT')

        const historyItem: HistoryItem = {
          id: Date.now().toString(36) + Math.random().toString(36).substr(2),
          command: transcript.trim(),
          ...data,
          timestamp: new Date(),
        }
        onComplete(historyItem)
      } else {
        setErrorMsg(result?.error || 'Agent returned an error. Please try again.')
        setState('ERROR')
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error. Please try again.')
      setState('ERROR')
    }
  }, [transcript, onComplete])

  const handleRerecord = useCallback(() => {
    setTranscript('')
    setState('RECORDING')
  }, [])

  const handleRegenerate = useCallback(() => {
    setState('PROCESSING')
    handleSend()
  }, [handleSend])

  const handleCopyResult = useCallback(async () => {
    if (resultData?.content) {
      await copyToClipboard(resultData.content)
      setCopyFeedback(true)
      setTimeout(() => setCopyFeedback(false), 2000)
    }
  }, [resultData])

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60)
    const secs = s % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">
            {state === 'RECORDING' && 'Listening...'}
            {state === 'PREVIEW' && 'Review Command'}
            {state === 'PROCESSING' && 'Processing...'}
            {state === 'RESULT' && (resultData?.title ?? 'Result')}
            {state === 'ERROR' && 'Error'}
          </h2>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground" onClick={onClose}>
            <RiCloseLine className="w-5 h-5" />
          </Button>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* RECORDING STATE */}
          {state === 'RECORDING' && (
            <div className="flex flex-col items-center gap-5">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                  <RiMic2Fill className="w-8 h-8 text-primary" />
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
              </div>

              {/* Waveform bars */}
              <div className="flex items-center gap-1 h-8">
                {[1, 2, 3, 4, 5, 6, 7].map((bar) => (
                  <div
                    key={bar}
                    className="w-1 bg-primary rounded-full animate-pulse"
                    style={{
                      height: `${12 + (bar % 3) * 8}px`,
                      animationDelay: `${bar * 0.1}s`,
                      animationDuration: `${0.5 + (bar % 3) * 0.3}s`,
                    }}
                  />
                ))}
              </div>

              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">{formatTime(elapsedTime)}</p>
                {transcript && (
                  <p className="text-sm text-foreground max-w-xs text-center italic opacity-80">
                    {`"${transcript.slice(-80)}${transcript.length > 80 ? '...' : ''}"`}
                  </p>
                )}
              </div>

              <Button onClick={handleStopRecording} variant="destructive" size="sm" className="gap-2 rounded-xl">
                <RiStopCircleLine className="w-4 h-4" />
                Stop Recording
              </Button>
            </div>
          )}

          {/* PREVIEW STATE */}
          {state === 'PREVIEW' && (
            <div className="space-y-4">
              {!speechSupported && (
                <div className="text-xs text-muted-foreground bg-secondary/50 px-3 py-2 rounded-lg">
                  Speech recognition not available. Type your command below.
                </div>
              )}
              <Textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Type or edit your command..."
                className="min-h-[100px] bg-input border-border rounded-xl text-foreground text-sm resize-none"
                autoFocus
              />
              <div className="flex items-center gap-2 justify-end">
                {speechSupported && (
                  <Button variant="secondary" size="sm" className="gap-1.5 rounded-xl" onClick={handleRerecord}>
                    <RiRepeatLine className="w-3.5 h-3.5" />
                    Re-record
                  </Button>
                )}
                <Button
                  size="sm"
                  className="gap-1.5 rounded-xl"
                  onClick={handleSend}
                  disabled={!transcript.trim()}
                >
                  <RiSendPlaneFill className="w-3.5 h-3.5" />
                  Send
                </Button>
              </div>
            </div>
          )}

          {/* PROCESSING STATE */}
          {state === 'PROCESSING' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-4 py-4">
                <RiLoader4Line className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Generating response...</p>
              </div>
              <div className="space-y-3">
                <Skeleton className="h-4 w-3/4 rounded-lg" />
                <Skeleton className="h-4 w-full rounded-lg" />
                <Skeleton className="h-4 w-5/6 rounded-lg" />
                <Skeleton className="h-4 w-2/3 rounded-lg" />
              </div>
            </div>
          )}

          {/* RESULT STATE */}
          {state === 'RESULT' && resultData && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {(() => {
                  const style = getCommandTypeStyle(resultData.commandType)
                  return (
                    <Badge className={`${style.bgColor} ${style.textColor} border-0 text-xs font-semibold`}>
                      {resultData.commandType}
                    </Badge>
                  )
                })()}
              </div>

              <div className="max-h-[300px] overflow-y-auto pr-1 text-foreground">
                {renderMarkdown(resultData.content ?? '')}
              </div>
            </div>
          )}

          {/* ERROR STATE */}
          {state === 'ERROR' && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
                <RiErrorWarningLine className="w-7 h-7 text-destructive" />
              </div>
              <p className="text-sm text-muted-foreground text-center max-w-xs">{errorMsg || 'Something went wrong.'}</p>
              <Button variant="secondary" size="sm" className="gap-1.5 rounded-xl" onClick={() => { setState('PREVIEW') }}>
                <RiRepeatLine className="w-3.5 h-3.5" />
                Try Again
              </Button>
            </div>
          )}
        </div>

        {/* Footer actions for RESULT state */}
        {state === 'RESULT' && (
          <div className="flex items-center gap-2 p-4 border-t border-border">
            <Button size="sm" className="gap-1.5 rounded-xl flex-1" onClick={handleCopyResult}>
              <RiFileCopyLine className="w-3.5 h-3.5" />
              {copyFeedback ? 'Copied!' : 'Copy to Clipboard'}
            </Button>
            <Button variant="secondary" size="sm" className="gap-1.5 rounded-xl" onClick={handleRegenerate}>
              <RiRefreshLine className="w-3.5 h-3.5" />
              Regenerate
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5 rounded-xl text-muted-foreground" onClick={onClose}>
              Dismiss
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
