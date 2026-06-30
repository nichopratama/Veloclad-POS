import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function GET(req: NextRequest, props: { params: Promise<{ filename: string }> }) {
  try {
    const { filename } = await props.params;
    const filePath = path.join(process.cwd(), 'public', 'uploads', 'profiles', filename);

    const file = await fs.readFile(filePath);
    const ext = filename.split('.').pop()?.toLowerCase();
    
    let contentType = 'image/jpeg';
    if (ext === 'png') contentType = 'image/png';
    else if (ext === 'webp') contentType = 'image/webp';
    else if (ext === 'gif') contentType = 'image/gif';
    else if (ext === 'svg') contentType = 'image/svg+xml';

    return new NextResponse(file, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    return new NextResponse('File not found', { status: 404 });
  }
}
