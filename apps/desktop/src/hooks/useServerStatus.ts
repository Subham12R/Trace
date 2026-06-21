import { useEffect } from 'react'
import { toast } from 'sonner'
import { useServerStore } from '@/stores/serverStore'

export function useServerStatus() {
  const status = useServerStore((s) => s.status)
  useEffect(() => {
    if (status === 'offline') {
      toast.error('Trace server offline', {
        id: 'server-status',
        duration: Infinity,
        description: 'Restart the Trace server to resume tracking.',
      })
    } else if (status === 'online') {
      toast.dismiss('server-status')
    }
  }, [status])
}
