export function handleBookingApi(
  req: { method?: string; body?: Record<string, unknown> },
  res: {
    status: (code: number) => { json: (data: unknown) => unknown; end: () => unknown }
  }
): Promise<unknown>

export function processSlackEvent(
  headers: Record<string, unknown>,
  rawBody: string
): Promise<{ status: number; body: Record<string, unknown> }>

