'use client'

import { useState } from 'react'
import { RiFileCopyLine, RiRepeatLine, RiSearchLine, RiArrowDownSLine, RiArrowUpSLine } from 'react-icons/ri'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

interface HistoryItem {
  id: string
  command: string
  intent: string
  title: string
  content: string
  commandType: string
  timestamp: Date
}

interface HistoryFeedProps {
  history: HistoryItem[]
  onCopy: (text: string) => void
  onRerun: (command: string) => void
}

function getRelativeTime(date: Date): string {
  const now = Date.now()
  const diff = now - new Date(date).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

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

export default function HistoryFeed({ history, onCopy, onRerun }: HistoryFeedProps) {
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = search.trim()
    ? history.filter(item => {
        const q = search.toLowerCase()
        return (item.command ?? '').toLowerCase().includes(q) ||
               (item.title ?? '').toLowerCase().includes(q) ||
               (item.commandType ?? '').toLowerCase().includes(q)
      })
    : history

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search commands..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border rounded-xl"
          />
        </div>
        <Badge variant="secondary" className="text-xs text-muted-foreground whitespace-nowrap">
          {history.length} command{history.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <ScrollArea className="h-[calc(100vh-220px)]">
        <div className="space-y-3 pr-2">
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No commands found matching your search.
            </div>
          )}
          {filtered.map((item) => {
            const isExpanded = expandedId === item.id
            const style = getCommandTypeStyle(item.commandType)
            return (
              <Card
                key={item.id}
                className="border border-border bg-card shadow-lg shadow-black/30 rounded-xl transition-all duration-200 hover:border-primary/30"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge className={`${style.bgColor} ${style.textColor} border-0 text-xs font-semibold`}>
                          {item.commandType ?? 'Generate'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{getRelativeTime(item.timestamp)}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-foreground mb-1 truncate">{item.title ?? 'Untitled'}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">{item.command}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    >
                      {isExpanded ? <RiArrowUpSLine className="w-4 h-4" /> : <RiArrowDownSLine className="w-4 h-4" />}
                    </Button>
                  </div>

                  {!isExpanded && (
                    <div className="mt-2 text-xs text-muted-foreground line-clamp-3">
                      {(item.content ?? '').slice(0, 200)}
                    </div>
                  )}

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="prose-sm text-foreground">
                        {renderMarkdown(item.content ?? '')}
                      </div>
                      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
                        <Button
                          variant="default"
                          size="sm"
                          className="gap-1.5 rounded-lg text-xs"
                          onClick={() => onCopy(item.content ?? '')}
                        >
                          <RiFileCopyLine className="w-3.5 h-3.5" />
                          Copy
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="gap-1.5 rounded-lg text-xs"
                          onClick={() => onRerun(item.command)}
                        >
                          <RiRepeatLine className="w-3.5 h-3.5" />
                          Rerun
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
