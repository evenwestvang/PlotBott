import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

interface APICallStats {
  timestamp: Date;
  prompt: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  duration: number;
  success: boolean;
  error?: string;
  attempt: number;
  maxTokens: number;
}

export class ClaudeClient {
  private client: Anthropic;
  private callStats: APICallStats[] = [];
  
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
    maxTokens = 4000,
    attempt = 1
  ): Promise<T> {
    const startTime = Date.now();
    const userMessage = inputData 
      ? `Input data:\n\n${JSON.stringify(inputData, null, 2)}`
      : 'Generate the requested content.';
    
    // Identify prompt type for tracking
    const promptType = this.identifyPromptType(systemPrompt);
    
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
      
      const duration = Date.now() - startTime;
      const usage = response.usage;
      
      // Track successful call
      this.callStats.push({
        timestamp: new Date(),
        prompt: promptType,
        inputTokens: usage.input_tokens,
        outputTokens: usage.output_tokens,
        totalTokens: usage.input_tokens + usage.output_tokens,
        duration,
        success: true,
        attempt,
        maxTokens
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
      const duration = Date.now() - startTime;
      
      // Track failed call
      this.callStats.push({
        timestamp: new Date(),
        prompt: promptType,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        duration,
        success: false,
        error: (error as Error).message,
        attempt,
        maxTokens
      });
      
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
        return await this.generateWithPrompt<T>(systemPrompt, inputData, maxTokens, attempt);
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
  
  private identifyPromptType(systemPrompt: string): string {
    if (systemPrompt.includes('Worldbuilder')) return 'Universe';
    if (systemPrompt.includes('Dramatist')) return 'Controlling Idea';
    if (systemPrompt.includes('Systems Designer')) return 'Factions';
    if (systemPrompt.includes('Casting + Psychology')) return 'Characters';
    if (systemPrompt.includes('Production Designer')) return 'Locations';
    if (systemPrompt.includes('Opposition Engineer')) return 'Conflict Matrix';
    if (systemPrompt.includes('Structuralist')) return 'Season Arc';
    if (systemPrompt.includes('Episodic Designer')) return 'Episode Plan';
    if (systemPrompt.includes('Beat Mechanic')) return 'Scene Plan';
    return 'Unknown';
  }
  
  public getPerformanceReport(): string {
    if (this.callStats.length === 0) {
      return 'No API calls have been made yet.';
    }
    
    const totalCalls = this.callStats.length;
    const successfulCalls = this.callStats.filter(c => c.success).length;
    const failedCalls = totalCalls - successfulCalls;
    
    const totalTokens = this.callStats.reduce((sum, call) => sum + call.totalTokens, 0);
    const totalInputTokens = this.callStats.reduce((sum, call) => sum + call.inputTokens, 0);
    const totalOutputTokens = this.callStats.reduce((sum, call) => sum + call.outputTokens, 0);
    
    const totalDuration = this.callStats.reduce((sum, call) => sum + call.duration, 0);
    const avgDuration = totalDuration / totalCalls;
    
    // Group by prompt type
    const byPromptType = this.callStats.reduce((acc, call) => {
      if (!acc[call.prompt]) {
        acc[call.prompt] = [];
      }
      acc[call.prompt].push(call);
      return acc;
    }, {} as Record<string, APICallStats[]>);
    
    let report = `\n📊 Claude API Performance Report\n`;
    report += `=====================================\n\n`;
    
    // Overall stats
    report += `🔢 Total API Calls: ${totalCalls}\n`;
    report += `✅ Successful: ${successfulCalls}\n`;
    report += `❌ Failed: ${failedCalls}\n`;
    report += `⏱️  Total Duration: ${(totalDuration / 1000).toFixed(1)}s\n`;
    report += `📊 Average Duration: ${(avgDuration / 1000).toFixed(1)}s per call\n\n`;
    
    // Token usage
    report += `🎯 Token Usage:\n`;
    report += `   Input Tokens: ${totalInputTokens.toLocaleString()}\n`;
    report += `   Output Tokens: ${totalOutputTokens.toLocaleString()}\n`;
    report += `   Total Tokens: ${totalTokens.toLocaleString()}\n`;
    report += `   Avg per Call: ${Math.round(totalTokens / totalCalls).toLocaleString()}\n\n`;
    
    // By prompt type
    report += `📋 By Generation Type:\n`;
    Object.entries(byPromptType).forEach(([type, calls]) => {
      const successful = calls.filter(c => c.success).length;
      const inputTokens = calls.reduce((sum, c) => sum + c.inputTokens, 0);
      const outputTokens = calls.reduce((sum, c) => sum + c.outputTokens, 0);
      const totalTokens = calls.reduce((sum, c) => sum + c.totalTokens, 0);
      const duration = calls.reduce((sum, c) => sum + c.duration, 0);
      const avgDuration = duration / calls.length;
      
      report += `   ${type}:\n`;
      report += `     Calls: ${calls.length} (${successful}/${calls.length} success)\n`;
      report += `     Input Tokens: ${inputTokens.toLocaleString()}\n`;
      report += `     Output Tokens: ${outputTokens.toLocaleString()}\n`;
      report += `     Total Tokens: ${totalTokens.toLocaleString()}\n`;
      report += `     Avg Duration: ${(avgDuration / 1000).toFixed(1)}s\n`;
      
      // Show retries if any
      const retries = calls.filter(c => c.attempt > 1).length;
      if (retries > 0) {
        report += `     Retries: ${retries}\n`;
      }
      report += `\n`;
    });
    
    // Timeline
    if (this.callStats.length > 0) {
      const firstCall = this.callStats[0].timestamp;
      const lastCall = this.callStats[this.callStats.length - 1].timestamp;
      const totalTime = lastCall.getTime() - firstCall.getTime();
      
      report += `⏰ Timeline:\n`;
      report += `   Start: ${firstCall.toISOString()}\n`;
      report += `   End: ${lastCall.toISOString()}\n`;
      report += `   Total Time: ${(totalTime / 1000).toFixed(1)}s\n\n`;
    }
    
    // Show slowest calls
    const slowestCalls = [...this.callStats]
      .filter(c => c.success)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5);
      
    if (slowestCalls.length > 0) {
      report += `🐌 Slowest Calls:\n`;
      slowestCalls.forEach((call, i) => {
        report += `   ${i + 1}. ${call.prompt}: ${(call.duration / 1000).toFixed(1)}s (${call.totalTokens} tokens)\n`;
      });
      report += `\n`;
    }
    
    return report;
  }
  
  public resetStats(): void {
    this.callStats = [];
  }
}