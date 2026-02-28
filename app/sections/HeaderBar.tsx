'use client'

import { RiMic2Fill, RiKeyboardBoxLine } from 'react-icons/ri'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export default function HeaderBar() {
  return (
    <header>
      <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <RiMic2Fill className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground tracking-tight">VoiceAction</h1>
            <p className="text-xs text-muted-foreground">Voice-activated productivity assistant</p>
          </div>
        </div>
        <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1.5 border-border bg-secondary/50 text-muted-foreground text-xs">
          <RiKeyboardBoxLine className="w-3.5 h-3.5" />
          <span>Ctrl+O</span>
        </Badge>
      </div>
      <Separator className="bg-border" />
    </header>
  )
}
