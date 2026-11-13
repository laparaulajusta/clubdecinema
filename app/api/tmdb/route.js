import { NextResponse } from 'next/server';
import { IDIOMA_TMDB } from '@/lib/constants';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  if (!query) return NextResponse.json({ results: [] });

  try {
    const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${process.env.TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=${IDIOMA_TMDB}`);
    if (!res.ok) {
      return NextResponse.json({ results: [] }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json({ results: data.results || [] });
  } catch {
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}
