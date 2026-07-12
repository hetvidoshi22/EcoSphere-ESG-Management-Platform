'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

type DrawerSize = 'md' | 'lg'

const sizeMap: Record<DrawerSize, string> = {
  md: 'w-full sm:w-[500px]',
  lg: 'w-full sm:w-[720px]',
}

interface RecordDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: React.ReactNode
  size?: DrawerSize
  onSave?: () => void | Promise<void>
  onDiscard?: () => void
  loading?: boolean
}

export function RecordDrawer({
  open,
  onOpenChange,
  title,
  children,
  size = 'md',
  onSave,
  onDiscard,
  loading = false,
}: RecordDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={sizeMap[size]}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 py-6">{children}</div>

        <SheetFooter className="flex gap-2">
          <Button variant="outline" onClick={onDiscard} disabled={loading}>
            Discard
          </Button>
          <Button onClick={onSave} disabled={loading} className="bg-brand-primary hover:bg-brand-primary/90">
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
