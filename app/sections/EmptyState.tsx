'use client'

import { RiMic2Fill, RiFileTextLine, RiEditLine, RiSearchLine, RiMailLine } from 'react-icons/ri'
import { Card, CardContent } from '@/components/ui/card'

interface EmptyStateProps {
  onExampleClick: (command: string) => void
}

const examples = [
  {
    icon: RiFileTextLine,
    label: 'Generate',
    text: 'Create a PRD for a social media app',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    icon: RiEditLine,
    label: 'Rephrase',
    text: 'Rephrase this paragraph more formally',
    color: 'text-accent',
    bgColor: 'bg-accent/10',
  },
  {
    icon: RiSearchLine,
    label: 'Research',
    text: 'Research the latest trends in AI',
    color: 'text-[hsl(191,97%,70%)]',
    bgColor: 'bg-[hsl(191,97%,70%)]/10',
  },
  {
    icon: RiMailLine,
    label: 'Assist',
    text: 'Help me write a professional email',
    color: 'text-[hsl(326,100%,68%)]',
    bgColor: 'bg-[hsl(326,100%,68%)]/10',
  },
]

export default function EmptyState({ onExampleClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
          <RiMic2Fill className="w-10 h-10 text-primary opacity-60" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground mb-1">Ready to listen</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            Press <kbd className="px-1.5 py-0.5 rounded bg-secondary border border-border text-xs font-mono">Ctrl+Win</kbd> to give your first voice command, or try an example below.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
        {examples.map((example) => {
          const IconComp = example.icon
          return (
            <Card
              key={example.text}
              className="border border-border bg-card shadow-lg shadow-black/30 rounded-xl cursor-pointer transition-all duration-200 hover:border-primary/40 hover:shadow-xl hover:shadow-black/40 hover:scale-[1.02]"
              onClick={() => onExampleClick(example.text)}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg ${example.bgColor} flex items-center justify-center shrink-0 mt-0.5`}>
                  <IconComp className={`w-4 h-4 ${example.color}`} />
                </div>
                <div>
                  <span className={`text-xs font-semibold ${example.color}`}>{example.label}</span>
                  <p className="text-sm text-foreground mt-0.5 leading-snug">{example.text}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
