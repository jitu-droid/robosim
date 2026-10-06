'use server';

export type AiAnalysisResult = { ok: true; analysis: string } | { ok: false; error: string };

/** Runs the Gemini analysis flow. Fails softly so the UI can fall back to the built-in analyzer. */
export async function runAiAnalysis(simulationResults: string): Promise<AiAnalysisResult> {
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY && !process.env.GOOGLE_GENAI_API_KEY) {
    return { ok: false, error: 'GEMINI_API_KEY is not configured on the server.' };
  }
  if (simulationResults.length > 20_000) {
    return { ok: false, error: 'Too many results to analyse at once.' };
  }
  try {
    // Imported lazily so a missing key never breaks page rendering.
    const { analyzeAlgorithmPerformance } = await import('@/ai/flows/analyze-algorithm-performance');
    const { analysis } = await analyzeAlgorithmPerformance({ simulationResults });
    return { ok: true, analysis };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'AI analysis failed.' };
  }
}
