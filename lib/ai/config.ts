import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import { generateText, streamText, embed, CoreMessage } from 'ai';

// 统一对外暴露的获取大模型实例的方法
export const getLLM = (tier: 'fast' | 'smart' = 'fast') => {
  // 使用 gemini-1.5-flash/pro 作为当前可用模型，对应用户的 gemini-3 预期
  return tier === 'fast' ? google('gemini-1.5-flash') : google('gemini-1.5-pro'); 
};

export const getFallbackLLM = (tier: 'fast' | 'smart' = 'fast') => {
  return tier === 'fast' ? openai('gpt-4o-mini') : openai('gpt-4o');
};

export const getEmbeddingModel = () => {
  return google.textEmbeddingModel('text-embedding-004'); // 最新 Google Embedding 模型
};

interface GenerateOptions {
  tier?: 'fast' | 'smart';
  prompt?: string;
  messages?: CoreMessage[];
  system?: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * 带重试和回退机制的文本生成
 */
export async function generateTextWithFallback(options: GenerateOptions) {
  const tier = options.tier || 'fast';
  
  try {
    console.log(`[AI Gateway] Attempting generation with Google model (tier: ${tier})`);
    const result = await generateText({
      model: getLLM(tier),
      prompt: options.prompt,
      messages: options.messages,
      system: options.system,
      maxTokens: options.maxTokens,
      temperature: options.temperature,
    });
    return result;
  } catch (error) {
    console.error("[AI Gateway] Google API failed or timed out. Error:", error);
    console.log(`[AI Gateway] Falling back to OpenAI model (tier: ${tier})`);
    
    try {
      const fallbackResult = await generateText({
        model: getFallbackLLM(tier),
        prompt: options.prompt,
        messages: options.messages,
        system: options.system,
        maxTokens: options.maxTokens,
        temperature: options.temperature,
      });
      return fallbackResult;
    } catch (fallbackError) {
      console.error("[AI Gateway] Fallback OpenAI API also failed. Error:", fallbackError);
      throw new Error("All LLM providers failed to generate text.");
    }
  }
}

/**
 * 带重试和回退机制的流式文本生成
 */
export async function streamTextWithFallback(options: GenerateOptions) {
  const tier = options.tier || 'fast';
  
  try {
    console.log(`[AI Gateway] Attempting stream with Google model (tier: ${tier})`);
    return streamText({
      model: getLLM(tier),
      prompt: options.prompt,
      messages: options.messages,
      system: options.system,
      maxTokens: options.maxTokens,
      temperature: options.temperature,
    });
  } catch (error) {
    console.error("[AI Gateway] Google API failed for streaming. Error:", error);
    console.log(`[AI Gateway] Falling back to OpenAI model for streaming (tier: ${tier})`);
    
    return streamText({
      model: getFallbackLLM(tier),
      prompt: options.prompt,
      messages: options.messages,
      system: options.system,
      maxTokens: options.maxTokens,
      temperature: options.temperature,
    });
  }
}
