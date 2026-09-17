export function handleBookingApi(
  req: { method?: string; body?: Record<string, unknown> },
  res: {
    status: (code: number) => { json: (data: unknown) => unknown; end: () => unknown }
  }
): Promise<unknown>
