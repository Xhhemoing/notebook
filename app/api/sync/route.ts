import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// Generic handler for syncing data to Cloudflare D1
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { action, payload } = data;

    // Access the D1 database binding
    const db = (process.env as any).DB;

    if (!db) {
      return NextResponse.json(
        { error: 'Database binding (DB) not found. Are you running on Cloudflare?' },
        { status: 500 }
      );
    }

    // Example of handling different sync actions
    if (action === 'sync_memory') {
      const { id, subject, content, type, functionType, purposeType, isMistake, createdAt, vocabularyData } = payload;
      
      // Upsert memory
      await db.prepare(`
        INSERT INTO memories (id, subject, content, type, functionType, purposeType, isMistake, createdAt, vocabularyData)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          subject = excluded.subject,
          content = excluded.content,
          type = excluded.type,
          functionType = excluded.functionType,
          purposeType = excluded.purposeType,
          isMistake = excluded.isMistake,
          vocabularyData = excluded.vocabularyData
      `).bind(
        id, subject, content, type || 'concept', functionType, purposeType, isMistake ? 1 : 0, createdAt, 
        vocabularyData ? JSON.stringify(vocabularyData) : null
      ).run();

      return NextResponse.json({ success: true, message: 'Memory synced' });
    }

    if (action === 'sync_resource') {
      // Handle resource syncing
      // Note: For large files, D1 is not recommended. Use R2 instead.
      return NextResponse.json({ success: true, message: 'Resource sync placeholder' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error: any) {
    console.error('D1 Sync Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
