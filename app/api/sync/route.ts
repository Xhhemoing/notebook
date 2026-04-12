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

    if (action === 'pull') {
      // Fetch all data from D1
      const memories = await db.prepare('SELECT * FROM memories').all();
      const nodes = await db.prepare('SELECT * FROM knowledge_nodes').all();
      const textbooks = await db.prepare('SELECT * FROM textbooks').all();
      const resources = await db.prepare('SELECT * FROM resources').all();
      
      return NextResponse.json({
        success: true,
        data: {
          memories: memories.results.map((m: any) => ({
            ...m,
            isMistake: !!m.isMistake,
            knowledgeNodeIds: m.knowledgeNodeIds ? JSON.parse(m.knowledgeNodeIds) : [],
            vocabularyData: m.vocabularyData ? JSON.parse(m.vocabularyData) : undefined,
            embedding: m.embedding ? JSON.parse(m.embedding) : undefined
          })),
          knowledgeNodes: nodes.results.map((n: any) => ({
            ...n,
            order: Number(n.order)
          })),
          textbooks: textbooks.results,
          resources: resources.results.map((r: any) => ({
            ...r,
            isFolder: !!r.isFolder,
            size: Number(r.size)
          }))
        }
      });
    }

    if (action === 'push_memories') {
      const items = payload as any[];
      if (items.length === 0) return NextResponse.json({ success: true });

      // Batch upsert memories
      const statements = items.map(m => db.prepare(`
        INSERT INTO memories (id, subject, content, functionType, purposeType, isMistake, wrongAnswer, errorReason, visualDescription, notes, knowledgeNodeIds, createdAt, embedding)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          subject = excluded.subject,
          content = excluded.content,
          functionType = excluded.functionType,
          purposeType = excluded.purposeType,
          isMistake = excluded.isMistake,
          wrongAnswer = excluded.wrongAnswer,
          errorReason = excluded.errorReason,
          visualDescription = excluded.visualDescription,
          notes = excluded.notes,
          knowledgeNodeIds = excluded.knowledgeNodeIds,
          embedding = excluded.embedding
      `).bind(
        m.id, m.subject, m.content, m.functionType, m.purposeType, m.isMistake ? 1 : 0, 
        m.wrongAnswer || null, m.errorReason || null, m.visualDescription || null, m.notes || null,
        JSON.stringify(m.knowledgeNodeIds || []), m.createdAt,
        m.embedding ? JSON.stringify(m.embedding) : null
      ));

      await db.batch(statements);
      return NextResponse.json({ success: true });
    }

    if (action === 'push_nodes') {
      const items = payload as any[];
      if (items.length === 0) return NextResponse.json({ success: true });

      const statements = items.map(n => db.prepare(`
        INSERT INTO knowledge_nodes (id, subject, name, parentId, "order")
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          subject = excluded.subject,
          name = excluded.name,
          parentId = excluded.parentId,
          "order" = excluded."order"
      `).bind(n.id, n.subject, n.name, n.parentId, n.order || 0));

      await db.batch(statements);
      return NextResponse.json({ success: true });
    }

    if (action === 'delete_memories') {
      const ids = payload as string[];
      if (ids.length === 0) return NextResponse.json({ success: true });
      await db.prepare(`DELETE FROM memories WHERE id IN (${ids.map(() => '?').join(',')})`).bind(...ids).run();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error: any) {
    console.error('D1 Sync Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
