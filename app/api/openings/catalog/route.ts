import { NextResponse } from 'next/server'
import { loadCatalog, searchCatalog } from '@/lib/openings/catalog'

export async function GET(req: Request): Promise<Response> {
  const q = new URL(req.url).searchParams.get('q') ?? ''
  const results = searchCatalog(loadCatalog(), q)
  return NextResponse.json({ results })
}
