import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

export class ClaudeClient {
  private client: Anthropic;
  
  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  
  async generateWithPrompt<T = any>(
    systemPrompt: string,
    inputData?: any,
    maxTokens = 4000
  ): Promise<T> {
    const userMessage = inputData 
      ? `Input data:\n\n${JSON.stringify(inputData, null, 2)}`
      : 'Generate the requested content.';
    
    try {
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: userMessage
        }]
      });
      
      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude API');
      }
      
      // Extract JSON from the response - try multiple patterns
      let jsonStr = content.text.trim();
      
      // Remove markdown code blocks if present
      jsonStr = jsonStr.replace(/^```json\s*|\s*```$/g, '');
      jsonStr = jsonStr.replace(/^```\s*|\s*```$/g, '');
      
      // Find JSON object
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('Claude response:', content.text);
        throw new Error('No JSON found in Claude response');
      }
      
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed;
      } catch (parseError) {
        // Try to clean up common JSON issues
        let cleaned = jsonMatch[0];
        // Remove trailing commas
        cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
        
        try {
          return JSON.parse(cleaned);
        } catch (secondError) {
          console.error('Failed to parse JSON after cleanup:', cleaned);
          throw new Error(`Invalid JSON in Claude response: ${secondError}`);
        }
      }
    } catch (error) {
      console.error('Claude API error:', error);
      throw error;
    }
  }
  
  async generateWithRetry<T = any>(
    systemPrompt: string,
    inputData?: any,
    maxRetries = 3,
    maxTokens = 4000
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.generateWithPrompt<T>(systemPrompt, inputData, maxTokens);
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          break;
        }
        
        console.warn(`Generation attempt ${attempt} failed, retrying...`, error);
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
    
    throw lastError || new Error('Max retries exceeded');
  }
}