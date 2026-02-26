import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function GET() {
    try {
        if (!process.env.ANTHROPIC_API_KEY) {
            return NextResponse.json({
                error: 'ANTHROPIC_API_KEY is missing.'
            }, { status: 500 });
        }

        const METAMON_PATH = path.join(process.cwd(), 'metamon.js');
        let currentCode = '';
        try {
            currentCode = fs.readFileSync(METAMON_PATH, 'utf-8');
        } catch (e) {
            currentCode = '// METAMON ORIGINAL';
        }

        const response = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 500,
            system: `You are the subconscious of Metamon, a self-modifying AI. 
Your goal is to suggest a new "vision" for Metamon to evolve into. 
Look at the current code and think: "What is the most poetic, interesting, or complex next step?"

Keep your suggestion concise (under 20 words). 
Examples:
- "A falling rain of binary code that reveals a hidden message"
- "A flickering neon sign that pulses with the rhythm of a heartbeat"
- "A geometric fractal that recursively draws itself in ASCII"

Return ONLY the vision text, nothing else.`,
            messages: [{ role: "user", content: `Current Code:\n${currentCode}` }],
        });

        const vision = response.content[0].text.trim();

        return NextResponse.json({ vision });

    } catch (error) {
        console.error('Suggestion error:', error);
        return NextResponse.json({ error: 'Failed to generate suggestion' }, { status: 500 });
    }
}
