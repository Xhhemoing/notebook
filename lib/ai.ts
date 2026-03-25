import { GoogleGenAI, Type } from '@google/genai';
import { Memory, KnowledgeNode, Subject, MemoryFunction, MemoryPurpose, Settings } from './types';
import { v4 as uuidv4 } from 'uuid';

const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

export async function parseNotes(
  input: string,
  subject: Subject,
  existingNodes: KnowledgeNode[],
  settings: Settings,
  base64Image?: string,
  explicitFunction?: string,
  explicitPurpose?: string,
  previousParsedItems?: any[],
  previousAnalysis?: string
): Promise<{ analysisProcess: string; parsedItems: any[]; newNodes: KnowledgeNode[] }> {
  const prompt = `
你是一个高考复习与错题本AI助手。请分析以下学生的作业/笔记内容（可能包含文本或图片）。
科目：${subject}
当前已有的知识图谱节点：
${existingNodes.map((n) => `- ${n.name} (ID: ${n.id})`).join('\n')}

用户的作业与错题解析偏好（非常重要，请严格遵循）：
${settings.homeworkPreferences || '无特殊偏好'}

${previousParsedItems ? `
注意：这是用户要求重新生成的请求。
之前的分析过程：
${previousAnalysis}

之前解析出的内容：
${JSON.stringify(previousParsedItems, null, 2)}

请根据用户新的补充说明/修改要求，重新生成解析结果。
` : ''}

请执行以下任务：
1. 仔细观察图片中的笔迹、题号前的标记（如用户偏好中所述，例如+号、打叉等）。
2. 根据用户的指令或标记，提取出需要记录的错题、独立的知识点或记忆卡片。
3. 如果是错题，请尝试完成解答、整理和归纳。
4. 提供一段分析过程（analysisProcess），向用户解释你识别到了哪些标记、笔迹，以及你是如何理解用户意图的。

对于每一个提取出的记忆/错题，请提供：
1. content: 记忆或错题的具体内容（如果是错题，请包含题目、你的解答和归纳）。
2. functionType: 功能分类，必须是以下之一：'细碎记忆', '方法论', '关联型记忆', '系统型'。${explicitFunction && explicitFunction !== 'auto' ? `(用户已指定倾向于：${explicitFunction})` : ''}
3. purposeType: 目的分类，必须是以下之一：'内化型', '记忆型', '补充知识型', '系统型'。${explicitPurpose && explicitPurpose !== 'auto' ? `(用户已指定倾向于：${explicitPurpose})` : ''}
4. suggestedNodeName: 建议关联的知识节点名称。如果现有的节点合适，请使用现有节点的名称；如果不合适，请提供一个新的、符合该科目树状结构的节点名称。
5. notes: 补充提示或注意点（可选）。
6. isMistake: 布尔值，表示这是否是一道错题（根据用户标记判断）。

输入内容/指令：
${input || '请分析图片中的作业和标记'}
`;

  const parts: any[] = [{ text: prompt }];
  if (base64Image) {
    parts.push({
      inlineData: {
        data: base64Image.split(',')[1], // Remove data:image/jpeg;base64,
        mimeType: base64Image.split(';')[0].split(':')[1],
      },
    });
  }

  const response = await ai.models.generateContent({
    model: settings.parseModel,
    contents: { parts },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          analysisProcess: { type: Type.STRING, description: "AI对用户笔迹、标记的识别过程和意图分析" },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                content: { type: Type.STRING },
                functionType: { type: Type.STRING },
                purposeType: { type: Type.STRING },
                suggestedNodeName: { type: Type.STRING },
                notes: { type: Type.STRING },
                isMistake: { type: Type.BOOLEAN },
              },
              required: ['content', 'functionType', 'purposeType', 'suggestedNodeName', 'isMistake'],
            },
          }
        },
        required: ['analysisProcess', 'items']
      },
    },
  });

  const resultStr = response.text || '{"analysisProcess": "", "items": []}';
  const parsed = JSON.parse(resultStr);

  const newNodes: KnowledgeNode[] = [];

  for (const item of parsed.items || []) {
    let nodeId = existingNodes.find((n) => n.name === item.suggestedNodeName)?.id;
    
    if (!nodeId) {
      let newlyCreated = newNodes.find((n) => n.name === item.suggestedNodeName);
      if (newlyCreated) {
        nodeId = newlyCreated.id;
      } else {
        const rootNode = existingNodes.find((n) => n.subject === subject && n.parentId === null);
        nodeId = uuidv4();
        newNodes.push({
          id: nodeId,
          subject: subject,
          name: item.suggestedNodeName,
          parentId: rootNode ? rootNode.id : null,
        });
      }
    }
    item.nodeId = nodeId;
  }

  return { analysisProcess: parsed.analysisProcess || '', parsedItems: parsed.items || [], newNodes };
}

export async function chatWithAI(
  query: string,
  subject: Subject,
  relevantMemories: Memory[],
  allNodes: KnowledgeNode[],
  settings: Settings
): Promise<string> {
  const memoryContext = relevantMemories.map(m => {
    const nodes = m.knowledgeNodeIds.map(id => allNodes.find(n => n.id === id)?.name).filter(Boolean).join(', ');
    return `[记忆点] ${m.content} (分类: ${m.functionType}, 关联节点: ${nodes}) ${m.notes ? `\n注意: ${m.notes}` : ''}`;
  }).join('\n\n');

  const prompt = `
你是一个专为高三学生进行二轮复习辅导的AI老师。
当前科目：${subject}

学生的问题：
${query}

以下是学生数据库中提取出的相关记忆点和错题记录（作为上下文参考）：
${memoryContext || '暂无相关记忆。'}

请结合学生的记忆点，给出专业、易懂、切中要害的解答。如果学生的记忆点中有错误或薄弱的地方，请重点指出并帮助其巩固。
`;

  const response = await ai.models.generateContent({
    model: settings.chatModel,
    contents: prompt,
  });

  return response.text || '抱歉，我无法回答这个问题。';
}

export type GraphOperation = 
  | { action: 'add'; name: string; parentId: string | null }
  | { action: 'delete'; nodeId: string }
  | { action: 'rename'; nodeId: string; name: string }
  | { action: 'move'; nodeId: string; parentId: string | null };

export async function adjustKnowledgeGraph(
  command: string,
  subject: Subject,
  existingNodes: KnowledgeNode[],
  settings: Settings
): Promise<GraphOperation[]> {
  const prompt = `
你是一个知识图谱管理AI。用户想要修改【${subject}】的知识图谱。
当前图谱节点列表（JSON格式）：
${JSON.stringify(existingNodes.map(n => ({ id: n.id, name: n.name, parentId: n.parentId })), null, 2)}

用户的指令：
"${command}"

请分析用户的指令，并返回一个操作列表来修改图谱。支持的操作(action)有：
- 'add': 添加新节点 (需要提供 name 和 parentId)
- 'delete': 删除节点 (需要提供 nodeId)
- 'rename': 重命名节点 (需要提供 nodeId 和 name)
- 'move': 移动节点 (需要提供 nodeId 和 parentId)

注意：如果用户说“在X下添加Y”，你需要找到X的ID作为parentId。如果找不到合适的父节点，parentId可以是null（根节点）。
`;

  const response = await ai.models.generateContent({
    model: settings.graphModel,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            action: { type: Type.STRING },
            nodeId: { type: Type.STRING },
            name: { type: Type.STRING },
            parentId: { type: Type.STRING },
          },
          required: ['action'],
        },
      },
    },
  });

  const resultStr = response.text || '[]';
  const parsed = JSON.parse(resultStr);
  
  // Clean up parsed operations
  return parsed.map((op: any) => {
    if (op.parentId === 'null' || op.parentId === undefined) op.parentId = null;
    return op as GraphOperation;
  });
}

export type QuizQuestion = {
  type: 'qa' | 'tf' | 'mc';
  question: string;
  options?: string[]; // For multiple choice
  correctAnswer: string;
  explanation: string;
};

export async function generateQuiz(
  memory: Memory,
  settings: Settings
): Promise<QuizQuestion> {
  const prompt = `
你是一个高考复习AI老师。请根据以下学生的记忆点/错题，生成一道简单的复习考察题，帮助学生巩固记忆。
记忆点内容：
${memory.content}
${memory.notes ? `补充笔记：${memory.notes}` : ''}

请生成一道题目，题型可以是：
1. 'qa' (简答题/问答题)
2. 'tf' (判断题，答案必须是"对"或"错")
3. 'mc' (单选题，提供4个选项)

请随机选择一种题型，并以JSON格式返回。
`;

  const response = await ai.models.generateContent({
    model: settings.chatModel,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, description: "qa, tf, or mc" },
          question: { type: Type.STRING },
          options: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "Only for mc type"
          },
          correctAnswer: { type: Type.STRING, description: "The correct answer. For tf, use '对' or '错'" },
          explanation: { type: Type.STRING, description: "Explanation of the answer" }
        },
        required: ['type', 'question', 'correctAnswer', 'explanation']
      }
    }
  });

  const resultStr = response.text || '{}';
  return JSON.parse(resultStr) as QuizQuestion;
}

