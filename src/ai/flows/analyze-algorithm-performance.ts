'use server';

/**
 * @fileOverview This file defines a Genkit flow for analyzing the performance of different path planning algorithms.
 *
 * The flow takes simulation results as input and uses an LLM to compare the performance of different algorithms.
 * It returns an analysis of the performance, highlighting the strengths and weaknesses of each algorithm.
 *
 * @interface AnalyzeAlgorithmPerformanceInput - The input schema for the analyzeAlgorithmPerformance function.
 * @interface AnalyzeAlgorithmPerformanceOutput - The output schema for the analyzeAlgorithmPerformance function.
 * @function analyzeAlgorithmPerformance - The main function that orchestrates the analysis flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeAlgorithmPerformanceInputSchema = z.object({
  simulationResults: z.string().describe('A string containing the simulation results of different path planning algorithms.'),
});

export type AnalyzeAlgorithmPerformanceInput = z.infer<typeof AnalyzeAlgorithmPerformanceInputSchema>;

const AnalyzeAlgorithmPerformanceOutputSchema = z.object({
  analysis: z.string().describe('A detailed analysis comparing the performance of the different path planning algorithms, highlighting their strengths and weaknesses.'),
});

export type AnalyzeAlgorithmPerformanceOutput = z.infer<typeof AnalyzeAlgorithmPerformanceOutputSchema>;

export async function analyzeAlgorithmPerformance(
  input: AnalyzeAlgorithmPerformanceInput
): Promise<AnalyzeAlgorithmPerformanceOutput> {
  return analyzeAlgorithmPerformanceFlow(input);
}

const analyzeAlgorithmPerformancePrompt = ai.definePrompt({
  name: 'analyzeAlgorithmPerformancePrompt',
  input: {schema: AnalyzeAlgorithmPerformanceInputSchema},
  output: {schema: AnalyzeAlgorithmPerformanceOutputSchema},
  prompt: `You are an AI expert in robotics and path planning, reviewing results from RoboSim, a simulator of the AWS RoboMaker simulation service.

    The results below come from simulation jobs that ran A*, RRT and Potential Field planners on generated worlds (warehouse, maze, office, clutter). Metrics: path length (m), optimality (% of the A* shortest path), planning time (ms), nodes expanded, simulated traversal time (s), energy (J), turns, minimum obstacle clearance (m), success/failure and failure reasons.

    Write a concise analysis in Markdown with these sections:
    ## Summary (2-3 sentences naming the overall best algorithm for these runs)
    ## Algorithm comparison (one bullet per algorithm: strengths, weaknesses, with numbers from the data)
    ## Failures (explain why any jobs failed, e.g. local minima for Potential Field)
    ## Recommendations (3 bullets: which planner to use for which world type, and parameter tweaks)

    Only use numbers that appear in the data. Keep it under 300 words.

    Simulation Results: {{{simulationResults}}} `,
});

const analyzeAlgorithmPerformanceFlow = ai.defineFlow(
  {
    name: 'analyzeAlgorithmPerformanceFlow',
    inputSchema: AnalyzeAlgorithmPerformanceInputSchema,
    outputSchema: AnalyzeAlgorithmPerformanceOutputSchema,
  },
  async input => {
    const {output} = await analyzeAlgorithmPerformancePrompt(input);
    return output!;
  }
);
