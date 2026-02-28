'use client'

import React, { useState, useEffect, useCallback } from 'react'
import HeaderBar from './sections/HeaderBar'
import EmptyState from './sections/EmptyState'
import HistoryFeed from './sections/HistoryFeed'
import VoiceOverlay from './sections/VoiceOverlay'
import { copyToClipboard } from '@/lib/clipboard'
import { RiMic2Fill, RiCheckboxCircleLine } from 'react-icons/ri'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'

interface HistoryItem {
  id: string
  command: string
  intent: string
  title: string
  content: string
  commandType: string
  timestamp: Date
}

const SAMPLE_HISTORY: HistoryItem[] = [
  {
    id: 'sample-1',
    command: 'Create a PRD for a social media app',
    intent: 'generate',
    title: 'Social Media App PRD',
    content: '# Product Requirements Document\n\n## Overview\nA next-generation social media platform focused on authentic connections.\n\n## Key Features\n- **Story-first feed**: Prioritizes ephemeral content\n- **Interest-based discovery**: AI-powered content matching\n- **Privacy controls**: Granular audience selection\n- **Creator monetization**: Built-in tipping and subscriptions\n\n## Target Audience\nGen Z and Millennials seeking authentic social experiences.\n\n## Success Metrics\n1. Daily Active Users (DAU)\n2. Average session length > 8 minutes\n3. Content creation rate > 30%',
    commandType: 'Generate',
    timestamp: new Date(Date.now() - 120000),
  },
  {
    id: 'sample-2',
    command: 'Rephrase this paragraph more formally',
    intent: 'rephrase',
    title: 'Formal Rephrasing',
    content: 'The proposed initiative seeks to **establish a comprehensive framework** for cross-departmental collaboration, thereby enhancing operational efficiency and fostering a culture of continuous improvement across the organization.',
    commandType: 'Rephrase',
    timestamp: new Date(Date.now() - 300000),
  },
  {
    id: 'sample-3',
    command: 'Research the latest trends in AI',
    intent: 'research',
    title: 'AI Trends 2025',
    content: '## Latest AI Trends\n\n### 1. Multimodal AI\nModels that process text, images, audio, and video simultaneously are becoming the standard.\n\n### 2. AI Agents\nAutonomous agents that can plan, execute, and iterate on complex tasks with minimal human oversight.\n\n### 3. Small Language Models\nEfficient, specialized models that run on-device for privacy-sensitive applications.\n\n### 4. AI in Science\n- Drug discovery acceleration\n- Climate modeling improvements\n- Materials science breakthroughs',
    commandType: 'Research',
    timestamp: new Date(Date.now() - 600000),
  },
]

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function Page() {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [overlayOpen, setOverlayOpen] = useState(false)
  const [initialCommand, setInitialCommand] = useState<string | undefined>()
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)
  const [showSample, setShowSample] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('voiceaction-history')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          setHistory(parsed.map((item: any) => ({ ...item, timestamp: new Date(item.timestamp) })))
        }
      }
    } catch {}
  }, [])

  // Save to localStorage on change
  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem('voiceaction-history', JSON.stringify(history))
    }
  }, [history])

  // Ctrl+O hotkey listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Meta') {
        e.preventDefault()
        setInitialCommand(undefined)
        setOverlayOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleComplete = useCallback((item: HistoryItem) => {
    setHistory(prev => [item, ...prev])
    setActiveAgentId(null)
  }, [])

  const handleCopy = useCallback(async (text: string) => {
    const success = await copyToClipboard(text)
    if (success) {
      setCopyFeedback('Copied!')
      setTimeout(() => setCopyFeedback(null), 2000)
    }
  }, [])

  const handleExampleClick = useCallback((command: string) => {
    setInitialCommand(command)
    setOverlayOpen(true)
  }, [])

  const handleRerun = useCallback((command: string) => {
    setInitialCommand(command)
    setOverlayOpen(true)
  }, [])

  const displayHistory = showSample ? SAMPLE_HISTORY : history

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background text-foreground">
        <HeaderBar />

        {/* Sample Data Toggle */}
        <div className="max-w-4xl mx-auto px-4 pt-4 flex items-center justify-end gap-2">
          <label htmlFor="sample-toggle" className="text-xs text-muted-foreground cursor-pointer select-none">
            Sample Data
          </label>
          <Switch
            id="sample-toggle"
            checked={showSample}
            onCheckedChange={setShowSample}
          />
        </div>

        <main className="max-w-4xl mx-auto px-4 py-6">
          {displayHistory.length === 0 ? (
            <EmptyState onExampleClick={handleExampleClick} />
          ) : (
            <HistoryFeed
              history={displayHistory}
              onCopy={handleCopy}
              onRerun={handleRerun}
            />
          )}
        </main>

        {/* Floating Action Button */}
        <button
          onClick={() => { setInitialCommand(undefined); setOverlayOpen(true) }}
          className="fixed bottom-6 left-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-2xl hover:shadow-primary/40 z-40"
          aria-label="Open voice command"
        >
          <RiMic2Fill className="w-6 h-6" />
        </button>

        {/* Voice Overlay */}
        {overlayOpen && (
          <VoiceOverlay
            isOpen={overlayOpen}
            onClose={() => setOverlayOpen(false)}
            onComplete={handleComplete}
            initialCommand={initialCommand}
          />
        )}

        {/* Copy feedback */}
        {copyFeedback && (
          <div className="fixed bottom-6 right-6 bg-accent text-accent-foreground px-4 py-2 rounded-xl shadow-lg shadow-black/30 font-semibold text-sm z-50 flex items-center gap-2">
            <RiCheckboxCircleLine className="w-4 h-4" />
            {copyFeedback}
          </div>
        )}

        {/* Agent Status */}
        {!copyFeedback && (
          <div className="fixed bottom-6 right-6 z-30">
            <div className="bg-card border border-border rounded-xl shadow-lg shadow-black/30 px-3 py-2 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${overlayOpen ? 'bg-accent animate-pulse' : 'bg-muted-foreground/40'}`} />
              <span className="text-xs text-muted-foreground">VoiceAction Agent</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border text-muted-foreground">
                Perplexity
              </Badge>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  )
}
